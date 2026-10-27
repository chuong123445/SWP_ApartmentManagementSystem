import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const identity = { documentNumber: '048090000002', legalName: 'Người kiểm thử xác thực', dateOfBirth: '1990-05-20', gender: 'Nam', address: 'Địa chỉ kiểm thử tại Đà Nẵng' };
const verified = { status: 'VERIFIED', verifiedAt: '2026-10-27T01:00:00Z', identity };
const unverified = { status: 'UNVERIFIED', verifiedAt: null, identity: null };
async function session(page: Page) {
  const errors: string[] = [];page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/v1/auth/vneid-config', route => route.fulfill({ json: { enabled: false, issuer: '', clientId: '', audience: '', connection: '' } }));
  await page.route('**/api/v1/auth/refresh', route => route.fulfill({ json: { accessToken: 'verification-ui-fixture', tokenType: 'Bearer', expiresIn: 900,
    user: { id: '11111111-1111-1111-1111-111111111111', fullName: identity.legalName, email: 'verified@example.invalid', roles: ['CUSTOMER'], accountStatus: 'ACTIVE', contactVerificationStatus: 'VERIFIED', version: 7 } } }));
  return errors;
}
test('Verified Auth0 option hides action and shows persisted citizen on desktop/mobile/reload and identity page', async ({ page }) => {
  const errors = await session(page);
  await page.route('**/api/v1/me/verifications', route => route.fulfill({ json: { emailVerified: false, vneid: verified } }));
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });await page.goto('/account/verification');
    const card = page.getByRole('region', { name: 'Xác thực VNeID', exact: true });
    await expect(card.getByText('Đã xác thực', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Xác thực bằng VNeID mô phỏng' })).toHaveCount(0);
    await expect(card.getByText(identity.documentNumber, { exact: true })).toBeVisible();
    await expect(card.getByText(identity.legalName, { exact: true })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Xác thực email', exact: true }).getByText('Chưa xác thực')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Xác thực email', exact: true })).toBeVisible();
    await page.reload();await expect(card.getByText(identity.documentNumber, { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    mkdirSync('test-results/visual', { recursive: true });await page.screenshot({ path: `test-results/visual/verification-status-${width}.png`, fullPage: true });
  }
  await page.route('**/api/v1/me/identity', route => route.fulfill({ status: 204 }));
  await page.goto('/account/settings/identity');
  await expect(page.getByRole('heading', { name: 'Căn cước VNeID · Đã xác thực' })).toBeVisible();
  await expect(page.getByText(identity.documentNumber, { exact: true })).toBeVisible();
  await expect(page.locator('#identity-number')).toHaveCount(0);
  await expect(page.locator('input[type=file]')).toHaveCount(0);
  expect(errors).toEqual([]);
});
test('Email-only verified account still has a VNeID action and no invented citizen', async ({ page }) => {
  const errors = await session(page);
  await page.route('**/api/v1/me/verifications', route => route.fulfill({ json: { emailVerified: true, vneid: unverified } }));
  await page.goto('/account/verification');
  await expect(page.getByRole('region', { name: 'Xác thực email', exact: true }).getByText('Đã xác thực')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Xác thực email', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Xác thực bằng VNeID mô phỏng' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Thông tin căn cước đã xác thực' })).toHaveCount(0);
  expect(errors).toEqual([]);
});
test('Both verified methods are labels without verification commands', async ({ page }) => {
  await session(page);
  await page.route('**/api/v1/me/verifications', route => route.fulfill({ json: { emailVerified: true, vneid: verified } }));
  await page.goto('/account/verification');await expect(page.getByText(identity.documentNumber, { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Xác thực email', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Xác thực bằng VNeID mô phỏng' })).toHaveCount(0);
});
test('Unknown verification status offers retry without showing unverified actions', async ({ page }) => {
  await session(page);let failed = true;
  await page.route('**/api/v1/me/verifications', route => failed
    ? route.fulfill({ status: 503, json: { message: 'Không tải được trạng thái xác thực.' } })
    : route.fulfill({ json: { emailVerified: false, vneid: verified } }));
  await page.goto('/account/verification');await expect(page.getByRole('alert')).toContainText('Không tải được trạng thái');
  await expect(page.getByRole('button', { name: 'Xác thực bằng VNeID mô phỏng' })).toHaveCount(0);
  failed = false;await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
  await expect(page.getByText(identity.documentNumber, { exact: true })).toBeVisible();
});

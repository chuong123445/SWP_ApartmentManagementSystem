import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const citizen = { documentNumber: '048090000002', legalName: 'Người kiểm thử Owner', dateOfBirth: '1990-05-20', gender: 'Nam', address: 'Địa chỉ kiểm thử' };
const verified = { status: 'VERIFIED', verifiedAt: '2026-10-27T01:00:00Z', identity: citizen };
const unverified = { status: 'UNVERIFIED', verifiedAt: null, identity: null };
async function setup(page: Page, options: { verified?: boolean; manual?: boolean; failure?: 'verification' | 'identity' } = {}) {
  const errors: string[] = [], consoleErrors: string[] = [], failed: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', e => { if (e.type() === 'error') consoleErrors.push(`${e.text()} [${e.location().url}]`); });
  page.on('requestfailed', r => { if (r.failure()?.errorText !== 'net::ERR_ABORTED') failed.push(r.url()); });
  let identityReads = 0, writes = 0, failure = options.failure;
  const user = { id: '11111111-1111-1111-1111-111111111111', fullName: citizen.legalName, email: 'owner@example.invalid', roles: ['OWNER'], accountStatus: 'ACTIVE', contactVerificationStatus: 'VERIFIED', version: 5 };
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/v1/auth/vneid-config') return route.fulfill({ json: { enabled: false } });
    if (path === '/api/v1/auth/csrf') return route.fulfill({ json: { token: 'test-csrf', headerName: 'X-XSRF-TOKEN' } });
    if (path === '/api/v1/auth/refresh') return route.fulfill({ json: { accessToken: 'owner-gate-test', tokenType: 'Bearer', expiresIn: 900, user } });
    if (path === '/api/v1/me') return route.fulfill({ json: user });
    if (path === '/api/v1/me/verifications') return failure === 'verification'
      ? route.fulfill({ status: 503, json: { message: 'Nguồn xác thực tạm lỗi' } })
      : route.fulfill({ json: { emailVerified: true, vneid: options.verified === false ? unverified : verified } });
    if (path === '/api/v1/me/identity') {
      identityReads++;
      if (failure === 'identity') return route.fulfill({ status: 503, json: { message: 'Hồ sơ tạm lỗi' } });
      return options.manual ? route.fulfill({ json: { ...citizen, issueDate: '2020-01-01', issuePlace: 'Nơi cấp thử nghiệm', permanentAddress: citizen.address, currentAddress: citizen.address, verificationStatus: 'NOT_VERIFIED', version: 1 } }) : route.fulfill({ status: 204 });
    }
    if (path === '/api/v1/owner/properties' && route.request().method() === 'POST') {
      writes++;expect(route.request().headers()['authorization']).toBe('Bearer owner-gate-test');
      const input = route.request().postDataJSON();expect(input).not.toHaveProperty('verified');expect(input).not.toHaveProperty('ownerId');
      return route.fulfill({ status: 201, json: { property: { ...input, id: '22222222-2222-2222-2222-222222222222', approvalStatus: 'DRAFT', version: 0 }, apartments: [] } });
    }
    if (path === '/api/v1/owner/invoices') return route.fulfill({ json: { items: [], totalPages: 0, page: 0, totalElements: 0 } });
    if (['/api/v1/owner/apartments', '/api/v1/owner/properties', '/api/v1/owner/tenancies', '/api/v1/me/tenancies'].includes(path)) return route.fulfill({ json: [] });
    failed.push(`Unexpected API ${path}`);return route.fulfill({ status: 404 });
  });
  return { identityReads: () => identityReads, writes: () => writes, recover: () => { failure = undefined; }, check: () => {
    expect(errors).toEqual([]);expect(failed).toEqual([]);
    expect(consoleErrors.filter(value => !(value.includes('/favicon.ico]') && value.includes('status of 404')) && !(options.failure && value.includes('status of 503')))).toEqual([]);
  } };
}
async function openAdd(page: Page) {
  await page.goto('/app');await page.getByRole('button', { name: 'Thêm tài sản cho thuê', exact: true }).click();
}
for (const width of [1440, 390]) test(`Verified Owner adds property without manual identity at ${width}px`, async ({ page }) => {
  const fixture = await setup(page);await page.setViewportSize({ width, height: 900 });await openAdd(page);
  const dialog = page.getByRole('dialog', { name: 'Thêm tài sản cho thuê', exact: true });await expect(dialog).toBeVisible();
  await expect(page.getByText('Yêu cầu cập nhật CCCD', { exact: true })).toHaveCount(0);expect(fixture.identityReads()).toBe(0);
  await dialog.getByLabel('Tên tài sản *', { exact: true }).fill('Tài sản kiểm thử');
  await dialog.getByLabel('Địa chỉ tài sản *', { exact: true }).fill('12 Đường kiểm thử');
  await dialog.getByLabel('Tỉnh/Thành phố *', { exact: true }).fill('Đà Nẵng');
  await dialog.getByLabel('Quận/Huyện/Khu vực *', { exact: true }).fill('Hải Châu');
  await dialog.getByLabel('Mã căn/phòng *', { exact: true }).fill('A.01');
  await dialog.getByLabel('Diện tích (m²) *', { exact: true }).fill('40');
  await dialog.getByLabel('Giá thuê/tháng (đ) *', { exact: true }).fill('4500000');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await dialog.getByRole('button', { name: 'Lưu tài sản nháp', exact: true }).click();
  await expect(dialog).toHaveCount(0);expect(fixture.writes()).toBe(1);fixture.check();
});
test('Verified identity page has no legacy form or document request, including reload/mobile', async ({ page }) => {
  const fixture = await setup(page);await page.setViewportSize({ width: 390, height: 900 });await page.goto('/account/settings/identity');
  await expect(page.getByText(citizen.documentNumber, { exact: true })).toBeVisible();
  await expect(page.locator('#identity-number')).toHaveCount(0);await expect(page.locator('input[type=file]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Lưu hồ sơ danh tính', exact: true })).toHaveCount(0);
  await page.reload();await expect(page.getByText(citizen.documentNumber, { exact: true })).toBeVisible();expect(fixture.identityReads()).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  mkdirSync('test-results/visual', { recursive: true });await page.screenshot({ path: 'test-results/visual/owner-verified-identity-mobile.png', fullPage: true });fixture.check();
});
test('Unverified Owner without manual profile is directed to identity; manual form remains available', async ({ page }) => {
  const fixture = await setup(page, { verified: false });await openAdd(page);
  await expect(page.getByText('Yêu cầu cập nhật CCCD', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Xác thực danh tính ngay', exact: true }).click();
  await expect(page.locator('#identity-number')).toBeVisible();await expect(page.locator('input[type=file]')).toHaveCount(2);
  expect(fixture.writes()).toBe(0);fixture.check();
});
test('Legacy Owner with a manual identity can still open property form', async ({ page }) => {
  const fixture = await setup(page, { verified: false, manual: true });await openAdd(page);
  await expect(page.getByRole('dialog', { name: 'Thêm tài sản cho thuê', exact: true })).toBeVisible();expect(fixture.identityReads()).toBe(1);fixture.check();
});
for (const failure of ['verification', 'identity'] as const) test(`${failure} failure offers retry without claiming missing identity or opening property form`, async ({ page }) => {
  const fixture = await setup(page, { failure, verified: failure === 'verification', manual: true });await openAdd(page);
  await expect(page.getByRole('alert')).toContainText('Chưa tải được thông tin danh tính');
  await expect(page.getByText('Yêu cầu cập nhật CCCD', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('dialog', { name: 'Thêm tài sản cho thuê', exact: true })).toHaveCount(0);
  fixture.recover();await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Thêm tài sản cho thuê', exact: true })).toBeVisible();fixture.check();
});

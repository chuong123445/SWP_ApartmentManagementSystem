import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const env = new Map(readFileSync(resolve('../../ancu-proptech-backend/.env.local'), 'utf8').split(/\r?\n/).filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]));

test('legacy sample identity is preserved privately and property evidence retains demo labels', async ({ page }) => {
  const errors: string[] = [];page.on('pageerror', e => errors.push(e.message));
  await page.goto('/login');await page.locator('#login-email').fill(env.get('LOCAL_OWNER_EMAIL')!);await page.locator('#login-password').fill(env.get('LOCAL_OWNER_PASSWORD')!);
  const response = page.waitForResponse(r => r.url().endsWith('/api/v1/auth/login') && r.request().method() === 'POST');await page.locator('button[type=submit]').click();
  const headers = { Authorization: `Bearer ${(await (await response).json()).accessToken}` };
  await expect(page.locator('#nav-properties')).toBeVisible();
  const identity = await (await page.request.get('/api/v1/me/identity', { headers })).json();expect(identity.localFixture).toBe(true);expect(identity.verificationStatus).toBe('NOT_VERIFIED');
  await page.getByRole('button', { name: 'Tài khoản' }).click();await page.getByRole('link', { name: 'Cài đặt tài khoản', exact: true }).click();
  await page.locator('a[href="/account/settings/identity"]').click();
  await expect(page.getByRole('heading', { name: 'Xác thực danh tính', exact: true })).toBeVisible();
  await expect(page.locator('#identity-number')).toHaveCount(0);await expect(page.locator('input[type=file]')).toHaveCount(0);
  const preserved = await (await page.request.get('/api/v1/me/identity', { headers })).json();expect(preserved).toEqual(identity);
  await page.setViewportSize({ width: 390, height: 844 });expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);await page.screenshot({ path: 'test-results/visual/sample-identity-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });await page.getByRole('link', { name: 'Quay lại trang quản lý', exact: true }).click();await page.locator('#nav-properties').click();
  const properties = await (await page.request.get('/api/v1/owner/properties', { headers })).json();
  const sample = properties.find((p: { name: string }) => p.name === 'An Cư Lê Văn Sỹ');expect(sample).toBeTruthy();
  const dossiers = await (await page.request.get(`/api/v1/owner/properties/${sample.id}/verification-dossiers`, { headers })).json();expect(dossiers[0].localFixture).toBe(true);expect(dossiers[0].certificateNumber).toMatch(/^MAU-GCN-/);
  await page.getByTestId('property-card').filter({ hasText: 'An Cư Lê Văn Sỹ' }).getByRole('button', { name: 'Xem hồ sơ kiểm duyệt', exact: true }).click();
  const dialog = page.getByRole('dialog');await expect(dialog).toContainText(dossiers[0].certificateNumber);await expect(dialog).toContainText('Hồ sơ mẫu');await expect(dialog).toContainText('Căn cứ quyền khai thác');
  await page.setViewportSize({ width: 390, height: 844 });expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);await dialog.screenshot({ path: 'test-results/visual/sample-property-dossier-mobile.png' });
  expect(errors).toEqual([]);
});

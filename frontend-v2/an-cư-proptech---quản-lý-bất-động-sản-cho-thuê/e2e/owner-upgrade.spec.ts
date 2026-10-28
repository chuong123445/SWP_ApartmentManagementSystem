import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const diagnostics = new WeakMap<Page, { console: string[]; network: string[] }>();
test.beforeEach(({ page }) => {
  const log = { console: [] as string[], network: [] as string[] };diagnostics.set(page, log);
  page.on('console', message => { if (message.type() === 'error') log.console.push(`${message.text()} [${message.location().url}]`); });
  page.on('requestfailed', request => { if (request.failure()?.errorText !== 'net::ERR_ABORTED') log.network.push(new URL(request.url()).pathname); });
});
test.afterEach(({ page }) => {
  const log = diagnostics.get(page)!;const expected = test.info().title.startsWith('No eligible') ? ['401', '403'] : ['401'];
  expect(log.console.filter(value => !(value.includes('status of 404') && value.includes('/favicon.ico]')) && !expected.some(status => value.includes(`status of ${status}`)))).toEqual([]);
  expect(log.network).toEqual([]);
});

async function fixture(page: Page, options: { available?: boolean; verified?: boolean; empty?: boolean } = {}) {
  let role = 'CUSTOMER';let commands = 0;
  const user = () => ({ id: '11111111-1111-1111-1111-111111111111', email: 'upgrade@example.invalid', fullName: 'Người kiểm thử nâng cấp', roles: [role], accountStatus: 'ACTIVE', contactVerificationStatus: 'VERIFIED', version: role === 'OWNER' ? 5 : 4 });
  const errors: string[] = [];page.on('pageerror', e => errors.push(e.message));
  await page.route('**/api/v1/auth/vneid-config', route => route.fulfill({ json: { enabled: false } }));
  await page.route('**/api/v1/auth/csrf', route => route.fulfill({ json: { token: 'test-csrf', headerName: 'X-XSRF-TOKEN' } }));
  await page.route('**/api/v1/auth/refresh', route => route.fulfill({ json: { accessToken: 'upgrade-ui-test', tokenType: 'Bearer', expiresIn: 900, user: user() } }));
  await page.route('**/api/v1/me', route => route.fulfill({ json: user() }));
  await page.route('**/api/v1/me/tenancies', route => route.fulfill({ json: [] }));
  await page.route('**/api/v1/me/apartments', route => route.fulfill({ json: [] }));
  await page.route('**/api/v1/me/profile', route => route.fulfill({ json: { ...user(), emailVerified: false, phoneVerified: false } }));
  await page.route('**/api/v1/me/verifications', route => route.fulfill({ json: { emailVerified: false, vneid: { status: options.verified === false ? 'UNVERIFIED' : 'VERIFIED', verifiedAt: null, identity: null } } }));
  await page.route('**/api/v1/me/owner-upgrade', route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { role, version: user().version, identityVerified: options.verified !== false, assetServiceAvailable: options.available !== false } });
    commands++;expect(route.request().headers()['authorization']).toBe('Bearer upgrade-ui-test');expect(route.request().headers()['x-xsrf-token']).toBe('test-csrf');
    expect(route.request().postDataJSON()).toEqual({ consent: true, version: 4 });
    if (options.empty) return route.fulfill({ status: 403, json: { code: 'OWNER_ASSET_REQUIRED', message: 'VNeID chưa có tài sản cho thuê hợp lệ. Tài khoản chưa được nâng cấp.' } });
    role = 'OWNER';return route.fulfill({ json: user() });
  });
  return { commands: () => commands, errors };
}

test('Settings box shows persisted CCCD status and offers explicit owner upgrade', async ({ page }) => {
  const data = await fixture(page);await page.goto('/account/settings');
  const card = page.getByRole('region', { name: 'Trạng thái xác thực tài khoản' });
  await expect(card.getByText('CCCD / VNeID: Đã xác thực', { exact: true })).toBeVisible();
  await expect(card.getByText('Email: Chưa xác thực', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Trở thành chủ cho thuê', exact: true }).first()).toBeVisible();
  expect(data.commands()).toBe(0);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  mkdirSync('test-results/visual', { recursive: true });await page.screenshot({ path: 'test-results/visual/settings-cccd-owner-upgrade-mobile.png', fullPage: true });
  expect(data.errors).toEqual([]);
});
test('Consent is required and successful upgrade refreshes server role on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });const data = await fixture(page);await page.goto('/account/owner-upgrade');
  const command = page.getByRole('button', { name: 'Kiểm tra tài sản và nâng cấp', exact: true });
  await expect(command).toBeDisabled();expect(data.commands()).toBe(0);
  await page.getByRole('checkbox').check();await command.click();
  await expect(page.getByText('Tài khoản đã là chủ cho thuê.', { exact: true })).toBeVisible();
  await expect(command).toHaveCount(0);await expect(page.getByRole('link', { name: 'Vào trang quản lý' })).toHaveAttribute('href', '/app');
  expect(data.commands()).toBe(1);expect(data.errors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.reload();await expect(page.getByText('Tài khoản đã là chủ cho thuê.', { exact: true })).toBeVisible();expect(data.commands()).toBe(1);
});
test('No eligible assets keeps ordinary account and shows server rejection', async ({ page }) => {
  const data = await fixture(page, { empty: true });await page.goto('/account/owner-upgrade');await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Kiểm tra tài sản và nâng cấp', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('chưa có tài sản cho thuê hợp lệ');
  await expect(page.getByText('Tài khoản đã là chủ cho thuê.', { exact: true })).toHaveCount(0);expect(data.commands()).toBe(1);
});
test('Missing source credentials and unverified citizen do not offer bypass', async ({ page }) => {
  const data = await fixture(page, { available: false });await page.goto('/account/owner-upgrade');
  await expect(page.getByText('Nguồn thông tin tài sản chưa sẵn sàng.', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Kiểm tra tài sản và nâng cấp', exact: true })).toHaveCount(0);expect(data.commands()).toBe(0);
});
test('Unverified citizen is directed to verification before consent', async ({ page }) => {
  const data = await fixture(page, { verified: false });await page.goto('/account/owner-upgrade');
  await expect(page.getByRole('link', { name: 'Xác thực CCCD qua VNeID trước khi nâng cấp' })).toBeVisible();
  await expect(page.getByRole('checkbox')).toHaveCount(0);expect(data.commands()).toBe(0);
});
test('Public registration has no role selector', async ({ page }) => {
  await page.route('**/api/v1/auth/refresh', route => route.fulfill({ status: 401, json: { message: 'Chưa đăng nhập' } }));
  await page.route('**/api/v1/auth/vneid-config', route => route.fulfill({ json: { enabled: false } }));
  await page.goto('/register');await expect(page.getByRole('heading', { name: 'Tạo tài khoản' })).toBeVisible();
  await expect(page.locator('#register-role')).toHaveCount(0);await expect(page.getByRole('combobox')).toHaveCount(0);
});

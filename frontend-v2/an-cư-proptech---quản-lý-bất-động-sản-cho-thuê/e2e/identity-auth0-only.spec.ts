import { test, expect, type Page } from '@playwright/test';

const citizen = { documentNumber: '048090000002', legalName: 'Người kiểm thử căn cước', dateOfBirth: '1990-05-20', gender: 'Nam', address: 'Địa chỉ kiểm thử tại Đà Nẵng' };
async function setup(page: Page, options: { verified?: boolean; failure?: boolean; enabled?: boolean } = {}) {
  const errors: string[] = [], consoleErrors: string[] = [], unexpected: string[] = [], privateRequests: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && !message.text().includes('status of 503')) consoleErrors.push(message.text()); });
  page.on('requestfailed', request => { if (request.failure()?.errorText !== 'net::ERR_ABORTED') unexpected.push(request.url()); });
  let failure = options.failure, release: (() => void) | undefined;
  const pending = new Promise<void>(resolve => { release = resolve; });
  let wait = false;
  const user = { id: '101', fullName: citizen.legalName, email: 'identity@example.invalid', roles: ['CUSTOMER'], accountStatus: 'ACTIVE', contactVerificationStatus: 'VERIFIED', version: 3 };
  await page.route('**/api/**', async route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    if (path.startsWith('/api/v1/me/identity')) { privateRequests.push(`${request.method()} ${path}`); return route.fulfill({ status: 204 }); }
    if (path === '/api/v1/auth/vneid-config') return route.fulfill({ json: { enabled: options.enabled ?? false, issuer: 'https://identity-fixture.auth0.com/', clientId: 'identity-fixture-client', audience: 'https://identity-fixture/api', connection: 'identity-fixture-connection' } });
    if (path === '/api/v1/auth/csrf') return route.fulfill({ json: { headerName: 'X-XSRF-TOKEN', token: 'fixture' } });
    if (path === '/api/v1/auth/refresh') return route.fulfill({ json: { accessToken: 'identity-fixture', tokenType: 'Bearer', expiresIn: 900, user } });
    if (path === '/api/v1/me') return route.fulfill({ json: user });
    if (path === '/api/v1/me/profile') return route.fulfill({ json: { ...user, emailVerified: true, phoneVerified: false } });
    if (path === '/api/v1/me/tenancies') return route.fulfill({ json: [] });
    if (path === '/api/v1/me/notifications') return route.fulfill({ json: { items: [], unreadCount: 0, totalElements: 0, totalPages: 0 } });
    if (path === '/api/v1/me/verifications') {
      if (wait) await pending;
      return failure ? route.fulfill({ status: 503, json: { message: 'Không tải được trạng thái xác thực.' } }) : route.fulfill({ json: { emailVerified: true, vneid: options.verified
        ? { status: 'VERIFIED', verifiedAt: '2026-10-27T01:00:00Z', identity: citizen }
        : { status: 'UNVERIFIED', verifiedAt: null, identity: null } } });
    }
    unexpected.push(`${request.method()} ${path}`); return route.fulfill({ status: 404 });
  });
  return { recover: () => { failure = false; }, hold: () => { wait = true; }, release: () => release!(), check: () => {
    expect(errors).toEqual([]); expect(consoleErrors).toEqual([]); expect(unexpected).toEqual([]); expect(privateRequests).toEqual([]);
  } };
}
async function noManualForm(page: Page) {
  await expect(page.locator('main input, main textarea, main form')).toHaveCount(0);
  await expect(page.locator('input[type=file]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Lưu hồ sơ danh tính', exact: true })).toHaveCount(0);
}
for (const width of [1440, 390]) {
  test(`Unverified identity uses VNeID only at ${width}px`, async ({ page }) => {
    const fixture = await setup(page); await page.setViewportSize({ width, height: 900 });
    await page.goto('/account/settings/identity');
    await expect(page.getByRole('heading', { name: 'Căn cước · Chưa xác thực', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Xác thực bằng VNeID mô phỏng', exact: true })).toBeDisabled();
    await noManualForm(page);
    await page.reload(); await expect(page.getByRole('heading', { name: 'Căn cước · Chưa xác thực', exact: true })).toBeVisible();
    await noManualForm(page); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('link', { name: 'Quay lại cài đặt tài khoản', exact: true }).click();
    await expect(page.getByText('Xác thực căn cước bằng VNeID mô phỏng qua Auth0.', { exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Quản lý thông tin căn cước', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Xác thực danh tính', exact: true })).toBeVisible(); fixture.check();
  });
  test(`Verified identity stays read only at ${width}px`, async ({ page }) => {
    const fixture = await setup(page, { verified: true }); await page.setViewportSize({ width, height: 900 });
    await page.goto('/account/settings/identity'); await expect(page.getByText(citizen.documentNumber, { exact: true })).toBeVisible();
    await expect(page.getByRole('main').getByText(citizen.legalName, { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Xác thực bằng VNeID mô phỏng', exact: true })).toHaveCount(0);
    await noManualForm(page); await page.reload(); await expect(page.getByText(citizen.documentNumber, { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); fixture.check();
  });
}
test('Verification error retries without opening manual collection or a verification action', async ({ page }) => {
  const fixture = await setup(page, { failure: true }); await page.goto('/account/settings/identity');
  await expect(page.getByRole('alert')).toContainText('Không tải được trạng thái xác thực.');
  await expect(page.getByRole('button', { name: 'Xác thực bằng VNeID mô phỏng', exact: true })).toHaveCount(0); await noManualForm(page);
  fixture.recover(); await page.getByRole('button', { name: 'Tải lại trạng thái xác thực', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Căn cước · Chưa xác thực', exact: true })).toBeVisible(); fixture.check();
});
test('Loading verification does not show a manual form or a verification action', async ({ page }) => {
  const fixture = await setup(page, { verified: true }); fixture.hold(); await page.goto('/account/settings/identity');
  try {
    await expect(page.getByText('Đang tải căn cước đã xác thực...', { exact: true })).toBeVisible(); await noManualForm(page);
    await expect(page.getByRole('button', { name: 'Xác thực bằng VNeID mô phỏng', exact: true })).toHaveCount(0);
  } finally { fixture.release(); }
  await expect(page.getByText(citizen.documentNumber, { exact: true })).toBeVisible(); fixture.check();
});
test('Enabled identity action opens the existing Auth0 verification flow', async ({ page }) => {
  const fixture = await setup(page, { enabled: true });
  await page.route('https://identity-fixture.auth0.com/**', route => route.fulfill({ contentType: 'text/html', body: '<p>Controlled Auth0 authorization boundary</p>' }));
  await page.goto('/account/settings/identity');
  const action = page.getByRole('button', { name: 'Xác thực bằng VNeID mô phỏng', exact: true });
  await expect(action).toBeEnabled(); await noManualForm(page); await action.click();
  await expect(page).toHaveURL(/identity-fixture\.auth0\.com\/authorize\?/);
  const url = new URL(page.url()); expect(url.searchParams.get('connection')).toBe('identity-fixture-connection');
  expect(url.searchParams.get('prompt')).toBe('login'); expect(url.searchParams.get('code_challenge_method')).toBe('S256');
  fixture.check();
});

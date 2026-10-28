import { test, expect, type Page } from '@playwright/test';
import { mockGoogleIdentity } from './support/google-identity';
import { mkdirSync } from 'node:fs';

async function setup(page: Page, conflict = false) {
  await mockGoogleIdentity(page);
  let signedIn = false;
  let commands = 0;
  const user = { id: '41', email: 'google-merge@example.invalid', fullName: 'Người kiểm thử Google',
    roles: ['CUSTOMER'], accountStatus: 'ACTIVE', contactVerificationStatus: 'VERIFIED', version: 0 };
  const session = { accessToken: 'merge-internal-token', tokenType: 'Bearer', expiresIn: 900, user };
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('requestfailed', request => {
    if (request.failure()?.errorText !== 'net::ERR_ABORTED') errors.push(request.url());
  });
  page.on('console', message => {
    if (message.type() === 'error' && !message.text().includes('status of 401')
        && !(conflict && message.text().includes('status of 409'))
        && !message.location().url.endsWith('/favicon.ico')) errors.push(message.text());
  });
  await page.route('https://images.unsplash.com/**', route => route.fulfill({ status: 200, body: '' }));
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/v1/auth/vneid-config') return route.fulfill({ json: { enabled: false } });
    if (path === '/api/v1/auth/csrf') return route.fulfill({ json: { token: 'merge-csrf', headerName: 'X-XSRF-TOKEN' } });
    if (path === '/api/v1/auth/refresh') return signedIn
      ? route.fulfill({ json: session }) : route.fulfill({ status: 401, json: { message: 'Chưa đăng nhập' } });
    if (path === '/api/v1/auth/google') {
      commands++;
      expect(route.request().postDataJSON()).toEqual({ credential: 'controlled-google-credential' });
      expect(route.request().headers()['x-xsrf-token']).toBe('merge-csrf');
      expect(route.request().headers().authorization).toBeUndefined();
      if (conflict) return route.fulfill({ status: 409, json: {
        code: 'GOOGLE_ACCOUNT_EXISTS', message: 'Email này đã có tài khoản. Vui lòng đăng nhập bằng mật khẩu.',
      } });
      signedIn = true;
      return route.fulfill({ json: session });
    }
    if (path === '/api/v1/auth/logout') { signedIn = false; return route.fulfill({ status: 204 }); }
    if (path === '/api/v1/me') return route.fulfill({ json: user });
    if (path === '/api/v1/apartments') return route.fulfill({ json: { items: [], page: 0, totalPages: 0, totalElements: 0, size: 6 } });
    if (path === '/api/v1/apartments/address-options' || path.endsWith('/tenancies') || path === '/api/v1/me/apartments')
      return route.fulfill({ json: [] });
    throw new Error(`Unexpected API: ${path}`);
  });
  return { errors, commands: () => commands };
}

for (const width of [1440, 390]) {
  test(`Google and VNeID coexist; Google login restores and logs out at ${width}px`, async ({ page }) => {
    const fixture = await setup(page);
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/login');
    await expect(page.getByRole('button', { name: 'Đăng nhập bằng VNeID mô phỏng' })).toBeVisible();
    const google = page.getByRole('button', { name: 'Google test sign in' });
    await expect(google).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    mkdirSync('test-results/visual', { recursive: true });
    await page.screenshot({ path: `test-results/visual/merged-google-vneid-${width}.png`, fullPage: true });
    await google.click();
    await expect(page).toHaveURL(/\/$/);
    await page.reload();
    await page.getByRole('button', { name: 'Vai trò và tài khoản' }).click();
    await expect(page.getByRole('navigation', { name: 'Điều hướng tài khoản' })).toContainText('google-merge@example.invalid');
    const storage = await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }));
    expect(storage).not.toContain('merge-internal-token');
    expect(storage).not.toContain('controlled-google-credential');
    await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
    await expect(page.getByRole('link', { name: 'Đăng nhập', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Vai trò và tài khoản' })).toHaveCount(0);
    expect(fixture.commands()).toBe(1);
    expect(fixture.errors).toEqual([]);
  });
}

test('Google conflict keeps password and VNeID login available', async ({ page }) => {
  const fixture = await setup(page, true);
  await page.goto('/login');
  await page.getByRole('button', { name: 'Google test sign in' }).click();
  await expect(page.getByRole('alert')).toContainText('Email này đã có tài khoản');
  await expect(page.getByLabel('Email', { exact: true })).toBeEnabled();
  await expect(page.getByLabel('Mật khẩu', { exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Đăng nhập bằng VNeID mô phỏng' })).toBeVisible();
  expect(fixture.commands()).toBe(1);
  expect(fixture.errors).toEqual([]);
});

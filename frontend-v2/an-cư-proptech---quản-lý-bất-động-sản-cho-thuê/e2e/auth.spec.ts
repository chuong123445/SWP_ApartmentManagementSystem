import { test, expect } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

// Dedicated local fixture provisioned through backend local profile; never log secrets.
const localEnvPath = resolve('../../ancu-proptech-backend/.env.local');
const localEnv = new Map(readFileSync(localEnvPath, 'utf8').split(/\r?\n/)
  .filter(line => line.includes('=') && !line.startsWith('#'))
  .map(line => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)]));

test('Owner login, reload restoration and Role-menu logout revoke the session', async ({ page, context }) => {
  const browserErrors: string[] = [];
  page.on('pageerror', error => browserErrors.push(error.message));
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Chào mừng trở lại' })).toBeVisible();
  await page.getByLabel('Email', { exact: true }).fill(localEnv.get('LOCAL_OWNER_EMAIL')!);
  await page.getByLabel('Mật khẩu', { exact: true }).fill('wrong-password');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Email hoặc mật khẩu không đúng.');

  await page.getByLabel('Mật khẩu', { exact: true }).fill(localEnv.get('LOCAL_OWNER_PASSWORD')!);
  const loginResponse = page.waitForResponse(response => response.url().endsWith('/api/v1/auth/login') && response.status() === 200);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  const oldAccessToken = (await (await loginResponse).json()).accessToken;
  await expect(page.getByRole('button', { name: 'Vai trò và tài khoản' })).toBeVisible();
  await expect(page.locator('#nav-rooms')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Vai trò và tài khoản' })).toBeVisible();
  await expect(page.locator('#nav-rooms')).toBeVisible();

  // All moved pages must still render through the shared workspace/layout.
  for (const tab of ['rooms', 'tenants', 'contracts', 'invoices', 'utilities', 'maintenance', 'trustguard', 'finance', 'reports', 'settings', 'dashboard']) {
    await page.locator(`#nav-${tab}`).click();
    await expect(page.locator('main h1').first()).toBeVisible();
  }
  await page.locator('#nav-rooms').click();
  await page.locator('#btn-add-new-room').click();
  await expect(page.getByRole('heading', { name: 'Thêm Phòng Cho Thuê Mới' })).toBeVisible();
  await page.getByRole('button', { name: 'Hủy', exact: true }).click();

  // Billing is now backed by SQL; verify form access without creating a duplicate period.
  await page.locator('#nav-invoices').click();
  await page.locator('#btn-create-invoice-page').click();
  await expect(page.getByRole('dialog', { name: 'Lập hóa đơn' })).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Hủy', exact: true }).click();

  for (const role of ['Cư Dân Căn Hộ', 'Khách Tìm Thuê Căn Hộ', 'Chủ nhà (Owner)']) {
    await page.getByRole('button', { name: 'Vai trò và tài khoản' }).click();
    await page.getByRole('button', { name: role, exact: false }).click();
    await expect(page.locator('main h1').first()).toBeVisible();
  }
  mkdirSync('test-results/visual', { recursive: true });
  await page.getByRole('button', { name: 'Vai trò và tài khoản' }).click();
  await expect(page.locator('#btn-logout')).toBeVisible();
  await page.screenshot({ path: 'test-results/visual/owner-role.png' });
  await page.locator('#btn-logout').click();
  await expect(page.getByRole('heading', { name: 'Chào mừng trở lại' })).toBeVisible();
  const revoked = await context.request.get('/api/v1/me', { headers: { Authorization: `Bearer ${oldAccessToken}` } });
  expect(revoked.status()).toBe(401);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Chào mừng trở lại' })).toBeVisible();
  await page.screenshot({ path: 'test-results/visual/login.png' });
  expect(browserErrors).toEqual([]);
});

test('Resident preview without issued invoices shows an empty state without crashing', async ({ page }) => {
  const errors: string[] = [];page.on('pageerror', e => errors.push(e.message));
  await page.route(/\/api\/v1\/owner\/invoices\?/, route => route.fulfill({ contentType: 'application/json', body: '{"items":[],"page":0,"size":20,"totalElements":0,"totalPages":0}' }));
  await page.goto('/login');await page.locator('#login-email').fill(localEnv.get('LOCAL_OWNER_EMAIL')!);await page.locator('#login-password').fill(localEnv.get('LOCAL_OWNER_PASSWORD')!);await page.locator('button[type=submit]').click();
  await expect(page.getByRole('button', { name: 'Vai trò và tài khoản' })).toBeVisible();await page.getByRole('button', { name: 'Vai trò và tài khoản' }).click();await page.getByRole('button', { name: 'Cư Dân Căn Hộ', exact: false }).click();
  await expect(page.getByRole('heading', { name: 'Cổng cư dân', exact: true })).toBeVisible();expect(errors).toEqual([]);
});

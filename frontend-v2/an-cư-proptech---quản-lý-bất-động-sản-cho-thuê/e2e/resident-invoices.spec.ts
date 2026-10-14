import { test, expect, type Page } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import type { BillingInvoice } from '../src/types/billing';

const env = new Map(readFileSync(resolve('../../ancu-proptech-backend/.env.local'), 'utf8')
  .split(/\r?\n/).filter(line => line.includes('=') && !line.startsWith('#'))
  .map(line => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)]));

async function login(page: Page, prefix: string) {
  await page.goto('/login');
  await page.locator('#login-email').fill(env.get(`${prefix}_EMAIL`)!);
  await page.locator('#login-password').fill(env.get(`${prefix}_PASSWORD`)!);
  const response = page.waitForResponse(r => r.url().endsWith('/api/v1/auth/login') && r.request().method() === 'POST');
  await page.locator('button[type=submit]').click();
  expect((await response).status()).toBe(200);
  const body = await (await response).json();
  await page.waitForURL('/');
  return body.accessToken as string;
}

async function openInvoices(page: Page) {
  await page.getByRole('button', { name: 'Vai trò và tài khoản' }).click();
  await page.getByRole('navigation', { name: 'Điều hướng tài khoản' })
    .getByRole('link', { name: 'Hóa đơn của tôi', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Hóa đơn của tôi', exact: true })).toBeVisible();
}

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

test('Real residents open sent invoice history/details with refresh, mobile and cross-tenant isolation', async ({ browser, baseURL }) => {
  const contexts = await Promise.all([browser.newContext({ baseURL }), browser.newContext({ baseURL })]);
  const residents: { page: Page; token: string; invoice: BillingInvoice }[] = [];
  const errors: string[] = [];
  try {
    for (const [index, context] of contexts.entries()) {
      const page = await context.newPage();page.on('pageerror', error => errors.push(error.message));
      const token = await login(page, `LOCAL_TENANT_${index + 1}`);
      const response = await context.request.get('/api/v1/me/invoices', { headers: { Authorization: `Bearer ${token}` } });
      expect(response.status()).toBe(200);
      const history = await response.json();expect(history.items.length).toBeGreaterThan(0);
      const invoice: BillingInvoice = history.items[0];
      expect(history.items.every((item: BillingInvoice) => item.status === 'SENT' && item.customerId === invoice.customerId)).toBe(true);
      await openInvoices(page);
      await expect(page.locator('main a[href^="/my/invoices/"]')).toHaveCount(history.items.length);
      await page.locator(`main a[href="/my/invoices/${invoice.id}"]`).click();
      await expect(page.getByRole('heading', { name: `Hóa đơn căn hộ ${invoice.roomNumber}`, exact: true })).toBeVisible();
      await expect(page.getByText('Đã gửi người thuê', { exact: true })).toBeVisible();
      await expect(page.getByRole('cell', { name: 'Tiền thuê tháng', exact: true })).toBeVisible();
      await expect(page.getByRole('cell', { name: /^Điện / })).toContainText(invoice.electricityEndReading);
      await expect(page.getByRole('cell', { name: /^Nước / })).toContainText(invoice.waterEndReading);
      await page.reload();
      await expect(page.getByRole('heading', { name: `Hóa đơn căn hộ ${invoice.roomNumber}`, exact: true })).toBeVisible();
      await noOverflow(page);
      await page.setViewportSize({ width: 390, height: 844 });await noOverflow(page);
      mkdirSync('test-results/visual', { recursive: true });
      await page.screenshot({ path: `test-results/visual/resident-invoice-${index + 1}-mobile.png`, fullPage: true });
      await page.getByRole('link', { name: '← Hóa đơn của tôi', exact: true }).click();
      await expect(page.locator(`main a[href="/my/invoices/${invoice.id}"]`)).toBeVisible();await noOverflow(page);
      residents.push({ page, token, invoice });
    }
    expect(residents[0].invoice.customerId).not.toBe(residents[1].invoice.customerId);
    for (const [index, resident] of residents.entries()) {
      const foreign = residents[1 - index].invoice;
      const response = await contexts[index].request.get(`/api/v1/invoices/${foreign.id}`, { headers: { Authorization: `Bearer ${resident.token}` } });
      expect(response.status()).toBe(404);
      await resident.page.goto(`/my/invoices/${foreign.id}`);
      await expect(resident.page.getByRole('alert')).toBeVisible();
      await expect(resident.page.getByRole('heading', { name: `Hóa đơn căn hộ ${foreign.roomNumber}`, exact: true })).toHaveCount(0);
    }
    expect(errors).toEqual([]);
  } finally { await Promise.all(contexts.map(context => context.close())); }
});

test('Invoice entry survives unavailable/empty tenancy data and supports empty history and retry', async ({ page }) => {
  await page.route('**/api/v1/me/tenancies', route => route.fulfill({ status: 503, json: { message: 'Quan hệ thuê tạm thời không khả dụng.' } }));
  await login(page, 'LOCAL_TENANT_1');
  await openInvoices(page);
  await expect(page.locator('main a[href^="/my/invoices/"]').first()).toBeVisible();
  // Transport simulations only; these do not mutate the real accounts, contracts or invoices.
  await page.route('**/api/v1/me/tenancies', route => route.fulfill({ json: [] }));
  await page.route('**/api/v1/me/invoices?*', route => route.fulfill({ json: { items: [], page: 0, size: 20, totalElements: 0, totalPages: 0 } }));
  await page.reload();
  await expect(page.getByText('Chưa có hóa đơn được gửi đến tài khoản của bạn.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Vai trò và tài khoản' }).click();
  await expect(page.getByRole('navigation', { name: 'Điều hướng tài khoản' }).getByRole('link', { name: 'Hóa đơn của tôi', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.route('**/api/v1/me/invoices?*', route => route.fulfill({ status: 503, json: { message: 'Không tải được hóa đơn.' } }));
  await page.getByRole('button', { name: 'Làm mới', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Không tải được hóa đơn.');
  await page.unroute('**/api/v1/me/invoices?*');
  await page.getByRole('button', { name: 'Làm mới', exact: true }).click();
  await expect(page.locator('main a[href^="/my/invoices/"]').first()).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });await noOverflow(page);
});

test('Guest invoice history requires login', async ({ page }) => {
  await page.goto('/my/invoices');await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator('#login-email')).toBeVisible();
});

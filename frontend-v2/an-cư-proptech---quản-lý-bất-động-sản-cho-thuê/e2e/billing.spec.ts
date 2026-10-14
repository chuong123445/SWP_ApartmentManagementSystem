import { test, expect, type Page } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
const env = new Map(readFileSync(resolve('../../ancu-proptech-backend/.env.local'), 'utf8').split(/\r?\n/).filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]));
async function login(page: Page, prefix: string) {
  await page.goto('/login');await page.locator('#login-email').fill(env.get(`${prefix}_EMAIL`)!);await page.locator('#login-password').fill(env.get(`${prefix}_PASSWORD`)!);
  const response = page.waitForResponse(r => r.url().endsWith('/api/v1/auth/login'));await page.locator('button[type=submit]').click();const r = await response;expect(r.status()).toBe(200);return (await r.json()).accessToken as string;
}
test('Owner sends persisted invoices to two real tenants, with private drafts and cross-tenant isolation', async ({ browser, baseURL }) => {
  const ownerContext = await browser.newContext({ baseURL });const firstContext = await browser.newContext({ baseURL });const secondContext = await browser.newContext({ baseURL });
  try {
    const owner = await ownerContext.newPage();const one = await firstContext.newPage();const two = await secondContext.newPage();
    const ownerToken = await login(owner, 'LOCAL_OWNER');await expect(owner.locator('#nav-tenants')).toBeVisible();
    await owner.locator('#nav-tenants').click();await expect(owner.getByText('Khách thuê Một', { exact: true }).first()).toBeVisible();await expect(owner.getByText('T.101', { exact: true }).first()).toBeVisible();
    const tenantToken = await login(one, 'LOCAL_TENANT_1');await one.getByRole('button', { name: 'Vai trò và tài khoản' }).click();await expect(one.getByRole('link', { name: 'Hóa đơn của tôi', exact: true })).toBeVisible();
    const secondToken = await login(two, 'LOCAL_TENANT_2');await two.getByRole('button', { name: 'Vai trò và tài khoản' }).click();await expect(two.getByRole('link', { name: 'Hóa đơn của tôi', exact: true })).toBeVisible();
    const tenanciesResponse = await ownerContext.request.get('/api/v1/owner/tenancies', { headers: { Authorization: `Bearer ${ownerToken}` } });const tenancies = await tenanciesResponse.json();
    await owner.locator('#nav-invoices').click();
    for (const [number, target, token, context, sendImmediately] of [
      ['T.101', one, tenantToken, firstContext, false], ['T.102', two, secondToken, secondContext, true],
    ] as const) {
      const contract = tenancies.find((c: { roomNumber: string }) => c.roomNumber === number);
      const contextResponse = await ownerContext.request.get(`/api/v1/owner/contracts/${contract.id}/billing-context`, { headers: { Authorization: `Bearer ${ownerToken}` } });expect(contextResponse.status()).toBe(200);const billing = await contextResponse.json();
      await owner.locator('#btn-create-invoice-page').click();await owner.locator('#invoice-contract').selectOption(contract.id);await expect(owner.locator('#invoice-electricity')).toBeVisible();
      await owner.locator('#invoice-electricity').fill(String(Number(billing.electricityStartReading) + 120));await owner.locator('#invoice-water').fill(String(Number(billing.waterStartReading) + 8));
      const createdResponse = owner.waitForResponse(r => r.url().endsWith(`/contracts/${contract.id}/invoices`) && r.request().method() === 'POST');
      await owner.locator(sendImmediately ? '#btn-create-send-invoice' : '#btn-confirm-create-invoice').click();const created = await createdResponse;expect(created.status()).toBe(201);const invoice = await created.json();
      if (!sendImmediately) {
        const hidden = await context.request.get(`/api/v1/invoices/${invoice.id}`, { headers: { Authorization: `Bearer ${token}` } });expect(hidden.status()).toBe(404);
        const row = owner.locator(`[data-invoice-id="${invoice.id}"]`);await expect(row).toContainText('Bản nháp');const sent = owner.waitForResponse(r => r.url().endsWith(`/invoices/${invoice.id}/send`));await row.getByRole('button', { name: 'Gửi người thuê' }).click();expect((await sent).status()).toBe(200);
        const foreign = await secondContext.request.get(`/api/v1/invoices/${invoice.id}`, { headers: { Authorization: `Bearer ${secondToken}` } });expect(foreign.status()).toBe(404);
      } else await expect(owner.getByRole('dialog')).toHaveCount(0);
      await target.goto('/');await expect(target.locator(`a[href="/my/invoices/${invoice.id}"]`)).toBeVisible();await target.locator(`a[href="/my/invoices/${invoice.id}"]`).click();await expect(target.getByRole('heading', { name: 'Chi tiết hóa đơn', exact: true })).toBeVisible();await expect(target.getByText(`Hóa đơn căn hộ ${number}`, { exact: true })).toBeVisible();await target.reload();await expect(target.getByText(`Hóa đơn căn hộ ${number}`, { exact: true })).toBeVisible();
    }
    mkdirSync('test-results/visual', { recursive: true });await one.screenshot({ path: 'test-results/visual/tenant-invoice.png', fullPage: true });await owner.screenshot({ path: 'test-results/visual/owner-invoices.png', fullPage: true });
  } finally { await ownerContext.close();await firstContext.close();await secondContext.close(); }
});
test('Home filters address hierarchically and Customer can open invoice navigation', async ({ page }) => {
  await login(page, 'LOCAL_CUSTOMER');await page.waitForURL('/');await page.getByRole('button', { name: 'Vai trò và tài khoản' }).click();await expect(page.getByRole('link', { name: 'Hóa đơn của tôi', exact: true })).toBeVisible();await page.keyboard.press('Escape');
  await expect(page.locator('#address-city option', { hasText: 'TP. Đà Nẵng' })).toHaveCount(1);await page.locator('#address-city').selectOption('TP. Đà Nẵng');await page.locator('#address-district').selectOption('Khu vực Hải Châu');await page.locator('#address-ward').selectOption('Phường Hải Châu');
  await page.getByRole('button', { name: 'Tìm kiếm', exact: true }).click();await expect(page.getByRole('heading', { name: 'Căn hộ thuê local — T.102', exact: true })).toBeVisible();
  await page.locator('#address-city').selectOption('TP. Hồ Chí Minh');await expect(page.locator('#address-district')).toHaveValue('');await expect(page.locator('#address-ward')).toHaveValue('');
  mkdirSync('test-results/visual', { recursive: true });await page.screenshot({ path: 'test-results/visual/home-address.png', fullPage: true });
});

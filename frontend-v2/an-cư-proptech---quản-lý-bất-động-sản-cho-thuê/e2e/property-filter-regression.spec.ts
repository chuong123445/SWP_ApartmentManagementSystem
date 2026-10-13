import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const env = new Map(readFileSync(resolve('../../ancu-proptech-backend/.env.local'), 'utf8').split(/\r?\n/).filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1)]));

// Read-only checks against canonical fixtures; do not create invoices, change credentials or mutate requests.
test('real property UUID scopes apartments, tenants, contracts, invoices and invoice choices without resetting shared data', async ({ page }) => {
  test.setTimeout(45000);const errors: string[] = [];page.on('pageerror', e => errors.push(e.message));
  await page.goto('/login');await page.locator('#login-email').fill(env.get('LOCAL_OWNER_EMAIL')!);await page.locator('#login-password').fill(env.get('LOCAL_OWNER_PASSWORD')!);
  const login = page.waitForResponse(r => r.url().endsWith('/api/v1/auth/login') && r.status() === 200);await page.locator('button[type=submit]').click();
  const headers = { Authorization: `Bearer ${(await (await login).json()).accessToken}` };
  const read = async (path: string) => { const r = await page.request.get(path, { headers });expect(r.status()).toBe(200);return r.json(); };
  const [properties, apartments, tenancies] = await Promise.all([read('/api/v1/owner/properties'),read('/api/v1/owner/apartments'),read('/api/v1/owner/tenancies')]);
  const select = page.getByLabel('Tài sản đang chọn');await expect(select.locator('option')).toHaveCount(properties.length + 1);
  for (const p of properties) {
    expect(p.id).toMatch(/^[0-9a-f-]{36}$/i);const scopedApartments = apartments.filter((a: any) => a.propertyId === p.id);const ids = new Set(scopedApartments.map((a: any) => a.id));
    const leases = tenancies.filter((c: any) => ids.has(c.apartmentId));
    await select.selectOption(p.id);await page.locator('#nav-rooms').click();await expect(page.locator('[id^=room-card-]')).toHaveCount(scopedApartments.length);
    await page.locator('#nav-tenants').click();await expect(page.locator('tbody tr')).toHaveCount(leases.filter((c: any) => c.status === 'ACTIVE').length);
    await page.locator('#nav-contracts').click();await expect(page.locator('tbody tr')).toHaveCount(leases.length);
    const inbox = await read(`/api/v1/owner/rental-requests?propertyId=${p.id}&page=0&size=10`);
    await page.locator('#nav-rental_requests').click();await expect(page.getByRole('status').filter({ hasText: 'Đang tải yêu cầu...' })).toHaveCount(0);
    await expect(page.getByTestId('rental-request')).toHaveCount(inbox.items.length);
    const expected = await read(`/api/v1/owner/invoices?propertyId=${p.id}&page=0&size=20`);
    await page.locator('#nav-invoices').click();await expect(page.getByRole('status').filter({ hasText: 'Đang tải hóa đơn...' })).toHaveCount(0);
    await expect(page.locator('[data-invoice-id]')).toHaveCount(expected.items.length);
    for (const invoice of expected.items) await expect(page.locator(`[data-invoice-id="${invoice.id}"]`)).toBeVisible();
    await page.locator('#btn-create-invoice-page').click();const dialog = page.getByRole('dialog', { name: 'Lập hóa đơn' });await expect(dialog).toBeVisible();
    await expect(dialog.locator('#invoice-contract option')).toHaveCount(leases.filter((c: any) => c.status === 'ACTIVE').length + 1);
    await dialog.getByRole('button', { name: 'Hủy', exact: true }).click();
    await page.locator('#nav-rooms').click();await expect(page.locator('[id^=room-card-]')).toHaveCount(scopedApartments.length);
  }
  await select.selectOption('all');await expect(page.locator('[id^=room-card-]')).toHaveCount(apartments.length);
  await page.reload();await page.locator('#nav-rooms').click();await expect(page.locator('[id^=room-card-]')).toHaveCount(apartments.length);
  await page.setViewportSize({ width: 390, height: 844 });await page.getByRole('button', { name: 'Menu quản lý', exact: true }).click();
  await select.selectOption(properties[0].id);await expect(select).toBeHidden();await expect(page.locator('[id^=room-card-]')).toHaveCount(apartments.filter((a: any) => a.propertyId === properties[0].id).length);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);expect(errors).toEqual([]);
});

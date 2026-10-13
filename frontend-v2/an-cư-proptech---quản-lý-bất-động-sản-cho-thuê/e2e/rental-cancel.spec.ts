import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const env = new Map(readFileSync(resolve('../../ancu-proptech-backend/.env.local'), 'utf8').split(/\r?\n/).filter(line => line.includes('=') && !line.startsWith('#')).map(line => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)]));

test('real request refresh, simultaneous duplicate prevention, cancellation and mobile history', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(env.get('LOCAL_CUSTOMER_EMAIL')!);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(env.get('LOCAL_CUSTOMER_PASSWORD')!);
  const login = page.waitForResponse(r => r.url().endsWith('/api/v1/auth/login') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  const token = (await (await login).json()).accessToken;
  const headers = { Authorization: `Bearer ${token}` };
  await expect(page).toHaveURL(/\/$/);
  const apartments = (await (await page.request.get('/api/v1/apartments?size=50')).json()).items;
  let apartmentId = '';
  for (const apartment of apartments.filter((a: any) => a.availability === 'VACANT')) {
    const active = await (await page.request.get(`/api/v1/me/apartments/${apartment.id}/rental-requests`, { headers })).json();
    if (!active.length) { apartmentId = apartment.id; break; }
  }
  expect(apartmentId).toBeTruthy();
  const message = `Kiểm thử cancel ${crypto.randomUUID()}`;
  const responses = await Promise.all([1, 2].map(() => page.request.post(`/api/v1/apartments/${apartmentId}/rental-requests`, { headers, data: { message } })));
  expect(responses.map(r => r.status()).sort()).toEqual([201, 409]);
  const created = await responses.find(r => r.status() === 201)!.json();
  try {
    await page.goto(`/apartments/${apartmentId}`);
    await expect(page.getByText('Đã gửi yêu cầu thuê', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Gửi yêu cầu thuê', exact: true })).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole('button', { name: 'Hủy yêu cầu thuê', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Thông tin căn hộ', exact: true })).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole('button', { name: 'Hủy yêu cầu thuê', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    await page.screenshot({ path: 'test-results/visual/rental-pending-mobile.png', fullPage: true });
    await page.getByRole('button', { name: 'Hủy yêu cầu thuê', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Gửi yêu cầu thuê', exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('button', { name: 'Gửi yêu cầu thuê', exact: true })).toBeVisible();
    await page.getByLabel('Lời nhắn cho chủ nhà').fill(message + ' again');
    await page.getByRole('button', { name: 'Gửi yêu cầu thuê', exact: true }).click();
    await expect(page.getByText('Đã gửi yêu cầu thuê', { exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Xem yêu cầu của tôi' }).click();
    const row = page.getByTestId('rental-request').filter({ hasText: message + ' again' });
    await row.getByRole('button', { name: 'Hủy yêu cầu thuê', exact: true }).click();
    await expect(row).toContainText('Đã hủy');
    await expect(row.getByRole('button', { name: 'Hủy yêu cầu thuê', exact: true })).toHaveCount(0);
    await page.reload();
    await expect(row).toContainText('Đã hủy');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    await page.screenshot({ path: 'test-results/visual/rental-cancelled-mobile.png', fullPage: true });
    expect(errors).toEqual([]);
  } finally {
    const active = await (await page.request.get(`/api/v1/me/apartments/${apartmentId}/rental-requests`, { headers })).json();
    for (const r of active.filter((r: any) => r.message.startsWith(message) && r.status === 'PENDING'))
      await page.request.post(`/api/v1/me/rental-requests/${r.id}/cancel`, { headers, data: { version: r.version } });
  }
});

import { test, expect } from '@playwright/test';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
const env = new Map(readFileSync(resolve('../../ancu-proptech-backend/.env.local'), 'utf8').split(/\r?\n/)
  .filter(line => line.includes('=') && !line.startsWith('#'))
  .map(line => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)]));

test('Owner manages canonical apartments, keeps imported drafts private, and publishes to Home', async ({ page }) => {
  await page.goto('/login');
  await page.locator('#login-email').fill(env.get('LOCAL_OWNER_EMAIL')!);
  await page.locator('#login-password').fill(env.get('LOCAL_OWNER_PASSWORD')!);
  await page.locator('button[type=submit]').click();
  await expect(page.locator('#nav-rooms')).toBeVisible();
  await page.locator('#nav-rooms').click();
  await expect(page.locator('#room-card-p999')).toBeVisible();
  await expect(page.locator('#room-card-p303')).toBeVisible();
  await expect(page.locator('#room-card-p303')).toContainText('Bản nháp');
  await page.locator('#btn-add-new-room').click();
  const form = page.locator('form').last();
  await form.locator('#new-apartment-property').selectOption({ label: 'Phòng chuyển đổi từ dữ liệu cũ' });
  await expect(form.locator('input[type=checkbox]')).toBeDisabled();
  await form.getByRole('button', { name: 'Hủy', exact: true }).click();
  await page.locator('#btn-add-new-room').click();
  const title = `Kiểm thử đồng bộ căn hộ ${Date.now()}`;
  const number = `E2E-${Date.now()}`;
  await form.locator('#new-apartment-property').selectOption({ label: 'An Cư Lê Văn Sỹ' });
  await form.locator('#new-apartment-title').fill(title);
  await form.locator('input[placeholder="P.303"]').fill(number);
  await form.locator('input[type=checkbox]').check();
  const savedResponse = page.waitForResponse(r => r.url().endsWith('/api/v1/owner/apartments') && r.request().method() === 'POST');
  await form.locator('button[type=submit]').click();
  const response = await savedResponse;
  expect(response.status()).toBe(201);
  const saved = await response.json();
  mkdirSync('test-results/visual', { recursive: true });
  writeFileSync('test-results/created-owner-apartment.json', JSON.stringify({ id: saved.id, title }));
  await expect(page.locator(`[id="room-card-${number.toLowerCase()}"]`)).toBeVisible();
  await page.reload();
  await page.locator('#nav-rooms').click();
  await expect(page.locator(`[id="room-card-${number.toLowerCase()}"]`)).toBeVisible();
  await page.screenshot({ path: 'test-results/visual/unified-owner-apartments.png', fullPage: true });
  await page.goto('/');
  await page.locator('#apartment-search').fill(title);
  await page.locator('main form button[type=submit]').click();
  await expect(page.locator(`a[href="/apartments/${saved.id}"]`).first()).toBeVisible();
  await page.locator(`a[href="/apartments/${saved.id}"]`).first().click();
  await expect(page.locator('h1')).toHaveText(title);
});

test('Owner inventory API failure shows an error without mock-room fallback', async ({ page }) => {
  await page.goto('/login');
  await page.locator('#login-email').fill(env.get('LOCAL_OWNER_EMAIL')!);
  await page.locator('#login-password').fill(env.get('LOCAL_OWNER_PASSWORD')!);
  await page.route('**/api/v1/owner/apartments', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"message":"Inventory unavailable"}' }));
  await page.locator('button[type=submit]').click();
  await expect(page.locator('#nav-rooms')).toBeVisible();
  await page.locator('#nav-rooms').click();
  await expect(page.getByRole('alert')).toHaveText(/Inventory unavailable/);
  await expect(page.locator('[id^="room-card-"]')).toHaveCount(0);
});

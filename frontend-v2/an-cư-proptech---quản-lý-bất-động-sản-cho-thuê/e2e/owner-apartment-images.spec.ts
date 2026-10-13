import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const env = new Map(readFileSync(resolve('../../ancu-proptech-backend/.env.local'), 'utf8').split(/\r?\n/).filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1)]));
test('Owner apartment names, persisted cover images, modal and responsive cards', async ({ page }) => {
  await page.goto('/login');await page.locator('#login-email').fill(env.get('LOCAL_OWNER_EMAIL')!);await page.locator('#login-password').fill(env.get('LOCAL_OWNER_PASSWORD')!);
  const login = page.waitForResponse(r => r.url().endsWith('/api/v1/auth/login') && r.status() === 200);await page.locator('button[type=submit]').click();
  const token = (await (await login).json()).accessToken;
  const apartments = await (await page.request.get('/api/v1/owner/apartments', {headers:{Authorization:`Bearer ${token}`}})).json();
  await page.locator('#nav-rooms').click();await expect(page.locator('#nav-rooms')).toContainText('Quản lý căn hộ');await expect(page.getByRole('heading',{name:'Danh sách căn hộ'})).toBeVisible();
  const cards = page.locator('[id^="room-card-"]');await expect(cards).toHaveCount(apartments.length);
  for (const apartment of apartments) {
    const card = page.locator(`#room-card-${apartment.roomNumber.toLowerCase().replace('.','')}`);
    await expect(card.getByRole('img')).toHaveAttribute('src',apartment.thumbnail);await card.scrollIntoViewIfNeeded();
    await expect.poll(() => card.getByRole('img').evaluate((image:HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  }
  await cards.first().scrollIntoViewIfNeeded();await page.screenshot({path:'test-results/visual/owner-apartment-images-desktop.png',fullPage:true});
  await cards.first().click();const modal = page.locator('#btn-close-room-modal').locator('..').locator('..');
  await expect(modal.getByRole('img')).toHaveAttribute('src',apartments[0].thumbnail);await expect(modal.getByText('Ảnh căn hộ',{exact:true})).toBeVisible();await page.locator('#btn-close-room-modal').click();
  await page.setViewportSize({width:390,height:844});await cards.first().scrollIntoViewIfNeeded();
  await page.screenshot({path:'test-results/visual/owner-apartment-images-mobile.png',fullPage:true});
  const imageBox = await cards.first().getByRole('img').boundingBox();expect(imageBox!.x).toBeGreaterThanOrEqual(0);expect(imageBox!.x+imageBox!.width).toBeLessThanOrEqual(390);expect(imageBox!.width).toBeGreaterThan(250);
  await page.getByRole('button',{name:'Menu quản lý',exact:true}).click();await expect(page.locator('#nav-rooms')).toBeVisible();await page.locator('#nav-rooms').click();await expect(page.locator('#nav-rooms')).toBeHidden();await expect(cards.first()).toBeVisible();
});

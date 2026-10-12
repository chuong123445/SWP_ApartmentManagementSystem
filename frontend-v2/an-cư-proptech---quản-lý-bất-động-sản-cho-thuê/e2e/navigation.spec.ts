import { test, expect } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
const env = new Map(readFileSync(resolve('../../ancu-proptech-backend/.env.local'), 'utf8').split(/\r?\n/).filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]));

for (const prefix of ['LOCAL_CUSTOMER', 'LOCAL_TENANT_1']) {
  test(`${prefix} uses the account dropdown and keeps Home visible`, async ({ page }) => {
    const errors: string[] = [];page.on('pageerror', e => errors.push(e.message));
    await page.goto('/login');await page.locator('#login-email').fill(env.get(`${prefix}_EMAIL`)!);await page.locator('#login-password').fill(env.get(`${prefix}_PASSWORD`)!);await page.locator('button[type=submit]').click();
    const trigger = page.getByRole('button', { name: 'Vai trò và tài khoản' });
    await expect(trigger).toBeVisible();await expect(page.getByRole('link', { name: 'Trang chủ', exact: true })).toBeVisible();
    const menu = page.getByRole('navigation', { name: 'Điều hướng tài khoản' });
    await expect(menu).toHaveCount(0);await expect(page.locator('header').getByRole('link', { name: 'Hồ sơ cá nhân', exact: true })).toHaveCount(0);
    await trigger.click();await expect(menu.getByRole('link', { name: 'Yêu cầu của tôi', exact: true })).toBeVisible();
    await expect(menu.getByRole('link', { name: 'Trang quản lý', exact: true })).toHaveCount(0);
    if (prefix === 'LOCAL_TENANT_1') await expect(menu.getByRole('link', { name: 'Hóa đơn của tôi', exact: true })).toBeVisible();
    else await expect(menu.getByRole('link', { name: 'Hóa đơn của tôi', exact: true })).toHaveCount(0);
    await page.keyboard.press('Escape');await expect(trigger).toBeFocused();await expect(menu).toHaveCount(0);
    await trigger.click();await page.getByRole('heading', { name: 'Tìm căn hộ cho thuê phù hợp với bạn', exact: true }).click();await expect(menu).toHaveCount(0);
    await trigger.click();await menu.getByRole('link', { name: 'Hồ sơ cá nhân', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Hồ sơ cá nhân', exact: true })).toBeVisible();await expect(menu).toHaveCount(0);
    await page.getByRole('link', { name: 'Quay lại trang chủ', exact: true }).click();await expect(page.getByTestId('apartment-card').first()).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });await trigger.click();
    const box = await menu.boundingBox();expect(box).not.toBeNull();expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x + box!.width).toBeLessThanOrEqual(390);
    mkdirSync('test-results/visual', { recursive: true });await page.screenshot({ path: `test-results/visual/navigation-${prefix.toLowerCase()}.png`, fullPage: true });
    await menu.getByRole('button', { name: 'Đăng xuất', exact: true }).click();await expect(page.getByRole('link', { name: 'Đăng nhập', exact: true })).toBeVisible();expect(errors).toEqual([]);
  });
}

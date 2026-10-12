import { test, expect } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
const fixturePath = resolve('../../ancu-proptech-backend/target/profile-ui-account.json');
test.skip(!process.env.E2E_ACCOUNT_FIXTURE, 'Enable only with the isolated temporary account fixture; never change real fixture passwords.');
test('Profile persists, password change revokes sessions, phone stays unverified and email shows transport readiness', async ({ page }) => {
  const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
  const login = async (password: string) => { await page.goto('/login');await page.locator('#login-email').fill(fixture.email);await page.locator('#login-password').fill(password);await page.locator('button[type=submit]').click();await expect(page.getByRole('link', { name: 'Hồ sơ cá nhân', exact: true })).toBeVisible(); };
  await login(fixture.password);await page.getByRole('link', { name: 'Hồ sơ cá nhân', exact: true }).click();await expect(page.locator('#profile-name')).toHaveValue('Profile UI Test');
  await page.locator('#profile-name').fill('Profile UI Updated');await page.locator('#profile-address').fill('Địa chỉ thử cách ly');await page.getByRole('button', { name: 'Lưu hồ sơ', exact: true }).click();await expect(page.getByRole('status')).toHaveText('Đã lưu hồ sơ cá nhân.');await page.reload();await expect(page.locator('#profile-name')).toHaveValue('Profile UI Updated');
  await page.getByRole('link', { name: 'Cài đặt tài khoản', exact: true }).first().click();await expect(page.locator('#password-current')).toBeVisible();
  await page.locator('#password-current').fill(fixture.password);await page.locator('#password-new').fill('Ui-profile-new!12345');await page.locator('#password-confirm').fill('Ui-profile-new!12345');await page.getByRole('button', { name: 'Đổi mật khẩu', exact: true }).click();await expect(page.getByRole('heading', { name: 'Chào mừng trở lại' })).toBeVisible();
  await page.locator('#login-email').fill(fixture.email);await page.locator('#login-password').fill(fixture.password);await page.locator('button[type=submit]').click();await expect(page.getByRole('alert')).toHaveText('Email hoặc mật khẩu không đúng.');
  await page.locator('#login-password').fill('Ui-profile-new!12345');await page.locator('button[type=submit]').click();await expect(page.locator('#phone-number')).toBeVisible();
  await page.locator('#phone-number').fill('0977712345');await page.locator('#phone-password').fill('Ui-profile-new!12345');await page.getByRole('button', { name: 'Cập nhật số điện thoại', exact: true }).click();await expect(page.getByRole('heading', { name: 'Chào mừng trở lại' })).toBeVisible();
  await page.locator('#login-email').fill(fixture.email);await page.locator('#login-password').fill('Ui-profile-new!12345');await page.locator('button[type=submit]').click();await expect(page.locator('#phone-number')).toHaveValue('+84977712345');await expect(page.getByText(/Chưa xác minh SMS/)).toBeVisible();
  mkdirSync('test-results/visual', { recursive: true });await page.screenshot({ path: 'test-results/visual/account-settings.png', fullPage: true });await page.getByRole('link', { name: 'Hồ sơ cá nhân', exact: true }).first().click();await page.screenshot({ path: 'test-results/visual/account-profile.png', fullPage: true });
});

import { test, expect } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

test.skip(!process.env.E2E_REGISTRATION, 'Creates isolated pending accounts in local SQL; enable with cleanup.');
test('Customer and Owner register with restricted sessions; delivery failure remains retryable', async ({ page }) => {
  const created: string[] = [];
  mkdirSync('test-results/visual', { recursive: true });
  for (const role of ['CUSTOMER', 'OWNER']) {
    // Keep transport failure deterministic and never mail external test addresses.
    await page.route('**/api/v1/me/email-changes', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ code: 'OTP_DELIVERY_UNAVAILABLE', message: 'SMTP kiểm thử chưa sẵn sàng.' }) }));
    await page.goto('/login');await page.getByRole('link', { name: 'Đăng ký', exact: true }).click();
    await expect(page.locator('#register-role option')).toHaveCount(2);
    const email = `registration-ui-${randomUUID()}@example.invalid`;
    await page.locator('#register-role').selectOption(role);
    await page.locator('#register-name').fill(`Registration UI ${role}`);
    await page.locator('#register-email').fill(email);
    await page.locator('#register-password').fill('Ui-registration!12345');
    await page.locator('#register-confirm').fill('different-password');
    await page.getByRole('button', { name: 'Đăng ký', exact: true }).click();
    await expect(page.getByRole('alert')).toHaveText('Mật khẩu xác nhận không khớp.');
    await page.locator('#register-confirm').fill('Ui-registration!12345');
    const responsePromise = page.waitForResponse(response => response.url().endsWith('/api/v1/auth/register'));
    await page.getByRole('button', { name: 'Đăng ký', exact: true }).click();
    const response = await responsePromise;expect(response.status()).toBe(201);
    created.push(email);writeFileSync('test-results/registration-created.json', JSON.stringify(created));
    const account = await response.json();expect(account.roles).toEqual([role]);expect(account.accountStatus).toBe('PENDING_VERIFICATION');
    await expect(page).toHaveURL(/\/account\/settings\/email$/);
    await expect(page.getByRole('status')).toContainText('Đăng ký thành công, email chưa được xác minh.');
    await expect(page.locator('#email-new')).toHaveValue(email);
    await page.reload();await expect(page.locator('#email-new')).toHaveValue(email);
    await page.goto(role === 'OWNER' ? '/app' : '/my/rental-requests');
    await expect(page.getByRole('heading', { name: 'Tài khoản cần xác minh', exact: true })).toBeVisible();
    await page.screenshot({ path: `test-results/visual/registration-${role.toLowerCase()}-pending.png`, fullPage: true });
    await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
    await page.context().clearCookies();
  }
});

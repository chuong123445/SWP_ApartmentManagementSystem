import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { mkdirSync, writeFileSync, unlinkSync } from 'node:fs';

test('new Owner is gated, creates single and multiple private drafts, and filters by real properties', async ({ page }) => {
  test.setTimeout(65000);
  const key = randomUUID(), name = `Property E2E ${key}`, email = `property-e2e-${key}@example.invalid`, password = `Property-test-${randomUUID()}!`;
  let ownerId = '00000000-0000-0000-0000-000000000000';
  const manifestDir = resolve('../../ancu-proptech-backend/target/property-e2e-fixtures');mkdirSync(manifestDir, { recursive: true });
  const manifest = resolve(manifestDir, `${key}.json`);
  const fixture = (mode: 'prepare' | 'cleanup') => {
    const result = spawnSync('powershell.exe', ['-NoProfile', '-File', resolve('../../ancu-proptech-backend/tools/property-e2e-fixture.ps1'), '-Mode', mode, '-TestKey', key, '-OwnerId', ownerId], { encoding: 'utf8' });
    if (result.status !== 0) throw new Error(`Property fixture ${mode} failed: ${result.stderr}`);
    return JSON.parse(result.stdout.trim());
  };
  const errors: string[] = [];page.on('pageerror', error => errors.push(error.message));
  try {
    // SMTP failure is simulated; this test never sends mail to .invalid or claims a real inbox check.
    await page.route('**/api/v1/me/email-changes', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ code: 'OTP_DELIVERY_UNAVAILABLE', message: 'Chưa gửi được OTP.' }) }));
    await page.goto('/register');await page.locator('#register-role').selectOption('OWNER');
    await page.locator('#register-name').fill(name);await page.locator('#register-email').fill(email);
    await page.locator('#register-password').fill(password);await page.locator('#register-confirm').fill(password);
    const registration = page.waitForResponse(r => r.url().endsWith('/api/v1/auth/register') && r.request().method() === 'POST');
    await page.getByRole('button', { name: 'Đăng ký', exact: true }).click();
    const registered = await (await registration).json();ownerId = registered.id;
    writeFileSync(manifest, JSON.stringify({ key, ownerId }));
    expect(registered.accountStatus).toBe('PENDING_VERIFICATION');
    await expect(page).toHaveURL(/\/account\/settings\/email/);
    await page.goto('/app');await expect(page.getByRole('heading', { name: 'Tài khoản cần xác minh', exact: true })).toBeVisible();
    // Local test provisioning only. OTP confirmation/activation is covered by the server mail-adapter tests.
    expect(fixture('prepare').prepared).toBe(true);
    await page.context().clearCookies();await page.goto('/login');
    await page.locator('#login-email').fill(email);await page.locator('#login-password').fill(password);
    const login = page.waitForResponse(r => r.url().endsWith('/api/v1/auth/login') && r.request().method() === 'POST');
    await page.locator('button[type=submit]').click();const headers = { Authorization: `Bearer ${(await (await login).json()).accessToken}` };
    await expect(page.getByRole('heading', { name: 'Thêm tài sản cho thuê', exact: true })).toBeVisible();
    const select = page.getByLabel('Tài sản đang chọn');await expect(select).toBeDisabled();
    await page.getByRole('button', { name: 'Thêm tài sản cho thuê', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Thêm tài sản cho thuê' });
    const fillProperty = async (suffix: string) => {
      await dialog.getByLabel('Tên tài sản *', { exact: true }).fill(`${name} ${suffix}`);
      await dialog.getByLabel('Địa chỉ tài sản *', { exact: true }).fill('12 Đường kiểm thử');
      await dialog.getByLabel('Tỉnh/Thành phố *', { exact: true }).fill('TP. Hồ Chí Minh');
      await dialog.getByLabel('Quận/Huyện/Khu vực *', { exact: true }).fill('Quận 3');
    };
    const fillUnit = async (index: number, code: string) => {
      const unit = dialog.getByTestId('property-unit-form').nth(index);
      await unit.getByLabel('Mã căn/phòng *', { exact: true }).fill(code);
      await unit.getByLabel('Diện tích (m²) *', { exact: true }).fill('32.50');
      await unit.getByLabel('Giá thuê/tháng (đ) *', { exact: true }).fill('4500000');
    };
    await fillProperty('single');await fillUnit(0, 'E2E.1');
    await expect(dialog.getByRole('button', { name: 'Thêm căn/phòng', exact: true })).toHaveCount(0);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await dialog.screenshot({ path: 'test-results/visual/property-single-form-mobile.png' });
    const saveSingle = page.waitForResponse(r => r.url().endsWith('/api/v1/owner/properties') && r.request().method() === 'POST');
    await dialog.getByRole('button', { name: 'Lưu tài sản nháp', exact: true }).click();
    const singleResponse = await saveSingle;expect(singleResponse.status()).toBe(201);const single = await singleResponse.json();
    expect(single.property.approvalStatus).toBe('DRAFT');expect(single.apartments[0].electricityIndex).toBeNull();
    await expect(dialog).toHaveCount(0);await expect(page.getByTestId('property-card')).toHaveCount(1);
    await expect(page.getByTestId('property-card')).toContainText('Nháp – chưa gửi hồ sơ');
    await page.reload();await page.getByRole('button', { name: 'Menu quản lý', exact: true }).click();
    await expect(select).toBeEnabled();await expect(select.locator('option')).toHaveCount(2);
    await page.locator('#nav-properties').click();await page.getByRole('button', { name: 'Thêm tài sản cho thuê', exact: true }).click();
    await dialog.getByLabel('Tài sản gồm nhiều căn/phòng', { exact: true }).check();await fillProperty('multi');
    await fillUnit(0, 'E2E.2');await dialog.getByRole('button', { name: 'Thêm căn/phòng', exact: true }).click();await fillUnit(1, 'E2E.2');
    await dialog.getByRole('button', { name: 'Lưu tài sản nháp', exact: true }).click();await expect(dialog.getByRole('alert')).toContainText('Mã căn/phòng bị trùng');
    await fillUnit(1, 'E2E.3');
    const saveMulti = page.waitForResponse(r => r.url().endsWith('/api/v1/owner/properties') && r.request().method() === 'POST');
    await dialog.getByRole('button', { name: 'Lưu tài sản nháp', exact: true }).click();
    const multiResponse = await saveMulti;expect(multiResponse.status()).toBe(201);const multi = await multiResponse.json();expect(multi.apartments).toHaveLength(2);
    await expect(dialog).toHaveCount(0);await page.setViewportSize({ width: 1440, height: 1000 });
    await select.selectOption(single.property.id);await page.locator('#nav-rooms').click();
    await expect(page.locator('[id^=room-card-]')).toHaveCount(1);await expect(page.locator('[id^=room-card-]').first()).toContainText('E2E.1');
    await select.selectOption(multi.property.id);await expect(page.locator('[id^=room-card-]')).toHaveCount(2);
    await select.selectOption('all');await expect(page.locator('[id^=room-card-]')).toHaveCount(3);
    await select.selectOption(single.property.id);await page.locator('#nav-rental_requests').click();
    await expect(page.getByText('Chưa có yêu cầu thuê phù hợp.', { exact: true })).toBeVisible();
    const requestFilter = page.waitForResponse(r => r.url().includes('/owner/rental-requests?') && r.url().includes(`propertyId=${multi.property.id}`));
    await select.selectOption(multi.property.id);expect((await requestFilter).status()).toBe(200);
    await page.locator('#nav-invoices').click();
    const invoiceFilter = page.waitForResponse(r => r.url().includes('/owner/invoices?') && r.url().includes(`propertyId=${single.property.id}`));
    await select.selectOption(single.property.id);expect((await invoiceFilter).status()).toBe(200);
    for (const apartment of [...single.apartments, ...multi.apartments]) {
      expect((await page.request.get(`/api/v1/apartments/${apartment.id}`)).status()).toBe(404);
    }
    const properties = await (await page.request.get('/api/v1/owner/properties', { headers })).json();expect(properties).toHaveLength(2);
    await page.locator('#nav-properties').click();await page.screenshot({ path: 'test-results/visual/property-list-desktop.png', fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });await page.screenshot({ path: 'test-results/visual/property-list-mobile.png', fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);expect(errors).toEqual([]);
  } finally {
    const cleaned = fixture('cleanup');expect(cleaned.accountsRemaining).toBe(0);expect(cleaned.propertiesRemaining).toBe(0);
    if (ownerId !== '00000000-0000-0000-0000-000000000000') unlinkSync(manifest);
  }
});

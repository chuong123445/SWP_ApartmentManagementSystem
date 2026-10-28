import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { mkdirSync, writeFileSync, unlinkSync } from 'node:fs';

test('pending Customer stores private identity, edits and reloads without becoming verified', async ({ page }) => {
  test.setTimeout(60000);
  const key = randomUUID(), email = `identity-e2e-${key}@example.invalid`, password = `Identity-${randomUUID()}!`;
  let id = '';
  const directory = resolve('../../ancu-proptech-backend/target/identity-e2e-fixtures');mkdirSync(directory, { recursive: true });
  const manifest = resolve(directory, `${key}.json`);
  const errors: string[] = [];page.on('pageerror', error => errors.push(error.message));
  // Synthetic raster only. No real identity document or external provider is used.
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
  try {
    const csrf = await (await page.request.get('/api/v1/auth/csrf')).json();
    const registration = await page.request.post('/api/v1/auth/register', { headers: { [csrf.headerName]: csrf.token }, data: { email, password, fullName: `Identity E2E ${key}`, requestedRole: 'CUSTOMER' } });
    expect(registration.status()).toBe(201);id = (await registration.json()).id;writeFileSync(manifest, JSON.stringify({ key, id }));
    await page.goto('/login');await page.locator('#login-email').fill(email);await page.locator('#login-password').fill(password);
    const loginResponse = page.waitForResponse(r => r.url().endsWith('/api/v1/auth/login') && r.request().method() === 'POST');
    await page.locator('button[type=submit]').click();const headers = { Authorization: `Bearer ${(await (await loginResponse).json()).accessToken}` };
    await expect(page.getByRole('button', { name: 'Vai trò và tài khoản' })).toBeVisible();
    const catalog = await (await page.request.get('/api/v1/apartments?size=100')).json();
    await page.goto('/');await expect(page.locator('.home-results [role=status]')).toHaveText(`${catalog.totalElements} căn hộ phù hợp`);
    await page.getByRole('button', { name: 'Vai trò và tài khoản' }).click();
    await page.getByRole('link', { name: 'Cài đặt tài khoản', exact: true }).click();await page.getByRole('link', { name: 'Xác thực danh tính', exact: true }).click();
    await expect(page).toHaveURL(/\/account\/settings\/identity$/);await expect(page.getByText('Chưa cung cấp hồ sơ danh tính', { exact: true })).toBeVisible();
    await page.locator('#identity-name').fill('Nguyễn Văn Kiểm Thử');await page.locator('#identity-number').fill('001095000123');
    await page.locator('#identity-birthday').fill('1995-06-15');await page.locator('#identity-issued').fill('2022-05-01');
    await page.locator('#identity-place').fill('Cục Cảnh sát QLHC về TTXH');
    await page.locator('#identity-permanent').fill('Địa chỉ trên căn cước thử nghiệm');await page.locator('#identity-current').fill('Địa chỉ đang sống thử nghiệm');
    await page.locator('#identity-front').setInputFiles({ name: 'fake.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg/>') });
    await expect(page.getByRole('alert')).toContainText('PNG/JPEG');
    await page.locator('#identity-front').setInputFiles({ name: 'front.png', mimeType: 'image/png', buffer: png });
    await page.locator('#identity-back').setInputFiles({ name: 'back.png', mimeType: 'image/png', buffer: png });
    await expect(page.getByRole('img', { name: 'Ảnh căn cước mặt trước', exact: true })).toBeVisible();
    const savedResponse = page.waitForResponse(r => r.url().endsWith('/api/v1/me/identity') && r.request().method() === 'PUT');
    await page.getByRole('button', { name: 'Lưu hồ sơ danh tính', exact: true }).click();expect((await savedResponse).status()).toBe(200);
    await expect(page.getByRole('status')).toContainText('Đã lưu hồ sơ. Danh tính của bạn chưa được xác minh.');
    await expect(page.getByText('Đã cung cấp hồ sơ · Chưa xác minh danh tính', { exact: true })).toBeVisible();
    const metadata = await (await page.request.get('/api/v1/me/identity', { headers })).json();expect(metadata.verificationStatus).toBe('NOT_VERIFIED');
    const profile = await (await page.request.get('/api/v1/me/profile', { headers })).json();expect(profile.emailVerified).toBe(false);expect(profile.accountStatus).toBe('PENDING_VERIFICATION');expect(profile.fullName).toBe(`Identity E2E ${key}`);
    await page.reload();await expect(page.locator('#identity-name')).toHaveValue('Nguyễn Văn Kiểm Thử');
    await expect(page.getByRole('img', { name: 'Ảnh căn cước mặt sau', exact: true })).toBeVisible();
    const image = await page.request.get('/api/v1/me/identity/documents/front', { headers });expect(image.status()).toBe(200);expect(image.headers()['cache-control']).toBe('no-store');
    await page.locator('#identity-current').fill('Địa chỉ sinh sống đã cập nhật');
    const updatedResponse = page.waitForResponse(r => r.url().endsWith('/api/v1/me/identity') && r.request().method() === 'PUT');
    await page.getByRole('button', { name: 'Lưu hồ sơ danh tính', exact: true }).click();expect((await updatedResponse).status()).toBe(200);
    await expect(page.getByRole('button', { name: 'Lưu hồ sơ danh tính', exact: true })).toBeEnabled();await expect(page.getByRole('status')).toContainText('Đã lưu hồ sơ.');
    await page.reload();await expect(page.locator('#identity-current')).toHaveValue('Địa chỉ sinh sống đã cập nhật');
    // Competing tab writes: the old version cannot silently overwrite it.
    const stale = await page.request.put('/api/v1/me/identity', { headers, multipart: { profile: { name: 'profile.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ legalName: metadata.legalName, documentNumber: metadata.documentNumber, dateOfBirth: metadata.dateOfBirth, issueDate: metadata.issueDate, issuePlace: metadata.issuePlace, permanentAddress: metadata.permanentAddress, currentAddress: 'Stale overwrite', version: metadata.version })) } } });
    expect(stale.status()).toBe(409);
    await page.setViewportSize({ width: 390, height: 844 });expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: 'test-results/visual/identity-mobile.png', fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1000 });await page.screenshot({ path: 'test-results/visual/identity-desktop.png', fullPage: true });
    expect(errors).toEqual([]);
  } finally {
    if (id) {
      const cleanup = spawnSync('powershell.exe', ['-NoProfile', '-File', resolve('../../ancu-proptech-backend/tools/identity-e2e-cleanup.ps1'), '-TestKey', key, '-AccountId', id], { encoding: 'utf8' });
      if (cleanup.status !== 0) throw new Error(`Identity fixture cleanup failed; IDs retained in manifest: ${cleanup.stderr}`);
      expect(JSON.parse(cleanup.stdout)).toEqual({ accountsRemaining: 0, profilesRemaining: 0, documentsRemaining: 0 });unlinkSync(manifest);
    }
  }
});

test('catalog shows every eligible VACANT apartment to guest', async ({ page }) => {
  const catalog = await (await page.request.get('/api/v1/apartments?size=100')).json();
  expect(catalog.items.every((item: { availability: string }) => item.availability === 'VACANT')).toBe(true);
  await page.goto('/');await expect(page.locator('.home-results [role=status]')).toHaveText(`${catalog.totalElements} căn hộ phù hợp`);
  const cards = page.getByTestId('apartment-card');
  // Current catalog is small enough for one page, but do not hardcode demo counts.
  await expect(cards).toHaveCount(Math.min(6, catalog.totalElements));
  for (const item of catalog.items.slice(0, 6)) await expect(page.locator(`.home-listings a[href="/apartments/${item.id}"]`).first()).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

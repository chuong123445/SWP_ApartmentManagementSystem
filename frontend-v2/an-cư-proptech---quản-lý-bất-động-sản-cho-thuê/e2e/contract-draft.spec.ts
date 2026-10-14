import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync, unlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';

test('isolated accepted-request wizard reuses stored parties/assets, persists editable clauses and exact Customer review', async ({ page, browser }) => {
  test.setTimeout(90000);
  const key = randomUUID(), propertyId = randomUUID(), name = `Rental E2E ${key}`, password = `Contract-test-${randomUUID()}!`;
  const ownerEmail = `rental-e2e-${key}-owner@example.invalid`, customerEmail = `rental-e2e-${key}-customer@example.invalid`;
  let ownerId = '00000000-0000-0000-0000-000000000000', customerId = ownerId;
  const ownerContext = await browser.newContext({ baseURL: test.info().project.use.baseURL });const ownerPage = await ownerContext.newPage();
  const pageErrors: string[] = [];page.on('pageerror', e => pageErrors.push(e.message));ownerPage.on('pageerror', e => pageErrors.push(e.message));
  const manifestDirectory = resolve('../../ancu-proptech-backend/target/rental-e2e-fixtures');mkdirSync(manifestDirectory, { recursive: true });
  const manifest = resolve(manifestDirectory, `${key}.json`);const persist = () => writeFileSync(manifest, JSON.stringify({ key, ownerId, customerId, propertyId, allowContractDrafts: true }));persist();
  const fixture = (mode: 'prepare' | 'cleanup') => {
    const result = spawnSync('powershell.exe', ['-NoProfile', '-File', resolve('../../ancu-proptech-backend/tools/rental-e2e-fixture.ps1'), '-Mode', mode, '-TestKey', key, '-OwnerId', ownerId, '-CustomerId', customerId, '-PropertyId', propertyId, '-AllowContractDrafts'], { encoding: 'utf8' });
    if (result.status !== 0) throw new Error(`Contract fixture ${mode} failed: ${result.stderr}`);return JSON.parse(result.stdout.trim());
  };
  const register = async (role: 'OWNER' | 'CUSTOMER', email: string) => {
    const csrf = await (await page.request.get('/api/v1/auth/csrf')).json();
    const r = await page.request.post('/api/v1/auth/register', { headers: { [csrf.headerName]: csrf.token }, data: { email, password, fullName: name, requestedRole: role } });
    expect(r.status()).toBe(201);return (await r.json()).id;
  };
  const login = async (p: Page, email: string) => {
    await p.goto('/login');await p.locator('#login-email').fill(email);await p.locator('#login-password').fill(password);
    const pending = p.waitForResponse(r => r.url().endsWith('/api/v1/auth/login') && r.request().method() === 'POST');await p.locator('button[type=submit]').click();
    const result = await (await pending).json();await expect(p.getByRole('button', { name: 'Vai trò và tài khoản' })).toBeVisible();return { Authorization: `Bearer ${result.accessToken}` };
  };
  try {
    ownerId = await register('OWNER', ownerEmail);persist();customerId = await register('CUSTOMER', customerEmail);persist();expect(fixture('prepare').prepared).toBe(true);
    const ownerHeaders = await login(ownerPage, ownerEmail);const customerHeaders = await login(page, customerEmail);
    const createApartment = async (number: string) => {
      const r = await ownerPage.request.post('/api/v1/owner/apartments', { headers: ownerHeaders, data: { propertyId, roomNumber: number, title: name, description: 'Contract isolated fixture', floor: 2, areaM2: '45.50', advertisedMonthlyRent: '5000000', bedrooms: 2, bathrooms: 1, amenities: ['Máy lạnh'], publicationStatus: 'PUBLISHED' } });
      expect(r.status()).toBe(201);return r.json();
    };
    const select = async (apartmentId: string, message: string) => {
      const r = await page.request.post(`/api/v1/apartments/${apartmentId}/rental-requests`, { headers: customerHeaders, data: { message } });expect(r.status()).toBe(201);const request = await r.json();
      const accept = await ownerPage.request.post(`/api/v1/owner/rental-requests/${request.id}/decisions`, { headers: ownerHeaders, data: { decision: 'ACCEPT', version: request.version } });expect(accept.status()).toBe(200);return accept.json();
    };
    const apartment = await createApartment('Contract.101');const accepted = await select(apartment.id, 'Wizard accepted selection');
    await ownerPage.reload();await ownerPage.locator('#nav-rental_requests').click();
    await ownerPage.getByTestId('rental-request').filter({ hasText: 'Wizard accepted selection' }).getByRole('button', { name: 'Tạo hợp đồng', exact: true }).click();
    const dialog = ownerPage.getByRole('dialog');await expect(dialog).toBeVisible();await expect(dialog).toContainText('Chung cư / Căn hộ');
    await dialog.getByRole('button', { name: 'Tiếp theo →', exact: true }).click();await expect(dialog).toContainText(ownerEmail);await expect(dialog).toContainText('0912345678');await expect(dialog).toContainText('Địa chỉ hồ sơ thử riêng');await expect(dialog).toContainText('1995-06-15');expect(await dialog.locator('input,textarea').count()).toBe(0);
    await dialog.getByRole('button', { name: 'Tiếp theo →', exact: true }).click();await expect(dialog).toContainText(customerEmail);await expect(dialog).toContainText('0912345678');expect(await dialog.locator('input,textarea').count()).toBe(0);
    await dialog.getByRole('button', { name: 'Tiếp theo →', exact: true }).click();await expect(dialog).toContainText('45.50');await expect(dialog).toContainText('Máy lạnh');
    await dialog.getByRole('button', { name: 'Tiếp theo →', exact: true }).click();await expect(dialog.getByRole('alert')).toContainText('Ngày kết thúc phải sau ngày bắt đầu');
    await dialog.getByLabel('Ngày bắt đầu', { exact: true }).fill('2026-11-01');await dialog.getByLabel('Ngày kết thúc', { exact: true }).fill('2027-11-01');
    await dialog.getByLabel('Tiền thuê mỗi tháng (VND)', { exact: true }).fill('5500000.50');await dialog.getByLabel('Tiền đặt cọc (VND)', { exact: true }).fill('10000000');
    await dialog.getByLabel('Đơn giá điện (VND/kWh)', { exact: true }).fill('3500');await dialog.getByLabel('Đơn giá nước (VND/m³)', { exact: true }).fill('15000');
    await dialog.getByRole('button', { name: 'Quay lại', exact: true }).click();await dialog.getByRole('button', { name: 'Tiếp theo →', exact: true }).click();await expect(dialog.getByLabel('Tiền thuê mỗi tháng (VND)', { exact: true })).toHaveValue('5500000.50');
    await dialog.getByRole('button', { name: 'Tiếp theo →', exact: true }).click();await expect(dialog.getByTestId('contract-clause')).toHaveCount(7);
    await dialog.getByLabel('Nội dung điều khoản 1', { exact: true }).fill('Bàn giao chìa khóa và danh mục thiết bị có xác nhận hai bên.');
    await dialog.getByRole('button', { name: 'Thêm điều khoản', exact: true }).click();await dialog.getByLabel('Tiêu đề điều khoản 8', { exact: true }).fill('Điều khoản riêng của Owner');await dialog.getByLabel('Nội dung điều khoản 8', { exact: true }).fill('Không hút thuốc trong căn hộ.');
    await dialog.getByRole('button', { name: 'Đưa điều khoản 8 lên', exact: true }).click();await expect(dialog.getByLabel('Tiêu đề điều khoản 7', { exact: true })).toHaveValue('Điều khoản riêng của Owner');
    await dialog.getByRole('button', { name: 'Xóa điều khoản 8', exact: true }).click();await expect(dialog.getByTestId('contract-clause')).toHaveCount(7);
    await ownerPage.setViewportSize({ width: 390, height: 844 });await dialog.screenshot({ path: 'test-results/visual/contract-wizard-owner-mobile.png' });
    const box = await dialog.boundingBox();expect(box!.x + box!.width).toBeLessThanOrEqual(390);expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await dialog.getByRole('button', { name: 'Tiếp theo →', exact: true }).click();await expect(dialog).toContainText('Không hút thuốc trong căn hộ.');await expect(dialog).toContainText(ownerEmail);await expect(dialog).toContainText(customerEmail);
    const saveResponse = ownerPage.waitForResponse(r => r.url().endsWith(`/rental-requests/${accepted.id}/contract`) && r.request().method() === 'POST');
    await dialog.getByRole('button', { name: 'Lưu bản nháp', exact: true }).click();const saved = await (await saveResponse).json();expect(saved.status).toBe('DRAFT');expect(saved.version).toBe(0);
    await expect(dialog.getByRole('status')).toContainText('Đã lưu bản nháp');await dialog.getByRole('button', { name: 'Đóng trình tạo hợp đồng' }).click();
    await ownerPage.setViewportSize({ width: 1440, height: 1000 });await ownerPage.reload();await ownerPage.locator('#nav-contracts').click();await expect(ownerPage.getByTestId('contract-draft-card')).toHaveCount(1);
    await ownerPage.getByRole('button', { name: 'Xem / sửa bản nháp', exact: true }).click();await expect(dialog).toContainText('Không hút thuốc trong căn hộ.');await expect(dialog).toContainText(saved.contractNumber);
    await dialog.getByRole('button', { name: 'Chỉnh sửa', exact: true }).click();await dialog.getByRole('button', { name: 'Tiếp theo →', exact: true }).click();
    ownerPage.once('dialog', d => d.accept());await dialog.getByRole('button', { name: 'Sử dụng điều khoản riêng', exact: true }).click();await expect(dialog.getByTestId('contract-clause')).toHaveCount(1);
    await dialog.getByLabel('Tiêu đề điều khoản 1', { exact: true }).fill('Thỏa thuận riêng đã rà soát');await dialog.getByLabel('Nội dung điều khoản 1', { exact: true }).fill('Bên A và Bên B thống nhất giữ gìn căn hộ và báo trước bằng văn bản khi có thay đổi.');
    await dialog.getByRole('button', { name: 'Tiếp theo →', exact: true }).click();await dialog.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();await expect(dialog.getByRole('status')).toContainText('Đã lưu bản nháp');await dialog.getByRole('button', { name: 'Đóng trình tạo hợp đồng' }).click();
    await page.goto('/my/contracts');await expect(page.getByTestId('contract-draft-card')).toHaveCount(1);await page.getByRole('link', { name: 'Rà soát hợp đồng →', exact: true }).click();await expect(page).toHaveURL(new RegExp(saved.id));await expect(page.getByText('Thỏa thuận riêng đã rà soát', { exact: false })).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });await page.screenshot({ path: 'test-results/visual/contract-customer-review-mobile.png', fullPage: true });expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const read = await ownerPage.request.get(`/api/v1/contracts/${saved.id}`, { headers: ownerHeaders });expect(read.status()).toBe(200);expect(read.headers()['cache-control']).toBe('no-store');
    const current = await read.json();expect(current.version).toBe(1);expect(current.clauses).toHaveLength(1);expect(current.snapshot.customer.id).toBe(customerId);
    const core = await (await ownerPage.request.get('/api/v1/owner/apartments', { headers: ownerHeaders })).json();expect(core.find((a: any) => a.id === apartment.id).availability).toBe('CONTRACT_IN_PROGRESS');
    // Actual two concurrent create commands on a fresh accepted selection.
    const second = await createApartment('Contract.102');const secondRequest = await select(second.id, 'Concurrent contract selection');
    const context = await (await ownerPage.request.get(`/api/v1/owner/rental-requests/${secondRequest.id}/contract-context`, { headers: ownerHeaders })).json();
    const terms = { startDate: '2026-11-01', endDate: '2027-11-01', monthlyRent: '5000000', electricityUnitPrice: '3500', waterUnitPrice: '15000', deposit: '0', paymentDay: 5, paymentMethod: 'Chuyển khoản', usagePurpose: 'Để ở', clauses: context.templateClauses };
    const command = { ...terms, requestVersion: context.requestVersion, sourceVersion: context.sourceVersion };
    const race = await Promise.all([1, 2].map(() => ownerPage.request.post(`/api/v1/owner/rental-requests/${secondRequest.id}/contract`, { headers: ownerHeaders, data: command })));
    expect(race.map(r => r.status()).sort()).toEqual([201, 409]);const raced = await race.find(r => r.status() === 201)!.json();
    const edits = await Promise.all(['Thỏa thuận A', 'Thỏa thuận B'].map(body => ownerPage.request.put(`/api/v1/owner/contracts/${raced.id}/draft`, { headers: ownerHeaders, data: { ...terms, clauses: [{ title: 'Phiên bản cạnh tranh', body }], version: 0 } })));
    expect(edits.map(r => r.status()).sort()).toEqual([200, 409]);
    const allDrafts = await (await ownerPage.request.get('/api/v1/owner/contract-drafts', { headers: ownerHeaders })).json();expect(allDrafts).toHaveLength(2);expect(pageErrors).toEqual([]);
  } finally {
    try { await ownerContext.close(); } finally { const result = fixture('cleanup');expect(result.accountsRemaining).toBe(0);expect(result.propertiesRemaining).toBe(0);unlinkSync(manifest); }
  }
});

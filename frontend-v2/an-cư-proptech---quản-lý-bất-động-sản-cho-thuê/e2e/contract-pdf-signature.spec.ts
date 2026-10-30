import { test, expect } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

// UI tests use synthetic data only; backend integration tests cover real authorization and PDF generation.
for (const role of ['OWNER', 'CUSTOMER'] as const) {
  test(`${role} can review a real PDF, draw and confirm only their own signature`, async ({ page }) => {
    if (role === 'CUSTOMER') await page.setViewportSize({ width: 390, height: 844 });
    const errors: string[] = [];page.on('pageerror', error => errors.push(error.message));
    let signed = false;
    const party = (id: string, fullName: string) => ({ id, fullName, email: `${id}@example.invalid`, phone: '0900000000', address: 'Địa chỉ kiểm thử', dateOfBirth: '1995-01-01', emailVerified: true, documentNumber: '999000000001' });
    const draft = () => ({ id: '42', rentalRequestId: '7', contractNumber: 'HD-42', status: 'DRAFT', version: 0, templateType: 'ROOM',
      startDate: '2026-11-01', endDate: '2027-11-01', monthlyRent: '6200000.50', deposit: '10000000', electricityUnitPrice: '3500', waterUnitPrice: '15000', paymentDay: 5, paymentMethod: 'Chuyển khoản', usagePurpose: 'Để ở', clauses: [{ title: 'Thỏa thuận', body: 'Nội dung kiểm thử' }], createdAt: '2026-10-28T00:00:00Z',
      snapshot: { owner: party('1', 'Chủ nhà kiểm thử'), customer: party('2', 'Khách thuê kiểm thử'), asset: { title: 'Phòng kiểm thử', roomNumber: 'P.101', address: 'Địa chỉ kiểm thử', amenities: [] }, receivingAccount: null },
      signing: { ownerAccountId: '1', customerAccountId: '2', contentHash: 'a'.repeat(64), state: signed ? role === 'OWNER' ? 'WAITING_CUSTOMER' : 'WAITING_OWNER' : 'UNSIGNED',
        ownerSignedAt: signed && role === 'OWNER' ? '2026-10-28T10:00:00Z' : null, customerSignedAt: signed && role === 'CUSTOMER' ? '2026-10-28T10:00:00Z' : null, ownerSignature: null, customerSignature: null } });
    const pdf = readFileSync(resolve('../../ancu-proptech-backend/target/contract-preview-unsigned.pdf'));
    await page.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname;
      const json = (body: unknown) => route.fulfill({ json: body });
      if (path.endsWith('/vneid-config')) return json({ enabled: false });
      if (path.endsWith('/csrf')) return json({ headerName: 'X-XSRF-TOKEN', token: 'ui-test' });
      if (path.endsWith('/refresh')) return json({ accessToken: 'ui-test-token', tokenType: 'Bearer', expiresIn: 900, user: { id: role === 'OWNER' ? '1' : '2', email: 'test@example.invalid', fullName: role === 'OWNER' ? 'Chủ nhà kiểm thử' : 'Khách thuê kiểm thử', roles: [role], accountStatus: 'ACTIVE', contactVerificationStatus: 'VERIFIED', version: 0 } });
      if (path.endsWith('/me/tenancies')) return json([]);
      if (path === '/api/v1/contracts/42') return json(draft());
      if (path.endsWith('/42/pdf')) return route.fulfill({ contentType: 'application/pdf', body: pdf });
      if (path.endsWith('/42/signatures')) {
        const body = route.request().postDataJSON();expect(body.version).toBe(0);expect(body.contentHash).toBe('a'.repeat(64));
        expect(body.consent).toBe(true);expect(body.signature).toMatch(/^data:image\/png;base64,/);expect(body).not.toHaveProperty('ownerId');expect(body).not.toHaveProperty('customerId');
        signed = true;return json(draft());
      }
      return route.fulfill({ status: 404, json: { message: `Unexpected fixture request: ${path}` } });
    });
    await page.goto('/contracts/42');
    await expect(page.getByRole('heading', { name: 'Xem và ký hợp đồng' })).toBeVisible();
    await expect(page.getByTitle('Bản PDF hợp đồng HD-42')).toBeVisible();
    await expect(page.getByRole('heading', { name: role === 'OWNER' ? 'Ký xác nhận · Bên cho thuê (Bên A)' : 'Ký xác nhận · Bên thuê (Bên B)' })).toBeVisible();
    const confirm = page.getByRole('button', { name: 'Xác nhận ký hợp đồng' });await expect(confirm).toBeDisabled();
    const pad = page.getByLabel('Khung vẽ chữ ký');await pad.scrollIntoViewIfNeeded();
    const bounds = (await pad.boundingBox())!;
    await page.mouse.move(bounds.x + 60, bounds.y + 100);await page.mouse.down();
    await page.mouse.move(bounds.x + 120, bounds.y + 45, { steps: 8 });await page.mouse.move(bounds.x + 180, bounds.y + 140, { steps: 8 });
    await page.mouse.move(bounds.x + 250, bounds.y + 65, { steps: 8 });await page.mouse.up();
    await expect(confirm).toBeDisabled();await page.getByRole('checkbox').check();await expect(confirm).toBeEnabled();
    mkdirSync('test-results/contract-visual', { recursive: true });
    await page.screenshot({ path: `test-results/contract-visual/${role.toLowerCase()}-signature.png` });
    await confirm.click();await expect(page.getByText('Đã lưu chữ ký của bạn vào hợp đồng.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Xác nhận ký hợp đồng' })).toHaveCount(0);
    await expect(page.getByText(role === 'OWNER' ? 'Chờ khách thuê ký' : 'Chờ chủ nhà ký', { exact: true })).toBeVisible();
    const download = page.waitForEvent('download');await page.getByRole('link', { name: 'Tải PDF', exact: true }).click();
    expect((await download).suggestedFilename()).toBe('HD-42.pdf');expect(errors).toEqual([]);
  });
}

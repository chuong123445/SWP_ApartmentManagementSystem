import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const party = (id: string, fullName: string) => ({ id, fullName, email: `${id}@example.invalid`, phone: '0900000000', address: 'Địa chỉ kiểm thử', dateOfBirth: '1995-01-01', emailVerified: true, documentNumber: '999000000001' });
function document() {
  return { id: '42', rentalRequestId: '7', contractNumber: 'HD-42', status: 'ACTIVE', version: 0, templateType: 'APARTMENT',
    startDate: '2025-10-01', endDate: '2026-09-30', monthlyRent: '6200000.50', deposit: '10000000', electricityUnitPrice: '3500', waterUnitPrice: '15000', paymentDay: 5, paymentMethod: 'Chuyển khoản', usagePurpose: 'Để ở', clauses: [{ title: 'Thỏa thuận', body: 'Nội dung kiểm thử' }], createdAt: '2025-09-28T00:00:00Z',
    snapshot: { owner: party('1', 'Chủ nhà kiểm thử'), customer: party('2', 'Khách thuê kiểm thử'), asset: { title: 'Phòng kiểm thử', roomNumber: 'P.101', address: 'Địa chỉ kiểm thử', amenities: [], areaM2: '40' }, receivingAccount: null },
    signing: { ownerAccountId: '1', customerAccountId: '2', contentHash: 'a'.repeat(64), state: 'SIGNED', ownerSignedAt: '2025-09-28T00:00:00Z', customerSignedAt: '2025-09-28T00:00:00Z', ownerSignature: null, customerSignature: null },
    lifecycle: { version: 3, expired: true, previousContractId: null as string | null, renewalContractId: null as string | null, endReason: null as string | null, handover: null as ReturnType<typeof handover> | null } };
}
function handover() { return { id: '8', version: 0, status: 'PENDING', returnDate: '2026-10-28', electricityReading: '215', waterReading: '55', electricityStartReading: '200', waterStartReading: '50', keysReturned: true, conditionNotes: 'Đã kiểm tra phòng và chìa khóa', depositAmount: '10000000', deductionAmount: '100000', utilityAmount: '127500', refundAmount: '9772500', extraAmountDue: '0', ownerConfirmedAt: '2026-10-28T10:00:00Z', customerConfirmedAt: null as string | null }; }

async function setup(page: Page, owner: boolean, mode: 'renewal' | 'handover' | 'confirm') {
  const old = document();if (mode === 'confirm') old.lifecycle.handover = handover();
  const pdf = readFileSync(resolve('../../ancu-proptech-backend/target/contract-preview-unsigned.pdf'));
  let renewalPosted = false;
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    const json = (body: unknown) => route.fulfill({ json: body });
    if (path.endsWith('/vneid-config')) return json({ enabled: false });
    if (path.endsWith('/csrf')) return json({ token: 'test', headerName: 'X-XSRF-TOKEN' });
    if (path.endsWith('/refresh')) return json({ accessToken: 'test-token', tokenType: 'Bearer', expiresIn: 900, user: { id: owner ? '1' : '2', fullName: 'Người kiểm thử', email: 'test@example.invalid', roles: [owner ? 'OWNER' : 'CUSTOMER'], accountStatus: 'ACTIVE', contactVerificationStatus: 'VERIFIED', version: 0 } });
    if (path.endsWith('/me/tenancies')) return json([]);
    if (path === '/api/v1/contracts/42') return json(old);
    if (path.endsWith('/pdf')) return route.fulfill({ contentType: 'application/pdf', body: pdf });
    if (path.endsWith('/renewal-context')) return json({ rentalRequestId: '7', requestVersion: 3, sourceVersion: 'b'.repeat(64), snapshot: old.snapshot, advertisedMonthlyRent: old.monthlyRent, suggestedDeposit: old.deposit, templateClauses: old.clauses, existingDraft: null });
    if (path.endsWith('/42/renewals')) {
      const body = route.request().postDataJSON();expect(body.requestVersion).toBe(3);expect(body.startDate).toBe('2026-10-01');expect(body.endDate).toBe('2027-09-30');expect(body).not.toHaveProperty('ownerSignature');
      renewalPosted = true;old.lifecycle.renewalContractId = '43';
      return json({ ...old, id: '43', contractNumber: 'HD-43', status: 'DRAFT', startDate: body.startDate, endDate: body.endDate,
        signing: { ...old.signing, state: 'UNSIGNED', ownerSignedAt: null, customerSignedAt: null }, lifecycle: { ...old.lifecycle, previousContractId: '42', renewalContractId: null, expired: false, version: 0 } });
    }
    if (path.endsWith('/42/handover')) {
      const body = route.request().postDataJSON();expect(body.version).toBe(3);expect(body.keysReturned).toBe(true);expect(body.consent).toBe(true);
      expect(body.electricityReading).toBe('215');expect(body.waterReading).toBe('55');old.lifecycle.handover = handover();return json(old);
    }
    if (path.endsWith('/42/handover/confirm')) {
      expect(route.request().postDataJSON()).toEqual({ version: 0, consent: true });old.status = 'ENDED';old.lifecycle.endReason = 'HANDOVER';
      old.lifecycle.handover!.status = 'CONFIRMED';old.lifecycle.handover!.customerConfirmedAt = '2026-10-28T11:00:00Z';return json(old);
    }
    return route.fulfill({ status: 404, json: { message: `Unexpected fixture: ${path}` } });
  });
  await page.goto('/contracts/42');await expect(page.getByRole('heading', { name: 'Hợp đồng đã hết hạn — chọn hướng xử lý' })).toBeVisible();
  return { renewalPosted: () => renewalPosted };
}

test('Owner renews an expired contract through the wizard with no copied signatures', async ({ page }) => {
  const state = await setup(page, true, 'renewal');await page.getByRole('button', { name: 'Tạo hợp đồng ký tiếp', exact: true }).click();
  const wizard = page.getByRole('dialog');await expect(wizard).toBeVisible();
  for (let index = 0; index < 3; index++) await wizard.getByRole('button', { name: 'Tiếp theo →', exact: true }).click();
  await expect(wizard.getByLabel('Ngày bắt đầu', { exact: true })).toHaveValue('2026-10-01');
  await wizard.getByLabel('Ngày kết thúc', { exact: true }).fill('2027-09-30');
  await wizard.getByRole('button', { name: 'Tiếp theo →', exact: true }).click();await wizard.getByRole('button', { name: 'Tiếp theo →', exact: true }).click();
  await wizard.getByRole('button', { name: 'Tạo hợp đồng PDF', exact: true }).click();
  await expect(wizard.getByTitle('Bản PDF hợp đồng HD-43')).toBeVisible();expect(state.renewalPosted()).toBe(true);
  await expect(wizard.getByText('Chờ hai bên ký', { exact: true })).toBeVisible();
});

test('Owner proposes handover without immediately ending tenancy', async ({ page }) => {
  await setup(page, true, 'handover');await page.getByRole('button', { name: 'Lập biên bản bàn giao', exact: true }).click();
  const form = page.getByRole('form', { name: 'Thông tin bàn giao' });
  await form.getByLabel('Chỉ số điện bàn giao', { exact: true }).fill('215');await form.getByLabel('Chỉ số nước bàn giao', { exact: true }).fill('55');
  await form.getByLabel('Khấu trừ khác theo thỏa thuận (đ)', { exact: true }).fill('100000');
  await form.getByLabel('Tình trạng phòng, tài sản và ghi chú đối soát', { exact: true }).fill('Đã kiểm tra phòng và chìa khóa');
  await form.getByRole('checkbox').nth(0).check();await form.getByRole('checkbox').nth(1).check();
  await form.getByRole('button', { name: 'Gửi bàn giao cho khách xác nhận' }).click();
  await expect(page.getByRole('heading', { name: 'Bàn giao · Chờ khách thuê xác nhận' })).toBeVisible();
  await expect(page.getByText('9.772.500 đ', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Xác nhận bàn giao và trả phòng' })).toHaveCount(0);
});

test('Tenant explicitly confirms handover before the contract ends', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });await setup(page, false, 'confirm');
  const confirm = page.getByRole('button', { name: 'Xác nhận bàn giao và trả phòng' });await expect(confirm).toBeDisabled();
  await page.getByRole('checkbox').check();await confirm.click();
  await expect(page.getByRole('heading', { name: 'Bàn giao · Đã xác nhận' })).toBeVisible();
  await expect(page.getByText('Hai bên đã xác nhận bàn giao;', { exact: false })).toBeVisible();
  await expect(confirm).toHaveCount(0);
});

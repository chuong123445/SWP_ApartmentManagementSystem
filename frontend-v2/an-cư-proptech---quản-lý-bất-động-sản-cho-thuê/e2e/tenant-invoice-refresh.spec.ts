import { test, expect } from '@playwright/test';

test('A newly signed tenant enters the invoice selector and tenant list without reloading the page', async ({ page }) => {
  let signed = false;
  let leaseReads = 0;
  const errors: string[] = [];page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    const json = (body: unknown) => route.fulfill({ json: body });
    if (path.endsWith('/vneid-config')) return json({ enabled: false });
    if (path.endsWith('/csrf')) return json({ headerName: 'X-XSRF-TOKEN', token: 'ui-test' });
    if (path.endsWith('/refresh')) return json({ accessToken: 'ui-test-token', tokenType: 'Bearer', expiresIn: 900,
      user: { id: '1', email: 'owner@example.invalid', fullName: 'Chủ nhà kiểm thử', roles: ['OWNER'], accountStatus: 'ACTIVE', contactVerificationStatus: 'VERIFIED', version: 0 } });
    if (path.endsWith('/owner/properties')) return json([{ id: '11', name: 'Tài sản kiểm thử', address: 'Địa chỉ kiểm thử', rentalMode: 'MULTI_UNIT', approvalStatus: 'APPROVED' }]);
    if (path.endsWith('/owner/apartments')) return json([{ id: '21', propertyId: '11', propertyName: 'Tài sản kiểm thử', ownerId: '1',
      version: 0, roomNumber: 'P.101', title: 'Căn hộ kiểm thử', areaM2: '40', advertisedMonthlyRent: '6000000', deposit: '10000000',
      electricityIndex: 200, waterIndex: 50, amenities: [], publicationStatus: 'PUBLISHED', availability: signed ? 'OCCUPIED' : 'CONTRACT_IN_PROGRESS', propertyApprovalStatus: 'APPROVED' }]);
    if (path.endsWith('/owner/tenancies')) {
      leaseReads++;
      if (!signed) return json([]);
      await new Promise(resolve => setTimeout(resolve, 500));
      return json([{ id: '42', apartmentId: '21', roomNumber: 'P.101', apartmentTitle: 'Căn hộ kiểm thử', propertyName: 'Tài sản kiểm thử',
        customerId: '2', customerName: 'Khách mới đã ký', customerEmail: 'tenant@example.invalid', status: 'ACTIVE', startDate: '2026-11-01', endDate: '2027-11-01', monthlyRent: '6000000', version: 0 }]);
    }
    if (path.endsWith('/owner/invoices')) return json({ items: [], page: 0, size: 20, totalPages: 0, totalElements: 0 });
    if (path.endsWith('/42/billing-context')) return json({ contractId: '42', apartmentId: '21', roomNumber: 'P.101', tenantName: 'Khách mới đã ký',
      period: '2026-11', monthlyRent: '6000000', electricityStartReading: '200', waterStartReading: '50', electricityUnitPrice: '3500', waterUnitPrice: '15000', baselineVersion: 0 });
    return route.fulfill({ status: 404, json: { message: `Unexpected fixture request: ${path}` } });
  });
  await page.goto('/app');await expect(page.locator('#nav-tenants')).toBeVisible();
  await expect.poll(() => leaseReads).toBeGreaterThan(0);
  await expect(page.getByRole('status', { name: 'Đang tải căn hộ...' })).toHaveCount(0);
  signed = true;
  await page.locator('#btn-header-quick-invoice').click();
  const modal = page.getByRole('dialog', { name: 'Lập hóa đơn' });await expect(modal).toBeVisible();
  await expect(modal.locator('#invoice-contract option', { hasText: 'Khách mới đã ký' })).toHaveCount(1);
  await expect(modal.locator('#invoice-contract')).toHaveValue('42');
  await expect(modal).toContainText('Điện đầu: 200');await expect(modal.locator('#btn-create-send-invoice')).toBeEnabled();
  await modal.getByRole('button', { name: 'Hủy', exact: true }).click();
  await page.locator('#nav-tenants').click();await expect(page.getByText('Khách mới đã ký', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

import { test, expect } from '@playwright/test';

for (const width of [1440, 390]) test('Chủ nhận tiền mặt, hóa đơn hết nợ và khách xem được ' + width, async ({ page }, info) => {
  await page.setViewportSize({ width, height: 960 });
  let owner = true;
  let paid = false;
  let attempts = 0;
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const invoice = {
    id: '91', contractId: '42', apartmentId: '21', customerId: '2', roomNumber: 'A.101', apartmentTitle: 'Phòng thử', tenantName: 'Khách thuê',
    kind: 'UTILITY', period: '2026-11', dueDate: '2026-11-30', status: 'SENT', version: 1,
    monthlyRent: '0', electricityStartReading: '100', electricityEndReading: '200', electricityQuantity: '100',
    electricityUnitPrice: '3500', electricityAmount: '350000', waterStartReading: '20', waterEndReading: '25',
    waterQuantity: '5', waterUnitPrice: '15000', waterAmount: '75000', waterBillingMode: 'METERED', occupantCount: 1,
    internetFee: '0', garbageFee: '0', maintenanceAmount: '200000',
    maintenanceCharges: [{ ticketId: '71', title: 'Sửa điều hòa', period: '2026-11', actualCost: '600000', ownerCost: '400000', customerCost: '200000' }],
    totalAmount: '625000', createdAt: '2026-11-01T01:00:00Z', sentAt: '2026-11-01T01:00:00Z',
  };
  const paidInvoice = () => ({ ...invoice, paymentStatus: paid ? 'PAID' : 'UNPAID', paidAt: paid ? new Date().toISOString() : null });
  await page.route('**/api/**', async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const json = (body: unknown) => route.fulfill({ json: body });
    if (path.endsWith('/refresh')) return json({ accessToken: 'fixture', tokenType: 'Bearer', expiresIn: 900, user: {
      id: owner ? '1' : '2', fullName: owner ? 'Chủ nhà' : 'Khách thuê', email: 'test@example.invalid', roles: owner ? ['OWNER'] : ['CUSTOMER'], accountStatus: 'ACTIVE', contactVerificationStatus: 'VERIFIED',
    } });
    if (path.endsWith('/csrf')) return json({ headerName: 'X-XSRF-TOKEN', token: 'test' });
    if (path.endsWith('/vneid-config')) return json({ enabled: false });
    if (path.endsWith('/notifications')) return json({ items: [], totalElements: 0, totalPages: 0, unreadCount: 0 });
    if (path.endsWith('/financial-summary')) return json({});
    if (path.endsWith('/owner/properties')) return json([{ id: '11', name: 'Tòa A', approvalStatus: 'APPROVED', rentalMode: 'MULTI_UNIT' }]);
    if (path.endsWith('/owner/apartments')) return json([{ id: '21', propertyId: '11', roomNumber: 'A.101', title: 'Phòng thử', areaM2: '30', advertisedMonthlyRent: '5000000', availability: 'OCCUPIED', propertyApprovalStatus: 'APPROVED', amenities: [] }]);
    if (path.endsWith('/tenancies')) return json([{ id: '42', apartmentId: '21', roomNumber: 'A.101', propertyName: 'Tòa A', customerName: 'Khách thuê', customerId: '2', status: 'ACTIVE', startDate: '2026-11-01', endDate: '2027-10-31', monthlyRent: '5000000' }]);
    if (path.endsWith('/invoices/91/cash-payment')) {
      expect(owner).toBe(true);
      const body = request.postDataJSON();
      expect(body.version).toBe(1);
      expect(body.transactionDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(body.amount).toBeUndefined();
      attempts++;
      if (attempts === 1) return route.fulfill({ status: 409, json: { message: 'Đã ghi nhận tiền chuyển đến. Cần đối soát trước khi xác nhận thu đủ bằng tiền mặt.' } });
      paid = true;
      return json({ invoiceId: '91', cashEntryId: '51', amount: '625000', paidAt: new Date().toISOString() });
    }
    if (path.endsWith('/invoices/91/payment')) return json({ status: paid ? 'PAID' : 'NOT_CONFIGURED', paymentMethod: paid ? 'CASH' : 'BANK_TRANSFER', amount: '625000', paidAt: paid ? new Date().toISOString() : null, qrUrl: null });
    if (path.endsWith('/owner/invoices/additional')) return json({ items: [], totalElements: 0, totalPages: 0 });
    if (path.endsWith('/owner/invoices') || path.endsWith('/me/invoices')) return json({ items: [paidInvoice()], totalElements: 1, totalPages: 1 });
    if (path.endsWith('/invoices/91')) return json(paidInvoice());
    if (path.endsWith('/maintenance-tickets')) return json({ items: [], totalElements: 0, totalPages: 0 });
    return json([]);
  });
  await page.goto('/app?tab=invoices');
  await page.locator('[data-invoice-id="91"]').getByRole('button', { name: 'Chi tiết', exact: true }).click();
  const modal = page.getByRole('dialog', { name: 'Chi tiết hóa đơn', exact: true });
  await modal.getByRole('button', { name: 'Đã nhận tiền mặt', exact: true }).click();
  const form = modal.getByRole('form', { name: 'Xác nhận thu tiền mặt' });
  await expect(form).toContainText('625.000 đ');
  await form.getByRole('button', { name: 'Xác nhận đã nhận đủ tiền', exact: true }).click();
  expect(attempts).toBe(0);
  await form.getByRole('checkbox').check();
  await form.getByRole('button', { name: 'Xác nhận đã nhận đủ tiền', exact: true }).click();
  await expect(form.getByRole('alert')).toContainText('Cần đối soát');
  await form.getByRole('button', { name: 'Xác nhận đã nhận đủ tiền', exact: true }).click();
  await expect(modal.getByRole('region', { name: 'Thanh toán hóa đơn' })).toContainText('Đã thanh toán bằng tiền mặt');
  await expect(modal.getByRole('button', { name: 'Đã nhận tiền mặt', exact: true })).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('chu-nha-nhan-tien-mat.png'), fullPage: true });
  await modal.getByRole('button', { name: 'Đóng', exact: true }).click();
  await expect(page.locator('[data-invoice-id="91"]')).toContainText('Đã thanh toán');
  owner = false;
  await page.goto('/my/invoices/91');await page.reload();
  await expect(page.getByRole('region', { name: 'Thanh toán hóa đơn' })).toContainText('Đã thanh toán bằng tiền mặt');
  await expect(page.getByRole('button', { name: 'Đã nhận tiền mặt', exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

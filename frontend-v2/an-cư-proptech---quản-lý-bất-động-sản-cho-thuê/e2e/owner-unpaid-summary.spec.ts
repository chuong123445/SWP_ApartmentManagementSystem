import { test, expect } from '@playwright/test';

for (const width of [1440, 390]) {
  test(`Owner unpaid badge uses full-scope summary at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = []; const unexpected: string[] = [];
    let count = 25;
    const invoice = (id: string, paid: boolean) => ({ id, contractId: '10', apartmentId: '17', customerId: '2', roomNumber: 'B.101', apartmentTitle: 'Căn mẫu', tenantName: 'Người thuê mẫu', period: '2026-11', dueDate: '2026-11-10', monthlyRent: '1000000', electricityStartReading: '0', electricityEndReading: '0', electricityQuantity: '0', electricityUnitPrice: '0', electricityAmount: '0', waterStartReading: '0', waterEndReading: '0', waterQuantity: '0', waterUnitPrice: '0', waterAmount: '0', totalAmount: '1000000', status: 'SENT', paymentStatus: paid ? 'PAID' : 'UNPAID', paidAt: paid ? '2026-11-02T00:00:00Z' : null, createdAt: '2026-11-01T00:00:00Z', version: 0 });
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/**', async route => {
      const url = new URL(route.request().url()); const path = url.pathname;
      const json = (body: unknown) => route.fulfill({ json: body });
      if (path.endsWith('/csrf')) return json({ token: 'fixture', headerName: 'X-XSRF-TOKEN' });
      if (path.endsWith('/vneid-config')) return json({ enabled: false });
      if (path.endsWith('/refresh')) return json({ accessToken: 'fixture', user: { id: '3', fullName: 'Chủ nhà mẫu', roles: ['OWNER'], accountStatus: 'ACTIVE', contactVerificationStatus: 'VERIFIED', version: 0 } });
      if (path.endsWith('/me/notifications')) return json({ items: [], page: 0, totalPages: 0, totalElements: 0, unreadCount: 0 });
      if (path.endsWith('/owner/properties')) return json([{ id: '2', name: 'Tài sản mẫu', approvalStatus: 'APPROVED' }, { id: '3', name: 'Tài sản khác', approvalStatus: 'APPROVED' }]);
      if (path.endsWith('/owner/apartments')) return json([{ id: '17', propertyId: '2', propertyName: 'Tài sản mẫu', roomNumber: 'B.101', title: 'Căn mẫu', availability: 'OCCUPIED', areaM2: '45', advertisedMonthlyRent: '1000000', amenities: [], version: 0 }]);
      if (path.endsWith('/owner/tenancies') || path.endsWith('/me/tenancies') || path.endsWith('/owner/maintenance-tickets')) return json([]);
      if (path.endsWith('/owner/invoices/summary')) return json({ unpaidCount: url.searchParams.get('propertyId') === '3' ? 4 : count });
      if (path.endsWith('/owner/invoices')) return json({ items: url.searchParams.get('page') === '1' ? [invoice('2', true)] : [invoice('1', true), invoice('3', false)], page: Number(url.searchParams.get('page') || 0), size: 20, totalPages: 2, totalElements: 26 });
      unexpected.push(path); return route.fulfill({ status: 404, json: { message: 'Unexpected fixture' } });
    });
    await page.goto('/app?tab=invoices&propertyId=2');
    await expect(page.getByRole('heading', { name: 'Hóa đơn người thuê', exact: true })).toBeVisible();
    if (width === 390) await page.getByRole('button', { name: 'Menu quản lý', exact: true }).click();
    await expect(page.getByText('25 nợ', { exact: true })).toBeVisible();
    if (width === 390) await page.getByRole('button', { name: 'Đóng menu quản lý', exact: true }).click({ position: { x: width - 10, y: 20 } });
    await page.getByRole('button', { name: 'Trang sau', exact: true }).click();
    await expect(page.getByText('Trang 2 / 2', { exact: true })).toBeVisible();
    count = 0;
    await page.getByRole('button', { name: 'Làm mới', exact: true }).click();
    if (width === 390) await page.getByRole('button', { name: 'Menu quản lý', exact: true }).click();
    await expect(page.getByText('25 nợ', { exact: true })).toHaveCount(0);
    await page.getByRole('combobox', { name: 'Tài sản đang chọn' }).selectOption('3');
    if (width === 390 && await page.getByRole('button', { name: 'Menu quản lý', exact: true }).getAttribute('aria-expanded') === 'false') await page.getByRole('button', { name: 'Menu quản lý', exact: true }).click();
    await expect(page.getByText('4 nợ', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    expect(errors).toEqual([]); expect(unexpected).toEqual([]);
  });
}

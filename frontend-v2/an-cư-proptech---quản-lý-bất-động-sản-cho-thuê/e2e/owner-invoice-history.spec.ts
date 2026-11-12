import { ownerSummaryFixture } from './fixtures/ownerSummary';
import { test, expect } from '@playwright/test';

for (const width of [1440, 390]) for (const scenario of ['history', 'pagination', 'monthly-error', 'receipt-error', 'refresh', 'scope']) {
  test(`Owner paid history ${scenario} at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [], unexpected: string[] = [], consoleErrors: string[] = [], reads: string[] = [], writes: string[] = [];
    let newlyPaid = false;
    const monthly = (id: string, paymentStatus: string, status = 'SENT') => ({ id, contractId: '4', apartmentId: '17', customerId: '2', roomNumber: 'B.101', apartmentTitle: 'Căn mẫu', tenantName: 'Người thuê mẫu', period: '2026-10', dueDate: '2026-11-05', monthlyRent: '5000000', totalAmount: '5100000', electricityStartReading: '0', electricityEndReading: '10', electricityQuantity: '10', electricityUnitPrice: '3500', electricityAmount: '35000', waterStartReading: '0', waterEndReading: '5', waterQuantity: '5', waterUnitPrice: '13000', waterAmount: '65000', status, paymentStatus, paidAt: paymentStatus === 'PAID' ? '2026-11-03T01:00:00Z' : null, createdAt: '2026-11-01T00:00:00Z', version: 0 });
    const receipt = (id: string, status = 'PAID') => ({ id, contractId: '4', tenantName: 'Người thuê mẫu', roomNumber: 'B.101', ownerName: 'Chủ nhà mẫu', createdAt: '2026-11-01T00:00:00Z', payment: { status, amount: '10000', paymentCode: `REF-${id}`, paidAt: status === 'PAID' ? '2026-11-03T01:00:00Z' : null, bank: null, accountNumber: null, accountHolderName: null, qrUrl: null } });
    const paged = (items: unknown[], number = 0, totalElements = items.length, totalPages = 1) => ({ items, page: number, size: 20, totalElements, totalPages });
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error' && !message.text().includes('503')) consoleErrors.push(message.text()); });
    await page.route('**/api/**', async route => {
      const req = route.request(), url = new URL(req.url()), path = url.pathname;
      const json = (body: unknown) => route.fulfill({ json: body });
      if (path.endsWith('/csrf')) return json({ token: 'fixture', headerName: 'X-XSRF-TOKEN' });
      if (path.endsWith('/vneid-config')) return json({ enabled: false });
      if (path.endsWith('/refresh')) return json({ accessToken: 'fixture', user: { id: '3', fullName: 'Chủ nhà mẫu', roles: ['OWNER'], accountStatus: 'ACTIVE', contactVerificationStatus: 'VERIFIED', version: 0 } });
      if (req.method() !== 'GET') writes.push(`${req.method()} ${path}`);
      if (path.endsWith('/me/notifications')) return json({ ...paged([]), unreadCount: 0 });
      const summary = ownerSummaryFixture(route); if (summary) return summary;
      if (path.endsWith('/owner/properties')) return json([{ id: '2', name: 'Tài sản A', approvalStatus: 'APPROVED' }, { id: '3', name: 'Tài sản B', approvalStatus: 'APPROVED' }]);
      if (path.endsWith('/owner/apartments')) return json([{ id: '17', propertyId: '2', propertyName: 'Tài sản A', roomNumber: 'B.101', title: 'Căn mẫu', availability: 'OCCUPIED', areaM2: '45', advertisedMonthlyRent: '5000000', amenities: [], version: 0 }]);
      if (path.endsWith('/owner/tenancies') || path.endsWith('/owner/maintenance-tickets')) return json([]);
      if (path.endsWith('/owner/invoices')) {
        reads.push(url.search);if (scenario === 'monthly-error') return route.fulfill({ status: 503, json: { message: 'Lỗi tải hóa đơn tháng' } });
        const filter = url.searchParams.get('filter') ?? 'ALL';
        return json(paged(url.searchParams.get('propertyId') === '3' ? [] : filter === 'DRAFT' ? [monthly('draft', 'UNPAID', 'DRAFT')] : filter === 'PAID' ? [monthly('paid', 'PAID')] : filter === 'UNPAID' ? [monthly('unpaid', 'UNPAID')] : [monthly('paid', 'PAID'), monthly('unpaid', 'UNPAID')]));
      }
      if (path.endsWith('/owner/invoices/additional')) {
        reads.push(url.search);if (scenario === 'receipt-error') return route.fulfill({ status: 503, json: { message: 'Lỗi tải phiếu thanh toán' } });
        const filter = url.searchParams.get('paymentStatus'), number = Number(url.searchParams.get('page'));
        return json(paged(url.searchParams.get('propertyId') === '3' ? [] : filter === 'UNPAID' ? (newlyPaid ? [] : [receipt('new', 'UNPAID')]) : [receipt(number === 1 ? 'old' : newlyPaid ? 'new' : 'paid')], number, scenario === 'pagination' ? 21 : 1, scenario === 'pagination' ? 2 : 1));
      }
      if (path.includes('/owner/invoices/additional/')) return json(receipt(path.split('/').pop()!));
      unexpected.push(`${req.method()} ${path}`);return route.fulfill({ status: 404 });
    });
    await page.goto('/app?tab=invoices&propertyId=2');
    const invoices = page.getByRole('region', { name: 'Quản lý hóa đơn', exact: true });
    const receipts = page.getByRole('region', { name: 'Phiếu thanh toán gửi người thuê', exact: true });
    if (scenario === 'monthly-error') {
      await expect(page.getByRole('alert')).toContainText('Lỗi tải hóa đơn tháng');await expect(page.locator('[data-receipt-id="paid"]')).toBeVisible();
    } else if (scenario === 'receipt-error') {
      await expect(page.getByRole('alert')).toContainText('Lỗi tải phiếu thanh toán');await expect(page.locator('[data-invoice-id="paid"]')).toBeVisible();
      await expect(receipts.getByText('Không có phiếu gửi người thuê phù hợp với bộ lọc.', { exact: true })).toHaveCount(0);
    } else {
      await expect(page.locator('[data-invoice-id="paid"]')).toBeVisible();await expect(page.locator('[data-receipt-id="paid"]')).toBeVisible();
      if (scenario === 'refresh') {
        await invoices.getByRole('button', { name: 'Chưa thanh toán', exact: true }).click();await expect(page.locator('[data-receipt-id="new"]')).toBeVisible();
        newlyPaid = true;await page.evaluate(() => window.dispatchEvent(new Event('focus')));await expect(page.locator('[data-receipt-id="new"]')).toHaveCount(0);
      }
      await invoices.getByRole('button', { name: 'Đã thanh toán', exact: true }).click();
      await expect(page.locator('[data-invoice-id="unpaid"]')).toHaveCount(0);await expect(page.locator('[data-invoice-id="paid"]')).toBeVisible();
      await expect(page.locator(`[data-receipt-id="${newlyPaid ? 'new' : 'paid'}"]`)).toBeVisible();
      if (scenario === 'pagination') {
        await receipts.getByRole('button', { name: 'Trang sau', exact: true }).click();await expect(page.locator('[data-receipt-id="old"]')).toBeVisible();
        await expect(page.locator('[data-invoice-id="paid"]')).toBeVisible();
      } else if (scenario === 'history') {
        await page.getByRole('button', { name: 'Xem phiếu #paid', exact: true }).click();const modal = page.getByRole('dialog');
        await expect(modal.getByText('REF-paid', { exact: true })).toBeVisible();await expect(modal.getByText('Đã thanh toán', { exact: true })).toBeVisible();
        await modal.getByRole('button', { name: 'Đóng', exact: true }).click();
        await invoices.getByRole('button', { name: 'Bản nháp', exact: true }).click();await expect(page.locator('[data-invoice-id="draft"]')).toBeVisible();await expect(receipts).toHaveCount(0);
        if (width === 390) await page.getByRole('button', { name: 'Menu quản lý', exact: true }).click();
        await page.getByRole('button', { name: 'Quản lý căn hộ', exact: true }).click();
        if (width === 390) await page.getByRole('button', { name: 'Menu quản lý', exact: true }).click();
        await page.getByRole('button', { name: /Hóa đơn & Thu/ }).click();
        await expect(invoices.getByRole('button', { name: 'Bản nháp', exact: true })).toHaveAttribute('aria-pressed', 'true');
        await expect(page.locator('[data-invoice-id="draft"]')).toBeVisible();
      } else if (scenario === 'scope') {
        if (width === 390) await page.getByRole('button', { name: 'Menu quản lý', exact: true }).click();
        await page.locator('#select-building-sidebar').selectOption('3');
        await expect(page.locator('[data-receipt-id="paid"]')).toHaveCount(0);await expect(page.locator('[data-invoice-id="paid"]')).toHaveCount(0);
        await expect(invoices.getByRole('button', { name: 'Đã thanh toán', exact: true })).toHaveAttribute('aria-pressed', 'true');
      }
    }
    expect(reads.some(query => query.includes('filter=PAID')) || scenario.includes('error')).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    expect(errors).toEqual([]);expect(unexpected).toEqual([]);expect(consoleErrors).toEqual([]);expect(writes).toEqual([]);
  });
}

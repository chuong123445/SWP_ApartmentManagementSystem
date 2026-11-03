import { test, expect } from '@playwright/test';

for (const width of [1440, 390]) for (const scenario of ['empty', 'paid', 'monthly', 'additional', 'multiple', 'guest', 'error']) {
  test(`Home unpaid notice ${scenario} at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];const unexpected: string[] = [];const privateReads: string[] = [];const writes: string[] = [];
    const payment = { status: scenario === 'paid' ? 'PAID' : 'UNPAID', amount: '1000', bank: 'Ngân hàng mẫu', accountNumber: '000000', accountHolderName: 'CHU NHA MAU', paymentCode: 'SAMPLE', qrUrl: null, paidAt: null };
    const invoice = { id: '50', contractId: '4', apartmentId: '17', customerId: '2', roomNumber: 'KHONG-HIEN-PHONG', apartmentTitle: 'Không hiển thị căn hộ tại banner', tenantName: 'Khách mẫu', period: '2026-11', dueDate: '2026-11-12', monthlyRent: '8500000', totalAmount: '8500000', status: 'SENT', paymentStatus: scenario === 'paid' ? 'PAID' : 'UNPAID', electricityStartReading: '1000', electricityEndReading: '1000', electricityQuantity: '0', electricityUnitPrice: '3500', electricityAmount: '0', waterStartReading: '100', waterEndReading: '100', waterQuantity: '0', waterUnitPrice: '30000', waterAmount: '0' };
    const receipt = { id: '8', contractId: '4', roomNumber: 'KHONG-HIEN-PHONG', ownerName: 'Chủ nhà mẫu', tenantName: 'Khách mẫu', createdAt: '2026-11-02T00:00:00Z', payment };
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://images.unsplash.com/**', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>' }));
    await page.route('**/api/**', async route => {
      const url = new URL(route.request().url());const path = url.pathname;const json = (body: unknown) => route.fulfill({ json: body });
      if (route.request().method() !== 'GET' && !path.endsWith('/refresh')) writes.push(path);
      if (path.endsWith('/csrf')) return json({ token: 'fixture', headerName: 'X-XSRF-TOKEN' });
      if (path.endsWith('/vneid-config')) return json({ enabled: false });
      if (path.endsWith('/refresh')) return scenario === 'guest' ? route.fulfill({ status: 401, json: { message: 'No session' } }) : json({ accessToken: 'fixture', user: { id: '2', fullName: 'Khách mẫu', roles: ['CUSTOMER'], accountStatus: 'ACTIVE', contactVerificationStatus: 'VERIFIED', version: 0 } });
      if (path.endsWith('/me/tenancies')) return json([]);
      if (path.endsWith('/me/notifications')) return json({ items: [], page: 0, totalPages: 0, totalElements: 0, unreadCount: 0 });
      if (path.endsWith('/apartments/address-options')) return json([]);
      if (path === '/api/v1/apartments') return json({ items: [], page: 0, totalPages: 0, totalElements: 0 });
      if (path.endsWith('/me/invoices')) {
        privateReads.push(path);expect(url.searchParams.get('paymentStatus')).toBe('UNPAID');
        if (scenario === 'error') return route.fulfill({ status: 500, json: { message: 'Không tải được hóa đơn' } });
        const items = ['monthly', 'multiple', 'paid'].includes(scenario) ? [invoice] : [];
        return json({ items, page: 0, size: 20, totalElements: items.length, totalPages: items.length ? 1 : 0 });
      }
      if (path.endsWith('/me/payments/sepay/test-payments')) {
        privateReads.push(path);expect(url.searchParams.get('paymentStatus')).toBe('UNPAID');return json(['additional', 'multiple', 'paid'].includes(scenario) ? [receipt] : []);
      }
      if (path === '/api/v1/invoices/50') return json(invoice);
      if (path === '/api/v1/invoices/50/payment') return json(payment);
      if (path === '/api/v1/me/payments/sepay/test-payments/8') return json(receipt);
      unexpected.push(path);return route.fulfill({ status: 404, json: { message: `Unexpected fixture: ${path}` } });
    });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Tìm căn hộ cho thuê phù hợp với bạn', exact: true })).toBeVisible();
    const notice = page.getByRole('region', { name: 'Hóa đơn chưa thanh toán', exact: true });
    if (['monthly', 'additional', 'multiple'].includes(scenario)) {
      await expect(notice).toBeVisible();
      await expect(notice.getByText('KHONG-HIEN-PHONG', { exact: false })).toHaveCount(0);
      await expect(notice.getByText('8.500.000', { exact: false })).toHaveCount(0);
      const path = scenario === 'monthly' ? '/my/invoices/50' : scenario === 'additional' ? '/my/invoices/additional/8' : '/my/invoices';
      await expect(notice.getByRole('link', { name: 'Thanh toán ngay', exact: true })).toHaveAttribute('href', path);
      await notice.getByRole('link', { name: 'Thanh toán ngay', exact: true }).click();
      await expect(page).toHaveURL(new RegExp(path + '$'));
      if (scenario === 'multiple') await expect(page.getByLabel('Trạng thái thanh toán', { exact: true })).toHaveValue('UNPAID');
      else await expect(page.getByRole('heading', { name: 'Thanh toán hóa đơn', exact: true })).toBeVisible();
    } else {
      if (scenario !== 'guest') await expect.poll(() => new Set(privateReads).size).toBe(2);
      await expect(notice).toHaveCount(0);
      await expect(page.getByText('Căn hộ đang thuê & hóa đơn', { exact: true })).toHaveCount(0);
      await expect(page.getByText('Chưa có hóa đơn được Owner gửi.', { exact: true })).toHaveCount(0);
      if (scenario === 'guest') expect(privateReads).toEqual([]);
    }
    expect(writes).toEqual([]);expect(unexpected).toEqual([]);expect(errors).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

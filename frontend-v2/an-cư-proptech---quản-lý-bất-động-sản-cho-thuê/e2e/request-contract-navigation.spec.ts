import { test, expect } from '@playwright/test';

for (const width of [1440, 390]) {
  for (const entry of ['action', 'title']) {
    test(`customer opens hidden-unit contract using ${entry} at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      const errors: string[] = [];
      const apartmentCalls: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/api/**', async route => {
        const path = new URL(route.request().url()).pathname;
        const json = (body: unknown) => route.fulfill({ json: body });
        if (path.endsWith('/csrf')) return json({ token: 'fixture', headerName: 'X-XSRF-TOKEN' });
        if (path.endsWith('/vneid-config')) return json({ enabled: false });
        if (path.endsWith('/refresh')) return json({ accessToken: 'fixture', user: { id: '2', fullName: 'Hữu Hà', roles: ['CUSTOMER'], accountStatus: 'ACTIVE', contactVerificationStatus: 'VERIFIED', version: 0 } });
        if (path.endsWith('/me/tenancies') || path.endsWith('/me/contract-drafts')) return json([]);
        if (path.endsWith('/me/notifications')) return json({ items: [], page: 0, totalPages: 0, totalElements: 0, unreadCount: 0 });
        if (path.endsWith('/me/rental-requests')) return json({ items: [
          { id: '39', apartmentId: '16', apartmentTitle: 'HH205.TEST', address: 'Địa chỉ mẫu', advertisedMonthlyRent: '8500000', status: 'ACCEPTED', message: 'Mẫu hết hạn', createdAt: '2026-11-02T00:00:00Z', version: 0, contractId: '4', contractCompleted: true },
          { id: '40', apartmentId: '17', apartmentTitle: 'Chưa có hợp đồng', address: 'Địa chỉ mẫu', advertisedMonthlyRent: '5000000', status: 'PENDING', message: '', createdAt: '2026-11-02T00:00:00Z', version: 0, contractId: null, contractCompleted: false },
        ], page: 0, totalPages: 1, totalElements: 2 });
        if (path.startsWith('/api/v1/apartments/')) { apartmentCalls.push(path); return route.fulfill({ status: 404, json: { message: 'Không tìm thấy căn hộ đang được đăng công khai.' } }); }
        if (path === '/api/v1/contracts/4') return json({ id: '4', contractNumber: 'HD-4', status: 'ACTIVE', version: 0, startDate: '2026-05-01', endDate: '2026-10-31', monthlyRent: '8500000', deposit: '2000000', clauses: [], snapshot: { owner: { id: '3', fullName: 'Chủ nhà mẫu' }, customer: { id: '2', fullName: 'Hữu Hà' }, asset: { title: 'HH205.TEST', amenities: [] } }, signing: { state: 'SIGNED', contentHash: 'fixture', ownerAccountId: '3', customerAccountId: '2', ownerSignedAt: '2026-10-30T00:00:00Z', customerSignedAt: '2026-10-30T00:00:00Z' }, lifecycle: { expired: true, version: 0, handover: null, renewalContractId: null } });
        if (path.endsWith('/contracts/4/pdf')) return route.fulfill({ contentType: 'application/pdf', body: '%PDF-1.4\n%%EOF' });
        return route.fulfill({ status: 404, json: { message: `Unexpected fixture: ${path}` } });
      });
      await page.goto('/my/rental-requests');
      const card = page.getByTestId('rental-request').filter({ hasText: 'HH205.TEST' });
      await expect(card.getByRole('link', { name: 'Xem hợp đồng', exact: true })).toHaveAttribute('href', '/contracts/4');
      await expect(page.getByRole('link', { name: 'Chưa có hợp đồng', exact: true })).toHaveAttribute('href', '/apartments/17');
      await card.getByRole('link', { name: entry === 'action' ? 'Xem hợp đồng' : 'HH205.TEST', exact: true }).click();
      await expect(page).toHaveURL(/\/contracts\/4$/);
      await expect(page.getByRole('heading', { name: 'Hợp đồng PDF · HD-4', exact: true })).toBeVisible();
      await expect(page.getByText('Chờ chủ nhà tạo hợp đồng ký tiếp hoặc biên bản bàn giao.', { exact: false })).toBeVisible();
      await expect(page.getByRole('alert')).toHaveCount(0);
      expect(apartmentCalls).toEqual([]);
      expect(errors).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });
  }
}

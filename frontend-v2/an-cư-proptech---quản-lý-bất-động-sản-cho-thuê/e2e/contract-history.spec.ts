import { test, expect } from '@playwright/test';

for (const width of [1440, 390]) {
  for (const scenario of ['owner-history', 'legacy', 'ended', 'unknown', 'server-error']) {
    test(`contract history ${scenario} at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      const errors: string[] = [];
      const fallbackCalls: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      const lease = { id: '1', apartmentId: '10', roomNumber: 'T.101', apartmentTitle: 'Căn hộ cũ', propertyName: 'Tài sản mẫu', customerId: '2', customerName: 'Khách thuê mẫu', customerEmail: 'test@example.invalid', status: 'ACTIVE', startDate: '2026-05-01', endDate: '2026-10-31', monthlyRent: '5000000', version: 0 };
      const ended = scenario === 'ended';
      const draft = { id: '4', rentalRequestId: '39', contractNumber: 'HD-4', status: ended ? 'ENDED' : 'ACTIVE', version: 0, startDate: '2026-05-01', endDate: '2026-10-31', monthlyRent: '8500000', deposit: '2000000', clauses: [], snapshot: { owner: { id: '3', fullName: 'Chủ nhà mẫu' }, customer: { id: '2', fullName: 'Khách thuê mẫu' }, asset: { title: 'HH205.TEST', amenities: [] } }, signing: { state: 'SIGNED', contentHash: 'fixture', ownerAccountId: '3', customerAccountId: '2', ownerSignedAt: '2026-10-30T00:00:00Z', customerSignedAt: '2026-10-30T00:00:00Z' }, lifecycle: { expired: true, version: 0, handover: null, renewalContractId: null } };
      await page.route('**/api/**', async route => {
        const path = new URL(route.request().url()).pathname;
        const json = (body: unknown) => route.fulfill({ json: body });
        if (path.endsWith('/csrf')) return json({ token: 'fixture', headerName: 'X-XSRF-TOKEN' });
        if (path.endsWith('/vneid-config')) return json({ enabled: false });
        if (path.endsWith('/refresh')) return json({ accessToken: 'fixture', user: { id: '3', fullName: 'Chủ nhà mẫu', roles: ['OWNER'], accountStatus: 'ACTIVE', contactVerificationStatus: 'VERIFIED', version: 0 } });
        if (path.endsWith('/me/notifications')) return json({ items: [], page: 0, totalPages: 0, totalElements: 0, unreadCount: 0 });
        if (path.endsWith('/owner/tenancies')) { fallbackCalls.push(path);return json([lease]); }
        if (path.endsWith('/owner/apartments')) return json([{ id: '10', propertyId: '2', propertyName: 'Tài sản mẫu', roomNumber: 'T.101', title: 'Căn hộ cũ', availability: 'OCCUPIED', areaM2: '30', advertisedMonthlyRent: '5000000', amenities: [], version: 0 }]);
        if (path.endsWith('/owner/properties')) return json([{ id: '2', name: 'Tài sản mẫu', address: 'Địa chỉ mẫu', approvalStatus: 'APPROVED' }]);
        if (path.endsWith('/me/tenancies') || path.endsWith('/owner/apartments') || path.endsWith('/owner/properties') || path.endsWith('/owner/maintenance')) return json([]);
        if (path.endsWith('/owner/invoices')) return json({ items: [], totalPages: 0 });
        if (path.endsWith('/owner/contract-drafts')) return json([draft]);
        if (path === '/api/v1/contracts/4') return json(draft);
        if (path.endsWith('/contracts/4/pdf')) return route.fulfill({ contentType: 'application/pdf', body: '%PDF-1.4\n%%EOF' });
        if (path.startsWith('/api/v1/contracts/')) return route.fulfill({ status: scenario === 'server-error' ? 500 : 404, json: { message: scenario === 'server-error' ? 'Lỗi tải nội dung hợp đồng' : 'Không tìm thấy hợp đồng.' } });
        return route.fulfill({ status: 404, json: { message: `Unexpected fixture: ${path}` } });
      });
      if (scenario === 'owner-history') {
        await page.goto('/app?tab=contracts');
        const card = page.getByTestId('contract-draft-card');
        await expect(card.getByRole('link', { name: 'Xem hợp đồng →', exact: true })).toHaveAttribute('href', '/contracts/4');
        const row = page.getByRole('row').filter({ hasText: 'T.101' });
        await expect(row.getByText('Hết hạn — chờ xử lý', { exact: true })).toBeVisible();
        await row.getByRole('link', { name: 'Xem hồ sơ', exact: true }).click();
        await expect(page).toHaveURL(/\/contracts\/1$/);
      } else await page.goto(scenario === 'ended' ? '/contracts/4' : scenario === 'legacy' ? '/contracts/1' : '/contracts/999');
      if (scenario === 'legacy' || scenario === 'owner-history') {
        await expect(page.getByRole('region', { name: 'Hồ sơ quan hệ thuê cũ' })).toBeVisible();
        await expect(page.getByText('Hồ sơ cũ chỉ có thông tin quan hệ thuê.', { exact: false })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Tải PDF', exact: true })).toHaveCount(0);
      } else if (scenario === 'ended') {
        await expect(page.getByTitle('Bản PDF hợp đồng HD-4')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Xác nhận ký hợp đồng' })).toHaveCount(0);
        await expect(page.getByRole('button', { name: 'Tạo hợp đồng ký tiếp' })).toHaveCount(0);
      } else {
        await expect(page.getByRole('alert')).toHaveText(scenario === 'server-error' ? 'Lỗi tải nội dung hợp đồng' : 'Không tìm thấy hợp đồng.');
        await expect(page.getByRole('region', { name: 'Hồ sơ quan hệ thuê cũ' })).toHaveCount(0);
        if (scenario === 'server-error') expect(fallbackCalls).toEqual([]);
      }
      expect(errors).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });
  }
}

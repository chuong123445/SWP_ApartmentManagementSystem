import { test, expect } from '@playwright/test';

for (const width of [1440, 390]) {
  for (const scenario of ['tenant-request', 'owner-accept', 'owner-reject', 'owner-expired', 'owner-before-end', 'scheduled', 'stale']) {
    test(`renewal request ${scenario} at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      const errors: string[] = [];
      const unexpected: string[] = [];
      const tenant = scenario === 'tenant-request' || scenario === 'stale';
      const renewal = { id: '8', status: 'PENDING', version: 0, message: 'Muốn thuê tiếp', decision: null, decisionReason: null, createdAt: '2026-11-02T00:00:00Z', decidedAt: null };
      const doc = { id: '4', rentalRequestId: '39', contractNumber: 'HD-4', status: scenario === 'scheduled' ? 'DRAFT' : 'ACTIVE', version: 0, startDate: '2026-05-01', endDate: '2026-10-31', monthlyRent: '8500000', deposit: '2000000', clauses: [],
        snapshot: { owner: { id: '3', fullName: 'Chủ nhà mẫu' }, customer: { id: '2', fullName: 'Hữu Hà' }, asset: { title: 'HH205.TEST', amenities: [] } },
        signing: { state: 'SIGNED', contentHash: 'fixture', ownerAccountId: '3', customerAccountId: '2', ownerSignedAt: '2026-10-30T00:00:00Z', customerSignedAt: '2026-10-30T00:00:00Z' },
        lifecycle: { version: 3, expired: scenario !== 'owner-before-end', previousContractId: scenario === 'scheduled' ? '2' : null, renewalContractId: null, handover: null, renewalRequestAvailable: true, renewalRequestOpensOn: '2026-10-21', handoverAvailable: scenario === 'owner-expired', renewalRequest: scenario === 'owner-accept' || scenario === 'owner-reject' ? renewal : null } };
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/api/**', async route => {
        const path = new URL(route.request().url()).pathname;
        const json = (body: unknown) => route.fulfill({ json: body });
        if (path.endsWith('/csrf')) return json({ token: 'fixture', headerName: 'X-XSRF-TOKEN' });
        if (path.endsWith('/vneid-config')) return json({ enabled: false });
        if (path.endsWith('/refresh')) return json({ accessToken: 'fixture', user: { id: tenant ? '2' : '3', fullName: 'Người dùng mẫu', roles: [tenant ? 'CUSTOMER' : 'OWNER'], accountStatus: 'ACTIVE', contactVerificationStatus: 'VERIFIED', version: 0 } });
        if (path.endsWith('/me/tenancies')) return json([]);
        if (path.endsWith('/me/notifications')) return json({ items: [], page: 0, totalPages: 0, totalElements: 0, unreadCount: 0 });
        if (path === '/api/v1/contracts/4') return json(doc);
        if (path.endsWith('/contracts/4/pdf')) return route.fulfill({ contentType: 'application/pdf', body: '%PDF-1.4\n%%EOF' });
        if (path.endsWith('/4/renewal-request')) {
          expect(route.request().postDataJSON()).toEqual({ version: 3, consent: true, message: 'Muốn thuê tiếp' });
          if (scenario === 'stale') return route.fulfill({ status: 409, json: { message: 'Dữ liệu đã thay đổi. Hãy cập nhật trạng thái.' } });
          doc.lifecycle.renewalRequest = renewal;return json(doc);
        }
        if (path.endsWith('/4/renewal-request/decision')) {
          const body = route.request().postDataJSON();expect(body.version).toBe(0);
          if (scenario === 'owner-accept') { expect(body.decision).toBe('ACCEPT');doc.lifecycle.renewalRequest = { ...renewal, status: 'ACCEPTED', version: 1 }; }
          else { expect(body.decision).toBe('REJECT');expect(body.reason).toBe('Không tiếp tục cho thuê');doc.lifecycle.renewalRequest = { ...renewal, status: 'REJECTED', version: 1 };doc.lifecycle.handoverAvailable = true; }
          return json(doc);
        }
        unexpected.push(path);return route.fulfill({ status: 404, json: { message: `Unexpected fixture: ${path}` } });
      });
      await page.goto('/contracts/4');
      await expect(page.getByRole('heading', { name: 'Hợp đồng PDF · HD-4', exact: true })).toBeVisible();
      if (tenant) {
        const form = page.getByRole('form', { name: 'Gửi yêu cầu thuê tiếp', exact: true });
        await expect(form.getByRole('button', { name: 'Gửi yêu cầu thuê tiếp', exact: true })).toBeDisabled();
        await form.getByRole('textbox').fill('Muốn thuê tiếp');await form.getByRole('checkbox').check();
        await form.getByRole('button', { name: 'Gửi yêu cầu thuê tiếp', exact: true }).click();
        if (scenario === 'stale') await expect(page.getByRole('alert')).toHaveText('Dữ liệu đã thay đổi. Hãy cập nhật trạng thái.');
        else await expect(page.getByRole('heading', { name: 'Yêu cầu thuê tiếp · Chờ chủ nhà xử lý', exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Tạo hợp đồng ký tiếp', exact: true })).toHaveCount(0);
      } else if (scenario === 'owner-accept' || scenario === 'owner-reject') {
        await expect(page.getByRole('button', { name: 'Lập biên bản bàn giao', exact: true })).toHaveCount(0);
        await expect(page.getByRole('button', { name: 'Tạo hợp đồng ký tiếp', exact: true })).toHaveCount(0);
        await expect(page.getByRole('button', { name: 'Từ chối thuê tiếp', exact: true })).toBeDisabled();
        if (scenario === 'owner-reject') await page.getByLabel('Phản hồi (bắt buộc khi từ chối)', { exact: true }).fill('Không tiếp tục cho thuê');
        await page.getByRole('button', { name: scenario === 'owner-accept' ? 'Chấp nhận thuê tiếp' : 'Từ chối thuê tiếp', exact: true }).click();
        await expect(page.getByRole('button', { name: scenario === 'owner-accept' ? 'Tạo hợp đồng ký tiếp' : 'Lập biên bản bàn giao', exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: scenario === 'owner-accept' ? 'Lập biên bản bàn giao' : 'Tạo hợp đồng ký tiếp', exact: true })).toHaveCount(0);
      } else if (scenario === 'owner-expired') {
        await page.getByRole('button', { name: 'Lập biên bản bàn giao', exact: true }).click();
        await expect(page.getByRole('form', { name: 'Thông tin bàn giao' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Tạo hợp đồng ký tiếp', exact: true })).toHaveCount(0);
      } else {
        await expect(page.getByRole('button', { name: 'Lập biên bản bàn giao', exact: true })).toHaveCount(0);
        await expect(page.getByRole('button', { name: 'Tạo hợp đồng ký tiếp', exact: true })).toHaveCount(0);
        if (scenario === 'scheduled') {
          await expect(page.getByText('Đã ký — chờ chuyển kỳ thuê', { exact: true })).toBeVisible();
          await expect(page.getByRole('button', { name: 'Xác nhận ký hợp đồng', exact: true })).toHaveCount(0);
          await expect(page.getByRole('button', { name: 'Hủy bản ký tiếp', exact: true })).toHaveCount(0);
        }
      }
      expect(errors).toEqual([]);expect(unexpected).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });
  }
}

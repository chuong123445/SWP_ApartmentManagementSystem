import { test, expect } from '@playwright/test';

for (const width of [1440, 390]) {
  for (const scenario of ['filters', 'accept', 'reject', 'stale', 'draft', 'scope-keyboard']) {
    test(`Owner request inbox ${scenario} at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      const errors: string[] = [];const unexpected: string[] = [];const calls: string[] = [];
      const common = { apartmentId: '17', address: 'Địa chỉ mẫu', advertisedMonthlyRent: '8500000', customerId: '2', customerName: 'Hữu Hà', customerEmail: 'huuha205@example.invalid', message: 'Muốn thuê', createdAt: '2026-11-02T00:00:00Z', version: 0 };
      const ordinary = [
        { ...common, id: '31', apartmentTitle: 'Ứng viên mới', status: 'PENDING', contractId: null, contractCompleted: false },
        { ...common, id: '32', apartmentTitle: 'Đang chuẩn bị bản thuê', status: 'ACCEPTED', contractId: '42', contractCompleted: false },
        { ...common, id: '33', apartmentTitle: 'Đã ký đủ bản thuê', status: 'ACCEPTED', contractId: '43', contractCompleted: true },
      ];
      const renewalCommon = { apartmentId: '17', apartmentTitle: 'Căn mẫu thuê tiếp', roomNumber: 'HH205.D10', propertyId: '2', propertyName: 'Tài sản mẫu', customerName: 'Hữu Hà', customerEmail: 'huuha205@example.invalid', startDate: '2026-05-01', endDate: '2026-10-31', monthlyRent: '8500000', message: 'Tôi muốn thuê tiếp', decisionReason: null, createdAt: '2026-11-02T00:00:00Z', decidedAt: null, nextContractId: null, nextContractStatus: null };
      const renewals = [
        { ...renewalCommon, id: '8', contractId: '4', contractNumber: 'HD-4', version: 2, status: 'PENDING', nextContractId: null as string | null },
        { ...renewalCommon, id: '9', contractId: '5', contractNumber: 'HD-5', version: 1, status: 'ACCEPTED', nextContractId: null as string | null },
        { ...renewalCommon, id: '10', contractId: '6', contractNumber: 'HD-6', version: 2, status: 'FULFILLED', nextContractId: '7', nextContractStatus: 'ACTIVE' },
      ];
      const party = { id: '3', fullName: 'Chủ nhà mẫu', email: 'owner@example.invalid', phone: null, address: 'Địa chỉ mẫu', dateOfBirth: null, emailVerified: true };
      const doc = { id: '5', rentalRequestId: '39', contractNumber: 'HD-5', status: 'ACTIVE', version: 0, templateType: 'APARTMENT', startDate: '2026-05-01', endDate: '2026-10-31', monthlyRent: '8500000', electricityUnitPrice: '3500', waterUnitPrice: '30000', deposit: '2000000', paymentDay: 5, paymentMethod: 'Chuyển khoản', usagePurpose: 'Để ở', clauses: [{ title: 'Điều khoản', body: 'Điều khoản mẫu' }],
        snapshot: { owner: party, customer: { ...party, id: '2', fullName: 'Hữu Hà' }, asset: { apartmentId: '17', propertyId: '2', title: 'Căn mẫu thuê tiếp', roomNumber: 'HH205.D10', propertyName: 'Tài sản mẫu', address: 'Địa chỉ mẫu', amenities: [], areaM2: '45' }, receivingAccount: null },
        signing: { state: 'SIGNED', ownerAccountId: '3', customerAccountId: '2', ownerSignedAt: '2026-10-30T00:00:00Z', customerSignedAt: '2026-10-30T00:00:00Z' }, lifecycle: { version: 3, expired: true, renewalRequest: { status: 'ACCEPTED' }, handoverAvailable: false } };
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/api/**', async route => {
        const url = new URL(route.request().url());const path = url.pathname;const json = (body: unknown) => route.fulfill({ json: body });calls.push(path + url.search);
        const paged = (items: unknown[]) => json({ items, page: 0, size: 10, totalElements: items.length, totalPages: items.length ? 1 : 0 });
        if (path.endsWith('/csrf')) return json({ token: 'fixture', headerName: 'X-XSRF-TOKEN' });
        if (path.endsWith('/vneid-config')) return json({ enabled: false });
        if (path.endsWith('/refresh')) return json({ accessToken: 'fixture', user: { id: '3', fullName: 'Chủ nhà mẫu', roles: ['OWNER'], accountStatus: 'ACTIVE', contactVerificationStatus: 'VERIFIED', version: 0 } });
        if (path.endsWith('/me/notifications')) return json({ items: [], page: 0, totalPages: 0, totalElements: 0, unreadCount: 0 });
        if (path.endsWith('/owner/properties')) return json([{ id: '2', name: 'Tài sản mẫu', approvalStatus: 'APPROVED' }, { id: '3', name: 'Tài sản khác', approvalStatus: 'APPROVED' }]);
        if (path.endsWith('/owner/apartments')) return json([{ id: '17', propertyId: '2', propertyName: 'Tài sản mẫu', roomNumber: 'HH205.D10', title: 'Căn mẫu', availability: 'OCCUPIED', areaM2: '45', advertisedMonthlyRent: '8500000', amenities: [], version: 0 }]);
        if (path.endsWith('/owner/tenancies') || path.endsWith('/me/tenancies') || path.endsWith('/owner/maintenance-tickets')) return json([]);
        if (path.endsWith('/owner/invoices')) return paged([]);
        if (path.endsWith('/owner/rental-requests')) {
          const status = url.searchParams.get('status');const complete = url.searchParams.get('contractCompleted');
          return paged(url.searchParams.get('propertyId') === '3' ? [] : ordinary.filter(r => (!status || r.status === status) && (complete === null || r.contractCompleted === (complete === 'true'))));
        }
        if (path.endsWith('/owner/renewal-requests')) { const status = url.searchParams.get('status');return paged(url.searchParams.get('propertyId') === '3' ? [] : renewals.filter(r => !status || r.status === status)); }
        if (path.endsWith('/4/renewal-request/decision')) {
          const body = route.request().postDataJSON();expect(body.version).toBe(2);
          if (scenario === 'stale') return route.fulfill({ status: 409, json: { message: 'Yêu cầu đã thay đổi. Hãy tải lại.' } });
          if (scenario === 'reject') { expect(body.decision).toBe('REJECT');expect(body.reason).toBe('Không tiếp tục cho thuê');renewals[0].status = 'REJECTED'; }
          else { expect(body.decision).toBe('ACCEPT');renewals[0].status = 'ACCEPTED'; }
          return json(doc);
        }
        if (path.endsWith('/5/renewal-context')) return json({ rentalRequestId: '39', requestVersion: 3, sourceVersion: 'a'.repeat(64), snapshot: doc.snapshot, advertisedMonthlyRent: '8500000', suggestedDeposit: '2000000', templateClauses: doc.clauses, existingDraft: null });
        if (path === '/api/v1/contracts/5') return json(doc);
        unexpected.push(path);return route.fulfill({ status: 404, json: { message: `Unexpected fixture: ${path}` } });
      });
      await page.goto(`/app?tab=rental_requests&propertyId=2${scenario === 'scope-keyboard' ? '&requestType=renewal' : ''}`);
      if (scenario === 'scope-keyboard') {
        await expect(page.getByRole('tab', { name: 'Thuê tiếp', exact: true })).toHaveAttribute('aria-selected', 'true');
        await expect(page.getByLabel('Trạng thái thuê tiếp', { exact: true })).toHaveValue('PENDING');
        expect(calls.some(path => path.startsWith('/api/v1/owner/rental-requests'))).toBe(false);
        await page.getByRole('tab', { name: 'Thuê tiếp', exact: true }).press('ArrowLeft');
        await expect(page.getByRole('tab', { name: 'Thuê mới', exact: true })).toHaveAttribute('aria-selected', 'true');
        await page.getByLabel('Trạng thái', { exact: true }).selectOption('SIGNED');
        if (width === 390) await page.getByRole('button', { name: 'Menu quản lý', exact: true }).click();
        await page.getByRole('combobox', { name: 'Tài sản đang chọn' }).selectOption('3');
        await expect(page.getByLabel('Trạng thái', { exact: true })).toHaveValue('PENDING');
        await page.getByRole('tab', { name: 'Thuê tiếp', exact: true }).click();
        await expect(page).toHaveURL(/propertyId=3/);
        await expect(page.getByText('Chưa có yêu cầu thuê tiếp phù hợp.', { exact: true })).toBeVisible();
      } else {
        await expect(page.getByLabel('Trạng thái', { exact: true })).toHaveValue('PENDING');
        await expect(page.getByTestId('rental-request')).toHaveCount(1);
        if (scenario === 'filters') {
          await page.getByLabel('Trạng thái', { exact: true }).selectOption('CONTRACTING');
          await expect(page.getByTestId('rental-request').getByRole('heading')).toHaveText('Đang chuẩn bị bản thuê');
          await page.getByLabel('Trạng thái', { exact: true }).selectOption('SIGNED');
          await expect(page.getByTestId('rental-request').getByRole('heading')).toHaveText('Đã ký đủ bản thuê');
          await expect(page.getByTestId('rental-request').getByText('Đã ký hợp đồng', { exact: true })).toBeVisible();
        }
        await page.getByRole('tab', { name: 'Thuê tiếp', exact: true }).click();
        await expect(page.getByLabel('Trạng thái thuê tiếp', { exact: true })).toHaveValue('PENDING');
        await expect(page.getByTestId('renewal-request')).toHaveCount(1);
        if (scenario === 'accept') {
          await page.getByRole('button', { name: 'Đồng ý thuê tiếp', exact: true }).click();
          await page.getByRole('button', { name: 'Xem yêu cầu đang làm hợp đồng', exact: true }).click();
          await expect(page.getByTestId('renewal-request')).toHaveCount(2);
          expect(new URL(page.url()).pathname).toBe('/app');
        } else if (scenario === 'reject' || scenario === 'stale') {
          await page.getByRole('button', { name: 'Từ chối thuê tiếp', exact: true }).click();
          const dialog = page.getByRole('dialog');await expect(dialog.getByRole('button', { name: 'Xác nhận từ chối', exact: true })).toBeDisabled();
          await dialog.getByRole('textbox').fill('Không tiếp tục cho thuê');await dialog.getByRole('button', { name: 'Xác nhận từ chối', exact: true }).click();
          if (scenario === 'stale') await expect(dialog.getByRole('alert')).toHaveText('Yêu cầu đã thay đổi. Hãy tải lại.');
          else { await page.getByLabel('Trạng thái thuê tiếp', { exact: true }).selectOption('REJECTED');await expect(page.getByTestId('renewal-request')).toHaveCount(1); }
        } else if (scenario === 'draft') {
          await page.getByLabel('Trạng thái thuê tiếp', { exact: true }).selectOption('ACCEPTED');
          await page.getByRole('button', { name: 'Soạn hợp đồng ký tiếp', exact: true }).click();
          await expect(page.getByRole('heading', { name: 'Ký tiếp hợp đồng HD-5', exact: true })).toBeVisible();
        } else {
          await page.getByLabel('Trạng thái thuê tiếp', { exact: true }).selectOption('FULFILLED');
          await expect(page.getByRole('link', { name: 'Xem hợp đồng ký tiếp', exact: true })).toHaveAttribute('href', '/contracts/7');
          await page.getByRole('tab', { name: 'Thuê mới', exact: true }).click();
          await expect(page.getByLabel('Trạng thái', { exact: true })).toHaveValue('PENDING');
        }
      }
      expect(errors).toEqual([]);expect(unexpected).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });
  }
}

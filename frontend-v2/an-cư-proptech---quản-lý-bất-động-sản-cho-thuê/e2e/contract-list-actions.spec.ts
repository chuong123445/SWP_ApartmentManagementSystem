import {exitFixture,proposedHandover} from './fixtures/contractExit';
import { test, expect } from '@playwright/test';

for (const width of [1440, 390]) for (const scenario of ['requests', 'renewal', 'pending', 'owner', 'stale', 'changed', 'legacy']) {
  test(`Contract list ${scenario} at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const owner = ['owner', 'stale', 'changed'].includes(scenario);
    const errors: string[] = [], unexpected: string[] = [], consoleErrors: string[] = [];
    const writes: { path: string; body: any }[] = []; let contractReads = 0;
    const party = (id: string) => ({ id, fullName: id === '3' ? 'Chủ nhà mẫu' : 'Người thuê mẫu', email: `party${id}@example.invalid`, phone: null, address: null, dateOfBirth: null, emailVerified: true });
    const make = (id: string) => ({ id, rentalRequestId: String(Number(id) + 35), contractNumber: `HD-${id}`, status: 'ACTIVE', version: 0, templateType: 'APARTMENT', startDate: '2026-05-01', endDate: '2026-10-31', monthlyRent: '8500000', electricityUnitPrice: '3500', waterUnitPrice: '15000', deposit: '2000000', paymentDay: 5, paymentMethod: 'Chuyển khoản', usagePurpose: 'Để ở', clauses: [], createdAt: '2026-05-01T00:00:00Z',
      snapshot: { owner: party('3'), customer: party('2'), asset: { apartmentId: '17', propertyId: '2', propertyName: 'Tài sản mẫu', roomNumber: 'B.101', title: `Căn hợp đồng ${id}`, address: 'Địa chỉ mẫu', amenities: [], areaM2: '45' }, receivingAccount: null },
      signing: { ownerAccountId: '3', customerAccountId: '2', state: 'SIGNED', ownerSignedAt: '2026-05-01T00:00:00Z', customerSignedAt: '2026-05-01T00:00:00Z', ownerSignature: null, customerSignature: null, contentHash: 'a'.repeat(64) },
      lifecycle: { version: 3, expired: true, previousContractId: null, renewalContractId: null, endReason: null, handover: null as any, renewalRequest: null as any, renewalRequestAvailable: true, renewalRequestOpensOn: '2026-10-21', handoverAvailable: owner } });
    const exit=exitFixture('4','3','2');
    const docs = [make('4'), make('5'), make('6')];
    docs[1].lifecycle.renewalRequest = { id: '8', version: 2, status: 'PENDING', message: 'Muốn thuê tiếp', decisionReason: null };
    docs[1].lifecycle.handoverAvailable = false; docs[2].status = 'ENDED'; docs[2].lifecycle.handoverAvailable = false;
    const tenancies = scenario === 'legacy' ? [{ id: '90', apartmentId: '17', propertyName: 'Tài sản mẫu', roomNumber: 'B.101', customerId: '2', customerName: 'Người thuê mẫu', customerEmail: 'tenant@example.invalid', status: 'ENDED', startDate: '2026-01-01', endDate: '2026-04-30', monthlyRent: '8500000', version: 0 }]
      : docs.map(d => ({ id: d.id, apartmentId: '17', propertyName: 'Tài sản mẫu', roomNumber: 'B.101', customerId: '2', customerName: 'Người thuê mẫu', customerEmail: 'tenant@example.invalid', status: d.status, startDate: d.startDate, endDate: d.endDate, monthlyRent: d.monthlyRent, version: 0 }));
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error' && !(scenario === 'stale' && m.text().includes('409'))) consoleErrors.push(m.text()); });
    await page.route('https://accounts.google.com/**',r=>r.fulfill({contentType:'application/javascript',body:'window.google={accounts:{id:{initialize(){},renderButton(){},disableAutoSelect(){},cancel(){}}}}'}));
    await page.route('**/api/**', async route => {
      const req = route.request(), url = new URL(req.url()), path = url.pathname;
      const json = (body: unknown) => route.fulfill({ json: body });
      if (path.endsWith('/csrf')) return json({ token: 'fixture', headerName: 'X-XSRF-TOKEN' });
      if (path.endsWith('/vneid-config')) return json({ enabled: false });
      if (path.endsWith('/refresh')) return json({ accessToken: 'fixture', user: { id: owner ? '3' : '2', fullName: 'Người kiểm thử', roles: [owner ? 'OWNER' : 'CUSTOMER'], accountStatus: 'ACTIVE', contactVerificationStatus: 'VERIFIED', version: 0 } });
      if (path.endsWith('/me/notifications')) return json({ items: [{ id: 'contract-expiry:1', title: 'Hợp đồng sắp hết hạn', message: 'Kiểm tra hợp đồng HD-4', url: '/my/rental-requests?tab=contracts&contractId=4', createdAt: '2026-11-02T00:00:00Z', read: false }], page: 0, size: 20, totalPages: 1, totalElements: 1, unreadCount: 1 });
      if (path.includes('/me/notifications/') && req.method() === 'POST') return route.fulfill({ status: 204 });
      if (path.endsWith('/me/tenancies') || path.endsWith('/owner/tenancies')) return json(tenancies);
      if (path.endsWith('/me/rental-requests')) return json({ items: [{ id: '31', apartmentId: '18', apartmentTitle: 'Yêu cầu chưa có hợp đồng', address: 'Địa chỉ mẫu', advertisedMonthlyRent: '5000000', customerId: '2', customerName: 'Người thuê mẫu', customerEmail: 'tenant@example.invalid', status: 'PENDING', message: 'Xin thuê', createdAt: '2026-11-02T00:00:00Z', version: 0, contractId: null, contractCompleted: false }], page: 0, size: 20, totalPages: 1, totalElements: 1 });
      if (path.endsWith('/contract-drafts')) { contractReads++; return json(scenario === 'legacy' ? [] : docs); }
      if (path === '/api/v1/contracts/4') return json(scenario === 'changed' ? { ...docs[0], lifecycle: { ...docs[0].lifecycle, handoverAvailable: false, renewalRequest: { status: 'PENDING', id: '10', version: 1 } } } : docs[0]);
      if (path.endsWith('/4/renewal-request') && req.method() === 'POST') {
        const body = req.postDataJSON(); writes.push({ path, body }); expect(body.version).toBe(3); expect(body.consent).toBe(true);
        docs[0].lifecycle.renewalRequest = { id: '11', status: 'PENDING', version: 0, message: body.message }; return json(docs[0]);
      }
      if(path==='/api/v1/contracts/4/exit')return json(exit);
      if(path==='/api/v1/contracts/4/exit/actions'){
        const body=req.postDataJSON();writes.push({path,body});expect(body.sourceVersion).toBe(exit.sourceVersion);expect(body.consent).toBe(true);expect(body.action).toBe('PROPOSE_HANDOVER');expect(body.handover.keysReturned).toBe(true);expect(body.handover).not.toHaveProperty('deductionAmount');
        if(scenario==='stale')return route.fulfill({status:409,json:{message:'Dữ liệu đã thay đổi. Hãy tải lại.'}});
        proposedHandover(exit,body.handover);docs[0].lifecycle.handoverAvailable=false;return json(exit);
      }
      if(path.endsWith('/owner/workspace-summary'))return json({propertyId:null,asOf:'2026-11-08',expiringThrough:'2026-11-28',unpaidMonthlyInvoiceCount:0,unpaidAdditionalReceiptCount:0,unpaidCount:0,expiringContractCount:0,expiredContractCount:0});
      if (path.endsWith('/owner/properties')) return json([{ id: '2', name: 'Tài sản mẫu', approvalStatus: 'APPROVED' }]);
      if (path.endsWith('/owner/apartments')) return json([{ id: '17', propertyId: '2', propertyName: 'Tài sản mẫu', roomNumber: 'B.101', title: 'Căn mẫu', availability: 'OCCUPIED', areaM2: '45', advertisedMonthlyRent: '8500000', amenities: [], version: 0 }]);
      if (path.endsWith('/owner/maintenance-tickets')) return json([]);
      if (path.endsWith('/owner/invoices')) return json({ items: [], page: 0, totalPages: 0, totalElements: 0 });
      unexpected.push(`${req.method()} ${path}`); return route.fulfill({ status: 404 });
    });
    await page.goto(owner ? '/app?tab=contracts&propertyId=2' : scenario === 'requests' ? '/my/rental-requests' : scenario === 'legacy' ? '/my/contracts' : `/my/rental-requests?tab=contracts${scenario === 'pending' ? '&contractId=5' : ''}`);
    if (scenario === 'requests') {
      await expect(page.getByText('Yêu cầu chưa có hợp đồng', { exact: true })).toBeVisible(); expect(contractReads).toBe(0);
      await expect(page.getByText('Hợp đồng sắp hết hạn', { exact: true })).toHaveCount(0);
      await page.getByRole('button', { name: /^Thông báo/ }).click();
      await page.getByRole('button', { name: /Hợp đồng sắp hết hạn/ }).click();
      await expect(page.getByRole('tab', { name: 'Hợp đồng', exact: true })).toHaveAttribute('aria-selected', 'true');
      await expect(page.getByText('Yêu cầu chưa có hợp đồng', { exact: true })).toHaveCount(0);
      await expect(page.locator('#contract-4')).toBeVisible();
    } else if (scenario === 'legacy') {
      await expect(page.getByRole('tab', { name: 'Hợp đồng', exact: true })).toHaveAttribute('aria-selected', 'true');
      await expect(page.getByRole('link', { name: 'Xem hồ sơ thuê', exact: true })).toHaveAttribute('href', '/contracts/90');
      await expect(page.getByRole('button', { name: 'Gửi yêu cầu thuê tiếp', exact: true })).toHaveCount(0);
    } else if (scenario === 'pending') {
      await expect(page.locator('#contract-5')).toBeVisible();
      await expect(page.locator('#contract-5').getByRole('button', { name: 'Gửi yêu cầu thuê tiếp', exact: true })).toHaveCount(0);
      await page.getByRole('tab', { name: 'Hợp đồng', exact: true }).press('ArrowLeft');
      await expect(page.getByRole('tab', { name: 'Yêu cầu thuê đã gửi', exact: true })).toHaveAttribute('aria-selected', 'true');
    } else {
      const card = page.locator('#contract-4'); await expect(card).toBeVisible();
      await card.getByRole('button', { name: owner ? 'Lập biên bản bàn giao' : 'Gửi yêu cầu thuê tiếp', exact: true }).click();
      const modal = page.getByRole('dialog'); await expect(modal).toBeVisible();
      if (scenario === 'changed') {
        await expect(modal.getByRole('status')).toBeVisible(); await expect(modal.getByLabel('Ngày bàn giao', { exact: true })).toHaveCount(0);
      } else if (!owner) {
        await modal.getByLabel('Lời nhắn thuê tiếp (không bắt buộc)', { exact: true }).fill('Tôi muốn thuê tiếp.');
        expect(await modal.getByRole('button', { name: 'Gửi yêu cầu thuê tiếp', exact: true }).isEnabled()).toBe(false);
        await modal.getByRole('checkbox').check(); await modal.getByRole('button', { name: 'Gửi yêu cầu thuê tiếp', exact: true }).click();
        await expect(modal.getByRole('heading', { name: /Yêu cầu thuê tiếp · Chờ chủ nhà xử lý/ })).toBeVisible(); expect(writes.length).toBe(1);
      } else {
        await modal.getByRole('button',{name:'Lập biên bản bàn giao cư trú',exact:true}).click();
        await modal.getByLabel('Điện bàn giao', { exact: true }).fill('215'); await modal.getByLabel('Nước bàn giao', { exact: true }).fill('55');
        await modal.getByLabel('Lý do xử lý kết thúc thuê', { exact: true }).fill('Phòng đã kiểm tra, đủ chìa khóa.');
        for (const box of await modal.getByRole('checkbox').all()) await box.check();
        await modal.getByRole('button', { name: 'Xác nhận: Lập biên bản bàn giao cư trú', exact: true }).click();
        if (scenario === 'stale') await expect(modal.getByRole('alert')).toContainText('Dữ liệu đã thay đổi');
        else await expect(modal.getByText('Bàn giao cư trú: Chờ người thuê xác nhận',{exact:true})).toBeVisible();
        expect(writes.length).toBe(1);
      }
      await modal.getByRole('button', { name: 'Đóng', exact: true }).click(); await expect(page.getByRole('dialog')).toHaveCount(0);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    expect(errors).toEqual([]); expect(unexpected).toEqual([]); expect(consoleErrors).toEqual([]);
    if (['requests', 'pending', 'changed', 'legacy'].includes(scenario)) expect(writes).toEqual([]);
  });
}

import { test, type ConsoleMessage, type Page, type Request, type Route } from '@playwright/test';

async function exercise(page: Page, base: string, width: number) {
  const errors: string[] = [];
  const unexpected: string[] = [];
  const writes: string[] = [];
  let role = 'OWNER';
  let collected = false;
  let invoiceIssued = false;
  let withdrawalStatus = '';
  let withdrawalVersion = 0;
  const pageError = (error: Error) => errors.push(error.message);
  const consoleError = (message: ConsoleMessage) => { if (message.type() === 'error') errors.push(message.text()); };
  const requestFailed = (request: Request) => { if (request.failure()?.errorText !== 'net::ERR_ABORTED') errors.push(request.url()); };
  page.on('pageerror', pageError);
  page.on('console', consoleError);
  page.on('requestfailed', requestFailed);
  const emptyPage = { items: [], page: 0, size: 20, totalElements: 0, totalPages: 0 };
  const withdrawal = () => ({
    id: '12', ownerId: '3', amount: '3000', bank: 'BIDV', accountNumber: '0123456789', accountHolder: 'CHU NHA MAU',
    status: withdrawalStatus, version: withdrawalVersion, canComplete: role === 'ADMIN' && withdrawalStatus === 'PROCESSING',
    transferReference: withdrawalStatus === 'PAID' ? 'FT-MAU-12' : null,
    note: null, createdAt: '2026-11-03T08:00:00Z', updatedAt: '2026-11-03T08:00:00Z',
  });
  const invoice = {
    id: '9', contractId: '8', apartmentId: '7', customerId: '41', roomNumber: 'A101', apartmentTitle: 'Căn hộ mẫu',
    tenantName: 'Người thuê mẫu', period: '2026-10', dueDate: '2026-11-05', monthlyRent: '5000', totalAmount: '5000',
    electricityStartReading: '0', electricityEndReading: '0', electricityQuantity: '0', electricityUnitPrice: '3500', electricityAmount: '0',
    waterStartReading: '0', waterEndReading: '0', waterQuantity: '0', waterUnitPrice: '15000', waterAmount: '0',
    status: 'SENT', version: 0, createdAt: '2026-11-01T00:00:00Z', sentAt: '2026-11-01T00:00:00Z', paymentStatus: 'UNPAID',
  };
  const qr = 'https://vietqr.app/img?bank=BIDV&acc=0123456789&amount=5000&des=ANCU1234567890ABCDEF12345678';
  const api = async (route: Route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname.replace('/api/v1', '');
    const post = req.method() === 'POST';
    const json = (body: unknown) => route.fulfill({ json: body });
    if (path === '/auth/csrf') return json({ token: 'fixture', headerName: 'X-XSRF-TOKEN' });
    if (path === '/auth/vneid-config') return json({ enabled: false });
    const user = { id: role === 'OWNER' ? '3' : role === 'ADMIN' ? '1' : '41', fullName: 'Tài khoản mẫu',
      email: 'demo@example.invalid', roles: [role], accountStatus: 'ACTIVE', contactVerificationStatus: 'VERIFIED', version: 0 };
    if (path === '/auth/refresh') return json({ accessToken: 'fixture', user });
    if (path === '/me') return json(user);
    if (path === '/me/tenancies' || path === '/owner/tenancies' || path === '/owner/maintenance-tickets') return json([]);
    if (path === '/me/notifications') return json({ ...emptyPage, unreadCount: 0 });
    if (path === '/owner/properties') return json([{ id: '2', name: 'Tài sản mẫu', approvalStatus: 'APPROVED' }]);
    if (path === '/owner/apartments') return json([{ id: '7', propertyId: '2', propertyName: 'Tài sản mẫu',
      roomNumber: 'A101', title: 'Căn hộ mẫu', availability: 'OCCUPIED', areaM2: '45',
      advertisedMonthlyRent: '5000', amenities: [], version: 0 }]);
    if (path === '/owner/invoices') return json({ ...emptyPage, items: [invoice], totalElements: 1, totalPages: 1 });
    if (path === '/owner/invoices/additional') return json(emptyPage);
    if (path === '/invoices/9') return json(invoice);
    if (path === '/invoices/9/payment') {
      if (post) {
        writes.push('issue-qr');
        invoiceIssued = true;
      }
      // Return a QR even for the owner to verify the owner UI guards independently of API redaction.
      return json({ status: collected ? 'PAID' : 'UNPAID', amount: '5000', bank: 'BIDV',
        accountNumber: '0123456789', accountHolderName: 'TAI KHOAN THU CHUNG',
        paymentCode: invoiceIssued ? 'ANCU1234567890ABCDEF12345678' : null,
        qrUrl: invoiceIssued && !collected ? qr : null, paidAt: collected ? '2026-11-03T08:00:00Z' : null });
    }
    if (path === '/owner/settlements') return json({ received: collected ? '5000' : '0',
      available: collected ? (withdrawalStatus ? '2000' : '5000') : '0',
      reserved: ['PENDING', 'PROCESSING'].includes(withdrawalStatus) ? '3000' : '0',
      paid: withdrawalStatus === 'PAID' ? '3000' : '0', entries: [] });
    if (path === '/admin/settlements/connection') return json({ configured: true, enabled: true,
      bank: 'BIDV', accountNumber: '0123456789', accountHolderName: 'TAI KHOAN THU CHUNG',
      virtualAccount: null, webhookUrl: 'https://example.invalid/webhook', lastWebhookAt: '2026-11-03T08:00:00Z' });
    if (path === '/owner/settlements/withdrawals' && post) {
      const input = req.postDataJSON();
      if (input.amount !== '3000' || !input.requestKey || input.accountNumber !== '0123456789') throw Error('Invalid withdrawal input');
      withdrawalStatus = 'PENDING';
      writes.push('request');
      return json(withdrawal());
    }
    if (path === '/owner/settlements/withdrawals' || path === '/admin/settlements/withdrawals') {
      const filter = url.searchParams.get('status');
      if (!withdrawalStatus || (filter && filter !== withdrawalStatus)) return json(emptyPage);
      return json({ ...emptyPage, items: [withdrawal()], totalElements: 1, totalPages: 1 });
    }
    if (path === '/admin/settlements/withdrawals/12/actions' && post) {
      const input = req.postDataJSON();
      if (input.version !== withdrawalVersion) throw Error('Wrong withdrawal version');
      if (input.action === 'START') withdrawalStatus = 'PROCESSING';
      else if (input.action === 'PAID' && input.transferReference === 'FT-MAU-12') withdrawalStatus = 'PAID';
      else throw Error('Unexpected decision');
      withdrawalVersion++;
      writes.push(input.action);
      return json(withdrawal());
    }
    unexpected.push(req.method() + ' ' + path);
    return route.fulfill({ status: 404, json: { message: 'Unexpected API' } });
  };
  const qrResponse = (route: Route) => route.fulfill({ contentType: 'image/svg+xml', body:
    '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="black"/></svg>' });
  const check = (condition: boolean, message: string) => { if (!condition) throw Error(message); };
  const fits = async () => check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Horizontal overflow');
  const go = (path: string) => page.goto(base + path, { waitUntil: 'domcontentloaded' });
  await page.route('**/api/**', api);
  await page.route('https://vietqr.app/img?**', qrResponse);
  try {
    await page.setViewportSize({ width, height: 900 });
    await go('/account/settings/payments');
    await page.getByText('Chưa có số dư có thể rút.', { exact: true }).waitFor();
    check(await page.getByRole('button', { name: 'Gửi yêu cầu rút' }).isDisabled(), 'Zero balance allowed withdrawals');
    await fits();

    role = 'CUSTOMER';
    await go('/my/invoices/9');
    await page.getByRole('button', { name: 'Hiển thị QR thanh toán SePay' }).click();
    await page.getByRole('img', { name: 'QR chuyển khoản hóa đơn SePay' }).waitFor();
    await fits();

    role = 'OWNER';
    await go('/app?tab=invoices&propertyId=2');
    await page.locator('[data-invoice-id="9"]').getByRole('button', { name: /Chi tiết|Xem/ }).click();
    const detail = page.getByRole('dialog', { name: 'Chi tiết hóa đơn' });
    await detail.getByText('ANCU1234567890ABCDEF12345678', { exact: true }).waitFor();
    check(await detail.getByRole('img').count() === 0, 'Owner saw QR');
    check(await detail.getByRole('button', { name: 'Hiển thị QR thanh toán SePay' }).count() === 0, 'Owner can request QR');
    await fits();

    collected = true;
    await go('/account/settings/payments');
    await page.getByLabel('Số tiền (đồng)', { exact: true }).fill('3000');
    await page.getByLabel('Ngân hàng', { exact: true }).fill('BIDV');
    await page.getByLabel('Số tài khoản', { exact: true }).fill('0123456789');
    await page.getByLabel('Tên chủ tài khoản', { exact: true }).fill('CHU NHA MAU');
    await page.getByRole('button', { name: 'Gửi yêu cầu rút' }).click();
    await page.getByRole('button', { name: /#12 · Chờ xử lý/ }).waitFor();
    await fits();

    role = 'ADMIN';
    await go('/admin/settlements');
    await page.getByRole('button', { name: /#12 · Chờ xử lý/ }).click();
    await page.getByRole('button', { name: 'Nhận xử lý' }).click();
    await page.getByLabel('Mã giao dịch ngân hàng').fill('FT-MAU-12');
    check(await page.getByRole('button', { name: 'Ghi nhận đã chuyển' }).isDisabled(), 'Transfer can be confirmed without review');
    await page.getByRole('checkbox', { name: /Tôi đã chuyển khoản thành công/ }).check();
    await page.getByRole('button', { name: 'Ghi nhận đã chuyển' }).click();
    await page.getByRole('heading', { name: /Yêu cầu #12 · Đã chuyển/ }).waitFor();
    await fits();

    role = 'OWNER';
    await go('/account/settings/payments');
    await page.getByRole('button', { name: /#12 · Đã chuyển/ }).click();
    await page.getByText('Mã giao dịch: FT-MAU-12').waitFor();
    check(writes.join(',') === 'issue-qr,request,START,PAID', 'Unexpected write: ' + writes);
    check(!errors.length && !unexpected.length, JSON.stringify({ errors, unexpected }));
    return { width, writes, errors, unexpected };
  } finally {
    await page.unroute('**/api/**', api);
    await page.unroute('https://vietqr.app/img?**', qrResponse);
    page.off('pageerror', pageError);
    page.off('console', consoleError);
    page.off('requestfailed', requestFailed);
  }
}

for (const width of [1440, 390]) {
  test(`SePay collection, tenant QR and manual withdrawal at ${width}px`, async ({ page, baseURL }) => {
    await exercise(page, baseURL ?? 'http://localhost:3000', width);
  });
}

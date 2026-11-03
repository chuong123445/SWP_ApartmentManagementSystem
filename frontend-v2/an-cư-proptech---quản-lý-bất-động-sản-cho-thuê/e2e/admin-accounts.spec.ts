import { test, type Page, type Route, type ConsoleMessage, type Request } from '@playwright/test';

async function exercise(page: Page, base: string, width: number) {
  const errors: string[] = [];
  const unexpected: string[] = [];
  const writes: string[] = [];
  const pageError = (error: Error) => errors.push(error.message);
  const consoleError = (message: ConsoleMessage) => {
    if (message.type() === 'error' && !message.text().includes('409')) errors.push(message.text());
  };
  const failed = (request: Request) => {
    if (request.failure()?.errorText !== 'net::ERR_ABORTED') errors.push(request.url());
  };
  page.on('pageerror', pageError); page.on('console', consoleError); page.on('requestfailed', failed);
  const user = { id: '1', fullName: 'Quản trị viên', email: 'admin@example.invalid', roles: ['ADMIN'],
    accountStatus: 'ACTIVE', contactVerificationStatus: 'VERIFIED', version: 0 };
  let rows = [
    { id: '1', email: user.email, fullName: user.fullName, role: 'ADMIN', status: 'ACTIVE', deletedAt: null, version: 0, canManage: false, canUnlock: false },
    { id: '2', email: 'blank@example.invalid', fullName: 'Khách chưa có dữ liệu', role: 'CUSTOMER', status: 'ACTIVE', deletedAt: null, version: 0, canManage: true, canUnlock: false },
    { id: '3', email: 'owner@example.invalid', fullName: 'Chủ nhà có tài sản', role: 'OWNER', status: 'ACTIVE', deletedAt: null, version: 0, canManage: true, canUnlock: false },
  ];
  const empty = { items: [], page: 0, size: 20, totalElements: 0, totalPages: 0 };
  const routeApi = async (route: Route) => {
    const req = route.request(), url = new URL(req.url()), path = url.pathname;
    const json = (data: unknown, status = 200) => route.fulfill({ status, json: data });
    if (path.endsWith('/auth/csrf')) return json({ token: 'fixture', headerName: 'X-XSRF-TOKEN' });
    if (path.endsWith('/auth/vneid-config')) return json({ enabled: false });
    if (path.endsWith('/auth/refresh')) return json({ accessToken: 'fixture', user });
    if (path === '/api/v1/me') return json(user);
    if (path === '/api/v1/me/notifications') return json({ ...empty, unreadCount: 0 });
    if (path === '/api/v1/apartments/address-options') return json([]);
    if (path === '/api/v1/apartments') return json(empty);
    if (path === '/api/v1/admin/property-dossiers') return json(empty);
    if (path === '/api/v1/admin/accounts') {
      const q = url.searchParams.get('q') ?? '', filter = url.searchParams.get('filter');
      const items = rows.filter(a => (a.email.includes(q) || a.fullName.includes(q)) &&
        (a.deletedAt ? filter === 'DELETED' : filter === 'ALL' || a.status === filter));
      return json({ ...empty, items, totalElements: items.length, totalPages: items.length ? 1 : 0 });
    }
    if (/^\/api\/v1\/admin\/accounts\/[0-9]+\/actions$/.test(path) && req.method() === 'POST') {
      const input = req.postDataJSON(), id = path.split('/').at(-2), row = rows.find(a => a.id === id);
      if (!row || !row.canManage || !input.reason?.trim()) throw Error('Invalid administration request');
      if (input.reason === 'Kiểm tra dữ liệu cũ') return json({ code: 'STALE_VERSION', message: 'Tài khoản đã thay đổi. Vui lòng tải lại.' }, 409);
      if (input.version !== row.version) throw Error('Incorrect version submitted');
      row.version++;
      writes.push(input.action + ':' + row.id);
      let outcome = '';
      if (input.action === 'LOCK') { row.status = 'LOCKED'; row.canUnlock = true; outcome = 'LOCKED'; }
      else if (input.action === 'UNLOCK') { row.status = 'ACTIVE'; row.canUnlock = false; outcome = 'UNLOCKED'; }
      else if (row.id === '3') { Object.assign(row, { status: 'INACTIVE', deletedAt: '2026-11-03T00:00:00Z', canManage: false }); outcome = 'SOFT_DELETED'; }
      else { rows = rows.filter(a => a.id !== row.id); outcome = 'HARD_DELETED'; }
      return json({ id: row.id, outcome });
    }
    unexpected.push(req.method() + ' ' + path);
    return json({}, 404);
  };
  const photos = (route: Route) => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>' });
  const check = (condition: boolean, message: string) => { if (!condition) throw Error(message); };
  const card = (email: string) => page.getByRole('article', { name: 'Tài khoản ' + email, exact: true });
  const fits = async () => check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Horizontal overflow');
  await page.route('**/api/**', routeApi);
  await page.route('https://images.unsplash.com/**', photos);
  try {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(base + '/');
    const nav = page.getByRole('navigation', { name: 'Điều hướng chính' });
    await nav.getByRole('link', { name: 'Quản trị hệ thống', exact: true }).waitFor();
    await nav.getByRole('link', { name: 'Quản trị hệ thống', exact: true }).click();
    await page.getByRole('button', { name: 'Vai trò và tài khoản' }).click();
    const menu = page.getByRole('navigation', { name: 'Điều hướng tài khoản' });
    await menu.getByRole('link', { name: 'Quản trị hệ thống', exact: true }).waitFor();
    check(await menu.getByRole('link', { name: /Cài đặt tài khoản|Hồ sơ & tài khoản/ }).count() === 0, 'Admin personal links remain');
    await page.getByRole('button', { name: 'Vai trò và tài khoản' }).click();
    await page.getByRole('link', { name: 'Tài khoản người dùng', exact: true }).click();
    await card('blank@example.invalid').waitFor();
    check(await card('admin@example.invalid').getByRole('button').count() === 0, 'Admin account has destructive actions');
    await fits();

    await card('blank@example.invalid').getByRole('button', { name: 'Khóa', exact: true }).click();
    let dialog = page.getByRole('dialog');
    check(await dialog.getByRole('button', { name: 'Xác nhận', exact: true }).isDisabled(), 'Missing reason accepted');
    await dialog.getByLabel('Lý do', { exact: true }).fill('Kiểm tra khóa tài khoản');
    await dialog.getByRole('button', { name: 'Xác nhận', exact: true }).click();
    await page.getByText('Đã khóa tài khoản và thu hồi các phiên đăng nhập.', { exact: true }).waitFor();
    await card('blank@example.invalid').getByRole('button', { name: 'Mở khóa', exact: true }).click();
    await dialog.getByLabel('Lý do', { exact: true }).fill('Cho phép truy cập lại');
    await dialog.getByRole('button', { name: 'Xác nhận', exact: true }).click();
    await page.getByText('Đã mở khóa tài khoản. Người dùng có thể đăng nhập lại.', { exact: true }).waitFor();

    await card('owner@example.invalid').getByRole('button', { name: 'Xóa', exact: true }).click();
    await dialog.getByLabel('Lý do', { exact: true }).fill('Người dùng yêu cầu xóa');
    check(await dialog.getByRole('button', { name: 'Xác nhận', exact: true }).isDisabled(), 'Delete did not require confirmation');
    await dialog.getByRole('checkbox').check();
    await fits();
    await dialog.getByRole('button', { name: 'Xác nhận', exact: true }).click();
    await page.getByText('Đã xóa mềm tài khoản và lưu lại lịch sử nghiệp vụ.', { exact: true }).waitFor();
    await page.getByLabel('Trạng thái tài khoản', { exact: true }).selectOption('DELETED');
    await card('owner@example.invalid').waitFor();
    check(await card('owner@example.invalid').getByRole('button').count() === 0, 'Deleted account still has commands');
    await page.getByLabel('Trạng thái tài khoản', { exact: true }).selectOption('ALL');

    await card('blank@example.invalid').getByRole('button', { name: 'Xóa', exact: true }).click();
    await dialog.getByLabel('Lý do', { exact: true }).fill('Kiểm tra dữ liệu cũ');
    await dialog.getByRole('checkbox').check();
    await dialog.getByRole('button', { name: 'Xác nhận', exact: true }).click();
    await dialog.getByRole('alert').filter({ hasText: 'Tài khoản đã thay đổi' }).waitFor();
    await dialog.getByRole('button', { name: 'Hủy', exact: true }).click();
    await card('blank@example.invalid').getByRole('button', { name: 'Xóa', exact: true }).click();
    await dialog.getByLabel('Lý do', { exact: true }).fill('Xóa tài khoản trắng');
    await dialog.getByRole('checkbox').check();
    await dialog.getByRole('button', { name: 'Xác nhận', exact: true }).click();
    await page.getByText('Đã xóa cứng tài khoản trắng.', { exact: true }).waitFor();

    await page.getByLabel('Tìm tên hoặc email').fill('admin@example.invalid');
    await page.getByRole('button', { name: 'Tìm kiếm', exact: true }).click();
    await page.getByText('1 tài khoản', { exact: true }).waitFor();
    await fits();
    check(writes.join(',') === 'LOCK:2,UNLOCK:2,DELETE:3,DELETE:2', 'Unexpected mutations ' + writes);
    check(!errors.length && !unexpected.length, JSON.stringify({ errors, unexpected }));
    return { width, writes, errors, unexpected };
  } finally {
    await page.goto('about:blank');
    await page.unroute('**/api/**', routeApi); await page.unroute('https://images.unsplash.com/**', photos);
    page.off('pageerror', pageError); page.off('console', consoleError); page.off('requestfailed', failed);
  }
}

for (const width of [1440, 390]) {
  test(`Admin account entry, lock, unlock and deletion at ${width}px`, async ({ page, baseURL }) => {
    await exercise(page, baseURL ?? 'http://localhost:3000', width);
  });
}

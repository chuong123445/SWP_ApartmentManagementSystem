import { test, type Page, type Route } from '@playwright/test';

export async function exerciseLocalProfile(page: Page, base: string, width: number, scenario: string) {
  const errors: string[] = [], unexpected: string[] = [];
  const check = (ok: boolean, message: string) => { if (!ok) throw Error(message); };
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('response', r => { if (r.url().includes('/api/') && r.status() >= 400) errors.push(r.status() + ' ' + r.url()); });
  const owner = scenario === 'owner';
  const fullName = owner ? 'Nguyễn Văn Chương' : scenario === 'tenant1' ? 'Nguyễn Minh Tuấn' : 'Trần Lan Anh';
  const user = { id: owner ? '3' : scenario === 'tenant1' ? '5' : '6', fullName, email: scenario + '@example.invalid', roles: owner ? ['OWNER', 'CUSTOMER'] : ['CUSTOMER'], accountStatus: 'ACTIVE', contactVerificationStatus: 'VERIFIED', version: 1 };
  const citizen = { documentNumber: owner ? '079095018642' : scenario === 'tenant1' ? '079098023516' : '079300041827', legalName: fullName, dateOfBirth: owner ? '1995-08-16' : scenario === 'tenant1' ? '1998-10-29' : '2000-06-18', gender: scenario === 'tenant2' ? 'Nữ' : 'Nam', address: '28 đường số 8, phường Hiệp Bình, TP. Hồ Chí Minh', documentIssueDate: '2021-08-20', documentIssuePlace: 'Cục Cảnh sát quản lý hành chính về trật tự xã hội', permanentAddress: '24 Nguyễn Văn Cừ, phường Bến Thành, TP. Hồ Chí Minh' };
  const profile = { ...user, dateOfBirth: citizen.dateOfBirth, address: citizen.address, phone: '+84903845721', bio: 'Sinh sống và làm việc tại TP. Hồ Chí Minh.', emailVerified: true, phoneVerified: true };
  const api = (route: Route) => {
    const path = new URL(route.request().url()).pathname, json = (body: unknown) => route.fulfill({ json: body });
    if (path.endsWith('/csrf')) return json({ token: 'fixture', headerName: 'X-XSRF-TOKEN' });
    if (path.endsWith('/refresh')) return json({ accessToken: 'fixture', user });
    if (path.endsWith('/vneid-config')) return json({ enabled: false });
    if (path === '/api/v1/me') return json(user);
    if (path === '/api/v1/me/profile') return json(profile);
    if (path === '/api/v1/me/verifications') return json({ emailVerified: true, vneid: { status: 'VERIFIED', source: 'LOCAL_DEMO', verifiedAt: '2026-11-04T05:00:00Z', identity: citizen } });
    if (path.endsWith('/notifications')) return json({ items: [], unreadCount: 0, totalElements: 0, totalPages: 0, page: 0 });
    if (path.endsWith('/me/tenancies')) return json([]);
    unexpected.push(route.request().method() + ' ' + path); return route.fulfill({ status: 404 });
  };
  await page.route('**/api/**', api);
  try {
    await page.setViewportSize({ width, height: 950 });
    for (const path of ['/account/settings/identity', '/account/profile', '/account/settings', '/account/verification']) {
      await page.goto(base + path);
      const main = page.getByRole('main');
      if (path === '/account/settings') await main.getByText('CCCD: Đã xác thực', { exact: true }).waitFor();
      else if (path === '/account/profile') { await main.getByRole('heading', { name: 'Họ tên trên căn cước', exact: true }).waitFor(); await main.getByText(fullName, { exact: true }).waitFor(); }
      else { await main.getByText(citizen.documentIssuePlace, { exact: true }).waitFor(); await main.getByText(citizen.documentNumber, { exact: true }).waitFor(); }
      check(!/mẫu|mô phỏng|minh họa|sample/i.test(await main.innerText()), 'Placeholder or simulation text remains in profile content: ' + path);
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Horizontal overflow: ' + path);
    }
    check(!errors.length && !unexpected.length, JSON.stringify({ errors, unexpected }));
    return { width, scenario, errors, unexpected };
  } finally { await page.unroute('**/api/**', api); }
}

for (const width of [1440, 390]) for (const scenario of ['owner', 'tenant1', 'tenant2']) test(`Local profile ${scenario} ${width}`, async ({ page, baseURL }) => { await exerciseLocalProfile(page, baseURL ?? 'http://localhost:3000', width, scenario); });

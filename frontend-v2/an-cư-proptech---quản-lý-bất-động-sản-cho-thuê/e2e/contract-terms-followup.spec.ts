import { test, type Page, type Route } from '@playwright/test';

export async function exerciseContractTerms(page: Page, base: string, width: number, mode: string) {
  const errors: string[] = [], unexpected: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('response', r => { if (r.url().includes('/api/') && r.status() >= 400) errors.push(r.status() + ' ' + r.url()); });
  const check = (ok: boolean, message: string) => { if (!ok) throw Error(message); };
  const empty = { items: [], totalElements: 0, totalPages: 0, page: 0, size: 20 };
  const owner = mode === 'wizard';
  const user = { id: owner ? '3' : '2', fullName: owner ? 'Nguyễn Văn Chương' : 'Nguyễn Minh Tuấn', email: 'account@example.invalid', roles: owner ? ['OWNER', 'CUSTOMER'] : ['CUSTOMER'], accountStatus: 'ACTIVE', contactVerificationStatus: 'VERIFIED', version: 0 };
  const party = (id: string) => ({ id, fullName: id === '3' ? 'Nguyễn Văn Chương' : 'Nguyễn Minh Tuấn', email: 'account@example.invalid', phone: '0903845721', address: '18 đường số 5, phường Hiệp Bình, TP. Hồ Chí Minh', dateOfBirth: '1998-10-29', emailVerified: true, documentNumber: '079098023516', documentIssueDate: '2021-08-20', documentIssuePlace: 'Cục Cảnh sát quản lý hành chính về trật tự xã hội', permanentAddress: '18 đường số 5, phường Hiệp Bình, TP. Hồ Chí Minh', identityVerificationStatus: 'VERIFIED_LOCAL_DEMO', localFixture: true });
  const snapshot = { owner: party('3'), customer: party('2'), asset: { apartmentId: '5', propertyId: '4', propertyName: 'An Cư', title: 'Căn hộ A.101', roomNumber: 'A.101', address: 'TP. Hồ Chí Minh', amenities: [], areaM2: '45', localFixture: true }, receivingAccount: { bank: 'BIDV', accountNumber: '8815801950', accountHolderName: 'NGUYEN VAN CHUONG' } };
  const doc = { id: '4', rentalRequestId: '31', contractNumber: 'HD-4', status: 'ACTIVE', startDate: '2026-01-01', endDate: mode === 'early' ? '2027-11-06' : '2026-11-10', monthlyRent: '5000000', deposit: '1000000', electricityUnitPrice: '3500', waterUnitPrice: '15000', paymentDay: 5, paymentMethod: 'Chuyển khoản', usagePurpose: 'Để ở', clauses: [], snapshot, version: 0, createdAt: '2026-01-01T00:00:00Z', signing: { ownerAccountId: '3', customerAccountId: '2', state: 'SIGNED', ownerSignedAt: '2026-01-01T00:00:00Z', customerSignedAt: '2026-01-01T00:00:00Z', ownerSignature: null, customerSignature: null, contentHash: 'a'.repeat(64) }, lifecycle: { version: 1, expired: false, handover: null, handoverAvailable: false, previousContractId: null, renewalContractId: null, renewalRequest: null, renewalRequestAvailable: mode === 'open', renewalRequestOpensOn: mode === 'early' ? '2027-10-27' : '2026-10-31' } };
  let pdf = '%PDF-1.4\n'; const offsets = [0];
  for (const [i, object] of ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << >> >>'].entries()) { offsets.push(pdf.length); pdf += `${i + 1} 0 obj\n${object}\nendobj\n`; }
  const xref = pdf.length; pdf += 'xref\n0 4\n0000000000 65535 f \n' + offsets.slice(1).map(n => String(n).padStart(10, '0') + ' 00000 n \n').join('') + `trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const api = (route: Route) => {
    const req = route.request(), url = new URL(req.url()), path = url.pathname;
    const json = (body: unknown) => route.fulfill({ json: body });
    if (path.endsWith('/csrf')) return json({ token: 'fixture', headerName: 'X-XSRF-TOKEN' });
    if (path.endsWith('/refresh')) return json({ accessToken: 'fixture', user });
    if (path.endsWith('/vneid-config')) return json({ enabled: false });
    if (path === '/api/v1/me') return json(user);
    if (path.endsWith('/notifications')) return json({ ...empty, unreadCount: 0 });
    if (path === '/api/v1/contracts/4') return json(doc);
    if (path === '/api/v1/contracts/4/pdf') return route.fulfill({ contentType: 'application/pdf', body: pdf });
    if (path.endsWith('/owner/properties')) return json([{ id: '4', name: 'An Cư', approvalStatus: 'APPROVED' }]);
    if (path.endsWith('/owner/rental-requests')) { const items = url.searchParams.get('status') === 'ACCEPTED' ? [{ id: '31', apartmentId: '5', apartmentTitle: 'Căn hộ A.101', customerId: '2', customerName: snapshot.customer.fullName, status: 'ACCEPTED', version: 0, contractCompleted: false }] : []; return json({ ...empty, items, totalElements: items.length, totalPages: items.length ? 1 : 0 }); }
    if (path.endsWith('/contract-context')) return json({ rentalRequestId: '31', requestVersion: 0, sourceVersion: 'a'.repeat(64), snapshot, advertisedMonthlyRent: '5000000', suggestedDeposit: '1000000', templateClauses: [{ title: 'Thỏa thuận thuê nhà', body: 'Hai bên thực hiện các điều kiện đã thống nhất.' }], existingDraft: null });
    if (path.endsWith('/owner/invoices')) return json(empty);
    if (['/api/v1/owner/apartments', '/api/v1/owner/tenancies', '/api/v1/me/tenancies', '/api/v1/owner/maintenance-tickets'].includes(path)) return json([]);
    unexpected.push(req.method() + ' ' + path); return route.fulfill({ status: 404 });
  };
  await page.route('**/api/**', api);
  try {
    await page.setViewportSize({ width, height: 950 });
    if (owner) {
      await page.goto(base + '/app?tab=rental_requests&propertyId=4');
      await page.getByLabel('Trạng thái', { exact: true }).selectOption('CONTRACTING');
      await page.getByRole('button', { name: 'Tạo hợp đồng', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: 'Tạo hợp đồng thuê', exact: true });
      for (const heading of ['Thông tin bên cho thuê (Bên A)', 'Thông tin bên thuê (Bên B)', 'Tài sản cho thuê']) {
        await dialog.getByRole('button', { name: 'Tiếp theo →', exact: true }).click();
        await dialog.getByRole('heading', { name: heading, exact: true }).waitFor();
        check(await dialog.getByText(/căn cước mẫu|quyền khai thác mẫu|VNeID mô phỏng/).count() === 0, 'Sample banner remains');
      }
      check(await dialog.getByRole('heading', { name: 'Tài khoản nhận tiền đã lưu', exact: true }).count() === 0, 'Saved receiving account remains');
      check(await dialog.getByText('8815801950', { exact: true }).count() === 0, 'Owner bank number remains in authoring UI');
    } else {
      await page.goto(base + '/contracts/4');
      const life = page.getByRole('region', { name: 'Ký tiếp hoặc bàn giao' });
      await life.getByRole('heading', { name: 'Vòng đời hợp đồng', exact: true }).waitFor();
      await life.getByText(/Yêu cầu thuê tiếp mở trong 10 ngày cuối/).waitFor();
      const form = life.getByRole('form', { name: 'Gửi yêu cầu thuê tiếp', exact: true });
      if (mode === 'early') check(await form.count() === 0, 'Early renewal form is available');
      else { await form.waitFor(); check(await form.getByRole('button', { name: 'Gửi yêu cầu thuê tiếp', exact: true }).isDisabled(), 'Renewal consent was skipped'); await form.getByRole('checkbox').check(); check(await form.getByRole('button', { name: 'Gửi yêu cầu thuê tiếp', exact: true }).isEnabled(), 'Eligible tenant cannot submit'); }
    }
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Horizontal overflow');
    check(!errors.length && !unexpected.length, JSON.stringify({ errors, unexpected }));
    return { width, mode, errors, unexpected };
  } finally { await page.unroute('**/api/**', api); }
}

for (const width of [1440, 390]) for (const mode of ['early', 'open', 'wizard']) test(`Contract terms ${mode} ${width}`, async ({ page, baseURL }) => { await exerciseContractTerms(page, baseURL ?? 'http://localhost:3000', width, mode); });

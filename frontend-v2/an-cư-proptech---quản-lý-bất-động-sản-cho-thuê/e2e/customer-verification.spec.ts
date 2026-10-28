import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

async function setup(page: Page, options: { email?: boolean; vneid?: boolean; role?: 'CUSTOMER' | 'OWNER'; failure?: boolean; pending?: boolean; reject?: boolean } = {}) {
  const user = { id: '41', email: 'renter@example.invalid', fullName: 'Người thuê đã xác thực', roles: [options.role ?? 'CUSTOMER'],
    accountStatus: options.pending ? 'PENDING_VERIFICATION' : 'ACTIVE', contactVerificationStatus: 'VERIFIED', version: 2 };
  const citizen = { documentNumber: '999090000041', legalName: user.fullName, dateOfBirth: '1990-01-01', gender: 'Nam', address: 'Địa chỉ kiểm thử' };
  const apartment = { id: '3', title: 'Căn hộ kiểm thử xác thực', description: 'Căn hộ độc lập', propertyName: 'Tài sản kiểm thử',
    address: 'Địa chỉ căn hộ', city: 'Đà Nẵng', district: 'Hải Châu', ward: null, areaM2: '40', floor: 1, bedrooms: 1, bathrooms: 1,
    advertisedMonthlyRent: '4500000', deposit: '4500000', availability: 'VACANT', amenities: [], images: [], rentalRightsAvailable: true,
    publicOwner: { displayName: 'Chủ nhà kiểm thử' } };
  let failed = options.failure ?? false;
  let request: { id: string; status: string; version: number; [key: string]: unknown } | null = null;
  let manualReads = 0, commands = 0, historyReads = 0;
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('requestfailed', request => { if (request.failure()?.errorText !== 'net::ERR_ABORTED') errors.push(request.url()); });
  page.on('console', message => {
    if (message.type() === 'error' && !message.location().url.endsWith('/favicon.ico')
      && !(options.failure && message.text().includes('status of 503'))
      && !(options.reject && message.text().includes('status of 403'))) errors.push(message.text());
  });
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/v1/auth/vneid-config') return route.fulfill({ json: { enabled: false } });
    if (path === '/api/v1/auth/csrf') return route.fulfill({ json: { token: 'csrf-test', headerName: 'X-XSRF-TOKEN' } });
    if (path === '/api/v1/auth/refresh') return route.fulfill({ json: { accessToken: 'renter-test', tokenType: 'Bearer', expiresIn: 900, user } });
    if (path === '/api/v1/me') return route.fulfill({ json: user });
    if (path === '/api/v1/me/profile') return route.fulfill({ json: { ...user, emailVerified: !!options.email, phoneVerified: false, phone: null, address: null, bio: null, dateOfBirth: null, emailOtpAvailable: true } });
    if (path === '/api/v1/me/verifications') return failed
      ? route.fulfill({ status: 503, json: { message: 'Không tải được trạng thái xác thực' } })
      : route.fulfill({ json: { emailVerified: !!options.email, vneid: { status: options.vneid ? 'VERIFIED' : 'UNVERIFIED', verifiedAt: options.vneid ? '2026-10-28T01:00:00Z' : null, identity: options.vneid ? citizen : null } } });
    if (path === '/api/v1/me/identity') { manualReads++; return route.fulfill({ status: 204 }); }
    if (path.endsWith('/tenancies')) return route.fulfill({ json: [] });
    if (path === '/api/v1/apartments/3') return route.fulfill({ json: apartment });
    if (path === '/api/v1/me/apartments/3/rental-requests') { historyReads++; return route.fulfill({ json: request?.status === 'PENDING' ? [request] : [] }); }
    if (path === '/api/v1/apartments/3/rental-requests') {
      commands++;
      expect(route.request().headers().authorization).toBe('Bearer renter-test');
      expect(route.request().postDataJSON()).toEqual({ message: 'Muốn thuê căn hộ' });
      if (options.reject) return route.fulfill({ status: 403, json: { code: 'CONTACT_NOT_VERIFIED', message: 'Cần xác thực lại tài khoản' } });
      request = { id: '71', apartmentId: '3', apartmentTitle: apartment.title, apartmentAddress: apartment.address, monthlyRent: '4500000',
        customerId: user.id, customerName: user.fullName, customerEmail: user.email, message: 'Muốn thuê căn hộ', status: 'PENDING', createdAt: '2026-10-28T01:00:00Z', version: 0 };
      return route.fulfill({ status: 201, json: request });
    }
    if (path === '/api/v1/me/rental-requests/71/cancel') {
      expect(route.request().postDataJSON()).toEqual({ version: 0 });
      request = { ...request!, status: 'CANCELLED', version: 1 };
      return route.fulfill({ json: request });
    }
    if (path === '/api/v1/me/rental-requests') return route.fulfill({ json: { items: request ? [request] : [], page: 0, size: 20, totalPages: request ? 1 : 0, totalElements: request ? 1 : 0 } });
    throw new Error(`Unexpected endpoint ${path}`);
  });
  return { manualReads: () => manualReads, commands: () => commands, historyReads: () => historyReads, retry: () => { failed = false; }, check: () => expect(errors).toEqual([]) };
}

for (const width of [1440, 390]) {
  test(`VNeID verified Customer requests, reloads and cancels without legacy identity at ${width}px`, async ({ page }) => {
    const fixture = await setup(page, { vneid: true });
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/apartments/3');
    await page.getByLabel('Lời nhắn cho chủ nhà').fill('Muốn thuê căn hộ');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    mkdirSync('test-results/visual', { recursive: true });
    await page.screenshot({ path: `test-results/visual/customer-vneid-${width}.png`, fullPage: true });
    await page.getByRole('button', { name: 'Gửi yêu cầu thuê', exact: true }).click();
    await expect(page.getByText('Đã gửi yêu cầu thuê', { exact: true })).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.reload();
    await expect(page.getByText('Đã gửi yêu cầu thuê', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Hủy yêu cầu thuê', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Gửi yêu cầu thuê', exact: true })).toBeVisible();
    expect(fixture.commands()).toBe(1);
    expect(fixture.manualReads()).toBe(0);
    fixture.check();
  });
}

for (const variant of [{ email: true, role: 'CUSTOMER' as const }, { vneid: true, role: 'OWNER' as const }]) {
  test(`${variant.email ? 'Email verified Customer' : 'VNeID Owner as renter'} does not need a manual CCCD dossier`, async ({ page }) => {
    const fixture = await setup(page, variant);
    await page.goto('/apartments/3');
    await page.getByLabel('Lời nhắn cho chủ nhà').fill('Muốn thuê căn hộ');
    await page.getByRole('button', { name: 'Gửi yêu cầu thuê', exact: true }).click();
    await expect(page.getByText('Đã gửi yêu cầu thuê', { exact: true })).toBeVisible();
    expect(fixture.manualReads()).toBe(0);
    fixture.check();
  });
}

test('summary verified or manual data alone cannot replace server email/VNeID evidence', async ({ page }) => {
  const fixture = await setup(page);
  await page.goto('/apartments/3');
  await page.getByRole('button', { name: 'Gửi yêu cầu thuê', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('email hoặc VNeID mô phỏng');
  await expect(dialog.getByRole('link', { name: 'Quản lý xác thực tài khoản' })).toHaveAttribute('href', '/account/verification');
  await expect(dialog.getByText('Cập nhật CCCD', { exact: true })).toHaveCount(0);
  expect(fixture.commands()).toBe(0);
  expect(fixture.historyReads()).toBe(0);
  expect(fixture.manualReads()).toBe(0);
  fixture.check();
});

test('verification read failure offers retry without sending or demanding manual CCCD', async ({ page }) => {
  const fixture = await setup(page, { vneid: true, failure: true });
  await page.goto('/apartments/3');
  await expect(page.getByRole('alert')).toContainText('Không tải được trạng thái xác thực');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(fixture.commands()).toBe(0);
  fixture.retry();
  await page.getByRole('button', { name: 'Tải lại trạng thái xác thực' }).click();
  await page.getByLabel('Lời nhắn cho chủ nhà').fill('Muốn thuê căn hộ');
  await page.getByRole('button', { name: 'Gửi yêu cầu thuê', exact: true }).click();
  await expect(page.getByText('Đã gửi yêu cầu thuê', { exact: true })).toBeVisible();
  expect(fixture.manualReads()).toBe(0);
  fixture.check();
});

test('Backend rejection still blocks a renter after an earlier verified UI read', async ({ page }) => {
  const fixture = await setup(page, { vneid: true, reject: true });
  await page.goto('/apartments/3');
  await page.getByLabel('Lời nhắn cho chủ nhà').fill('Muốn thuê căn hộ');
  await page.getByRole('button', { name: 'Gửi yêu cầu thuê', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText('Đã gửi yêu cầu thuê', { exact: true })).toHaveCount(0);
  expect(fixture.commands()).toBe(1);
  fixture.check();
});

test('verified Customer settings opens read-only VNeID identity without manual fields', async ({ page }) => {
  const fixture = await setup(page, { vneid: true });
  await page.goto('/account/settings');
  await page.getByRole('link', { name: 'Xem căn cước đã xác thực' }).click();
  await expect(page.getByText('999090000041', { exact: true })).toBeVisible();
  await expect(page.locator('#identity-name')).toHaveCount(0);
  expect(fixture.manualReads()).toBe(0);
  fixture.check();
});

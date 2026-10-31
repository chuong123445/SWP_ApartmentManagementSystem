import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { mockGoogleIdentity } from './support/google-identity';

const diagnostics = new WeakMap<Page, { console: string[]; network: string[] }>();
test.beforeEach(async ({ page }) => {
  await mockGoogleIdentity(page);
  // Hồi quy OAuth độc lập Backend đang chạy; các fixture cụ thể ghi đè route này.
  await page.route('**/api/v1/auth/csrf', route => route.fulfill({ json: { token: 'vneid-csrf', headerName: 'X-XSRF-TOKEN' } }));
  await page.route('**/api/v1/auth/refresh', route => route.fulfill({ status: 401, json: { message: 'Chưa đăng nhập' } }));
  await page.route('**/api/v1/apartments?*', route => route.fulfill({ json: { items: [], page: 0, totalPages: 0, totalElements: 0, size: 6 } }));
  for (const endpoint of ['apartments/address-options', 'me/tenancies', 'me/apartments']) {
    await page.route(`**/api/v1/${endpoint}`, route => route.fulfill({ json: [] }));
  }
  const log = { console: [] as string[], network: [] as string[] }; diagnostics.set(page, log);
  page.on('console', message => { if (message.type() === 'error') log.console.push(`${message.text()} [${message.location().url}]`); });
  page.on('requestfailed', request => {
    if (request.failure()?.errorText !== 'net::ERR_ABORTED') log.network.push(`${new URL(request.url()).pathname}: ${request.failure()?.errorText}`);
  });
});
test.afterEach(async ({ page }) => {
  const log = diagnostics.get(page)!;
  // 401 guest refresh and the explicitly tested 409 conflict are expected.
  const expectedStatuses = test.info().title.startsWith('Existing-email') ? ['401', '409'] : ['401'];
  // Trình duyệt có thể tự yêu cầu favicon.ico; project hiện chưa có favicon.
  const unexpected = log.console.filter(value => !(value.includes('status of 404') && value.includes('/favicon.ico]'))
    && !expectedStatuses.some(status => value.includes(`status of ${status}`)));
  expect(unexpected).toEqual([]);
  expect(log.network).toEqual([]);
});

test('Unconfigured VNeID stays disabled on desktop/mobile and callback explains it', async ({ page }) => {
  await page.route('**/api/v1/auth/vneid-config', route => route.fulfill({ json: { enabled: false } }));
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/register');
    await expect(page.getByRole('button', { name: 'Đăng ký bằng VNeID mô phỏng' })).toBeDisabled();
    await expect(page.getByText('VNeID chưa được cấu hình.', { exact: false })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    mkdirSync('test-results/visual', { recursive: true });
    await page.screenshot({ path: `test-results/visual/vneid-register-${width}.png`, fullPage: true });
    await page.goto('/login');
    await expect(page.getByRole('button', { name: 'Đăng nhập bằng VNeID mô phỏng' })).toBeDisabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await page.goto('/auth/vneid/callback');
  await expect(page.getByRole('alert')).toHaveText('VNeID chưa được cấu hình.');
  await page.getByRole('link', { name: 'Quay lại để thử lại' }).click();
  await expect(page).toHaveURL(/\/login$/); expect(errors).toEqual([]);
});

// Browser-only OAuth fixture. Does not prove a live Auth0 tenant connection;
// signature validation is tested separately by Backend RSA/JWKS tests.
async function oauthFixture(page: Page, intent: 'login' | 'verify', reject = false) {
  const errors: string[] = [];page.on('pageerror', e => errors.push(e.message));
  let complete = false; let commands = 0; let nonce = '';
  const user = () => ({ id: '11111111-1111-1111-1111-111111111111', email: 'oauth-test@example.invalid', fullName: 'Người kiểm thử',
    roles: ['CUSTOMER'], accountStatus: complete || intent === 'login' ? 'ACTIVE' : 'PENDING_VERIFICATION',
    contactVerificationStatus: complete || intent === 'login' ? 'VERIFIED' : 'UNVERIFIED', version: 1 });
  const session = () => ({ accessToken: 'internal-browser-fixture', tokenType: 'Bearer', expiresIn: 900, user: user() });
  await page.route('**/api/v1/auth/vneid-config', route => route.fulfill({ json: { enabled: true, issuer: 'https://auth0-test.invalid/', clientId: 'test-spa', audience: 'test-api', connection: 'test-connection' } }));
  await page.route('**/api/v1/auth/refresh', route => intent === 'verify' || complete ? route.fulfill({ json: session() }) : route.fulfill({ status: 401, json: { code: 'UNAUTHENTICATED', message: 'Chưa đăng nhập' } }));
  await page.route('**/api/v1/me', route => route.fulfill({ json: user() }));
  await page.route('**/api/v1/me/verifications', route => route.fulfill({ json: { emailVerified: false,
    vneid: complete ? { status: 'VERIFIED', verifiedAt: '2026-10-27T01:00:00Z', identity: {
      documentNumber: '048090000002', legalName: 'Người kiểm thử', dateOfBirth: '1990-05-20', gender: 'Nam', address: 'Địa chỉ kiểm thử',
    } } : { status: 'UNVERIFIED', verifiedAt: null, identity: null },
  } }));
  await page.route('**/api/v1/auth/vneid-login', route => {
    commands++;expect(route.request().headers()['authorization']).toBe('Bearer external-browser-fixture');
    expect(route.request().headers()['x-xsrf-token']).toBeTruthy();
    if (reject) return route.fulfill({ status: 409, json: { code: 'VNEID_ACCOUNT_LINK_REQUIRED', message: 'Email đã có tài khoản. Hãy đăng nhập tài khoản đó để liên kết VNeID.' } });
    complete = true; return route.fulfill({ json: session() });
  });
  await page.route('**/api/v1/me/verifications/vneid', route => {
    commands++;expect(route.request().headers()['authorization']).toBe('Bearer internal-browser-fixture');
    expect(route.request().postDataJSON()).toEqual({ auth0AccessToken: 'external-browser-fixture' });
    complete = true;return route.fulfill({ json: user() });
  });
  await page.route('https://auth0-test.invalid/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/authorize') {
      nonce = url.searchParams.get('nonce')!;
      expect(url.searchParams.get('audience')).toBe('test-api');
      expect(url.searchParams.get('code_challenge_method')).toBe('S256');
      expect(url.searchParams.get('prompt')).toBe('login');
      return route.fulfill({ status: 302, headers: { location: `${url.searchParams.get('redirect_uri')}?code=fixture-code&state=${encodeURIComponent(url.searchParams.get('state')!)}` } });
    }
    if (url.pathname === '/oauth/token') {
      const base64 = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
      const now = Math.floor(Date.now() / 1000);
      const id = `${base64({ alg: 'RS256', typ: 'JWT' })}.${base64({ iss: 'https://auth0-test.invalid/', sub: 'auth0|fixture', aud: 'test-spa', iat: now, exp: now + 3600, nonce })}.fixture-signature`;
      return route.fulfill({ json: { access_token: 'external-browser-fixture', id_token: id, token_type: 'Bearer', expires_in: 3600, scope: 'openid profile email' } });
    }
    return route.fulfill({ json: {} });
  });
  return { errors, commands: () => commands };
}

test('OAuth SDK callback registers using one backend command and keeps JWT out of storage', async ({ page }) => {
  const fixture = await oauthFixture(page, 'login');
  await page.goto('/register');await page.getByRole('button', { name: 'Đăng ký bằng VNeID mô phỏng' }).click();
  await expect(page).toHaveURL(new URL('/', test.info().project.use.baseURL as string).href);
  await expect(page.getByRole('button', { name: 'Vai trò và tài khoản' })).toBeVisible();
  expect(fixture.commands()).toBe(1);
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain('internal-browser-fixture');
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain('external-browser-fixture');
  expect(fixture.errors).toEqual([]);
});

test('Existing pending account completes self verification with distinct tokens on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const fixture = await oauthFixture(page, 'verify');
  await page.goto('/account/verification');await page.getByRole('button', { name: 'Xác thực bằng VNeID mô phỏng' }).click();
  await expect(page.getByText('Tài khoản đã xác thực.', { exact: false })).toBeVisible();
  expect(fixture.commands()).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/visual/vneid-self-mobile.png', fullPage: true });
  expect(fixture.errors).toEqual([]);
});

test('Existing-email rejection is visible and returns to login without creating a session', async ({ page }) => {
  const fixture = await oauthFixture(page, 'login', true);
  await page.goto('/login');await page.getByRole('button', { name: 'Đăng nhập bằng VNeID mô phỏng' }).click();
  await expect(page.getByRole('alert')).toContainText('Email đã có tài khoản.');
  expect(fixture.commands()).toBe(1);
  await page.getByRole('link', { name: 'Quay lại để thử lại' }).click();
  await expect(page.getByRole('heading', { name: 'Chào mừng trở lại' })).toBeVisible();
  expect(fixture.errors).toEqual([]);
});

test('Remembered Auth0 SSO session still requests explicit reauthentication before a backend login', async ({ page }) => {
  const fixture = await oauthFixture(page, 'login');
  await page.context().addCookies([{ name: 'auth0', value: 'remembered-account-a', domain: 'auth0-test.invalid', path: '/', secure: true, httpOnly: true, sameSite: 'Lax' }]);
  await page.route('https://auth0-test.invalid/authorize*', async route => {
    const url = new URL(route.request().url());
    expect((await route.request().allHeaders()).cookie).toContain('auth0=remembered-account-a');
    expect(url.searchParams.get('prompt')).toBe('login');
    expect(url.searchParams.has('login_hint')).toBe(false);
    return route.fulfill({ contentType: 'text/html; charset=utf-8', body: '<html><head><title>Auth0 test login</title></head><body><h1>Đăng nhập lại Auth0</h1><p>Nhập tài khoản muốn kiểm thử.</p></body></html>' });
  });
  await page.goto('/login');await page.getByRole('button', { name: 'Đăng nhập bằng VNeID mô phỏng' }).click();
  await expect(page).toHaveURL(/^https:\/\/auth0-test\.invalid\/authorize\?/);
  await expect(page.getByRole('heading', { name: 'Đăng nhập lại Auth0' })).toBeVisible();
  expect(fixture.commands()).toBe(0);
  expect(fixture.errors).toEqual([]);
});

async function apartmentReturnFixture(page: Page) {
  let manualReads = 0;
  await page.route('**/api/v1/apartments/3', route => route.fulfill({ json: {
    id: '3', title: 'Căn hộ quay lại sau VNeID', description: '', address: 'Địa chỉ kiểm thử', propertyName: 'Tài sản kiểm thử',
    areaM2: '40', bedrooms: 1, bathrooms: 1, advertisedMonthlyRent: '4500000', availability: 'VACANT', amenities: [], images: [],
    publicOwner: { displayName: 'Chủ nhà kiểm thử' },
  } }));
  await page.route('**/api/v1/me/apartments/3/rental-requests', route => route.fulfill({ json: [] }));
  await page.route('**/api/v1/me/identity', route => { manualReads++; return route.fulfill({ status: 204 }); });
  return () => manualReads;
}

test('VNeID login returns to numeric apartment ID and does not require manual identity', async ({ page }) => {
  const fixture = await oauthFixture(page, 'login');
  const manualReads = await apartmentReturnFixture(page);
  await page.goto('/apartments/3');
  await page.getByRole('link', { name: 'Đăng nhập để gửi yêu cầu thuê' }).click();
  await page.getByRole('button', { name: 'Đăng nhập bằng VNeID mô phỏng' }).click();
  await expect(page).toHaveURL(/\/apartments\/3$/);
  await expect(page.getByLabel('Lời nhắn cho chủ nhà')).toBeVisible();
  expect(fixture.commands()).toBe(1);
  expect(manualReads()).toBe(0);
  expect(fixture.errors).toEqual([]);
});

test('pending Customer returns to apartment after self verification through the actual OAuth callback', async ({ page }) => {
  const fixture = await oauthFixture(page, 'verify');
  const manualReads = await apartmentReturnFixture(page);
  await page.goto('/apartments/3');
  await page.getByRole('button', { name: 'Gửi yêu cầu thuê', exact: true }).click();
  await page.getByRole('link', { name: 'Quản lý xác thực tài khoản' }).click();
  await page.getByRole('button', { name: 'Xác thực bằng VNeID mô phỏng' }).click();
  await expect(page).toHaveURL(/\/apartments\/3$/);
  await expect(page.getByLabel('Lời nhắn cho chủ nhà')).toBeVisible();
  expect(fixture.commands()).toBe(1);
  expect(manualReads()).toBe(0);
  expect(fixture.errors).toEqual([]);
});

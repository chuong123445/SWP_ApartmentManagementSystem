import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { login, refresh, logout } from '@/services/auth/authService';
import { apiFetch, ApiError, setAccessToken, setRefreshHandler } from '@/services/http/client';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; setAccessToken(null); setRefreshHandler(null); });
const session = { accessToken: 'jwt', tokenType: 'Bearer', expiresIn: 900,
  user: { id: 'account-id', fullName: 'Chủ nhà', email: 'owner@ancu.local', roles: ['OWNER'],
    accountStatus: 'ACTIVE', contactVerificationStatus: 'VERIFIED', version: 0 } };

test('login obtains CSRF and uses cookies, preserving password and server role', async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(options?.credentials, 'same-origin');
    if (url === '/api/v1/auth/csrf') return Response.json({ token: 'csrf', headerName: 'X-XSRF-TOKEN' });
    assert.equal(url, '/api/v1/auth/login');
    assert.equal(new Headers(options?.headers).get('X-XSRF-TOKEN'), 'csrf');
    assert.deepEqual(JSON.parse(options!.body as string), { email: 'owner@ancu.local', password: ' spaces stay ' });
    return Response.json(session);
  };
  assert.deepEqual(await login(' owner@ancu.local ', ' spaces stay '), session);
});

test('invalid credentials return the backend error without a demo login', async () => {
  globalThis.fetch = async url => url === '/api/v1/auth/csrf'
    ? Response.json({ token: 'csrf', headerName: 'X-XSRF-TOKEN' })
    : Response.json({ code: 'INVALID_CREDENTIALS', message: 'Email hoặc mật khẩu không đúng.' }, { status: 401 });
  await assert.rejects(login('owner@ancu.local', 'wrong'), (error: ApiError) => error.status === 401 && error.code === 'INVALID_CREDENTIALS');
});

test('concurrent refresh calls share one rotation request', async () => {
  let calls = 0;
  globalThis.fetch = async url => {
    calls++;
    return url === '/api/v1/auth/csrf' ? Response.json({ token: 'csrf', headerName: 'X-XSRF-TOKEN' }) : Response.json(session);
  };
  const [a, b] = await Promise.all([refresh(), refresh()]);
  assert.deepEqual(a, b);
  assert.equal(calls, 2);
});

test('protected API adds JWT and retries once after refresh', async () => {
  let calls = 0;
  setAccessToken('expired');
  setRefreshHandler(async () => { setAccessToken('new-token'); });
  globalThis.fetch = async (_url, options) => {
    calls++;
    assert.equal(new Headers(options?.headers).get('Authorization'), calls === 1 ? 'Bearer expired' : 'Bearer new-token');
    return calls === 1 ? new Response(null, { status: 401 }) : Response.json([]);
  };
  assert.equal((await apiFetch('/api/rooms')).status, 200);
  assert.equal(calls, 2);
});

test('logout sends CSRF and only resolves after server revocation succeeds', async () => {
  globalThis.fetch = async (url, options) => {
    if (url === '/api/v1/auth/csrf') return Response.json({ token: 'csrf', headerName: 'X-XSRF-TOKEN' });
    assert.equal(url, '/api/v1/auth/logout');
    assert.equal(options?.method, 'POST');
    assert.equal(new Headers(options?.headers).get('X-XSRF-TOKEN'), 'csrf');
    return new Response(null, { status: 204 });
  };
  await logout();
});

test('failed logout is surfaced so the UI can retain the session and offer retry', async () => {
  globalThis.fetch = async url => {
    if (url === '/api/v1/auth/csrf') return Response.json({ token: 'csrf', headerName: 'X-XSRF-TOKEN' });
    throw new TypeError('offline');
  };
  await assert.rejects(logout(), /Không thể kết nối máy chủ/);
});

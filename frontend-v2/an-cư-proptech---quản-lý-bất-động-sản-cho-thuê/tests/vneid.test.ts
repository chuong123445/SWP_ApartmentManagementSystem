import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { vneidLogin, verifyVneid, getVneidConfig } from '../src/services/auth/vneidService.ts';
import { setAccessToken, setRefreshHandler, ApiError } from '../src/services/http/client.ts';
const original = globalThis.fetch;
afterEach(() => { globalThis.fetch = original; setAccessToken(null); setRefreshHandler(null); });
test('VNeID login sends Auth0 bearer and CSRF, without citizen JSON or local token', async () => {
  setAccessToken('internal-old');
  globalThis.fetch = async (url, init) => {
    if (url === '/api/v1/auth/csrf') return Response.json({ token: 'csrf', headerName: 'X-XSRF-TOKEN' });
    assert.equal(url, '/api/v1/auth/vneid-login'); assert.equal(init?.method, 'POST');
    assert.equal(new Headers(init?.headers).get('Authorization'), 'Bearer external');
    assert.equal(new Headers(init?.headers).get('X-XSRF-TOKEN'), 'csrf'); assert.equal(init?.body, undefined);
    return Response.json({ accessToken: 'new-internal' });
  };
  assert.equal((await vneidLogin('external')).accessToken, 'new-internal');
});
test('Self verification uses internal bearer and only external token in strict body', async () => {
  setAccessToken('internal');
  globalThis.fetch = async (url, init) => {
    if (url === '/api/v1/auth/csrf') return Response.json({ token: 'csrf', headerName: 'X-XSRF-TOKEN' });
    assert.equal(url, '/api/v1/me/verifications/vneid');
    assert.equal(new Headers(init?.headers).get('Authorization'), 'Bearer internal');
    assert.equal(new Headers(init?.headers).get('X-XSRF-TOKEN'), 'csrf');
    assert.deepEqual(JSON.parse(init?.body as string), { auth0AccessToken: 'external' });
    return Response.json({ contactVerificationStatus: 'VERIFIED' });
  };
  assert.equal((await verifyVneid('external')).contactVerificationStatus, 'VERIFIED');
});
test('Duplicate external account remains an error and does not fall back to registration', async () => {
  globalThis.fetch = async url => url === '/api/v1/auth/csrf'
    ? Response.json({ token: 'csrf', headerName: 'X-XSRF-TOKEN' })
    : Response.json({ code: 'VNEID_ACCOUNT_LINK_REQUIRED', message: 'Đăng nhập tài khoản cũ.' }, { status: 409 });
  await assert.rejects(vneidLogin('external'), (e: ApiError) => e.status === 409 && e.code === 'VNEID_ACCOUNT_LINK_REQUIRED');
});
test('Public configuration reports disabled integration without claiming authentication', async () => {
  globalThis.fetch = async (url, init) => { assert.equal(url, '/api/v1/auth/vneid-config'); assert.equal(init?.cache, 'no-store'); return Response.json({ enabled: false }); };
  assert.equal((await getVneidConfig()).enabled, false);
});

import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { register } from '@/services/auth/authService';
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
test('Registration obtains CSRF without caller-controlled role and preserves password whitespace', async () => {
  globalThis.fetch = async (url, options) => {
    if (url === '/api/v1/auth/csrf') return Response.json({ token: 'csrf', headerName: 'X-XSRF-TOKEN' });
    assert.equal(url, '/api/v1/auth/register');assert.equal(options?.credentials, 'same-origin');
    assert.equal(new Headers(options?.headers).get('X-XSRF-TOKEN'), 'csrf');
    assert.deepEqual(JSON.parse(options!.body as string), { fullName: 'New Owner', email: 'new@example.invalid', password: ' Password!12345 ' });
    return Response.json({ roles: ['CUSTOMER'], accountStatus: 'PENDING_VERIFICATION' }, { status: 201 });
  };
  assert.equal((await register({ fullName: ' New Owner ', email: ' new@example.invalid ', password: ' Password!12345 ' })).accountStatus, 'PENDING_VERIFICATION');
});
test('Duplicate registration reports backend error without treating it as successful', async () => {
  globalThis.fetch = async url => url === '/api/v1/auth/csrf' ? Response.json({ token: 'csrf', headerName: 'X-XSRF-TOKEN' }) : Response.json({ message: 'Email đã được sử dụng.' }, { status: 409 });
  await assert.rejects(register({ fullName: 'Customer', email: 'existing@example.invalid', password: 'Password!12345' }), /Email đã được sử dụng/);
});

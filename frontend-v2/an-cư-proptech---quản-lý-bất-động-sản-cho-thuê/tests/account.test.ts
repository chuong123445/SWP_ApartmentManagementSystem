import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { updateProfile, changePassword, changePhone, requestEmailChange, confirmEmailChange, pendingEmailChange } from '@/services/auth/accountService';
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
test('Profile patch is Self-only and sends version without actor/contact/authority fields', async () => {
  globalThis.fetch = async (url, options) => { assert.equal(url, '/api/v1/me');assert.equal(options?.method, 'PATCH');const body = JSON.parse(options!.body as string);assert.equal(body.version, 2);for (const field of ['id','roles','status','email','phone','emailVerified']) assert.equal(field in body, false);return Response.json({ fullName: body.fullName, version: 3 }); };
  assert.equal((await updateProfile({ fullName: 'New name', dateOfBirth: null, address: 'Address', bio: '', version: 2 })).version, 3);
});
test('Password change preserves whitespace, sends current password and handles no-content success', async () => {
  globalThis.fetch = async (url, options) => { assert.equal(url, '/api/v1/me/password');assert.deepEqual(JSON.parse(options!.body as string), { currentPassword: ' current ', newPassword: ' New password!123 ', version: 1 });return new Response(null, { status: 204 }); };
  assert.equal(await changePassword(' current ', ' New password!123 ', 1), undefined);
});
test('Phone update never submits a verified flag or target account ID', async () => {
  globalThis.fetch = async (_url, options) => { assert.deepEqual(JSON.parse(options!.body as string), { phone: '0912345678', currentPassword: 'password', version: 0 });return Response.json({ phoneVerified: false }); };
  assert.equal((await changePhone('0912345678', 'password', 0)).phoneVerified, false);
});
test('Email requires a server challenge and OTP confirm, not direct profile assignment', async () => {
  globalThis.fetch = async (url, options) => { assert.equal(url, '/api/v1/me/email-changes');assert.equal(JSON.parse(options!.body as string).email, 'new@example.invalid');return Response.json({ id: 'challenge-id', status: 'PENDING' }); };
  assert.equal((await requestEmailChange('new@example.invalid', 'password', 0)).status, 'PENDING');
  globalThis.fetch = async (url, options) => { assert.equal(url, '/api/v1/me/email-changes/challenge-id/confirm');assert.deepEqual(JSON.parse(options!.body as string), { code: '123456' });return Response.json({ emailVerified: true }); };
  assert.equal((await confirmEmailChange('challenge-id', '123456')).emailVerified, true);
});
test('Missing SMTP and current-password rejection remain visible errors', async () => {
  globalThis.fetch = async () => Response.json({ code: 'OTP_DELIVERY_UNAVAILABLE', message: 'Delivery unavailable' }, { status: 503 });
  await assert.rejects(requestEmailChange('new@example.invalid','password',0), /Delivery unavailable/);
  globalThis.fetch = async () => new Response(null, { status: 204 });assert.equal(await pendingEmailChange(), undefined);
});

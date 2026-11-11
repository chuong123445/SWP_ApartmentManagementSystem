import {test} from 'node:test';
import assert from 'node:assert/strict';
import {requestPasswordRecovery, verifyPasswordRecovery, resetPassword} from '../src/services/auth/authService';

test('Password recovery sends CSRF for request, OTP verification and single-use password reset proof', async () => {
  const calls: {url: string; body: any}[] = [];
  globalThis.fetch = async (url, init) => {
    if (String(url).endsWith('/csrf')) return Response.json({headerName: 'X-XSRF-TOKEN', token: 'csrf'});
    assert.equal(new Headers(init?.headers).get('X-XSRF-TOKEN'), 'csrf');
    assert.equal(init?.credentials, 'same-origin');
    calls.push({url: String(url), body: JSON.parse(String(init?.body))});
    if (String(url).endsWith('/verify')) return Response.json({challengeId: 'challenge', resetToken: 'proof', expiresAt: '2099-01-01'});
    if (String(url).endsWith('/reset')) return new Response(null, {status: 204});
    return Response.json({challengeId: 'challenge', maskedEmail: 'te***@example.invalid'});
  };
  const challenge = await requestPasswordRecovery(' test@example.invalid ');
  const proof = await verifyPasswordRecovery(challenge.challengeId, '123456');
  await resetPassword(proof, 'New-password!123', 'New-password!123');
  assert.equal(calls[0].url, '/api/v1/auth/password-recovery');
  assert.deepEqual(calls[0].body, {email: 'test@example.invalid'});
  assert.deepEqual(calls[1].body, {challengeId: 'challenge', code: '123456'});
  assert.deepEqual(Object.keys(calls[2].body).sort(), ['challengeId', 'confirmPassword', 'newPassword', 'resetToken']);
  assert.equal(calls[2].body.resetToken, 'proof');
  assert.equal(calls[2].body.newPassword, calls[2].body.confirmPassword);
});

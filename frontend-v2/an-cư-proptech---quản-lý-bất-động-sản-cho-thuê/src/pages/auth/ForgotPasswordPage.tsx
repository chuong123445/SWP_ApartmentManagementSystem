import { BrandLogo } from '@/components/navigation/BrandLogo';
import {useRef, useState} from 'react';
import {useAuth} from '@/hooks/useAuth';
import {Link, useNavigate} from 'react-router';
import {requestPasswordRecovery, verifyPasswordRecovery, resetPassword, type OtpChallenge, type PasswordResetProof} from '@/services/auth/authService';

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const {endSession} = useAuth();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [challenge, setChallenge] = useState<OtpChallenge | null>(null);
  const [proof, setProof] = useState<PasswordResetProof | null>(null);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const writing = useRef(false);
  const run = async (action: () => Promise<void>) => {
    if (writing.current) return;
    writing.current = true; setBusy(true); setError('');
    try { await action(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Chưa thực hiện được. Vui lòng thử lại.'); }
    finally { writing.current = false; setBusy(false); }
  };
  const send = () => run(async () => { setChallenge(await requestPasswordRecovery(email)); setCode(''); });
  const submit = () => run(async () => {
    if (!challenge) { setChallenge(await requestPasswordRecovery(email)); return; }
    if (!proof) { setProof(await verifyPasswordRecovery(challenge.challengeId, code)); return; }
    if (password !== confirmation) throw new Error('Mật khẩu xác nhận không khớp.');
    if (new TextEncoder().encode(password).length > 72) throw new Error('Mật khẩu tối đa 72 byte UTF-8.');
    await resetPassword(proof, password, confirmation);
    endSession();
    navigate('/login', {replace: true, state: {notice: 'Đã đặt lại mật khẩu. Hãy đăng nhập bằng mật khẩu mới.'}});
  });
  const control = 'w-full rounded-lg border border-slate-300 px-4 py-3 mt-2';
  return <main className="min-h-dvh bg-brand-50 flex items-center justify-center p-4">
    <section className="w-full max-w-md bg-white rounded-2xl border p-6 sm:p-8 space-y-5">
      <div className="mb-3"><BrandLogo /></div>
      <h1 className="text-2xl font-bold">Quên mật khẩu</h1>
      {error && <p role="alert" className="text-rose-700 text-sm">{error}</p>}
      <form className="space-y-4" onSubmit={e => {e.preventDefault(); void submit();}}>
        <fieldset disabled={busy} className="space-y-4 min-w-0">
          {!challenge && <label className="block text-sm">Email<input type="email" autoComplete="email" required maxLength={254} className={control} value={email} onChange={e => setEmail(e.target.value)} /></label>}
          {challenge && !proof && <>
            <p role="status" className="text-sm">Nếu email có tài khoản hỗ trợ đặt lại mật khẩu, mã xác nhận sẽ được gửi tới {challenge.maskedEmail}. Mã có hiệu lực 10 phút.</p>
            <label className="block text-sm">Mã OTP<input inputMode="numeric" autoComplete="one-time-code" required pattern="[0-9]{6}" maxLength={6} className={control} value={code} onChange={e => setCode(e.target.value)} /></label>
            <button type="button" className="text-emerald-800 underline text-sm" onClick={() => void send()}>Gửi lại mã OTP</button>
          </>}
          {proof && <>
            <label className="block text-sm">Mật khẩu mới<input type="password" autoComplete="new-password" required minLength={12} maxLength={72} className={control} value={password} onChange={e => setPassword(e.target.value)} /></label>
            <p className="text-xs text-slate-600">Ít nhất 12 ký tự, tối đa 72 byte UTF-8.</p>
            <label className="block text-sm">Xác nhận mật khẩu mới<input type="password" autoComplete="new-password" required maxLength={72} className={control} value={confirmation} onChange={e => setConfirmation(e.target.value)} /></label>
          </>}
          <button type="submit" className="w-full rounded-lg bg-brand-700 text-white px-4 py-3 disabled:opacity-50">{busy ? 'Đang xử lý…' : proof ? 'Đặt lại mật khẩu' : challenge ? 'Xác nhận OTP' : 'Gửi mã OTP'}</button>
        </fieldset>
      </form>
      {challenge && <button type="button" disabled={busy} className="text-sm underline" onClick={() => {setChallenge(null); setProof(null); setCode(''); setPassword(''); setConfirmation(''); setError('');}}>Bắt đầu lại</button>}
      <Link to="/login" className="block text-sm text-brand-800 underline">Quay lại đăng nhập</Link>
    </section>
  </main>;
}

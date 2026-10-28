import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { Building2, LoaderCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { register, type RegistrationInput } from '@/services/auth/authService';
import { requestEmailChange } from '@/services/auth/accountService';
import { SessionLoading } from '@/components/feedback/SessionLoading';
import { VneidButton } from '@/components/auth/VneidButton';

export function RegisterPage() {
  const { user, loading, login } = useAuth();const navigate = useNavigate();
  const [input, setInput] = useState<RegistrationInput>({ fullName: '', email: '', password: '', phone: '' });
  const [confirmation, setConfirmation] = useState('');const [busy, setBusy] = useState(false);const [error, setError] = useState('');
  const [registrationCreated, setRegistrationCreated] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();if (busy) return;setError('');
    if (input.password !== confirmation) { setError('Mật khẩu xác nhận không khớp.');return; }
    if (new TextEncoder().encode(input.password).length > 72) { setError('Mật khẩu tối đa 72 byte UTF-8.');return; }
    setBusy(true);
    let created = false;
    try {
      await register(input);created = true;setRegistrationCreated(true);
      const account = await login(input.email, input.password);
      let notice = 'Đăng ký thành công. Đã gửi OTP; kiểm tra hộp thư hoặc thư rác để xác minh email.';
      try { await requestEmailChange(account.email, input.password, account.version); }
      catch (e) { notice = `Đăng ký thành công, email chưa được xác minh. ${e instanceof Error ? e.message : 'Chưa gửi được OTP.'} Bạn có thể gửi lại OTP bên dưới.`; }
      setInput(value => ({ ...value, password: '' }));setConfirmation('');
      navigate('/account/settings/email', { replace: true, state: { notice } });
    } catch (e) {
      if (created) navigate('/login', { replace: true, state: { notice: 'Tài khoản đã được tạo. Vui lòng đăng nhập để xác minh email.', returnTo: '/account/settings/email' } });
      else setError(e instanceof Error ? e.message : 'Không thể đăng ký. Vui lòng thử lại.');
    } finally { setBusy(false); }
  };
  const cls = 'w-full border border-slate-300 rounded-lg px-4 py-3 mt-1 outline-none focus:border-emerald-600';
  if (loading) return <SessionLoading />;
  if (user && !busy && !registrationCreated) return <Navigate to="/account/settings" replace />;
  return <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
    <section className="w-full max-w-xl bg-white border border-slate-200 rounded-3xl shadow-lg p-8 sm:p-10">
      <Link to="/" className="flex items-center gap-2 text-emerald-700 font-bold mb-7"><Building2 />An Cư PropTech</Link>
      <h1 className="text-2xl font-bold text-slate-900">Tạo tài khoản</h1>
      <p className="text-sm text-slate-500 mt-2 mb-6">Tạo tài khoản và xác thực để bắt đầu. Khi có nhu cầu cho thuê, bạn có thể đăng ký trở thành chủ cho thuê trong cài đặt tài khoản.</p>
      {error && <p role="alert" className="bg-rose-50 text-rose-700 p-3 rounded-lg mb-4">{error}</p>}
      <form onSubmit={submit}><fieldset disabled={busy} className="space-y-4">
        <div><label htmlFor="register-name">Họ và tên</label><input id="register-name" required maxLength={100} autoComplete="name" value={input.fullName} onChange={e => setInput({ ...input, fullName: e.target.value })} className={cls} /></div>
        <div><label htmlFor="register-email">Email</label><input id="register-email" type="email" required maxLength={254} autoComplete="email" value={input.email} onChange={e => setInput({ ...input, email: e.target.value })} className={cls} /></div>
        <div><label htmlFor="register-phone">Số điện thoại (không bắt buộc)</label><input id="register-phone" type="tel" maxLength={20} autoComplete="tel" value={input.phone} onChange={e => setInput({ ...input, phone: e.target.value })} className={cls} /></div>
        <div><label htmlFor="register-password">Mật khẩu</label><input id="register-password" type="password" required minLength={12} maxLength={72} autoComplete="new-password" value={input.password} onChange={e => setInput({ ...input, password: e.target.value })} className={cls} /><p className="text-xs text-slate-500 mt-1">Ít nhất 12 ký tự, tối đa 72 byte UTF-8.</p></div>
        <div><label htmlFor="register-confirm">Nhập lại mật khẩu</label><input id="register-confirm" type="password" required autoComplete="new-password" value={confirmation} onChange={e => setConfirmation(e.target.value)} className={cls} /></div>
        <button type="submit" className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white font-semibold py-3 rounded-lg disabled:opacity-60">{busy ? <><LoaderCircle className="w-4 h-4 animate-spin" />Đang tạo tài khoản...</> : 'Đăng ký'}</button>
      </fieldset></form>
      <VneidButton intent="login" label="Đăng ký bằng VNeID mô phỏng" />
      <p className="text-sm text-slate-500 mt-6 text-center">Đã có tài khoản? <Link to="/login" className="text-emerald-700 font-semibold">Đăng nhập</Link></p>
    </section>
  </main>;
}

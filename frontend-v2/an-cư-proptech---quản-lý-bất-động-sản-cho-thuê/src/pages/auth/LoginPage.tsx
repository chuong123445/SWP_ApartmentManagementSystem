import { BrandLogo } from '@/components/navigation/BrandLogo';
import React, { useState } from 'react';
import { ArrowRight, Eye, EyeOff, LockKeyhole, LoaderCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Link, useLocation, useNavigate } from 'react-router';
import { loginDestination } from '@/utils/navigation';
import { VneidButton } from '@/components/auth/VneidButton';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';

export function LoginPage() {
  const { login, loginWithGoogle, error: sessionError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;
    setError('');
    setIsSubmitting(true);
    try {
      const user = await login(email, password);
      navigate(loginDestination(user, location.state?.returnTo), { replace: true });
    }
    catch (err) { setError(err instanceof Error ? err.message : 'Không thể đăng nhập. Vui lòng thử lại.'); }
    finally { setIsSubmitting(false); }
  };

  return (
    <main className="min-h-dvh bg-brand-50 flex items-center justify-center p-3 sm:p-6 font-sans">
      <div className="w-full max-w-5xl grid md:grid-cols-2 bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-xl">
        <section className="bg-brand-950 p-6 sm:p-9 lg:p-14 text-white flex flex-col justify-between md:min-h-80">
          <Link to="/" aria-label="An Cư PropTech" className="self-start"><BrandLogo onDark /></Link>
          <div className="mt-5 md:my-12"><h1 className="text-3xl lg:text-4xl font-bold leading-tight">Quản lý cho thuê,<br />thuận tiện mỗi ngày.</h1>
            <p className="text-sm text-slate-300 mt-5 leading-7 max-w-xs">Theo dõi phòng, khách thuê và hoạt động quản lý của bạn trong cùng một không gian.</p>
          </div>
        </section>
        <section className="min-w-0 p-5 sm:p-10 lg:p-14 flex flex-col justify-center">
          <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center mb-6"><LockKeyhole className="w-5 h-5" /></div>
          <h2 className="text-2xl font-bold text-slate-900">Chào mừng trở lại</h2>
          <p className="text-sm text-slate-500 mt-2 mb-8">Đăng nhập để tiếp tục quản lý tài khoản của bạn.</p>
          <form onSubmit={submit} className="space-y-5">
            {typeof location.state?.notice === 'string' && <p role="status" className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3">{location.state.notice}</p>}
            {(error || sessionError) && <p role="alert" className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3">{error || sessionError}</p>}
            <div><label htmlFor="login-email" className="block text-sm font-semibold text-slate-700 mb-2">Email</label>
              <input id="login-email" type="email" required maxLength={254} autoComplete="username" value={email}
                disabled={isSubmitting} onChange={event => setEmail(event.target.value)} placeholder="Email của bạn"
                className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" /></div>
            <div><label htmlFor="login-password" className="block text-sm font-semibold text-slate-700 mb-2">Mật khẩu</label>
              <div className="relative"><input id="login-password" type={showPassword ? 'text' : 'password'} required maxLength={128}
                autoComplete="current-password" value={password} disabled={isSubmitting} onChange={event => setPassword(event.target.value)}
                placeholder="Nhập mật khẩu" className="w-full border border-slate-300 rounded-lg pl-4 pr-12 py-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
                <button type="button" aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div></div>
            <button type="submit" disabled={isSubmitting} className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white py-3 rounded-lg text-sm font-semibold transition-colors">
              {isSubmitting ? <><LoaderCircle className="w-4 h-4 animate-spin" />Đang đăng nhập...</> : <>Đăng nhập<ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
          <Link to="/forgot-password" className="text-sm text-brand-700 underline mt-4">Quên mật khẩu?</Link>
          <VneidButton intent="login" label="Đăng nhập bằng VNeID mô phỏng" />
          <GoogleSignInButton disabled={isSubmitting} onCredential={async credential => {
            setError('');
            setIsSubmitting(true);
            try {
              const user = await loginWithGoogle(credential);
              navigate(loginDestination(user, location.state?.returnTo), { replace: true });
            } catch (err) { setError(err instanceof Error ? err.message : 'Không thể đăng nhập Google.'); }
            finally { setIsSubmitting(false); }
          }} />
          <p className="text-sm text-slate-500 mt-6 text-center">Chưa có tài khoản? <Link to="/register" className="text-brand-700 font-semibold">Đăng ký</Link></p>
        </section>
      </div>
    </main>
  );
}

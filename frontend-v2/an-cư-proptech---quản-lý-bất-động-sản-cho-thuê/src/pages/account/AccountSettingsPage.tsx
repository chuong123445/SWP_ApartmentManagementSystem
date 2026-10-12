import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { AccountLayout } from '@/layouts/AccountLayout';
import { useAccountProfile } from '@/hooks/useAccountProfile';
import { useAuth } from '@/hooks/useAuth';
import { changePassword, changePhone, requestEmailChange, confirmEmailChange, pendingEmailChange } from '@/services/auth/accountService';
import type { EmailChallenge } from '@/types/account';
export function AccountSettingsPage() {
  const { profile, error, loading, reload } = useAccountProfile();const { endSession } = useAuth();const navigate = useNavigate();
  const [oldPassword, setOldPassword] = useState('');const [newPassword, setNewPassword] = useState('');const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');const [emailPassword, setEmailPassword] = useState('');const [code, setCode] = useState('');const [challenge, setChallenge] = useState<EmailChallenge | null>(null);
  const [phone, setPhone] = useState('');const [phonePassword, setPhonePassword] = useState('');const [busy, setBusy] = useState('');const [formError, setFormError] = useState('');const [notice, setNotice] = useState('');
  useEffect(() => { if (profile) { setEmail(profile.email);setPhone(profile.phone ?? ''); } }, [profile]);
  useEffect(() => { let active = true;pendingEmailChange().then(c => { if (active && c?.status === 'PENDING') setChallenge(c); }).catch(() => undefined);return () => { active = false; }; }, []);
  const signedOut = (message: string) => { endSession();navigate('/login', { replace: true, state: { notice: message, returnTo: '/account/settings' } }); };
  const run = async (name: string, action: () => Promise<void>) => { if (busy) return;setBusy(name);setFormError('');setNotice('');try { await action(); } catch (e) { setFormError(e instanceof Error ? e.message : 'Không thể cập nhật tài khoản.'); } finally { setBusy(''); } };
  const cls = 'w-full border border-slate-300 rounded-lg px-3 py-2 mt-1';
  return <AccountLayout><h1 className="text-2xl font-bold mb-5">Cài đặt tài khoản</h1>
    {loading && <p role="status">Đang tải cài đặt...</p>}{(error || formError) && <p role="alert" className="bg-rose-50 text-rose-700 p-3 mb-4 rounded-lg">{error || formError}<button onClick={reload} className="ml-3 underline">Tải lại thông tin</button></p>}{notice && <p role="status" className="bg-emerald-50 text-emerald-700 p-3 mb-4 rounded-lg">{notice}</p>}
    {profile && <div className="space-y-6">
      <section className="bg-white border rounded-xl p-6"><h2 className="font-bold text-lg">Mật khẩu</h2><p className="text-sm text-slate-500 mt-1">Đổi mật khẩu sẽ đăng xuất tất cả phiên. Mật khẩu mới cần ít nhất 12 ký tự, tối đa 72 byte UTF-8.</p>
        <form className="space-y-4 mt-4" onSubmit={e => { e.preventDefault();if (newPassword !== confirmPassword) { setFormError('Mật khẩu xác nhận không khớp.');return; }void run('password', async () => { await changePassword(oldPassword, newPassword, profile.version);signedOut('Đã đổi mật khẩu. Vui lòng đăng nhập bằng mật khẩu mới.'); }); }}><fieldset disabled={!!busy} className="grid md:grid-cols-3 gap-4">
          <div><label htmlFor="password-current">Mật khẩu hiện tại</label><input id="password-current" type="password" required autoComplete="current-password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} className={cls} /></div>
          <div><label htmlFor="password-new">Mật khẩu mới</label><input id="password-new" type="password" required minLength={12} autoComplete="new-password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className={cls} /></div>
          <div><label htmlFor="password-confirm">Nhập lại mật khẩu mới</label><input id="password-confirm" type="password" required autoComplete="new-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={cls} /></div>
        </fieldset><button type="submit" disabled={!!busy} className="bg-emerald-600 text-white px-4 py-2 rounded-lg disabled:opacity-50">{busy === 'password' ? 'Đang cập nhật...' : 'Đổi mật khẩu'}</button></form>
      </section>
      <section className="bg-white border rounded-xl p-6"><h2 className="font-bold text-lg">Email đăng nhập</h2><p className="text-sm text-slate-500 mt-1">Hiện tại: {profile.email} · {profile.emailVerified ? 'Đã xác minh' : 'Chưa xác minh'}. Email hiện tại được giữ đến khi bạn xác nhận OTP ở email mới.</p>
        {!profile.emailOtpAvailable && <p className="mt-3 bg-amber-50 text-amber-800 p-3 rounded-lg text-sm">Dịch vụ gửi OTP email chưa sẵn sàng. Hiện chưa thể xác minh hoặc đổi email.</p>}
        <form className="space-y-4 mt-4" onSubmit={e => { e.preventDefault();void run('email', async () => { const c = await requestEmailChange(email, emailPassword, profile.version);setChallenge(c);setCode('');setEmailPassword('');setNotice('Đã gửi OTP. Kiểm tra hộp thư hoặc thư rác của email cần xác minh.'); }); }}><fieldset disabled={!!busy || !profile.emailOtpAvailable} className="grid md:grid-cols-2 gap-4">
          <div><label htmlFor="email-new">Email cần xác minh</label><input id="email-new" type="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} className={cls} /></div><div><label htmlFor="email-password">Mật khẩu hiện tại để gửi OTP</label><input id="email-password" type="password" required autoComplete="current-password" value={emailPassword} onChange={e => setEmailPassword(e.target.value)} className={cls} /></div>
        </fieldset><button type="submit" disabled={!!busy || !profile.emailOtpAvailable} className="border px-4 py-2 rounded-lg disabled:opacity-50">Gửi OTP email</button></form>
        {challenge && <form className="mt-5 pt-4 border-t space-y-3" onSubmit={e => { e.preventDefault();void run('confirm', async () => { await confirmEmailChange(challenge.id, code);signedOut('Đã xác minh và cập nhật email. Vui lòng đăng nhập bằng email vừa xác minh.'); }); }}><p className="text-sm">Mã gửi đến {challenge.destinationHint}; có hiệu lực đến {new Date(challenge.expiresAt).toLocaleTimeString('vi-VN')}.</p><label htmlFor="email-otp">Mã OTP 6 chữ số</label><input id="email-otp" required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e => setCode(e.target.value)} className={cls} /><button type="submit" disabled={!!busy} className="bg-emerald-600 text-white px-4 py-2 rounded-lg">Xác nhận email</button></form>}
      </section>
      <section className="bg-white border rounded-xl p-6"><h2 className="font-bold text-lg">Số điện thoại liên hệ</h2><p className="text-sm text-slate-500 mt-1">{profile.phoneVerified ? 'Số hiện tại đã xác minh.' : 'Chưa xác minh SMS.'} Cập nhật số không tự xác minh; thay đổi sẽ đăng xuất các phiên.</p>
        <form className="space-y-4 mt-4" onSubmit={e => { e.preventDefault();void run('phone', async () => { await changePhone(phone || null, phonePassword, profile.version);signedOut('Đã cập nhật số điện thoại. Vui lòng đăng nhập lại.'); }); }}><fieldset disabled={!!busy} className="grid md:grid-cols-2 gap-4"><div><label htmlFor="phone-number">Số điện thoại</label><input id="phone-number" type="tel" maxLength={20} placeholder="0912345678 hoặc +84912345678" value={phone} onChange={e => setPhone(e.target.value)} className={cls} /></div><div><label htmlFor="phone-password">Mật khẩu hiện tại để đổi số</label><input id="phone-password" type="password" required autoComplete="current-password" value={phonePassword} onChange={e => setPhonePassword(e.target.value)} className={cls} /></div></fieldset><button type="submit" disabled={!!busy} className="border px-4 py-2 rounded-lg disabled:opacity-50">Cập nhật số điện thoại</button></form>
      </section>
    </div>}
  </AccountLayout>;
}

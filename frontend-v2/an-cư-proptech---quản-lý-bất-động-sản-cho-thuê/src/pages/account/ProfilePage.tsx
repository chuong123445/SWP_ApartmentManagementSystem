import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { AccountLayout } from '@/layouts/AccountLayout';
import { useAccountProfile } from '@/hooks/useAccountProfile';
import { useAuth } from '@/hooks/useAuth';
import { updateProfile } from '@/services/auth/accountService';
export function ProfilePage() {
  const { profile, setProfile, error, loading, reload } = useAccountProfile();const { reloadUser } = useAuth();
  const [name, setName] = useState('');const [birthday, setBirthday] = useState('');const [address, setAddress] = useState('');const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);const [formError, setFormError] = useState('');const [notice, setNotice] = useState('');
  useEffect(() => { if (profile) { setName(profile.fullName);setBirthday(profile.dateOfBirth ?? '');setAddress(profile.address ?? '');setBio(profile.bio ?? ''); } }, [profile]);
  const cls = 'w-full border border-slate-300 rounded-lg px-3 py-2 mt-1';
  return <AccountLayout><h1 className="text-2xl font-bold mb-5">Hồ sơ cá nhân</h1>
    {loading && <p role="status">Đang tải hồ sơ...</p>}{(error || formError) && <p role="alert" className="p-3 mb-4 bg-rose-50 text-rose-700 rounded-lg">{error || formError}<button onClick={reload} className="ml-3 underline">Tải lại</button></p>}{notice && <p role="status" className="p-3 mb-4 bg-emerald-50 text-emerald-700 rounded-lg">{notice}</p>}
    {profile && <section className="bg-white border rounded-xl p-6"><div className="mb-5 flex gap-4 items-center"><div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xl font-bold">{profile.fullName.slice(0, 1)}</div><div><p className="font-semibold">{profile.email}</p><p className="text-sm text-slate-500">{profile.roles.join(', ')} · {profile.emailVerified ? 'Email đã xác minh' : 'Email chưa xác minh'}</p></div></div>
      <form onSubmit={async e => { e.preventDefault();if (saving) return;setSaving(true);setFormError('');setNotice('');try { const saved = await updateProfile({ fullName: name, dateOfBirth: birthday || null, address, bio, version: profile.version });setProfile(saved);await reloadUser();setNotice('Đã lưu hồ sơ cá nhân.'); } catch (e) { setFormError(e instanceof Error ? e.message : 'Không thể lưu hồ sơ.'); } finally { setSaving(false); } }} className="space-y-4"><fieldset disabled={saving} className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4"><div><label htmlFor="profile-name">Họ và tên</label><input id="profile-name" required maxLength={100} value={name} onChange={e => setName(e.target.value)} className={cls} /></div><div><label htmlFor="profile-birthday">Ngày sinh</label><input id="profile-birthday" type="date" value={birthday} onChange={e => setBirthday(e.target.value)} className={cls} /></div></div>
        <div><label htmlFor="profile-address">Địa chỉ liên hệ</label><input id="profile-address" maxLength={300} value={address} onChange={e => setAddress(e.target.value)} className={cls} /></div><div><label htmlFor="profile-bio">Giới thiệu</label><textarea id="profile-bio" maxLength={1000} rows={3} value={bio} onChange={e => setBio(e.target.value)} className={cls} /></div>
        <div className="text-sm text-slate-500">Số điện thoại: {profile.phone || 'Chưa thêm'} · <Link to="/account/settings" className="text-emerald-700 underline">Quản lý email, điện thoại và mật khẩu</Link></div>
      </fieldset><button type="submit" disabled={saving} className="bg-emerald-600 text-white px-5 py-2 rounded-lg disabled:opacity-50">{saving ? 'Đang lưu...' : 'Lưu hồ sơ'}</button></form>
    </section>}
  </AccountLayout>;
}

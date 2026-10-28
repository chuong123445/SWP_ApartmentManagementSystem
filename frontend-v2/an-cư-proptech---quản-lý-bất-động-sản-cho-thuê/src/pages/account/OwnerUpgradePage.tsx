import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { AccountLayout } from '@/layouts/AccountLayout';
import { useAuth } from '@/hooks/useAuth';
import { getOwnerUpgradeContext, upgradeOwner, type OwnerUpgradeContext } from '@/services/auth/vneidService';

export function OwnerUpgradePage() {
  const { user, reloadUser } = useAuth();
  const [context, setContext] = useState<OwnerUpgradeContext | null>(null);
  const [loading, setLoading] = useState(true);const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState(false);const [error, setError] = useState('');const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();setLoading(true);setContext(null);setError('');setConsent(false);
    getOwnerUpgradeContext(controller.signal).then(value => { if (!controller.signal.aborted) setContext(value); })
      .catch(e => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Không tải được thông tin tài khoản.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [user?.id, user?.version, revision]);
  const submit = async () => {
    if (!context || !consent || busy) return;setBusy(true);setError('');
    try { await upgradeOwner(context.version);await reloadUser(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Chưa thể nâng cấp tài khoản.'); }
    finally { setBusy(false); }
  };
  const owner = user?.roles.includes('OWNER');
  return <AccountLayout><div className="max-w-2xl">
    <Link to="/account/settings" className="text-sm text-emerald-700 underline">Quay lại cài đặt tài khoản</Link>
    <h1 className="text-2xl font-bold mt-4">Trở thành chủ cho thuê</h1>
    {owner ? <section className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-5"><p role="status" className="font-semibold text-emerald-900">Tài khoản đã là chủ cho thuê.</p><p className="text-sm mt-2 text-slate-600">Bạn có thể vào trang quản lý để thêm tài sản và chuẩn bị thông tin cho thuê.</p><Link to="/app" className="inline-block mt-4 px-4 py-2 rounded-lg bg-emerald-600 text-white">Vào trang quản lý</Link></section>
      : <section className="mt-5 rounded-xl border bg-white p-5 space-y-4">
        <p className="text-slate-600">Chính chủ có thể nâng cấp tự động sau khi xác thực CCCD và kiểm tra tài sản VNeID. Người được ủy quyền hoặc thuê lại dùng luồng hồ sơ Admin duyệt.</p>
        {loading && <p role="status">Đang kiểm tra điều kiện...</p>}
        {context && context.role === 'CUSTOMER' && <>
          {!context.identityVerified ? <Link to="/account/verification" className="inline-block text-emerald-700 underline">Xác thực CCCD qua VNeID trước khi nâng cấp</Link>
            : !context.assetServiceAvailable ? <p className="text-amber-800 bg-amber-50 rounded-lg p-3">Nguồn thông tin tài sản chưa sẵn sàng. Vui lòng thử lại sau hoặc liên hệ quản trị viên.</p>
              : <><label className="flex items-start gap-3 text-sm text-slate-700"><input type="checkbox" checked={consent} disabled={busy} onChange={e => setConsent(e.target.checked)} className="mt-1 shrink-0" /><span>Tôi đồng ý cho hệ thống đọc danh sách tài sản và thông tin quyền sở hữu từ VNeID để kiểm tra điều kiện trở thành chủ cho thuê.</span></label>
                <button type="button" disabled={!consent || busy} onClick={submit} className="px-4 py-3 rounded-lg bg-emerald-600 text-white font-semibold disabled:opacity-50">{busy ? 'Đang kiểm tra tài sản...' : 'Kiểm tra tài sản và nâng cấp'}</button></>}
        </>}
        {context?.role === 'ADMIN' && <p>Tài khoản quản trị không sử dụng chức năng nâng cấp chủ cho thuê.</p>}
        {context?.identityVerified&&context.role==='CUSTOMER'&&<Link to="/account/rental-properties" className="block border rounded-lg p-4 text-emerald-800 font-semibold">Tôi được ủy quyền / thuê lại — Nộp hồ sơ quyền cho thuê</Link>}
      </section>}
    {error && <p role="alert" className="mt-4 text-rose-700">{error}<button type="button" disabled={busy} onClick={() => setRevision(v => v + 1)} className="ml-2 underline">Tải lại điều kiện</button></p>}
  </div></AccountLayout>;
}

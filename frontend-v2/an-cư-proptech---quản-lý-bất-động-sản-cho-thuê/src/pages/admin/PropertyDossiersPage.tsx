import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/hooks/useAuth';
import { AccountMenu } from '@/components/navigation/AccountMenu';
import { Pagination } from '@/components/common/Pagination';
import { DossierDetails } from '@/components/property/DossierDetails';
import { adminDossier, adminDossiers, reviewDossier } from '@/services/property/dossierService';
import { dossierStatusLabels, type Dossier, type DossierStatus, type ReviewDecision } from '@/types/dossier';
import type { PageResult } from '@/types/apartment';

export function PropertyDossiersPage() {
  const { user, logout, isLoggingOut, error: authError } = useAuth();
  const [data, setData] = useState<PageResult<Dossier> | null>(null);const [status, setStatus] = useState<DossierStatus | ''>('PENDING_APPROVAL');
  const [page, setPage] = useState(0);const [loading, setLoading] = useState(true);const [error, setError] = useState('');const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState<Dossier | null>(null);const [reason, setReason] = useState('');const [busy, setBusy] = useState(false);const [confirmed, setConfirmed] = useState(false);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    let active = true;setLoading(true);setError('');
    adminDossiers(page, status).then(result => { if (active) setData(result); }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, status, revision]);
  const decide = async (decision: ReviewDecision) => {
    if (!selected || busy) return;setError('');setNotice('');
    if (decision !== 'APPROVE' && !reason.trim()) { setError('Cần nhập lý do từ chối hoặc yêu cầu bổ sung.');return; }
    if (decision === 'APPROVE' && !confirmed) { setError('Cần xác nhận đã đối chiếu hồ sơ trước khi phê duyệt.');return; }
    setBusy(true);
    try { const saved = await reviewDossier(selected.id, decision, reason.trim(), selected.version);setSelected(saved);setRevision(n => n + 1);setNotice(`Đã cập nhật hồ sơ: ${dossierStatusLabels[saved.status]}.`); }
    catch (e) { setError(e instanceof Error ? e.message : 'Không cập nhật được hồ sơ.');try { setSelected(await adminDossier(selected.id)); } catch { /* original action error is shown */ } }
    finally { setBusy(false); }
  };
  return <div className="min-h-screen bg-slate-50 text-slate-800">
    <header className="bg-white border-b px-4 md:px-8 py-4 flex items-center justify-between gap-3"><Link to="/" className="font-bold text-emerald-700">An Cư PropTech</Link><AccountMenu account={user!} onLogout={logout} isLoggingOut={isLoggingOut} authError={authError} /></header>
    <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-5">
      <h1 className="text-2xl font-bold">Kiểm duyệt tài sản</h1><p className="text-sm text-slate-600">Đối chiếu quyền sở hữu/khai thác, người nộp, tài khoản nhận tiền và chứng từ theo từng tài sản. Phê duyệt không tự công khai căn hộ.</p>
      <div className="flex flex-wrap gap-3 items-center"><label className="text-sm font-semibold">Trạng thái hồ sơ<select className="ml-2 border rounded-lg px-3 py-2 bg-white" value={status} onChange={e => { setStatus(e.target.value as DossierStatus | '');setPage(0);setSelected(null); }}><option value="">Tất cả</option>{(Object.keys(dossierStatusLabels) as DossierStatus[]).map(value => <option key={value} value={value}>{dossierStatusLabels[value]}</option>)}</select></label><button onClick={() => setRevision(n => n + 1)} className="text-sm text-emerald-700 underline">Tải lại hồ sơ</button><span className="text-sm text-slate-500">{data?.totalElements ?? 0} hồ sơ</span></div>
      {error && <p role="alert" className="bg-rose-50 p-3 rounded-lg text-rose-700 text-sm">{error}</p>}{notice && <p role="status" className="bg-emerald-50 p-3 rounded-lg text-emerald-700 text-sm">{notice}</p>}
      <div className="grid lg:grid-cols-2 gap-5">
        <section className="space-y-3">{loading ? <p role="status">Đang tải hồ sơ...</p> : !error && !data?.items.length ? <p className="bg-white border rounded-xl p-6 text-sm text-slate-500">Chưa có hồ sơ phù hợp.</p> : data?.items.map(d => <button key={d.id} data-testid="admin-dossier-card" type="button" disabled={busy} onClick={async () => {
          setError('');setNotice('');setReason('');setConfirmed(false);setBusy(true);
          try { setSelected(await adminDossier(d.id)); } catch (e) { setError(e instanceof Error ? e.message : 'Không tải được hồ sơ.'); } finally { setBusy(false); }
        }} className={`text-left w-full bg-white border rounded-xl p-4 space-y-2 ${selected?.id === d.id ? 'border-emerald-600' : 'border-slate-200'}`}><strong className="block break-words">{d.propertyName}</strong><span className="block text-sm text-slate-500 break-words">{d.propertyAddress}</span><span className="text-xs">{dossierStatusLabels[d.status]} · {d.applicantName}</span></button>)}{data && !loading && <Pagination page={data.page} totalPages={data.totalPages} onChange={value => { setPage(value);setSelected(null); }} />}</section>
        {selected && <section aria-label="Chi tiết hồ sơ kiểm duyệt" className="bg-white border rounded-xl p-5 space-y-4 min-w-0"><h2 className="text-lg font-bold break-words">{selected.propertyName}</h2><DossierDetails dossier={selected} />
          {selected.status === 'PENDING_APPROVAL' && <fieldset disabled={busy} className="space-y-4 disabled:opacity-60"><label className="block text-sm font-semibold">Ý kiến kiểm duyệt<textarea value={reason} maxLength={2000} rows={3} onChange={e => setReason(e.target.value)} className="w-full mt-1 border rounded-lg p-3 text-sm" /></label><label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="mt-1" />Đã đối chiếu người nộp, chủ tài khoản nhận tiền, quyền cho thuê và chứng từ của tài sản này.</label><div className="flex flex-wrap gap-2"><button onClick={() => void decide('APPROVE')} disabled={!confirmed} className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold text-sm disabled:opacity-50">Phê duyệt tài sản</button><button onClick={() => void decide('REQUEST_ADDITIONAL_INFORMATION')} className="bg-amber-100 text-amber-900 px-4 py-2 rounded-lg text-sm">Yêu cầu bổ sung</button><button onClick={() => void decide('REJECT')} className="bg-rose-100 text-rose-800 px-4 py-2 rounded-lg text-sm">Từ chối hồ sơ</button></div></fieldset>}
        </section>}
      </div>
    </main>
  </div>;
}

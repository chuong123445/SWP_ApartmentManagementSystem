import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ContractWizard } from '@/components/contract/ContractWizard';
import { getDrafts } from '@/services/contract/contractService';
import { formatRent } from '@/utils/format';
import type { ContractDraft } from '@/types/contract';
export function ContractDraftList({ owner = false, propertyId }: { owner?: boolean; propertyId?: string }) {
  const [items, setItems] = useState<ContractDraft[]>([]);const [error, setError] = useState('');const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);const [requestId, setRequestId] = useState<string | null>(null);
  useEffect(() => { let active = true;setLoading(true);setError('');getDrafts(owner, propertyId).then(data => { if (active) setItems(data); }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });return () => { active = false; }; }, [owner, propertyId, reloadKey]);
  return <section className="space-y-4"><div className="flex flex-wrap justify-between gap-3"><h2 className="text-lg font-bold">Hợp đồng từ yêu cầu đã chấp nhận</h2><button onClick={() => setReloadKey(n => n + 1)} className="text-sm text-emerald-700">Làm mới danh sách hợp đồng</button></div>
    {error && <p role="alert" className="text-rose-700">{error}</p>}{loading && <p role="status">Đang tải hợp đồng...</p>}
    {!loading && !error && <>{!items.length && <p className="text-sm text-slate-500">Chưa có hợp đồng được tạo từ yêu cầu thuê của bạn.</p>}<div className="grid md:grid-cols-2 gap-4">{items.map(d => <article key={d.id} data-testid="contract-draft-card" className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 min-w-0"><span className="text-xs rounded-full px-3 py-1 bg-amber-50 text-amber-800">{d.status === 'DRAFT' ? 'Bản nháp — chưa ký' : d.status === 'ACTIVE' ? 'Đang hiệu lực' : 'Đã kết thúc'}</span><h3 className="font-bold">{d.snapshot.asset.roomNumber} · {d.snapshot.asset.title}</h3><p className="text-sm text-slate-500 break-words">{owner ? d.snapshot.customer.fullName : d.snapshot.owner.fullName}</p><p className="text-sm">{d.startDate} → {d.endDate}</p><p className="font-semibold text-emerald-700">{formatRent(d.monthlyRent)} / tháng</p><p className="text-xs text-slate-500 break-all">{d.contractNumber}</p>{owner ? <button onClick={() => setRequestId(d.rentalRequestId)} className="text-sm font-semibold text-emerald-700">Xem / sửa bản nháp</button> : <Link to={`/my/contracts/${d.id}`} className="text-sm font-semibold text-emerald-700">Rà soát hợp đồng →</Link>}</article>)}</div></>}
    {requestId && <ContractWizard key={requestId} requestId={requestId} onClose={() => setRequestId(null)} onSaved={() => setReloadKey(n => n + 1)} />}
  </section>;
}

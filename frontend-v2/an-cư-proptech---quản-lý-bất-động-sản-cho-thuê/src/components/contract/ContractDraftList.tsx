import { SelectionCancellationModal } from '@/components/rental/SelectionCancellationModal';
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ContractWizard } from '@/components/contract/ContractWizard';
import { signingLabel } from '@/components/contract/ContractDocument';
import { getDrafts } from '@/services/contract/contractService';
import { formatRent } from '@/utils/format';
import type { ContractDraft } from '@/types/contract';
import { useAuth } from '@/hooks/useAuth';
import { contractActionLabel, contractLifecycleActions, contractStatusLabel, contractListTitle } from '@/utils/contractDisplay';
import { ContractListActionModal } from '@/components/contract/ContractListActionModal';
import { useTenancyContext } from '@/contexts/TenancyContext';
export function ContractDraftList({ owner = false, propertyId, onLoaded }: { owner?: boolean; propertyId?: string; onLoaded?: (drafts: ContractDraft[]) => void }) {
  const { user } = useAuth();
  const tenancy = useTenancyContext(); const [params] = useSearchParams(); const focusId = params.get('contractId'); const focused = useRef('');
  const [items, setItems] = useState<ContractDraft[]>([]);const [error, setError] = useState('');const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);const [requestId, setRequestId] = useState<string | null>(null);
  const [cancelRequest,setCancelRequest] = useState<string|null>(null);
  const [action, setAction] = useState<{ id: string; kind: 'renewal' | 'handover' } | null>(null);
  useEffect(() => { let active = true;setLoading(true);setError('');getDrafts(owner, propertyId).then(data => { if (active) { setItems(data);onLoaded?.(data); } }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });return () => { active = false; }; }, [owner, propertyId, reloadKey, onLoaded]);
  useEffect(() => { const refresh = () => { if (document.visibilityState === 'visible') setReloadKey(value => value + 1); };window.addEventListener('ancu:tenancy-changed', refresh);window.addEventListener('focus', refresh);return () => { window.removeEventListener('ancu:tenancy-changed', refresh);window.removeEventListener('focus', refresh); }; }, []);
  useEffect(() => { if (!loading && !error && focusId && focused.current !== focusId && items.some(item => item.id === focusId)) { const element = document.getElementById(`contract-${focusId}`);element?.focus({ preventScroll: true });element?.scrollIntoView({ block: 'center' });focused.current = focusId; } }, [items, loading, error, focusId]);
  const legacy = tenancy.tenancies.filter(contract => !items.some(document => document.id === contract.id));
  return <section className="space-y-4"><div className="flex flex-wrap justify-between gap-3"><h2 className="text-lg font-bold">Danh sách hợp đồng</h2><button onClick={() => setReloadKey(n => n + 1)} className="text-sm text-emerald-700">Làm mới danh sách hợp đồng</button></div>
    {error && <p role="alert" className="text-rose-700">{error}</p>}{loading && <p role="status">Đang tải hợp đồng...</p>}
    {!loading && !error && <>{!items.length && (owner || (!tenancy.loading && !tenancy.error && !legacy.length)) && <p className="text-sm text-slate-500">Chưa có hợp đồng được tạo từ yêu cầu thuê của bạn.</p>}{!owner && tenancy.loading && <p role="status" className="text-sm text-slate-500">Đang tải lịch sử thuê...</p>}<div className="grid md:grid-cols-2 gap-4">{items.map(d => {
      const actions = contractLifecycleActions(d, user?.id);
      return <article key={d.id} id={`contract-${d.id}`} tabIndex={-1} data-testid="contract-draft-card" className={`bg-white border rounded-xl p-5 space-y-3 min-w-0 ${focusId === d.id ? 'border-emerald-600 ring-2 ring-emerald-100' : 'border-slate-200'}`}>
        <span className="text-xs rounded-full px-3 py-1 bg-amber-50 text-amber-800">{signingLabel(d)}</span><h3 className="font-bold">{contractListTitle(d)}</h3><p className="text-sm text-slate-500 break-words">{owner ? d.snapshot.customer.fullName : d.snapshot.owner.fullName}</p><p className="text-sm">{d.startDate} → {d.endDate}</p><p className="font-semibold text-emerald-700">{formatRent(d.monthlyRent)} / tháng</p><p className="text-xs text-slate-500 break-all">{d.contractNumber}</p>
        <div className="flex flex-wrap items-center gap-3">{owner && d.status === 'DRAFT' && d.cancellationState !== 'PENDING' && !d.signing?.ownerSignedAt && !d.signing?.customerSignedAt ? <button onClick={() => setRequestId(d.rentalRequestId)} className="text-sm font-semibold text-emerald-700">{contractActionLabel(d, user?.id)}</button> : <Link to={`/contracts/${d.id}`} className="text-sm font-semibold text-emerald-700">{contractActionLabel(d, user?.id)} →</Link>}
          {!d.lifecycle?.previousContractId && (d.status==='DRAFT'||d.status==='CANCELLED') && <button className="text-sm text-red-700 underline" onClick={()=>setCancelRequest(d.rentalRequestId)}>Hủy / lịch sử làm hợp đồng</button>}
          {!owner && actions.canRequest && <button className="rounded-lg bg-brand-700 text-white px-4 py-2 text-sm font-semibold" onClick={() => setAction({ id: d.id, kind: 'renewal' })}>Gửi yêu cầu thuê tiếp</button>}
          {owner && actions.canHandover && <button className="rounded-lg bg-brand-700 text-white px-4 py-2 text-sm font-semibold" onClick={() => setAction({ id: d.id, kind: 'handover' })}>Lập biên bản bàn giao</button>}
        </div>
        {['ACTIVE','ENDED'].includes(d.status)&&<Link to={`/contracts/${d.id}/handover`} className="inline-block text-sm font-semibold text-emerald-800 underline">Biên bản bàn giao / ký</Link>}
        {d.lifecycle?.renewalRequest && <p className="text-sm text-slate-600">Thuê tiếp: {{ PENDING: 'Chờ chủ nhà xử lý', ACCEPTED: 'Đã chấp nhận', REJECTED: 'Đã từ chối', FULFILLED: 'Đã ký kỳ mới', CANCELLED: 'Đã hủy' }[d.lifecycle.renewalRequest.status]}</p>}
        {d.lifecycle?.handover?.status === 'PENDING' && <p className="text-sm text-slate-600">Bàn giao đang chờ người thuê xác nhận.</p>}
      </article>;
    })}</div>
      {!owner && tenancy.error && <p role="alert" className="text-rose-700">Không thể tải đầy đủ lịch sử thuê. {tenancy.error}</p>}
      {!owner && legacy.length > 0 && <section className="space-y-3"><h3 className="font-bold">Quan hệ thuê cũ</h3>{legacy.map(contract => <article key={contract.id} className="rounded-xl border border-slate-200 bg-white p-4 space-y-2"><h4 className="font-semibold">HD-{contract.id} · {contract.roomNumber}</h4><p className="text-sm">{contract.startDate} → {contract.endDate} · {contractStatusLabel(contract.status, contract.endDate)}</p><p className="text-xs text-slate-500">Chưa có bản nội dung hợp đồng được lưu; chỉ xem hồ sơ quan hệ thuê.</p><Link to={`/contracts/${contract.id}`} className="text-sm text-emerald-700 underline">Xem hồ sơ thuê</Link></article>)}</section>}
    </>}
    {cancelRequest && <SelectionCancellationModal requestId={cancelRequest} onClose={()=>setCancelRequest(null)} onChanged={()=>setReloadKey(v=>v+1)}/>}
    {requestId && <ContractWizard key={requestId} requestId={requestId} onClose={() => setRequestId(null)} onSaved={() => setReloadKey(n => n + 1)} />}
    {action && <ContractListActionModal key={`${action.id}-${action.kind}`} contractId={action.id} action={action.kind} onClose={() => setAction(null)} onUpdated={value => setItems(previous => previous.map(item => item.id === value.id ? value : item))} />}
  </section>;
}

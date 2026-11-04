import { useState } from 'react';
import { Link } from 'react-router';
import { Pagination } from '@/components/common/Pagination';
import { ContractWizard } from '@/components/contract/ContractWizard';
import { useRenewalInbox } from '@/hooks/useRenewalInbox';
import { decideRenewalRequest, getContract, cancelAcceptedRenewalRequest } from '@/services/contract/contractService';
import type { ContractDraft, RenewalInboxItem } from '@/types/contract';
import { formatRent, formatRequestDate } from '@/utils/format';
import { renewalInboxLabels } from '@/utils/rentalInbox';

const action = 'rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-50';
const primary = 'rounded-lg border border-emerald-700 bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50';
export function RenewalRequestsPanel({ propertyId, onDecision }: { propertyId?: string; onDecision: () => void }) {
  const [page, setPage] = useState(0);const [status, setStatus] = useState<RenewalInboxItem['status'] | 'ALL'>('PENDING');
  const { data, loading, error, reload } = useRenewalInbox(page, status === 'ALL' ? undefined : status, propertyId);
  const [actingId, setActingId] = useState('');const [rejecting, setRejecting] = useState<RenewalInboxItem | null>(null);const [reason, setReason] = useState('');
  const [notice, setNotice] = useState<{ error: boolean; text: string; accepted?: boolean } | null>(null);
  const [renewalOf, setRenewalOf] = useState<ContractDraft | null>(null);
  const decide = async (item: RenewalInboxItem, decision: 'ACCEPT' | 'REJECT') => {
    if (actingId) return;setActingId(item.id);setNotice(null);
    try {
      await decideRenewalRequest(item.contractId, item.version, decision, decision === 'REJECT' ? reason : '');
      setRejecting(null);setReason('');setNotice({ error: false, accepted: decision === 'ACCEPT', text: decision === 'ACCEPT' ? 'Đã chuyển sang Đang làm hợp đồng. Hãy soạn bản ký tiếp để hai bên rà soát và ký.' : 'Đã từ chối thuê tiếp và gửi thông báo cho người thuê.' });
      reload();onDecision();
    } catch (error) { setNotice({ error: true, text: error instanceof Error ? error.message : 'Không thể xử lý yêu cầu thuê tiếp.' });reload(); }
    finally { setActingId(''); }
  };
  const prepare = async (item: RenewalInboxItem) => {
    if (actingId) return;setActingId(item.id);setNotice(null);
    try { setRenewalOf(await getContract(item.contractId)); }
    catch (error) { setNotice({ error: true, text: error instanceof Error ? error.message : 'Không thể mở bước soạn hợp đồng.' }); }
    finally { setActingId(''); }
  };
  const cancel = async (item: RenewalInboxItem) => {
    if (actingId || !window.confirm('Hủy chấp nhận thuê tiếp? Hợp đồng hiện tại không bị kết thúc; lịch sử yêu cầu được giữ.')) return;
    setActingId(item.id);setNotice(null);
    try { await cancelAcceptedRenewalRequest(item.contractId, item.version);setNotice({ error: false, text: 'Đã hủy chấp nhận thuê tiếp. Đến hạn có thể xử lý bàn giao theo hợp đồng.' });reload();onDecision(); }
    catch (error) { setNotice({ error: true, text: error instanceof Error ? error.message : 'Không thể hủy chấp nhận.' });reload(); }
    finally { setActingId(''); }
  };
  return <section className="space-y-6">
    <header className="rounded-xl border border-slate-200 bg-white p-5 flex flex-wrap justify-between items-center gap-4">
      <div><h1 className="text-xl font-bold">Yêu cầu thuê tiếp</h1><p className="text-sm text-slate-500 mt-2">Xử lý yêu cầu từ khách đang thuê ngay tại đây. Đồng ý mới mở bước soạn hợp đồng kỳ mới.</p></div>
      <button type="button" className={primary} onClick={reload}>Làm mới yêu cầu thuê tiếp</button>
    </header>
    {notice && !rejecting && <div role={notice.error ? 'alert' : 'status'} className={`p-4 rounded-xl text-sm space-y-2 ${notice.error ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-800'}`}><p>{notice.text}</p>{notice.accepted && <button type="button" className="underline font-semibold" onClick={() => { setStatus('ACCEPTED');setPage(0);setNotice(null); }}>Xem yêu cầu đang làm hợp đồng</button>}</div>}
    <div className="flex flex-wrap justify-between items-center gap-3"><div className="text-sm text-slate-600"><label htmlFor="renewal-request-status">Trạng thái thuê tiếp</label> <select id="renewal-request-status" value={status} onChange={e => { setStatus(e.target.value as RenewalInboxItem['status'] | 'ALL');setPage(0);setNotice(null); }} className="ml-2 border border-slate-300 rounded-lg px-3 py-2 bg-white">
      {Object.entries(renewalInboxLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}<option value="ALL">Tất cả</option>
    </select></div><span className="text-sm text-slate-500">{data?.totalElements ?? 0} yêu cầu thuê tiếp</span></div>
    {error && <p role="alert" className="rounded-lg bg-rose-50 p-4 text-rose-700">{error}</p>}
    {loading ? <p role="status" className="py-10 text-center text-slate-500">Đang tải yêu cầu thuê tiếp...</p> : !error && <>
      {data?.items.length ? <div className="space-y-4">{data.items.map(item => <article key={item.id} data-testid="renewal-request" className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 min-w-0">
        <div className="flex flex-wrap justify-between items-start gap-3"><div className="min-w-0"><h2 className="font-bold break-words">{item.roomNumber} · {item.apartmentTitle}</h2><p className="text-sm text-slate-500 break-words">{item.propertyName}</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.status === 'REJECTED' ? 'bg-rose-50 text-rose-700' : item.status === 'FULFILLED' ? 'bg-emerald-50 text-emerald-800' : item.status === 'CANCELLED' ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-800'}`}>{renewalInboxLabels[item.status]}</span></div>
        <p className="text-sm break-words"><strong>{item.customerName}</strong> · {item.customerEmail}</p>
        <div className="text-xs text-slate-500 flex flex-wrap gap-3"><span>{item.contractNumber}: {item.startDate} → {item.endDate}</span><span>{formatRent(item.monthlyRent)} / tháng</span><span>Gửi lúc {formatRequestDate(item.createdAt)}</span></div>
        {item.message && <p className="rounded-lg bg-slate-50 p-3 text-sm whitespace-pre-wrap break-words">{item.message}</p>}
        {item.decisionReason && <p className="text-sm whitespace-pre-wrap break-words">Phản hồi: {item.decisionReason}</p>}
        <div className="flex flex-wrap gap-3 items-center border-t border-slate-100 pt-3">
          {item.status === 'PENDING' && <><button type="button" disabled={!!actingId} className={primary} onClick={() => void decide(item, 'ACCEPT')}>Đồng ý thuê tiếp</button><button type="button" disabled={!!actingId} className={`${action} text-rose-700`} onClick={() => { setRejecting(item);setReason('');setNotice(null); }}>Từ chối thuê tiếp</button></>}
          {item.status === 'ACCEPTED' && !item.nextContractId && <><button type="button" disabled={!!actingId} className={primary} onClick={() => void prepare(item)}>Soạn hợp đồng ký tiếp</button><button type="button" disabled={!!actingId} className={`${action} text-rose-700`} onClick={() => void cancel(item)}>Hủy chấp nhận thuê tiếp</button></>}
          {item.nextContractId && <Link className="text-sm font-semibold text-emerald-700 underline" to={`/contracts/${item.nextContractId}`}>Xem hợp đồng ký tiếp</Link>}
          <Link className="text-sm text-slate-600 underline" to={`/contracts/${item.contractId}`}>Xem {item.contractNumber} hiện tại</Link>
        </div>
      </article>)}</div> : <p className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-500">Chưa có yêu cầu thuê tiếp phù hợp.</p>}
      {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />}
    </>}
    {rejecting && <div role="dialog" aria-modal="true" aria-labelledby="reject-renewal-title" className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4" onKeyDown={e => { if (e.key === 'Escape' && !actingId) setRejecting(null); }}>
      <form className="rounded-xl bg-white p-6 w-full max-w-lg space-y-4" onSubmit={e => { e.preventDefault();if (reason.trim()) void decide(rejecting, 'REJECT'); }}>
        <h2 id="reject-renewal-title" className="font-bold text-lg">Từ chối yêu cầu thuê tiếp</h2><p className="text-sm">{rejecting.customerName} · {rejecting.roomNumber}</p>
        <label className="block text-sm">Lý do từ chối (bắt buộc)<textarea autoFocus required maxLength={1000} rows={4} value={reason} disabled={!!actingId} onChange={e => setReason(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 p-3" /></label>
        {notice?.error && <p role="alert" className="text-sm text-rose-700">{notice.text}</p>}
        <div className="flex flex-wrap justify-end gap-3"><button type="button" disabled={!!actingId} className={action} onClick={() => setRejecting(null)}>Hủy</button><button type="submit" disabled={!!actingId || !reason.trim()} className={`${action} bg-rose-600 border-rose-600 text-white`}>Xác nhận từ chối</button></div>
      </form>
    </div>}
    {renewalOf && <ContractWizard key={renewalOf.id} renewalOf={renewalOf} onClose={() => { setRenewalOf(null);reload(); }} onSaved={() => { reload();onDecision(); }} />}
  </section>;
}

import { SelectionCancellationModal } from '@/components/rental/SelectionCancellationModal';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { RequestList } from '@/components/rental/RequestList';
import { Pagination } from '@/components/common/Pagination';
import { useRentalRequests } from '@/hooks/useRentalRequests';
import { decideRentalRequest } from '@/services/rental/rentalService';
import { ApiError } from '@/services/http/client';
import type { RentalRequest } from '@/types/rental';
import { ContractWizard } from '@/components/contract/ContractWizard';
import { RenewalRequestsPanel } from '@/components/rental/RenewalRequestsPanel';
import { ordinaryInboxOptions, ordinaryInboxQuery, type OrdinaryInboxFilter } from '@/utils/rentalInbox';

export function RentalRequestsPage({ onDecision, propertyId }: { onDecision: () => void; propertyId?: string }) {
  const [params, setParams] = useSearchParams();
  const tab = params.get('requestType') === 'renewal' ? 'renewal' : 'new';
  const setTab = (value: 'new' | 'renewal') => setParams(previous => { const next = new URLSearchParams(previous);next.set('tab', 'rental_requests');if (propertyId) next.set('propertyId', propertyId);else next.delete('propertyId');if (value === 'renewal') next.set('requestType', 'renewal');else next.delete('requestType');return next; }, { replace: true });
  const selectTab = (value: 'new' | 'renewal') => { setTab(value);document.getElementById(`request-tab-${value}`)?.focus(); };
  return <section className="space-y-5">
    <div role="tablist" aria-label="Loại yêu cầu thuê" className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
      {(['new', 'renewal'] as const).map(value => <button key={value} type="button" id={`request-tab-${value}`} role="tab" aria-selected={tab === value} aria-controls={`request-panel-${value}`} tabIndex={tab === value ? 0 : -1}
        onClick={() => setTab(value)} onKeyDown={event => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) { event.preventDefault();selectTab(event.key === 'Home' ? 'new' : event.key === 'End' ? 'renewal' : tab === 'new' ? 'renewal' : 'new'); } }}
        className={`rounded-lg px-5 py-3 text-sm font-semibold ${tab === value ? 'bg-emerald-700 text-white' : 'bg-white border border-slate-300 text-slate-600'}`}>{value === 'new' ? 'Thuê mới' : 'Thuê tiếp'}</button>)}
    </div>
    <div role="tabpanel" id="request-panel-new" aria-labelledby="request-tab-new" hidden={tab !== 'new'}>{tab === 'new' && <NewRentalRequestsPage key={propertyId ?? 'all'} onDecision={onDecision} propertyId={propertyId} />}</div>
    <div role="tabpanel" id="request-panel-renewal" aria-labelledby="request-tab-renewal" hidden={tab !== 'renewal'}>{tab === 'renewal' && <RenewalRequestsPanel key={propertyId ?? 'all'} onDecision={onDecision} propertyId={propertyId} />}</div>
  </section>;
}

function NewRentalRequestsPage({ onDecision, propertyId }: { onDecision: () => void; propertyId?: string }) {
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState<OrdinaryInboxFilter>('PENDING');
  const query = ordinaryInboxQuery(status);
  const { data, loading, error, reload } = useRentalRequests(true, page, query.status, propertyId, query.contractCompleted);
  const [rejecting, setRejecting] = useState<RentalRequest | null>(null);
  const [contractRequestId, setContractRequestId] = useState<string | null>(null);
  const [cancelRequest,setCancelRequest] = useState<string|null>(null);
  const [reason, setReason] = useState('');
  const [decidingId, setDecidingId] = useState('');
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleAccept = async (request: RentalRequest) => {
    if (decidingId) return;
    setDecidingId(request.id);
    setActionNotice(null);
    try {
      await decideRentalRequest(request.id, 'ACCEPT', request.version);
      setActionNotice({
        type: 'success',
        text: `Đã chuyển yêu cầu của ${request.customerName} sang "Đang làm hợp đồng". Căn hộ được giữ để soạn hợp đồng; hai bên chưa ký.`,
      });
      reload();
      onDecision();
    } catch (err) {
      reload();onDecision();
      setActionNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Không thể chấp nhận yêu cầu thuê.',
      });
    } finally {
      setDecidingId('');
    }
  };

  const handleReject = async (request: RentalRequest) => {
    if (decidingId) return;

    setDecidingId(request.id);
    setActionNotice(null);
    try {
      await decideRentalRequest(request.id, 'REJECT', request.version, reason);
      setRejecting(null);setReason('');
      setActionNotice({
        type: 'success',
        text: `Đã từ chối yêu cầu thuê của ${request.customerName}. Trạng thái đã được đồng bộ với người thuê.`,
      });
      reload();
      onDecision();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) setRejecting(null);
      reload();onDecision();
      setActionNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Không thể từ chối yêu cầu thuê.',
      });
    } finally {
      setDecidingId('');
    }
  };

  return (
    <section className="space-y-6">
      {cancelRequest && <SelectionCancellationModal requestId={cancelRequest} onClose={()=>setCancelRequest(null)} onChanged={()=>{reload();onDecision();}}/>}
      {contractRequestId && <ContractWizard key={contractRequestId} requestId={contractRequestId} onClose={() => { setContractRequestId(null);reload(); }} onSaved={() => { reload();onDecision(); }} />}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Yêu cầu thuê căn hộ</h1>
          <p className="text-sm text-slate-500 mt-2">Mặc định hiển thị yêu cầu chờ xử lý, sắp xếp theo thời gian gửi. Đồng ý sẽ chuyển sang bước làm hợp đồng, chưa phải đã thuê.</p>
        </div>
        <button
          onClick={reload}
          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer transition-colors"
        >
          Làm mới
        </button>
      </div>

      {rejecting && <div role="dialog" aria-modal="true" aria-labelledby="reject-title" className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
        <form onSubmit={event => { event.preventDefault();void handleReject(rejecting); }} className="bg-white rounded-xl p-6 w-full max-w-lg space-y-4">
          <h2 id="reject-title" className="text-lg font-bold">Từ chối yêu cầu thuê</h2><p className="text-sm text-slate-600">Yêu cầu của {rejecting.customerName}</p>
          <label className="block text-sm font-semibold" htmlFor="reject-reason">Lý do từ chối (không bắt buộc)</label><textarea autoFocus id="reject-reason" rows={4} maxLength={2000} value={reason} onChange={event => setReason(event.target.value)} disabled={!!decidingId} className="w-full rounded-lg border border-slate-300 p-3 text-sm" />
          {actionNotice?.type === 'error' && <p role="alert" className="text-rose-700 text-sm">{actionNotice.text}</p>}
          <div className="flex flex-wrap justify-end gap-3"><button type="button" disabled={!!decidingId} onClick={() => setRejecting(null)} className="border rounded-lg px-4 py-2">Hủy</button><button type="submit" disabled={!!decidingId} className="bg-rose-600 text-white rounded-lg px-4 py-2 disabled:opacity-50">{decidingId ? 'Đang xử lý...' : 'Xác nhận từ chối'}</button></div>
        </form>
      </div>}
      {!rejecting && actionNotice && (
        <div
          role="alert"
          className={`p-4 rounded-xl text-sm flex items-center justify-between border ${
            actionNotice.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <span>{actionNotice.text}</span>
          <button
            type="button"
            onClick={() => setActionNotice(null)}
            className="text-xs underline font-semibold ml-4 cursor-pointer"
          >
            Đóng
          </button>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div className="text-sm text-slate-600">
          <label htmlFor="ordinary-request-status">Trạng thái</label>{' '}
          <select
            id="ordinary-request-status"
            value={status}
            onChange={e => {
              setStatus(e.target.value as OrdinaryInboxFilter);
              setPage(0);
            }}
            className="ml-2 border border-slate-300 rounded-lg px-3 py-2 bg-white"
          >
            {ordinaryInboxOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        <span className="text-sm text-slate-500">{data?.totalElements ?? 0} yêu cầu</span>
      </div>

      {error && <p role="alert" className="p-4 rounded-lg bg-rose-50 text-rose-700">{error}</p>}

      {loading ? (
        <p role="status" className="text-center py-10 text-slate-500">Đang tải yêu cầu...</p>
      ) : !error && (
        <>
          {data?.items.length ? (
            <RequestList onOpenCancellation={request=>setCancelRequest(request.id)}
              items={data.items}
              owner
              onAccept={handleAccept}
              onReject={request => { setRejecting(request);setReason('');setActionNotice(null); }}
              decidingId={decidingId}
              onCreateContract={request => setContractRequestId(request.id)}
            />
          ) : (
            <p className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-500">
              Chưa có yêu cầu thuê phù hợp.
            </p>
          )}
          {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />}
        </>
      )}
    </section>
  );
}

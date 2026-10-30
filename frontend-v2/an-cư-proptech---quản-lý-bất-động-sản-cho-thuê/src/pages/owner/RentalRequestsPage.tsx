import { useState } from 'react';
import { RequestList } from '@/components/rental/RequestList';
import { Pagination } from '@/components/common/Pagination';
import { useRentalRequests } from '@/hooks/useRentalRequests';
import { decideRentalRequest } from '@/services/rental/rentalService';
import { ApiError } from '@/services/http/client';
import type { RentalRequest, RentalRequestStatus } from '@/types/rental';
import { ContractWizard } from '@/components/contract/ContractWizard';

export function RentalRequestsPage({ onDecision, propertyId }: { onDecision: () => void; propertyId?: string }) {
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState<RentalRequestStatus | ''>('');
  const { data, loading, error, reload } = useRentalRequests(true, page, status || undefined, propertyId);
  const [rejecting, setRejecting] = useState<RentalRequest | null>(null);
  const [contractRequestId, setContractRequestId] = useState<string | null>(null);
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
        text: `Đã chấp nhận yêu cầu thuê của ${request.customerName}. Trạng thái căn hộ chuyển sang "Đang làm hợp đồng".`,
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
      {contractRequestId && <ContractWizard key={contractRequestId} requestId={contractRequestId} onClose={() => { setContractRequestId(null);reload(); }} onSaved={() => { reload();onDecision(); }} />}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Yêu cầu thuê căn hộ</h1>
          <p className="text-sm text-slate-500 mt-2">Ưu tiên yêu cầu chờ xử lý trước, sau đó sắp xếp theo thời gian gửi.</p>
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
        <label className="text-sm text-slate-600">
          Trạng thái{' '}
          <select
            value={status}
            onChange={e => {
              setStatus(e.target.value as RentalRequestStatus | '');
              setPage(0);
            }}
            className="ml-2 border border-slate-300 rounded-lg px-3 py-2 bg-white"
          >
            <option value="">Tất cả</option>
            <option value="PENDING">Chờ xử lý</option>
            <option value="ACCEPTED">Đã chấp nhận</option>
            <option value="REJECTED">Đã từ chối</option>
            <option value="CANCELLED">Đã hủy</option>
          </select>
        </label>
        <span className="text-sm text-slate-500">{data?.totalElements ?? 0} yêu cầu</span>
      </div>

      {error && <p role="alert" className="p-4 rounded-lg bg-rose-50 text-rose-700">{error}</p>}

      {loading ? (
        <p role="status" className="text-center py-10 text-slate-500">Đang tải yêu cầu...</p>
      ) : !error && (
        <>
          {data?.items.length ? (
            <RequestList
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

import {useAuth} from '@/hooks/useAuth';
import {LeaseRequestResultCard} from './LeaseRequestResultCard';
import {cancellationResult,resultActorRole} from '@/utils/leaseRequestResults';
import { useEffect, useState } from 'react';
import type { RentalRequest } from '@/types/rental';
import {
  getSelectionCancellation,
  actOnSelectionCancellation,
  type SelectionCancellation,
} from '@/services/rental/selectionCancellationService';

function RequestCancellationControls({
  request,
  owner = false,
  onChanged,
  onLoaded,
  onLoadError,
}: {
  request: RentalRequest;
  owner?: boolean;
  onChanged?: () => void;
  onLoaded:(value:SelectionCancellation)=>void;
  onLoadError:(message:string)=>void;
}) {
  const [data, setData] = useState<SelectionCancellation | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = (signal?: AbortSignal) => {
    getSelectionCancellation(request.id, signal)
      .then(value => {
        if(signal?.aborted)return;setData(value);onLoaded(value);onLoadError('');
      })
      .catch(err => {if(!signal?.aborted)onLoadError(err instanceof Error?err.message:'Không tải được kết quả dừng làm hợp đồng.');});
  };

  useEffect(() => {
    const c = new AbortController();
    load(c.signal);
    const refresh = () => {if(document.visibilityState==='visible')load(c.signal);};
    const timer=window.setInterval(refresh,10000);
    window.addEventListener('focus',refresh);
    window.addEventListener('ancu:tenancy-changed', refresh);
    return () => {
      c.abort();window.clearInterval(timer);window.removeEventListener('focus',refresh);
      window.removeEventListener('ancu:tenancy-changed', refresh);
    };
  }, [request.id]);

  if (data?.state === 'CANCELLED') return null;
  if (request.status === 'CANCELLED') {
    return (
      <div className="mt-3 text-xs text-slate-500 font-medium">
        Đã dừng quá trình làm hợp đồng.
      </div>
    );
  }

  if (request.status !== 'ACCEPTED' || request.contractCompleted) {
    return null;
  }

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data || !reason.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      const updated = await actOnSelectionCancellation(request.id, 'START', data.sourceVersion, reason.trim());
      setData(updated);onLoaded(updated);
      setShowForm(false);
      setReason('');
      window.dispatchEvent(new Event('ancu:tenancy-changed'));
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể gửi yêu cầu dừng.');
    } finally {
      setBusy(false);
    }
  };

  const handleRespond = async (action: 'ACCEPT' | 'REJECT') => {
    if (!data || busy) return;
    setBusy(true);
    setError('');
    try {
      const rejectReason = 'Không đồng ý dừng làm hợp đồng, tiếp tục thực hiện';
      const updated = await actOnSelectionCancellation(
        request.id,
        action,
        data.sourceVersion,
        action === 'REJECT' ? rejectReason : ''
      );
      setData(updated);onLoaded(updated);
      window.dispatchEvent(new Event('ancu:tenancy-changed'));
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể xử lý yêu cầu.');
    } finally {
      setBusy(false);
    }
  };

  const handleWithdraw = async () => {
    if (!data || busy) return;
    setBusy(true);
    setError('');
    try {
      const updated = await actOnSelectionCancellation(request.id, 'WITHDRAW', data.sourceVersion, '');
      setData(updated);onLoaded(updated);
      window.dispatchEvent(new Event('ancu:tenancy-changed'));
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể rút yêu cầu.');
    } finally {
      setBusy(false);
    }
  };

  // 1. Bên kia mong muốn dừng làm hợp đồng
  if (data?.canRespond) {
    const proposerTitle = owner ? 'Người thuê' : 'Chủ nhà';
    return (
      <section aria-label="Yêu cầu dừng làm hợp đồng" className="mt-3 p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-sm">
        <p className="font-semibold text-amber-950">
          {proposerTitle} mong muốn dừng việc làm hợp đồng
        </p>
        {data.reason && (
          <p className="text-xs text-amber-900 bg-white/80 p-2 rounded-lg border border-amber-100 whitespace-pre-wrap break-words">
            Lý do: {data.reason}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            disabled={busy}
            onClick={() => handleRespond('ACCEPT')}
            className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-sm cursor-pointer disabled:opacity-50"
          >
            {busy ? 'Đang xử lý...' : 'Có'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => handleRespond('REJECT')}
            className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-sm cursor-pointer disabled:opacity-50"
          >
            {busy ? 'Đang xử lý...' : 'Không'}
          </button>
        </div>
        {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
      </section>
    );
  }

  // 2. Chính người dùng này đã gửi yêu cầu dừng và đang chờ bên kia phản hồi
  if (data?.canWithdraw) {
    return (
      <section aria-label="Đã gửi yêu cầu dừng làm hợp đồng" className="mt-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-sm">
        <p className="font-semibold text-slate-800">
          Bạn đã gửi yêu cầu dừng làm hợp đồng (chờ bên kia phản hồi)
        </p>
        {data.reason && (
          <p className="text-xs text-slate-600 whitespace-pre-wrap break-words">
            Lý do: {data.reason}
          </p>
        )}
        <div>
          <button
            type="button"
            disabled={busy}
            onClick={handleWithdraw}
            className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-sm cursor-pointer disabled:opacity-50"
          >
            {busy ? 'Đang xử lý...' : 'Rút yêu cầu dừng làm hợp đồng'}
          </button>
        </div>
        {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
      </section>
    );
  }

  // 3. Chưa có yêu cầu dừng: hiển thị nút "Dừng làm hợp đồng"
  return (
    <div className="mt-3">
      {!showForm ? (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="text-sm text-red-600 hover:text-red-700 font-medium hover:underline inline-flex items-center gap-1 cursor-pointer"
        >
          Dừng làm hợp đồng
        </button>
      ) : (
        <form onSubmit={handleStart} className="p-3.5 bg-rose-50/80 border border-rose-200 rounded-xl space-y-2.5 text-sm">
          <p className="font-semibold text-rose-950">
            Dừng làm hợp đồng
          </p>
          <p className="text-xs text-rose-700">
            Yêu cầu này sẽ được gửi đến {owner ? 'khách thuê' : 'chủ nhà'} để xác nhận. Sau 3 ngày nếu không có phản hồi, hệ thống sẽ tự động chấp thuận.
          </p>
          <label className="block text-xs font-medium text-slate-700">
            Lý do dừng làm hợp đồng *
            <textarea
              required
              rows={2}
              maxLength={2000}
              disabled={busy}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Nhập lý do dừng làm hợp đồng..."
              className="mt-1 w-full border border-slate-300 rounded-lg p-2 text-sm bg-white"
            />
          </label>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="submit"
              disabled={busy || !reason.trim()}
              className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-sm cursor-pointer disabled:opacity-50"
            >
              {busy ? 'Đang gửi...' : 'Gửi yêu cầu dừng'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setShowForm(false);
                setReason('');
                setError('');
              }}
              className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-sm cursor-pointer disabled:opacity-50"
            >
              Hủy
            </button>
          </div>
          {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
        </form>
      )}
    </div>
  );
}

export function RequestCancellationAction(props:{request:RentalRequest;owner?:boolean;onChanged?:()=>void}){
 const {user}=useAuth();
 const [data,setData]=useState<SelectionCancellation|null>(null),[loadError,setLoadError]=useState('');const result=cancellationResult(data);
 return <>{loadError&&<p role="alert" className="mt-3 text-xs text-rose-700">Chưa tải được kết quả dừng làm hợp đồng. {loadError} <button className="underline" onClick={()=>window.dispatchEvent(new Event('ancu:tenancy-changed'))}>Thử lại</button></p>}{result&&<LeaseRequestResultCard viewerId={user?.id} result={result} history={data!.history.map(event=>({...event,actorRole:resultActorRole(event)}))}/>}<RequestCancellationControls {...props} onLoaded={setData} onLoadError={setLoadError}/></>;
}

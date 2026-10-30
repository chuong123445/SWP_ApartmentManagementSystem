import { Link } from 'react-router';
import { Check, X, FileText, CheckCircle2, XCircle } from 'lucide-react';
import type { RentalRequest, RentalRequestStatus } from '@/types/rental';
import { formatRent, formatRequestDate, requestStatusLabel } from '@/utils/format';

const statusBadgeClass: Record<RentalRequestStatus, string> = {
  PENDING: 'bg-amber-50 text-amber-800 border border-amber-200',
  ACCEPTED: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
  REJECTED: 'bg-rose-50 text-rose-800 border border-rose-200',
  CANCELLED: 'bg-slate-100 text-slate-600 border border-slate-200',
};

export function RequestList({
  items,
  owner = false,
  onCancel,
  cancelling,
  onAccept,
  onReject,
  decidingId,
  onCreateContract,
}: {
  items: RentalRequest[];
  owner?: boolean;
  onCancel?: (request: RentalRequest) => void;
  cancelling?: string;
  onAccept?: (request: RentalRequest) => void;
  onReject?: (request: RentalRequest) => void;
  decidingId?: string;
  onCreateContract?: (request: RentalRequest) => void;
}) {
  return (
    <div className="space-y-4">
      {items.map(request => (
        <article key={request.id} data-testid="rental-request" className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex flex-wrap justify-between gap-3">
            <div>
              <h2 className="font-bold text-slate-900">
                <Link to={`/apartments/${request.apartmentId}`} className="hover:text-emerald-700">
                  {request.apartmentTitle}
                </Link>
              </h2>
              <p className="text-xs text-slate-500 mt-1">{request.address}</p>
            </div>
            <span className={`text-xs font-semibold rounded-full px-3 py-1 self-start ${statusBadgeClass[request.status]}`}>
              {request.status === 'ACCEPTED' && request.contractCompleted ? 'Đã tạo hợp đồng' : requestStatusLabel[request.status]}
            </span>
          </div>

          <div className="flex flex-wrap gap-4 text-xs text-slate-500 mt-3">
            <span>{formatRent(request.advertisedMonthlyRent)} / tháng</span>
            <span>Gửi lúc {formatRequestDate(request.createdAt)}</span>
          </div>

          {owner && (
            <div className="mt-4 text-sm bg-slate-50 p-3 rounded-lg border border-slate-100">
              <span className="font-semibold text-slate-800">{request.customerName}</span>
              <span className="text-slate-500 ml-3">{request.customerEmail}</span>
            </div>
          )}

          <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
            {request.message || 'Không có lời nhắn.'}
          </p>

          {request.decisionReason && <p className="mt-3 text-sm text-slate-700 whitespace-pre-wrap break-words"><span className="font-semibold">{request.status === 'REJECTED' ? 'Lý do từ chối: ' : 'Lý do xử lý: '}</span>{request.decisionReason}</p>}
          {/* Owner actions */}
          {owner && request.status === 'PENDING' && (
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-3">
              <button
                type="button"
                disabled={!!decidingId}
                onClick={() => onAccept?.(request)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-4 py-2 text-sm font-semibold inline-flex items-center gap-1.5 disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
              >
                <Check className="w-4 h-4" />
                {decidingId === request.id ? 'Đang xử lý...' : 'Đồng ý'}
              </button>
              <button
                type="button"
                disabled={!!decidingId}
                onClick={() => onReject?.(request)}
                className="border border-rose-300 text-rose-700 hover:bg-rose-50 rounded-lg px-4 py-2 text-sm font-semibold inline-flex items-center gap-1.5 disabled:opacity-50 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
                Từ chối
              </button>
            </div>
          )}

          {owner && request.status === 'ACCEPTED' && (
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3">
              <span className="text-xs text-emerald-700 font-medium inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                {request.contractCompleted ? 'Đã tạo hợp đồng — hai bên đã ký đầy đủ' : 'Đã chấp nhận yêu cầu thuê'}
              </span>
              {request.contractCompleted && request.contractId ? <Link to={`/contracts/${request.contractId}`} className="text-sm font-semibold text-emerald-700 underline">Xem hợp đồng</Link> : <button
                type="button"
                disabled={!onCreateContract}
                onClick={() => onCreateContract?.(request)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-4 py-2 text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50"
              >
                <FileText className="w-4 h-4" />
                {request.contractId ? 'Xem / ký hợp đồng' : 'Tạo hợp đồng'}
              </button>}
            </div>
          )}

          {owner && request.status === 'REJECTED' && (
            <div className="mt-3 text-xs text-rose-700 font-medium inline-flex items-center gap-1.5">
              <XCircle className="w-4 h-4 text-rose-500" />
              Đã từ chối yêu cầu thuê
            </div>
          )}

          {/* Customer actions & status notices */}
          {!owner && request.status === 'PENDING' && onCancel && (
            <button
              disabled={!!cancelling}
              onClick={() => onCancel(request)}
              className="mt-3 border border-rose-300 text-rose-700 hover:bg-rose-50 rounded-lg px-4 py-2 text-sm disabled:opacity-50 transition-colors"
            >
              {cancelling === request.id ? 'Đang hủy...' : 'Hủy yêu cầu thuê'}
            </button>
          )}

          {!owner && request.status === 'ACCEPTED' && (
            <div className="mt-3 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{request.contractCompleted ? 'Đã tạo hợp đồng — hai bên đã ký đầy đủ.' : 'Chủ nhà đã chấp nhận yêu cầu thuê của bạn. Vui lòng liên hệ chủ nhà để thực hiện bước hợp đồng.'}</span>
            </div>
          )}

          {!owner && request.status === 'REJECTED' && (
            <div className="mt-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2.5 inline-flex items-center gap-1.5">
              <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>Yêu cầu thuê đã bị chủ nhà từ chối. Bạn có thể tìm và gửi yêu cầu đến các căn hộ khác.</span>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}

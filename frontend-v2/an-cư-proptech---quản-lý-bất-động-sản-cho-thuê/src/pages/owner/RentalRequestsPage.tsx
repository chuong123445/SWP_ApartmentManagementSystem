import { useState } from 'react';
import { RequestList } from '@/components/rental/RequestList';
import { Pagination } from '@/components/common/Pagination';
import { useRentalRequests } from '@/hooks/useRentalRequests';
import type { RentalRequestStatus } from '@/types/rental';
export function RentalRequestsPage() {
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState<RentalRequestStatus | ''>('');
  const { data, loading, error, reload } = useRentalRequests(true, page, status || undefined);
  return <section className="space-y-6"><div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap justify-between items-center gap-4"><div><h1 className="text-xl font-bold text-slate-900">Yêu cầu thuê căn hộ</h1><p className="text-sm text-slate-500 mt-2">Yêu cầu gửi đến căn hộ của bạn, theo thứ tự gửi trước đến sau.</p></div><button onClick={reload} className="bg-emerald-600 text-white rounded-lg px-4 py-2 text-sm font-semibold">Làm mới</button></div>
    <div className="flex justify-between items-center"><label className="text-sm text-slate-600">Trạng thái <select value={status} onChange={e => { setStatus(e.target.value as RentalRequestStatus | ''); setPage(0); }} className="ml-2 border border-slate-300 rounded-lg px-3 py-2 bg-white"><option value="">Tất cả</option><option value="PENDING">Chờ xử lý</option><option value="ACCEPTED">Đã chấp nhận</option><option value="REJECTED">Đã từ chối</option><option value="CANCELLED">Đã hủy</option></select></label><span className="text-sm text-slate-500">{data?.totalElements ?? 0} yêu cầu</span></div>
    {error && <p role="alert" className="p-4 rounded-lg bg-rose-50 text-rose-700">{error}</p>}
    {loading ? <p role="status" className="text-center py-10 text-slate-500">Đang tải yêu cầu...</p> : !error && <>{data?.items.length ? <RequestList items={data.items} owner /> : <p className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-500">Chưa có yêu cầu thuê phù hợp.</p>}{data && <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />}</>}
  </section>;
}

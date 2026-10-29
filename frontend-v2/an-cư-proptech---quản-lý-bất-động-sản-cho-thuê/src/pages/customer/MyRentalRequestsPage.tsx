import { useState } from 'react';
import { Link } from 'react-router';
import { CustomerLayout } from '@/layouts/CustomerLayout';
import { RequestList } from '@/components/rental/RequestList';
import { Pagination } from '@/components/common/Pagination';
import { useRentalRequests } from '@/hooks/useRentalRequests';
import { cancelRentalRequest } from '@/services/rental/rentalService';
import type { RentalRequest } from '@/types/rental';
import { ContractDraftList } from '@/components/contract/ContractDraftList';
export function MyRentalRequestsPage() {
  const [page, setPage] = useState(0);
  const { data, loading, error, reload } = useRentalRequests(false, page);
  const [cancelling, setCancelling] = useState('');
  const [cancelError, setCancelError] = useState('');
  const cancel = async (request: RentalRequest) => {
    if (cancelling) return;
    setCancelling(request.id); setCancelError('');
    try { await cancelRentalRequest(request.id, request.version); }
    catch (err) { setCancelError(err instanceof Error ? err.message : 'Không thể hủy yêu cầu.'); }
    finally { setCancelling(''); reload(); }
  };
  return <CustomerLayout><main className="max-w-5xl mx-auto px-5 py-8"><div className="flex justify-between items-center mb-6"><div><h1 className="text-2xl font-bold">Yêu cầu & hợp đồng</h1><p className="text-sm text-slate-500 mt-2">Theo dõi yêu cầu thuê, hợp đồng chờ ký và lịch sử thuê tại một nơi.</p></div><button onClick={reload} className="border border-slate-300 rounded-lg px-4 py-2 text-sm">Làm mới</button></div>
    <h2 className="font-semibold mb-4">Yêu cầu thuê đã gửi</h2>
    <div className="flex flex-wrap gap-4 mb-5 text-sm"><Link to="/my/invoices" className="text-emerald-700 underline">Lịch sử hóa đơn</Link><Link to="/my/maintenance" className="text-emerald-700 underline">Lịch sử sự cố</Link><Link to="/my/home" className="text-emerald-700 underline">Nhà đang thuê →</Link></div>
    {cancelError && <p role="alert" className="bg-rose-50 p-4 rounded-lg text-rose-700 mb-4">{cancelError}</p>}
    {error && <p role="alert" className="bg-rose-50 p-4 rounded-lg text-rose-700 mb-4">{error}</p>}
    {loading ? <p role="status" className="text-slate-500 py-10 text-center">Đang tải yêu cầu...</p> : !error && <>{data?.items.length ? <RequestList items={data.items} onCancel={cancel} cancelling={cancelling} /> : <p className="p-10 bg-white border border-slate-200 rounded-xl text-center text-slate-500">Bạn chưa gửi yêu cầu thuê nào.</p>}{data && <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />}</>}
    <div className="mt-10 border-t border-slate-200 pt-6"><ContractDraftList /></div>
  </main></CustomerLayout>;
}

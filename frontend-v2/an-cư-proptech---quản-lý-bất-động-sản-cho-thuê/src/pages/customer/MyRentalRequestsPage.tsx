import { SelectionCancellationModal } from '@/components/rental/SelectionCancellationModal';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { CustomerLayout } from '@/layouts/CustomerLayout';
import { RequestList } from '@/components/rental/RequestList';
import { Pagination } from '@/components/common/Pagination';
import { useRentalRequests } from '@/hooks/useRentalRequests';
import { cancelRentalRequest } from '@/services/rental/rentalService';
import type { RentalRequest } from '@/types/rental';
import { RentalHistoryNavigation } from '@/components/rental/RentalHistoryNavigation';
import type { RentalHistoryTab } from '@/components/rental/RentalHistoryNavigation';
import { ContractDraftList } from '@/components/contract/ContractDraftList';

export function MyRentalRequestsPage({ initialTab = 'requests' }: { initialTab?: RentalHistoryTab }) {
  const [params, setParams] = useSearchParams();
  const requested = params.get('tab');
  const active: RentalHistoryTab = requested === 'contracts' || requested === 'requests' ? requested : initialTab;
  const [page, setPage] = useState(0);
  return <CustomerLayout><main className="max-w-5xl mx-auto px-5 py-8 space-y-6">
    <header><h1 className="text-2xl font-bold">Yêu cầu & hợp đồng</h1><p className="text-sm text-slate-500 mt-2">Theo dõi yêu cầu thuê và hợp đồng trong hai tab riêng. Nhắc hạn được gửi qua chuông thông báo.</p></header>
    <RentalHistoryNavigation active={active} onChange={tab => { const next = new URLSearchParams(params); next.set('tab', tab); if (tab === 'requests') next.delete('contractId'); setParams(next); }} />
    <div className="flex flex-wrap gap-4 text-sm"><Link to="/my/invoices" className="text-emerald-700 underline">Lịch sử hóa đơn</Link><Link to="/my/maintenance" className="text-emerald-700 underline">Lịch sử sự cố</Link><Link to="/my/home" className="text-emerald-700 underline">Nhà đang thuê →</Link></div>
    <section role="tabpanel" id={`rental-panel-${active}`} aria-labelledby={`rental-tab-${active}`} tabIndex={0}>
      {active === 'contracts' ? <ContractDraftList /> : <RentalRequestsPanel page={page} onPageChange={setPage} />}
    </section>
  </main></CustomerLayout>;
}

function RentalRequestsPanel({ page, onPageChange }: { page: number; onPageChange: (page: number) => void }) {
  const { data, loading, error, reload } = useRentalRequests(false, page);
  const [cancelRequest,setCancelRequest] = useState<string|null>(null);
  const [cancelling, setCancelling] = useState('');
  const [cancelError, setCancelError] = useState('');
  const cancel = async (request: RentalRequest) => {
    if (cancelling) return;
    setCancelling(request.id); setCancelError('');
    try { await cancelRentalRequest(request.id, request.version); }
    catch (err) { setCancelError(err instanceof Error ? err.message : 'Không thể hủy yêu cầu.'); }
    finally { setCancelling(''); reload(); }
  };
  return <div>{cancelRequest && <SelectionCancellationModal requestId={cancelRequest} onClose={()=>setCancelRequest(null)} onChanged={reload}/>}<div className="flex flex-wrap justify-between items-center gap-4 mb-6"><div><h2 className="text-lg font-bold">Yêu cầu thuê đã gửi</h2><p className="text-sm text-slate-500 mt-2">Khi chủ nhà soạn hợp đồng, hồ sơ sẽ chuyển sang tab Hợp đồng.</p></div><button onClick={reload} className="border border-slate-300 rounded-lg px-4 py-2 text-sm">Làm mới yêu cầu</button></div>
    {cancelError && <p role="alert" className="bg-rose-50 p-4 rounded-lg text-rose-700 mb-4">{cancelError}</p>}
    {error && <p role="alert" className="bg-rose-50 p-4 rounded-lg text-rose-700 mb-4">{error}</p>}
    {loading ? <p role="status" className="text-slate-500 py-10 text-center">Đang tải yêu cầu...</p> : !error && <>{data?.items.length ? <RequestList onOpenCancellation={request=>setCancelRequest(request.id)} items={data.items} onCancel={cancel} cancelling={cancelling} /> : <p className="p-10 bg-white border border-slate-200 rounded-xl text-center text-slate-500">Không có yêu cầu thuê nào chưa chuyển thành hợp đồng.</p>}{data && <Pagination page={data.page} totalPages={data.totalPages} onChange={onPageChange} />}</>}
  </div>;
}

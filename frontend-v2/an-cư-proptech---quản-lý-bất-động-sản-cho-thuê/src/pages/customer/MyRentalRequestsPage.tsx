import { useState } from 'react';
import { CustomerLayout } from '@/layouts/CustomerLayout';
import { RequestList } from '@/components/rental/RequestList';
import { Pagination } from '@/components/common/Pagination';
import { useRentalRequests } from '@/hooks/useRentalRequests';
export function MyRentalRequestsPage() {
  const [page, setPage] = useState(0);
  const { data, loading, error, reload } = useRentalRequests(false, page);
  return <CustomerLayout><main className="max-w-5xl mx-auto px-5 py-8"><div className="flex justify-between items-center mb-6"><div><h1 className="text-2xl font-bold">Yêu cầu thuê của tôi</h1><p className="text-sm text-slate-500 mt-2">Theo dõi các yêu cầu bạn đã gửi đến chủ nhà.</p></div><button onClick={reload} className="border border-slate-300 rounded-lg px-4 py-2 text-sm">Làm mới</button></div>
    {error && <p role="alert" className="bg-rose-50 p-4 rounded-lg text-rose-700 mb-4">{error}</p>}
    {loading ? <p role="status" className="text-slate-500 py-10 text-center">Đang tải yêu cầu...</p> : !error && <>{data?.items.length ? <RequestList items={data.items} /> : <p className="p-10 bg-white border border-slate-200 rounded-xl text-center text-slate-500">Bạn chưa gửi yêu cầu thuê nào.</p>}{data && <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />}</>}
  </main></CustomerLayout>;
}

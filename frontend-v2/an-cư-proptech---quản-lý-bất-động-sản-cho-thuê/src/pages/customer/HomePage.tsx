import { useState } from 'react';
import { Search, Building2 } from 'lucide-react';
import { CustomerLayout } from '@/layouts/CustomerLayout';
import { ApartmentCard } from '@/components/apartments/ApartmentCard';
import { Pagination } from '@/components/common/Pagination';
import { useApartments } from '@/hooks/useApartments';
import type { ApartmentFilters } from '@/types/apartment';

export function HomePage() {
  const [q, setQ] = useState('');
  const [district, setDistrict] = useState('');
  const [maxRent, setMaxRent] = useState('');
  const [filters, setFilters] = useState<ApartmentFilters>({ page: 0, size: 6 });
  const { data, loading, error, reload } = useApartments(filters);
  return <CustomerLayout>
    <section className="bg-gradient-to-r from-slate-900 to-emerald-900 text-white"><div className="max-w-7xl mx-auto px-5 py-14"><span className="text-sm text-emerald-200">Không gian sống cho hành trình mới</span><h1 className="text-3xl md:text-4xl font-bold mt-3">Tìm căn hộ phù hợp với bạn</h1><p className="text-slate-300 text-sm mt-4">Xem thông tin căn hộ và gửi yêu cầu thuê trực tiếp đến chủ nhà.</p></div></section>
    <main className="max-w-7xl mx-auto px-5 py-8">
      <form onSubmit={event => { event.preventDefault(); setFilters({ q, district, maxRent, page: 0, size: 6 }); }} className="bg-white border border-slate-200 rounded-xl p-4 grid md:grid-cols-[2fr_1fr_1fr_auto] gap-3 mb-8">
        <div><label htmlFor="apartment-search" className="text-xs font-semibold text-slate-500 block mb-1">Tên hoặc địa chỉ</label><input id="apartment-search" value={q} onChange={e => setQ(e.target.value)} maxLength={120} placeholder="Tìm căn hộ, khu vực..." className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" /></div>
        <div><label htmlFor="apartment-district" className="text-xs font-semibold text-slate-500 block mb-1">Khu vực</label><input id="apartment-district" value={district} onChange={e => setDistrict(e.target.value)} maxLength={80} placeholder="Ví dụ: Thủ Đức" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" /></div>
        <div><label htmlFor="apartment-max-rent" className="text-xs font-semibold text-slate-500 block mb-1">Giá tối đa / tháng</label><input id="apartment-max-rent" type="number" min={0} value={maxRent} onChange={e => setMaxRent(e.target.value)} placeholder="Không giới hạn" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" /></div>
        <button type="submit" className="self-end bg-emerald-600 text-white rounded-lg px-5 py-2 text-sm font-semibold flex items-center gap-2"><Search className="w-4 h-4" />Tìm kiếm</button>
      </form>
      {error && <div role="alert" className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4 mb-5">{error}<button onClick={reload} className="ml-3 underline">Thử lại</button></div>}
      {loading ? <p role="status" className="py-12 text-center text-slate-500">Đang tải căn hộ...</p> : !error && <>
        <div className="flex justify-between mb-5"><h2 className="font-bold text-slate-900">Căn hộ đang đăng</h2><span className="text-sm text-slate-500">{data?.totalElements ?? 0} căn hộ</span></div>
        {data?.items.length ? <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">{data.items.map(a => <ApartmentCard key={a.id} apartment={a} />)}</div>
          : <div className="bg-white border border-slate-200 rounded-xl p-12 text-center"><Building2 className="w-9 h-9 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">Chưa có căn hộ phù hợp với bộ lọc này.</p></div>}
        {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={page => setFilters(value => ({ ...value, page }))} />}
      </>}
    </main>
  </CustomerLayout>;
}

import { Building2, Plus } from 'lucide-react';
import type { Building } from '@/types';

const labels: Record<string, string> = { DRAFT: 'Nháp – chưa gửi hồ sơ', PENDING_APPROVAL: 'Chờ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Bị từ chối' };
export function PropertiesPage({ properties, onAdd, onSelect }: {
  properties: Building[]; onAdd: () => void; onSelect: (id: string) => void;
}) {
  return <section className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-bold">Tài sản cho thuê</h1><button onClick={onAdd} className="inline-flex gap-2 items-center bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold text-sm"><Plus className="w-4 h-4" />Thêm tài sản cho thuê</button></div>
    <p className="text-sm text-slate-600">Quản lý một căn/nhà riêng hoặc tài sản gồm nhiều căn/phòng. Quyền sở hữu hoặc khai thác được kiểm duyệt riêng cho từng tài sản.</p>
    <div className="grid md:grid-cols-2 gap-4">{properties.map(p => <article key={p.id} data-testid="property-card" className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 min-w-0">
      <div className="flex items-start gap-3"><Building2 className="w-6 h-6 text-emerald-600 shrink-0" /><div className="min-w-0"><h2 className="font-bold break-words">{p.name}</h2><p className="text-sm text-slate-500 break-words">{p.address}</p></div></div>
      <p className="text-sm">{p.rentalMode === 'SINGLE_UNIT' ? 'Cho thuê nguyên căn' : p.rentalMode === 'MULTI_UNIT' ? 'Nhiều căn/phòng' : 'Tài sản hiện có'} · {p.totalRooms} căn/phòng</p>
      <span className={`inline-block text-xs font-semibold px-2 py-1 rounded ${p.legalStatus === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>{labels[p.legalStatus] ?? p.legalStatus}</span>
      {p.legalStatus !== 'APPROVED' && <p className="text-sm text-slate-500">Chưa được công khai. Chức năng gửi hồ sơ và Admin kiểm duyệt chưa được triển khai.</p>}
      <button onClick={() => onSelect(p.id)} className="block text-sm font-semibold text-emerald-700 underline">Xem các căn/phòng</button>
    </article>)}</div>
  </section>;
}

import { MaintenanceActions } from '@/components/maintenance/MaintenanceActions';
import { useState } from 'react';
import type { MaintenanceTicket } from '@/types';
import { MaintenanceForm, type MaintenancePlace } from '@/components/maintenance/MaintenanceForm';
const labels: Record<string,string> = { PENDING:'Chờ tiếp nhận', ACCEPTED:'Đã tiếp nhận', IN_PROGRESS:'Đang sửa', AWAITING_CONFIRMATION:'Chờ xác nhận', RESOLVED:'Đã hoàn tất', CANCELLED:'Đã hủy', REJECTED:'Đã từ chối' };
const priorities: Record<string,string> = { urgent:'Khẩn cấp', high:'Ưu tiên cao', normal:'Bình thường' };
export function MaintenancePage({ tickets, loading, error, onReload, owner=true, places=[] }: { tickets: MaintenanceTicket[]; loading:boolean; error:string; onReload:()=>void; owner?:boolean;places?:MaintenancePlace[] }) {
 const [creating,setCreating]=useState(false);
 const [filter,setFilter] = useState('');
 const visible = tickets.filter(t=>!filter || t.apiStatus===filter);
 const open = tickets.filter(t=>!['RESOLVED','CANCELLED','REJECTED'].includes(t.apiStatus ?? '')).length;
 return <section className="space-y-6 pb-12">
  <header className="bg-white border rounded-xl p-5 flex flex-wrap justify-between gap-3"><div><h1 className="text-xl font-bold">Tiếp Nhận Sự Cố & Bảo Trì Thiết Bị</h1><p className="text-sm text-slate-500 mt-2">{loading?'Đang tải dữ liệu...':error?'Chưa tải được dữ liệu':`${open} sự cố đang mở · ${tickets.length} phiếu`}</p></div><button type="button" onClick={onReload} className="border rounded-lg px-4 py-2 text-sm">Làm mới</button></header>
  <button disabled={!places.length} onClick={()=>setCreating(v=>!v)} className="bg-emerald-700 text-white px-4 py-2 rounded-lg disabled:opacity-50">Báo sự cố mới</button>
  {creating && <MaintenanceForm owner={owner} places={places} onSaved={onReload} onClose={()=>setCreating(false)}/>}
  <div className="bg-white border rounded-xl p-3 flex flex-wrap gap-2" aria-label="Lọc trạng thái sự cố">{[['','Tất cả'],...Object.entries(labels)].map(([value,label])=><button key={value} onClick={()=>setFilter(value)} className={`px-3 py-2 rounded-lg text-sm ${filter===value?'bg-slate-900 text-white':'bg-slate-50'}`}>{label} ({tickets.filter(t=>!value || t.apiStatus===value).length})</button>)}</div>
  {error && <p role="alert" className="bg-rose-50 text-rose-700 p-4 rounded-xl">{error}</p>}
  {loading && <p role="status" className="p-6 text-slate-500">Đang tải sự cố từ máy chủ...</p>}
  {!loading && !error && !visible.length && <p className="bg-white border rounded-xl p-8 text-center text-slate-500">{tickets.length?'Không có sự cố ở trạng thái này.':'Chưa có sự cố nào được ghi nhận.'}</p>}
  {!loading && !error && <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{visible.map(t=><article key={t.id} className="bg-white border rounded-xl p-5 space-y-3"><div className="flex justify-between gap-3 text-xs"><span className="font-semibold">{t.roomNumber}</span><span>{priorities[t.priority]}</span></div><h2 className="font-bold">{t.title}</h2><p className="whitespace-pre-wrap text-sm text-slate-600">{t.description}</p><p className="text-xs text-slate-500">Người báo: {t.tenantName}</p><p className="text-xs text-slate-500">Thời gian báo: {new Date(t.createdAt).toLocaleString('vi-VN')}</p><p className="text-sm font-semibold text-emerald-700">{labels[t.apiStatus??'']??'Không xác định'}</p><MaintenanceActions ticket={t} owner={owner} onReload={onReload}/></article>)}</div>}
 </section>;
}

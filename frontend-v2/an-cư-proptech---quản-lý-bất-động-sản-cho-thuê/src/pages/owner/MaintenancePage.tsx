import { useState } from 'react';
import { Wrench, Plus, RefreshCw, Clock3, ShieldCheck, AlertCircle, Search, Droplets, Zap, Wind, Armchair, UserRound, CalendarDays } from 'lucide-react';
import type { MaintenanceTicket } from '@/types';
import { MaintenanceActions } from '@/components/maintenance/MaintenanceActions';
import { MaintenanceForm, type MaintenancePlace } from '@/components/maintenance/MaintenanceForm';
import '@/styles/operations.css';

const labels: Record<string,string> = { PENDING:'Chờ tiếp nhận', ACCEPTED:'Đã tiếp nhận', IN_PROGRESS:'Đang sửa', AWAITING_CONFIRMATION:'Chờ xác nhận', RESOLVED:'Đã hoàn tất', CANCELLED:'Đã hủy', REJECTED:'Đã từ chối' };
const priorities: Record<string,string> = { urgent:'Khẩn cấp', high:'Ưu tiên cao', normal:'Bình thường' };
const categoryIcons = { electric:Zap, water:Droplets, aircon:Wind, furniture:Armchair, other:Wrench };
const closedStatuses = ['RESOLVED','CANCELLED','REJECTED'];

export function MaintenancePage({ tickets, loading, error, onReload, owner=true, places=[], initialCreating=false }: {
  tickets:MaintenanceTicket[]; loading:boolean; error:string; onReload:()=>void; owner?:boolean; places?:MaintenancePlace[]; initialCreating?:boolean;
}) {
  const [creating,setCreating] = useState(initialCreating);
  const [filter,setFilter] = useState('');
  const [search,setSearch] = useState('');
  const visible = tickets.filter(t => (!filter || t.apiStatus===filter) && `${t.title} ${t.roomNumber} ${t.tenantName}`.toLowerCase().includes(search.toLowerCase()));
  const open = tickets.filter(t => !closedStatuses.includes(t.apiStatus??''));
  const urgent = open.filter(t => t.priority==='urgent').length;
  const awaiting = tickets.filter(t => t.apiStatus==='AWAITING_CONFIRMATION').length;

  return <section className="operations-page" aria-label="Quản lý sự cố và bảo trì">
    <header className="op-heading">
      <div className="op-title-group"><span className="op-heading-icon"><Wrench size={23}/></span><div>
        <div className="op-eyebrow">{owner?'Vận hành · Chăm sóc tài sản':'Không gian sống · Hỗ trợ cư dân'}</div>
        <h1>{owner?'Sự cố & bảo trì':'Sự cố của tôi'}</h1>
        <p>{owner?'Theo dõi yêu cầu, phối hợp sửa chữa và nghiệm thu trong một nơi.':'Báo sự cố tại phòng đang thuê và theo dõi từng bước xử lý.'}</p>
      </div></div>
      <div className="op-buttons"><button type="button" onClick={onReload} disabled={loading} className="op-button"><RefreshCw size={14}/>Làm mới</button><button disabled={!places.length} onClick={()=>setCreating(v=>!v)} className="op-button op-button-primary" aria-expanded={creating}><Plus size={15}/>Báo sự cố mới</button></div>
    </header>
    <div className="op-stats">{[{label:'Sự cố đang mở',count:open.length,icon:Wrench,tone:''},{label:'Cần ưu tiên khẩn cấp',count:urgent,icon:AlertCircle,tone:'amber'},{label:'Chờ nghiệm thu',count:awaiting,icon:ShieldCheck,tone:'blue'}].map(s=><div className="op-stat" key={s.label}><span className={`op-stat-icon ${s.tone}`}><s.icon size={19}/></span><div><small>{s.label}</small><strong>{loading||error?'—':s.count}</strong></div></div>)}</div>
    {creating&&<div className="mb-5"><MaintenanceForm owner={owner} places={places} onSaved={onReload} onClose={()=>setCreating(false)}/></div>}
    {error&&<p role="alert" className="op-error">{error}</p>}
    <div className="op-panel"><div className="op-toolbar">
      <div className="op-tabs" aria-label="Lọc trạng thái sự cố">{[['','Tất cả'],...Object.entries(labels)].map(([value,label])=><button key={value} aria-pressed={filter===value} onClick={()=>setFilter(value)}>{label}<span className="op-count">{tickets.filter(t=>!value||t.apiStatus===value).length}</span></button>)}</div>
      <label className="op-search"><Search size={15}/><input aria-label="Tìm sự cố" placeholder="Tìm nội dung, phòng, người báo..." value={search} onChange={e=>setSearch(e.target.value)}/></label>
    </div><div className="op-caption">{loading?'Đang cập nhật dữ liệu':`${visible.length} phiếu hiển thị · ${tickets.length} phiếu đã ghi nhận`}</div></div>
    {loading&&<p role="status" className="op-empty">Đang tải sự cố từ máy chủ...</p>}
    {!loading&&!error&&!visible.length&&<div className="op-panel mt-5"><div className="op-empty"><Wrench size={30}/><strong>{tickets.length?'Không có sự cố ở trạng thái này.':'Chưa có sự cố nào được ghi nhận.'}</strong>{tickets.length?'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.':'Các yêu cầu sửa chữa sẽ xuất hiện tại đây sau khi được gửi.'}</div></div>}
    {!loading&&!error&&<div className="op-ticket-grid">{visible.map(t=>{
      const CategoryIcon=categoryIcons[t.category]??Wrench;
      const statusTone=t.apiStatus==='RESOLVED'?'green':t.apiStatus==='PENDING'?'amber':closedStatuses.includes(t.apiStatus??'')?'':'blue';
      return <article key={t.id} className="op-ticket">
        <div className="op-ticket-head"><div className="op-ticket-location"><span className="op-category"><CategoryIcon size={17}/></span>{t.roomNumber}</div><span className={`op-badge ${t.priority==='urgent'?'rose':t.priority==='high'?'amber':''}`}>{priorities[t.priority]}</span></div>
        <h2>{t.title}</h2><p className="op-ticket-description">{t.description}</p>
        <div className="op-ticket-meta"><span><UserRound size={12}/>{t.tenantName}</span><span><CalendarDays size={12}/>{new Date(t.createdAt).toLocaleString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}</span></div>
        <div className="op-ticket-status"><span className={`op-badge ${statusTone}`}><Clock3 size={11}/>{labels[t.apiStatus??'']??'Không xác định'}</span><span className="op-ticket-code">SC-{t.id}</span></div>
        <MaintenanceActions ticket={t} owner={owner} onReload={onReload}/>
      </article>;
    })}</div>}
  </section>;
}

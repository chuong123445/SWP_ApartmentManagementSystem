import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { AccountLayout } from '@/layouts/AccountLayout';
import { useAuth } from '@/hooks/useAuth';
import { getPropertyNotices, type PropertyNotice } from '@/services/property/propertyApplicationService';
export function PropertyNoticesPage(){
  const {user}=useAuth();const [items,setItems]=useState<PropertyNotice[]>([]);const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [revision,setRevision]=useState(0);
  useEffect(()=>{const controller=new AbortController();setLoading(true);setItems([]);setError('');getPropertyNotices(controller.signal).then(data=>{if(!controller.signal.aborted)setItems(data);}).catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Không tải được thông báo.');}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();},[user?.id,revision]);
  return <AccountLayout><h1 className="text-2xl font-bold mb-4">Thông báo thời hạn quyền cho thuê</h1><p className="text-slate-600 mb-4">Nhắc khi còn tối đa 30 ngày và khi đã hết hạn. Email nhắc hạn chỉ gửi đến địa chỉ đã xác thực. Hợp đồng hiện có được giữ nguyên.</p><button onClick={()=>setRevision(v=>v+1)} className="text-emerald-700 underline mb-4">Tải lại thông báo</button>
    {loading&&<p role="status">Đang tải thông báo...</p>}{error&&<p role="alert" className="text-rose-700">{error}</p>}{!loading&&!error&&!items.length&&<p>Chưa có thông báo thời hạn.</p>}
    <div className="space-y-4">{items.map(n=><article key={n.id} className="border rounded-xl p-4 min-w-0"><h2 className="font-bold break-words">{n.propertyName}</h2><p className={n.kind==='EXPIRED'?'text-rose-700':'text-amber-800'}>{n.kind==='EXPIRED'?'Hồ sơ quyền cho thuê đã hết hạn':'Quyền cho thuê sắp hết hạn'} · đến hết {n.expiresOn}</p><p className="text-sm mt-2">Hãy kiểm tra hồ sơ hiện hành và gửi giấy tờ gia hạn để Admin duyệt. Thông báo cũ vẫn được giữ trong lịch sử.</p></article>)}</div>
    <Link to="/account/rental-properties" className="inline-block mt-5 text-emerald-700 underline">Mở hồ sơ quyền cho thuê</Link>
  </AccountLayout>;
}

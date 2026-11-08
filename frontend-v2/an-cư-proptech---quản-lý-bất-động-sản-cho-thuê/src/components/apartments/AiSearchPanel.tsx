import { useEffect, useRef, useState } from 'react';
import { suggestSearch, applyAiSearch, toApartmentFilters, hasAiFilters, type AiSearchResult, type AiFilters } from '@/services/apartments/aiSearchService';
import type { ApartmentFilters } from '@/types/apartment';
const labels:Record<keyof AiFilters,string>={q:'Tên/địa chỉ',city:'Tỉnh/thành phố',district:'Quận/huyện',ward:'Phường/xã',minRent:'Giá tối thiểu (đ/tháng)',maxRent:'Giá tối đa (đ/tháng)',minArea:'Diện tích tối thiểu (m²)',maxArea:'Diện tích tối đa (m²)',bedrooms:'Số phòng ngủ',occupants:'Số người cần ở'};
export function AiSearchPanel({onApply}:{onApply:(filters:ApartmentFilters)=>void}){
 const [text,setText]=useState('');const [consent,setConsent]=useState(false);const [result,setResult]=useState<AiSearchResult|null>(null);const [filters,setFilters]=useState<AiFilters|null>(null);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 const controller=useRef<AbortController|null>(null);const form=useRef<HTMLFormElement>(null);
 useEffect(()=>()=>controller.current?.abort(),[]);
 const suggest=async()=>{if(busy||!consent||!text.trim())return;setBusy(true);setResult(null);setFilters(null);setError('');const c=new AbortController();controller.current=c;
  try{const data=await suggestSearch(text.trim(),c.signal);if(!c.signal.aborted){setResult(data);setFilters(data.filters);}}catch(e){if(!c.signal.aborted)setError(e instanceof Error?e.message:'Không phân tích được yêu cầu.');}finally{if(!c.signal.aborted)setBusy(false);}
 };
 const apply=async()=>{if(!result||!filters||!hasAiFilters(filters)||busy||!form.current?.reportValidity())return;setBusy(true);setError('');try{const accepted=await applyAiSearch(result.runId,filters);onApply(toApartmentFilters(accepted));setResult(null);setFilters(null);}catch(e){setError(e instanceof Error?e.message:'Không áp dụng được bộ lọc.');}finally{setBusy(false);}};
 return <section aria-label="AI hỗ trợ tìm căn hộ" className="home-hero mt-4"><h2 className="font-bold text-xl">Tìm phòng bằng lời nói tự nhiên</h2><p className="text-sm">Ví dụ: Phòng dưới 5 triệu, từ 25 m², tại Thủ Đức, cho 2 người. AI chỉ đề xuất bộ lọc; danh sách phòng và giá lấy từ hệ thống.</p>
  <label className="block mt-3">Nhu cầu tìm phòng<textarea aria-label="Nhu cầu tìm phòng" disabled={busy} maxLength={1000} value={text} onChange={e=>{setText(e.target.value);setResult(null);setFilters(null);setError('');}} rows={3} className="w-full min-w-0 border rounded-lg p-3"/></label>
  <label className="flex gap-2 items-start text-sm my-3"><input type="checkbox" disabled={busy} checked={consent} onChange={e=>setConsent(e.target.checked)}/><span>Tôi đồng ý gửi mô tả này đến Gemini để phân tích. Không nhập thông tin cá nhân hoặc giấy tờ.</span></label>
  <button type="button" className="home-primary" disabled={busy||!consent||!text.trim()} onClick={()=>void suggest()}>{busy?'Đang xử lý AI...':'Phân tích nhu cầu bằng AI'}</button>
  {error&&<p role="alert" className="text-red-700 mt-3">{error} Bạn vẫn có thể dùng bộ lọc thông thường phía trên.</p>}
  {result&&filters&&<form ref={form} className="mt-4 space-y-3" onSubmit={e=>{e.preventDefault();void apply();}}><h3 className="font-semibold">Kiểm tra bộ lọc AI đề xuất</h3><p className="text-sm">Kiểm tra và sửa trước khi áp dụng. Ô trống nghĩa là không giới hạn; chưa thực hiện tìm kiếm theo gợi ý này.</p>
   {result.notes.length>0&&<ul className="list-disc pl-5 text-amber-900">{result.notes.map((n,i)=><li key={i}>{n}</li>)}</ul>}
   <fieldset disabled={busy} className="grid sm:grid-cols-2 gap-3">{(Object.keys(labels) as (keyof AiFilters)[]).map(key=><label key={key} className="grid gap-1 min-w-0 text-sm">{labels[key]}<input className="border rounded-lg p-2 min-w-0" maxLength={key==='q'?120:80} type={['q','city','district','ward'].includes(key)?'text':'number'} min={key==='occupants'?1:0} step={['occupants','bedrooms'].includes(key)?'1':'0.01'} value={filters[key]??''} onChange={e=>setFilters({...filters,[key]:e.target.value===''?null:['occupants','bedrooms'].includes(key)?Number(e.target.value):e.target.value})}/></label>)}</fieldset>
   <p className="text-xs text-slate-500">Model: {result.model} · {result.promptVersion}</p><button disabled={busy||!hasAiFilters(filters)} type="submit" className="home-primary">Áp dụng bộ lọc và tìm phòng</button>{!hasAiFilters(filters)&&<p className="text-sm">Hãy nhập ít nhất một bộ lọc ở trên, hoặc bổ sung mô tả rồi phân tích lại.</p>}
  </form>}
 </section>;
}

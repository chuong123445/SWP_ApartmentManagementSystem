import {useEffect,useState} from 'react';
import {Sparkles,RefreshCw,FileSearch,Info} from 'lucide-react';
import {adminAiReview,retryAiReview} from '@/services/property/dossierAiService';
import type {DossierAiReview,AiFinding} from '@/types/dossierAi';
import type {EvidenceFile} from '@/types/dossier';

const fields:Record<string,string>={propertyName:'Tên tài sản',propertyAddress:'Địa chỉ tài sản',applicantName:'Người nộp',applicantDocumentNumber:'CCCD người nộp',principalName:'Chủ sở hữu gốc',principalDocumentNumber:'CCCD chủ sở hữu gốc',certificateNumber:'Số giấy chứng nhận',certificateIssueDate:'Ngày cấp',certificateIssuePlace:'Nơi cấp',rightsValidFrom:'Quyền cho thuê từ',rightsValidUntil:'Quyền cho thuê đến',originalLeaseFrom:'Hợp đồng gốc từ',originalLeaseUntil:'Hợp đồng gốc đến',bank:'Ngân hàng',accountNumber:'Số tài khoản',accountHolderName:'Chủ tài khoản',other:'Chứng từ / thông tin khác'};
const findingLabels:Record<string,string>={MISSING_INFORMATION:'Thiếu thông tin',MISSING_IMAGE:'Thiếu ảnh / trang',MISMATCH:'Không trùng khớp',UNREADABLE:'Chưa đọc rõ',INCONCLUSIVE:'Cần đối chiếu thêm'};
const states:Record<string,string>={NOT_REQUESTED:'Chưa quét',WAITING_CONFIGURATION:'Chưa kết nối AI',QUEUED:'Đang chờ quét',RUNNING:'Đang quét hồ sơ',COMPLETED:'Đã quét',FAILED:'Quét chưa thành công'};
const errors:Record<string,string>={RATE_LIMIT:'Dịch vụ AI đang giới hạn lượt gọi.',PROVIDER_AUTH:'Kết nối AI chưa được xác thực.',PROVIDER_ERROR:'Dịch vụ AI chưa xử lý được yêu cầu.',PROVIDER_TIMEOUT:'Dịch vụ AI phản hồi quá chậm.',PROVIDER_UNAVAILABLE:'Chưa kết nối được dịch vụ AI.',PROVIDER_INCOMPLETE:'AI không trả về kết quả đầy đủ.',INVALID_RESPONSE:'Kết quả AI chưa đủ cấu trúc để đối chiếu.',INVALID_SOURCE:'Tệp hồ sơ không đầy đủ hoặc đã thay đổi.',WORKER_INTERRUPTED:'Lượt quét trước bị gián đoạn.',PROCESSING_FAILED:'Lượt quét chưa xử lý xong.'};

function Finding({item}:{item:AiFinding}){
  return <li className="border border-amber-100 bg-amber-50/70 rounded-lg p-3 text-xs space-y-2">
    <p className="font-semibold text-amber-900">{findingLabels[item.type]??item.type} · {fields[item.field]??item.field}</p>
    <p className="text-slate-700 whitespace-pre-wrap break-words">{item.message}</p>
    {item.declaredValue&&<p className="break-words"><span className="text-slate-500">Đã khai: </span>{item.declaredValue}</p>}
    {item.observedValue&&<p className="break-words"><span className="text-slate-500">Đọc từ tệp: </span>{item.observedValue}</p>}
  </li>;
}
export function DossierAiReviewPanel({dossierId,files}:{dossierId:string;files:EvidenceFile[]}){
  const [data,setData]=useState<DossierAiReview|null>(null);const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [revision,setRevision]=useState(0);
  const [actionError,setActionError]=useState('');
  useEffect(()=>{
    let active=true;let timer:ReturnType<typeof setTimeout>|undefined;setLoading(true);setError('');
    const load=async()=>{try{const value=await adminAiReview(dossierId);if(!active)return;setData(value);setError('');
      if(['WAITING_CONFIGURATION','QUEUED','RUNNING'].includes(value.status))timer=setTimeout(()=>void load(),value.status==='WAITING_CONFIGURATION'?15000:5000);
    }catch(e){if(active)setError(e instanceof Error?e.message:'Không tải được kết quả AI.');}finally{if(active)setLoading(false);}};
    void load();return()=>{active=false;if(timer)clearTimeout(timer);};
  },[dossierId,revision]);
  const requestScan=async()=>{if(!data||busy)return;setBusy(true);setActionError('');try{setData(await retryAiReview(dossierId,data.version));setRevision(v=>v+1);}catch(e){setActionError(e instanceof Error?e.message:'Không tạo được lượt quét.');setRevision(v=>v+1);}finally{setBusy(false);}};
  const result=data?.result;
  const canScan=data&&['NOT_REQUESTED','COMPLETED','FAILED'].includes(data.status);
  return <section aria-label="AI hỗ trợ kiểm tra hồ sơ" className="rounded-xl border border-indigo-100 bg-indigo-50/30 p-4 space-y-4 min-w-0">
    <header className="flex items-start justify-between flex-wrap gap-3"><div className="flex items-center gap-2"><Sparkles size={18} className="text-indigo-600"/><h3 className="font-bold text-sm">AI hỗ trợ kiểm tra hồ sơ</h3></div><div className="flex flex-wrap gap-3 items-center"><span role="status" className="text-xs text-indigo-700 bg-indigo-100/60 rounded-full px-2.5 py-1">{loading&&!data?'Đang tải...':data?states[data.status]:'Chưa có kết quả'}</span><button type="button" aria-label="Tải lại kết quả AI" disabled={busy||loading} onClick={()=>setRevision(v=>v+1)} className="text-indigo-700 disabled:opacity-40"><RefreshCw size={14}/></button></div></header>
    <p className="text-xs text-slate-500 leading-relaxed flex gap-2"><Info size={14} className="shrink-0 mt-0.5"/>AI chỉ hỗ trợ đối chiếu thông tin và chứng từ. Admin tự quyết định phê duyệt, yêu cầu bổ sung hoặc từ chối; nhận xét AI không tự thay đổi trạng thái hồ sơ.</p>
    {(error||actionError)&&<p role="alert" className="text-sm text-rose-700">{error||actionError}</p>}
    {data?.status==='WAITING_CONFIGURATION'&&<p className="text-sm text-slate-600 bg-white border border-slate-100 p-3 rounded-lg">Dịch vụ AI chưa được kết nối. Hồ sơ đã được lưu và vẫn có thể kiểm duyệt thủ công. Khi dịch vụ được bật, hệ thống sẽ tự quét hồ sơ đang chờ.</p>}
    {data?.status==='NOT_REQUESTED'&&<p className="text-sm text-slate-600">Hồ sơ này chưa có lượt quét. Admin có thể bắt đầu quét để nhận gợi ý đối chiếu.</p>}
    {data?.status==='QUEUED'&&<p className="text-sm text-slate-600">Đã xếp hàng. Kết quả sẽ tự cập nhật khi lượt quét hoàn tất.</p>}
    {data?.status==='RUNNING'&&<p className="text-sm text-slate-600">Đang đọc các trường đã khai và từng ảnh/PDF gửi cùng hồ sơ...</p>}
    {data?.status==='FAILED'&&<p className="text-sm text-amber-800">{errors[data.errorCode??'']??'AI chưa kiểm tra xong hồ sơ.'} Chưa có kết luận AI; admin vẫn xử lý hồ sơ bình thường.</p>}
    {data?.status==='COMPLETED'&&result&&<>
      <div className={`border rounded-lg p-3 text-sm ${result.verdict==='CONSISTENT'?'bg-emerald-50 border-emerald-100 text-emerald-900':'bg-amber-50 border-amber-100 text-amber-900'}`}><strong>{result.verdict==='CONSISTENT'?'Chưa phát hiện bất thường':result.verdict==='ISSUES_FOUND'?'Có điểm cần đối chiếu / bổ sung':'Chưa đủ cơ sở để đánh giá'}</strong><p className="mt-2 text-xs leading-relaxed">{result.summary}</p></div>
      {!!result.overallFindings.length&&<div><h4 className="font-semibold text-xs mb-2">Đối chiếu giữa các tệp</h4><ul className="space-y-2">{result.overallFindings.map((item,i)=><Finding key={i} item={item}/>)}</ul></div>}
      {result.files.map(file=><article key={file.fileId} className="bg-white border border-slate-200 rounded-lg p-3 space-y-3 min-w-0"><div className="flex gap-2 items-start"><FileSearch size={16} className="text-indigo-500 shrink-0 mt-0.5"/><div className="min-w-0"><h4 className="font-semibold text-xs break-all">{files.find(f=>f.id===file.fileId)?.filename??`Tệp ${file.fileId}`}</h4><p className="text-xs text-slate-500 mt-1">{file.documentType} · {file.readable?'Đã đọc nội dung':'Chưa đọc rõ'}</p></div></div>
        {!!file.findings.length&&<ul className="space-y-2">{file.findings.map((item,i)=><Finding key={i} item={item}/>)}</ul>}
        <details className="text-xs"><summary className="cursor-pointer text-indigo-700">Các trường đã đọc ({file.extractedFields.length})</summary><dl className="mt-3 space-y-2">{file.extractedFields.map((field,i)=><div key={i} className="grid sm:grid-cols-2 gap-1 border-b border-slate-100 pb-2"><dt className="text-slate-500">{fields[field.field]??field.field}</dt><dd className="break-words whitespace-pre-wrap">{field.value}</dd></div>)}</dl></details>
      </article>)}
      <p className="text-[11px] text-slate-500">Kết quả không xác minh giấy tờ thật/giả hoặc quyền sở hữu hợp pháp.</p>
    </>}
    {canScan&&<button type="button" disabled={busy||loading} onClick={()=>void requestScan()} className="border border-indigo-200 text-indigo-700 bg-white rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-40">{busy?'Đang xếp hàng...':data.status==='NOT_REQUESTED'?'Quét hồ sơ bằng AI':'Quét lại hồ sơ'}</button>}
    {data?.createdAt&&<details className="text-[11px] text-slate-400"><summary className="cursor-pointer">Thông tin lượt quét</summary><div className="mt-2 space-y-1 break-all"><p>Model: {data.model??'Chưa chạy'} · {data.promptVersion}</p><p>Lần xử lý: {data.attempts} · Nộp vào hàng quét: {new Date(data.createdAt).toLocaleString('vi-VN')}</p>{data.finishedAt&&<p>Hoàn tất: {new Date(data.finishedAt).toLocaleString('vi-VN')}</p>}<p>Mã đối chiếu nguồn: {data.sourceHash}</p></div></details>}
  </section>;
}

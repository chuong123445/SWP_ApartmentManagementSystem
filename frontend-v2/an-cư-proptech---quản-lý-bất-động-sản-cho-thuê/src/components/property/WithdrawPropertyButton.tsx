import {useRef,useState} from 'react';
import {withdrawProperty} from '@/services/property/ownerPropertyService';

export function WithdrawPropertyButton({propertyId,version,pending=false,onWithdrawn}:{propertyId:string;version:number;pending?:boolean;onWithdrawn:()=>void}){
  const [busy,setBusy]=useState(false);const [error,setError]=useState('');const running=useRef(false);
  const remove=async()=>{
    if(running.current||!window.confirm(pending?'Rút hồ sơ chờ duyệt và xóa khỏi danh sách? Hồ sơ đã gửi và giấy tờ vẫn được giữ trong lịch sử.':'Xóa bản nháp này khỏi danh sách? Bạn có thể bắt đầu một hồ sơ mới sau đó.'))return;
    running.current=true;setBusy(true);setError('');
    try{await withdrawProperty(propertyId,version);onWithdrawn();}catch(e){setError(e instanceof Error?e.message:'Không thể xóa hoặc rút hồ sơ.');}
    finally{running.current=false;setBusy(false);}
  };
  return <div className="space-y-2"><button type="button" disabled={busy} onClick={()=>void remove()} className="text-sm text-rose-700 underline disabled:opacity-50">{busy?'Đang xử lý…':pending?'Rút hồ sơ chờ duyệt':'Xóa bản nháp'}</button>{error&&<p role="alert" className="text-sm text-rose-700">{error} <button type="button" className="underline" onClick={onWithdrawn}>Tải lại danh sách</button></p>}</div>;
}

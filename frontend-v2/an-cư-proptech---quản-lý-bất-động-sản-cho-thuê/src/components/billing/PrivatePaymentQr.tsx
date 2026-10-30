import {useEffect,useState} from 'react';
import {apiFetch,readApiError} from '@/services/http/client';
export function PrivatePaymentQr({path,alt}:{path:string;alt:string}){
 const [url,setUrl]=useState(''),[error,setError]=useState('');
 useEffect(()=>{let active=true,objectUrl='';setUrl('');setError('');apiFetch(path,{cache:'no-store'}).then(async r=>{if(!r.ok)throw await readApiError(r);if(!r.headers.get('content-type')?.startsWith('image/'))throw new Error('Máy chủ chưa trả về ảnh QR.');return r.blob();}).then(blob=>{if(active){objectUrl=URL.createObjectURL(blob);setUrl(objectUrl);}}).catch(e=>{if(active)setError(e instanceof Error?e.message:'Không tải được QR.');});return()=>{active=false;if(objectUrl)URL.revokeObjectURL(objectUrl);};},[path]);
 return error?<p role="alert" className="text-sm text-rose-700">{error}</p>:url?<img src={url} alt={alt} className="max-w-full max-h-80 object-contain rounded-xl border border-slate-200 bg-white"/>:<p role="status" className="text-sm text-slate-500">Đang tải ảnh QR...</p>;
}

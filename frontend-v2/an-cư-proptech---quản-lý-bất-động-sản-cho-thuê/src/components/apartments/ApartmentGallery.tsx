import {useState} from 'react';
import {ChevronLeft,ChevronRight} from 'lucide-react';
import {ApartmentImage} from '@/components/apartments/ApartmentImage';

export function ApartmentGallery({images,title}:{images:string[];title:string}){
  // Tải căn hộ khác/thay gallery thì bắt đầu lại từ ảnh đầu, không giữ chỉ số cũ.
  return <GallerySlides key={JSON.stringify(images)} images={images} title={title}/>;
}
function GallerySlides({images,title}:{images:string[];title:string}){
  const [index,setIndex]=useState(0);
  const sources=images.length?images:['/images/apartment-placeholder.svg'];
  const multiple=sources.length>1;
  const move=(delta:number)=>setIndex(current=>(current+delta+sources.length)%sources.length);
  return <section aria-label="Ảnh căn hộ" aria-roledescription="bộ ảnh" tabIndex={multiple?0:undefined}
    onKeyDown={event=>{
      if(!multiple||event.altKey||event.ctrlKey||event.metaKey)return;
      if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();move(event.key==='ArrowLeft'?-1:1);}
    }} className="min-w-0 rounded-2xl focus-visible:outline-2 focus-visible:outline-emerald-600">
    <div className="relative overflow-hidden rounded-2xl bg-slate-100 aspect-[4/3] sm:aspect-[16/10]">
      <ApartmentImage key={sources[index]} src={sources[index]} alt={`${title} - ảnh ${index+1}`} className="w-full h-full object-contain"/>
      {multiple&&<>
        <button type="button" aria-label="Ảnh trước" onClick={()=>move(-1)} className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-slate-900/75 hover:bg-slate-900 text-white flex items-center justify-center shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"><ChevronLeft aria-hidden="true" className="w-6 h-6"/></button>
        <button type="button" aria-label="Ảnh tiếp theo" onClick={()=>move(1)} className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-slate-900/75 hover:bg-slate-900 text-white flex items-center justify-center shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"><ChevronRight aria-hidden="true" className="w-6 h-6"/></button>
      </>}
      <p aria-live="polite" aria-atomic="true" className="absolute bottom-3 right-3 bg-slate-900/75 text-white rounded-full px-3 py-1 text-sm">{images.length?`${index+1} / ${sources.length}`:'Chưa có ảnh'}</p>
    </div>
    {multiple&&<div className="flex justify-center gap-1 mt-2" aria-label="Chọn ảnh">{sources.map((src,n)=><button type="button" key={`${src}-${n}`} aria-label={`Xem ảnh ${n+1}`} aria-current={index===n?'true':undefined} onClick={()=>setIndex(n)} className="w-11 h-11 flex items-center justify-center rounded-lg hover:bg-emerald-50 focus-visible:outline-emerald-600"><span aria-hidden="true" className={`w-2.5 h-2.5 rounded-full ${index===n?'bg-emerald-700':'bg-slate-300'}`}/></button>)}</div>}
  </section>;
}

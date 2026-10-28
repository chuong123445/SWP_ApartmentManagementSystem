import { useEffect, useState } from 'react';
import { apiFetch } from '@/services/http/client';
const placeholder = '/images/apartment-placeholder.svg';

export function ApartmentImage({ src, alt, className }: { src?: string; alt: string; className?: string }) {
  const [privateImage,setPrivateImage]=useState<{source:string;url:string}|null>(null);
  const protectedSource=src?.startsWith('/api/v1/property-images/');
  useEffect(()=>{if(!protectedSource||!src)return;const controller=new AbortController();let url:string|undefined;
    apiFetch(src,{signal:controller.signal,cache:'no-store'}).then(response=>{if(!response.ok)throw new Error('Image unavailable');return response.blob();}).then(blob=>{if(!controller.signal.aborted){url=URL.createObjectURL(blob);setPrivateImage({source:src,url});}}).catch(()=>{});
    return()=>{controller.abort();if(url)URL.revokeObjectURL(url);};
  },[src,protectedSource]);
  const resolved=protectedSource?(privateImage && privateImage.source===src?privateImage.url:placeholder):src;
  return <img src={resolved || placeholder} alt={alt} className={className} loading="lazy" onError={event => {
    const element = event.currentTarget;
    if (!element.src.endsWith(placeholder)) element.src = placeholder;
  }} />;
}

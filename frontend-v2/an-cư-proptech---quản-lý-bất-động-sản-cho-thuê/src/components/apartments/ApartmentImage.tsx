import { useEffect, useState } from 'react';
import { apiFetch } from '@/services/http/client';
const placeholder = '/images/apartment-placeholder.svg';
const interiorPhotos = [
  '/home/apartment-interior.webp',
  '/home/living-room.webp',
  '/home/bedroom.webp',
  '/home/kitchen.webp',
  '/home/lounge.webp',
];

function interiorPhoto(key: string) {
  // Keep the same fallback across reloads without storing it as listing data.
  let hash = 0;
  for (const character of key) hash = (Math.imul(hash, 31) + character.codePointAt(0)!) >>> 0;
  return interiorPhotos[hash % interiorPhotos.length];
}

export function ApartmentImage({ src, alt, className, illustrate = false }: {
  src?: string; alt: string; className?: string; illustrate?: boolean;
}) {
  const [failed, setFailed] = useState<string>();
  const [privateImage,setPrivateImage]=useState<{source:string;url:string}|null>(null);
  const protectedSource=src?.startsWith('/api/v1/property-images/');
  useEffect(()=>{if(!protectedSource||!src)return;const controller=new AbortController();let url:string|undefined;
    apiFetch(src,{signal:controller.signal,cache:'no-store'}).then(response=>{if(!response.ok)throw new Error('Image unavailable');return response.blob();}).then(blob=>{if(!controller.signal.aborted){url=URL.createObjectURL(blob);setPrivateImage({source:src,url});}}).catch(()=>{});
    return()=>{controller.abort();if(url)URL.revokeObjectURL(url);};
  },[src,protectedSource]);
  const resolved=protectedSource?(privateImage && privateImage.source===src?privateImage.url:placeholder):src;
  const source = resolved || placeholder;
  const fallback = illustrate && (source === placeholder || failed === source);
  return <img src={fallback ? interiorPhoto(alt) : source} alt={fallback ? '' : alt} className={className} loading="lazy" onError={event => {
    if (illustrate && !fallback) {
      setFailed(source);
      return;
    }
    const element = event.currentTarget;
    if (!element.src.endsWith(placeholder)) element.src = placeholder;
  }} />;
}

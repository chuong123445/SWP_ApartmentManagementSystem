import { useEffect, useState } from 'react';
import { identityImage } from '@/services/identity/identityService';

/** Authenticated blobs only; revoke every temporary URL on replacement/unmount. */
export function IdentityImage({ side, file, stored, revision }: { side: 'front' | 'back'; file: File | null; stored: boolean; revision: number }) {
  const [url, setUrl] = useState('');const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();let objectUrl = '';
    setUrl('');setError('');
    const load = async () => {
      try {
        const blob = file ?? (stored ? await identityImage(side, controller.signal) : null);
        if (!blob || controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);setUrl(objectUrl);
      } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Không tải được ảnh.'); }
    };
    void load();return () => { controller.abort();if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [side, file, stored, revision]);
  return <>{url && <img src={url} alt={`Ảnh căn cước ${side === 'front' ? 'mặt trước' : 'mặt sau'}`} className="w-full h-44 object-contain bg-slate-50 border rounded-lg mt-3" />}{error && <p role="alert" className="text-sm text-rose-700 mt-2">{error}</p>}</>;
}

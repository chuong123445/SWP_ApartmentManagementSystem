import { useEffect, useState } from 'react';
import { AddPropertyModal } from '@/components/property/AddPropertyModal';
import { RequireOwnerIdentityModal } from '@/components/property/RequireOwnerIdentityModal';
import { getAccountVerification } from '@/services/auth/vneidService';
import { getIdentity } from '@/services/identity/identityService';
import type { PropertyCreateInput } from '@/types/property';
import { VneidAssetImportModal } from '@/components/property/VneidAssetImportModal';

/** Căn cước đã xác thực từ Backend thay thế hồ sơ tự khai trong bước thêm tài sản. */
export function AddPropertyIdentityGate({ onClose, onCreate, onImported }: {
  onClose: () => void; onCreate: (input: PropertyCreateInput) => Promise<void>; onImported: (id: string) => void;
}) {
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [revision, setRevision] = useState(0);
  const [vneidMode,setVneidMode] = useState(false);
  useEffect(() => {
    const controller = new AbortController();setState('loading');
    async function check() {
      try {
        const verification = await getAccountVerification(controller.signal);
        // Không yêu cầu ảnh hoặc tự tạo hồ sơ CCCD nếu đã có evidence VERIFIED.
        const present = verification.vneid.status === 'VERIFIED'
          || Boolean((await getIdentity(controller.signal))?.documentNumber);
        if (!controller.signal.aborted) setState(present ? 'ready' : 'missing');
      } catch {
        if (!controller.signal.aborted) setState('error');
      }
    }
    void check();return () => controller.abort();
  }, [revision]);
  if (state === 'ready') return vneidMode ? <VneidAssetImportModal onClose={onClose} onBack={() => setVneidMode(false)} onImported={onImported} /> : <AddPropertyModal onClose={onClose} onCreate={onCreate} onChooseVneid={() => setVneidMode(true)} />;
  if (state === 'missing') return <RequireOwnerIdentityModal onClose={onClose} />;
  return <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
    <section role="dialog" aria-modal="true" aria-label="Kiểm tra thông tin danh tính" className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4">
      {state === 'loading' ? <p role="status">Đang kiểm tra thông tin danh tính...</p>
        : <><p role="alert">Chưa tải được thông tin danh tính. Vui lòng thử lại.</p>
          <button type="button" onClick={() => setRevision(value => value + 1)} className="bg-emerald-600 text-white rounded-lg px-4 py-2">Thử lại</button></>}
      <button type="button" onClick={onClose} className="ml-3 underline">Đóng</button>
    </section>
  </div>;
}

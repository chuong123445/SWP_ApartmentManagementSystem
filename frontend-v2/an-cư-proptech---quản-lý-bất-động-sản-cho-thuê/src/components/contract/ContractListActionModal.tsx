import { ContractExitPanel } from '@/components/contract/ContractExitPanel';
import { useEffect, useId, useRef, useState } from 'react';
import { ContractLifecyclePanel } from '@/components/contract/ContractLifecyclePanel';
import { getContract } from '@/services/contract/contractService';
import type { ContractDraft } from '@/types/contract';
import { contractLifecycleActions } from '@/utils/contractDisplay';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router';

export function ContractListActionModal({ contractId, action, onClose, onUpdated }: {
  contractId: string; action: 'renewal' | 'handover'; onClose: () => void; onUpdated: (draft: ContractDraft) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null); const titleId = useId();
  const { user } = useAuth();
  const [draft, setDraft] = useState<ContractDraft | null>(null); const [error, setError] = useState(''); const [revision, setRevision] = useState(0);
  const [completed, setCompleted] = useState(false);
  useEffect(() => { const element = dialog.current!;const overflow = document.body.style.overflow;document.body.style.overflow = 'hidden';element.showModal();return () => { element.close();document.body.style.overflow = overflow; }; }, []);
  useEffect(() => {
    let active = true; setDraft(null); setError('');
    getContract(contractId).then(value => { if (active) setDraft(value); }).catch(error => { if (active) setError(error instanceof Error ? error.message : 'Không thể tải hợp đồng mới nhất.'); });
    return () => { active = false; };
  }, [contractId, revision]);
  const allowed = !!draft && (action === 'handover' ? contractLifecycleActions(draft, user?.id).canHandover : contractLifecycleActions(draft, user?.id).canRequest);
  return <dialog ref={dialog} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); onClose(); }} className="m-auto w-[calc(100%-2rem)] max-w-3xl max-h-[90dvh] overflow-hidden rounded-2xl p-0 border border-slate-200 backdrop:bg-slate-900/50">
    <header className="p-4 sm:p-6 bg-white flex items-start justify-between gap-4"><h2 id={titleId} className="text-xl font-bold">{action === 'renewal' ? 'Yêu cầu thuê tiếp' : 'Lập biên bản bàn giao'} · HD-{contractId}</h2><button type="button" onClick={onClose} className="border rounded-lg px-3 py-2 text-sm shrink-0">Đóng</button></header>
    <div className="px-4 pb-4 sm:px-6 sm:pb-6 space-y-4 overflow-y-auto max-h-[calc(90dvh-7rem)]">
      {!draft && !error && <p role="status">Đang kiểm tra trạng thái hợp đồng...</p>}
      {error && <div role="alert" className="text-rose-700"><p>{error}</p><button className="underline mt-2" onClick={() => setRevision(value => value + 1)}>Tải lại hợp đồng</button></div>}
      {completed && <p role="status" className="text-sm text-emerald-800">{action === 'renewal' ? 'Đã gửi yêu cầu thuê tiếp. Chủ nhà sẽ xem xét yêu cầu.' : draft?.lifecycle?.handover?.status === 'CANCELLED' ? 'Đã hủy đề nghị bàn giao.' : 'Đã cập nhật biên bản bàn giao. Người thuê cần kiểm tra và xác nhận trước khi trả phòng.'}</p>}
      {draft && !completed && !allowed && <div className="space-y-3"><p role="status" className="text-sm text-amber-800">Trạng thái hợp đồng đã thay đổi hoặc thao tác này hiện chưa đủ điều kiện.</p><Link className="text-sm text-emerald-700 underline" to={`/contracts/${contractId}`}>Xem trạng thái hợp đồng</Link></div>}
      {draft && (allowed || completed) && (action==='handover'?<ContractExitPanel key={draft.id} draft={draft} initialOpen onChanged={async()=>{const value=await getContract(draft.id);setDraft(value);setCompleted(true);onUpdated(value);}}/>:<ContractLifecyclePanel key={draft.id} draft={draft} onUpdated={value => { setDraft(value); setCompleted(true); onUpdated(value); }} />)}
    </div>
  </dialog>;
}

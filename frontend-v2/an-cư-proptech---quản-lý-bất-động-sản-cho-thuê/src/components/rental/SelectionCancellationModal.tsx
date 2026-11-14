import {useEffect,useRef} from 'react';
import {SelectionCancellationPanel} from './SelectionCancellationPanel';
export function SelectionCancellationModal({requestId,onClose,onChanged}:{requestId:string;onClose:()=>void;onChanged:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const d=dialog.current!;const overflow=document.body.style.overflow;document.body.style.overflow='hidden';d.showModal();return()=>{d.close();document.body.style.overflow=overflow;};},[]);
 return <dialog ref={dialog} aria-label="Hủy và lịch sử lựa chọn thuê" onCancel={e=>{e.preventDefault();onClose();}} className="m-auto w-[calc(100%-2rem)] max-w-2xl max-h-[90dvh] overflow-y-auto rounded-2xl p-4 sm:p-6 border border-slate-200 backdrop:bg-slate-900/50"><div className="flex justify-end mb-3"><button type="button" onClick={onClose} className="border rounded-lg px-3 py-2 text-sm">Đóng cửa sổ hủy</button></div><SelectionCancellationPanel requestId={requestId} onChanged={onChanged}/></dialog>;
}

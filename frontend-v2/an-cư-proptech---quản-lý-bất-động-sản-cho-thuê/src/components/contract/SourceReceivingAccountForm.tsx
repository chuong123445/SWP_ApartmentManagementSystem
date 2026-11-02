import { useState } from 'react';
import { apiFetch, readApiError } from '@/services/http/client';
import type { ContractSnapshot } from '@/types/contract';
export function SourceReceivingAccountForm({ snapshot, onSaved }: { snapshot: ContractSnapshot; onSaved: () => Promise<void> }) {
  const [bank, setBank] = useState(snapshot.receivingAccount?.bank ?? '');
  const [number, setNumber] = useState(snapshot.receivingAccount?.accountNumber ?? '');
  const [holder, setHolder] = useState(snapshot.receivingAccount?.accountHolderName ?? snapshot.owner.fullName);
  const [busy, setBusy] = useState(false);const [error, setError] = useState('');
  return <form className="border rounded-xl p-4 space-y-3" onSubmit={async e => {
    e.preventDefault();if(busy)return;setBusy(true);setError('');
    try {
      const response=await apiFetch(`/api/v1/owner/properties/${encodeURIComponent(snapshot.asset.propertyId)}/receiving-account`, {
        method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({bank,accountNumber:number,accountHolderName:holder,version:snapshot.evidence?.receivingAccountVersion}),
      });if(!response.ok)throw await readApiError(response);await onSaved();
    }catch(e){setError(e instanceof Error?e.message:'Chưa lưu được tài khoản nhận tiền.');}finally{setBusy(false);}
  }}><h3 className="font-bold">Bổ sung tài khoản nhận tiền</h3>
    <p className="text-sm text-slate-600">Tên chủ tài khoản cần khớp căn cước đã xác thực. Đây là thông tin bạn khai báo; hệ thống chưa xác minh với ngân hàng. Lưu trước khi tạo bản nháp để đưa vào hợp đồng.</p>
    <fieldset disabled={busy} className="grid sm:grid-cols-2 gap-3">{([
      ['Ngân hàng',bank,setBank,150],['Số tài khoản',number,setNumber,50],['Tên chủ tài khoản',holder,setHolder,100],
    ] as const).map(([label,value,set,max])=><label key={label} className="text-sm">{label}<input required maxLength={max} value={value} onChange={e=>set(e.target.value)} className="w-full border rounded-lg p-2 mt-1"/></label>)}</fieldset>
    {error&&<p role="alert" className="text-rose-700">{error}</p>}<button disabled={busy} className="border rounded-lg px-4 py-2">{busy?'Đang lưu...':'Lưu tài khoản nhận tiền'}</button>
  </form>;
}

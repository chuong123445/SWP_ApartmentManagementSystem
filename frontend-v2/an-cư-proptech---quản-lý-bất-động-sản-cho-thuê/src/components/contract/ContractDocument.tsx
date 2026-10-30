import { useEffect, useRef, useState } from 'react';
import { Download, ExternalLink, RefreshCw, Copy, PenLine, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getContract, getContractPdf, signContract } from '@/services/contract/contractService';
import { SignaturePad } from '@/components/contract/SignaturePad';
import type { ContractDraft } from '@/types/contract';
import { ContractLifecyclePanel } from '@/components/contract/ContractLifecyclePanel';

export const signingLabel = (draft: ContractDraft) => draft.status === 'ENDED' ? 'Đã kết thúc' :
  draft.status === 'ACTIVE' && draft.lifecycle?.expired ? 'Hết hạn — chờ ký tiếp hoặc bàn giao' :
  draft.signing?.state === 'SIGNED' ? 'Hai bên đã ký' : draft.signing?.state === 'WAITING_CUSTOMER' ? 'Chờ khách thuê ký' :
  draft.signing?.state === 'WAITING_OWNER' ? 'Chờ chủ nhà ký' : draft.status === 'ACTIVE' ? 'Đang hiệu lực' : 'Chờ hai bên ký';
const action = 'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold disabled:opacity-50';

export function ContractDocument({ draft, onUpdated }: { draft: ContractDraft; onUpdated: (draft: ContractDraft) => void }) {
  const { user } = useAuth();
  const [pdfUrl, setPdfUrl] = useState('');
  const [pdfLoading, setPdfLoading] = useState(true);
  const [pdfError, setPdfError] = useState('');
  const [revision, setRevision] = useState(0);
  const [signature, setSignature] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const operation = useRef(false);
  const signing = draft.signing;
  const isOwner = user?.id === (signing?.ownerAccountId ?? draft.snapshot.owner.id);
  const isCustomer = user?.id === (signing?.customerAccountId ?? draft.snapshot.customer.id);
  const mySignedAt = isOwner ? signing?.ownerSignedAt : signing?.customerSignedAt;
  const canSign = !!signing && (isOwner || isCustomer) && !mySignedAt && draft.status === 'DRAFT';
  useEffect(() => {
    let active = true; let url = '';
    setPdfLoading(true); setPdfError(''); setPdfUrl('');
    getContractPdf(draft.id).then(blob => {
      if (!active) return;
      url = URL.createObjectURL(blob); setPdfUrl(url);
    }).catch(err => { if (active) setPdfError(err instanceof Error ? err.message : 'Không tải được PDF.'); })
      .finally(() => { if (active) setPdfLoading(false); });
    return () => { active = false; if (url) URL.revokeObjectURL(url); };
  }, [draft.id, draft.version, draft.status, signing?.ownerSignedAt, signing?.customerSignedAt, revision]);
  useEffect(() => { setSignature(null); setConsent(false); setError(''); }, [draft.id, draft.version]);
  const refresh = async () => {
    if (operation.current) return; operation.current = true; setBusy(true); setError('');
    try { onUpdated(await getContract(draft.id)); setRevision(n => n + 1); }
    catch (err) { setError(err instanceof Error ? err.message : 'Không thể tải lại.'); }
    finally { operation.current = false; setBusy(false); }
  };
  const sign = async () => {
    if (!signature || !consent || operation.current || !canSign || !pdfUrl) return;
    operation.current = true; setBusy(true); setError(''); setNotice('');
    try { onUpdated(await signContract(draft, signature)); setSignature(null); setConsent(false); setNotice('Đã lưu chữ ký của bạn vào hợp đồng.');window.dispatchEvent(new Event('ancu:tenancy-changed')); }
    catch (err) { setError(err instanceof Error ? err.message : 'Không thể lưu chữ ký.'); }
    finally { operation.current = false; setBusy(false); }
  };
  return <section className="space-y-5" aria-label="PDF và chữ ký hợp đồng">
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
      <div className="flex flex-wrap justify-between items-center gap-3"><div><h3 className="font-bold text-lg">Hợp đồng PDF · {draft.contractNumber}</h3><p className="text-sm text-emerald-800 mt-1">{signingLabel(draft)}</p></div><button type="button" disabled={busy} className={action} onClick={() => void refresh()}><RefreshCw size={15} />Cập nhật trạng thái</button></div>
      <div className="flex flex-wrap gap-2">
        {pdfUrl && <><a className={action} href={pdfUrl} download={`${draft.contractNumber}.pdf`}><Download size={15} />Tải PDF</a>
          <a className={action} href={pdfUrl} target="_blank" rel="noreferrer"><ExternalLink size={15} />Mở PDF / In hợp đồng</a></>}
        <button type="button" className={action} onClick={async () => {
          try { await navigator.clipboard.writeText(`${window.location.origin}/contracts/${encodeURIComponent(draft.id)}`); setNotice('Đã sao chép liên kết. Bên nhận cần đăng nhập đúng tài khoản của mình để xem và ký.'); }
          catch { setError('Không sao chép được liên kết. Hãy dùng trang Hợp đồng của tôi trên tài khoản khách thuê.'); }
        }}><Copy size={15} />Sao chép liên kết cho bên còn lại</button>
      </div>
      <p className="text-xs text-slate-500">PDF lấy từ bản hợp đồng đã lưu trên máy chủ. Hai bên chỉ được ký bằng chính tài khoản tham gia hợp đồng.</p>
    </div>
    {notice && <p role="status" className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-800">{notice}</p>}
    {error && <p role="alert" className="bg-rose-50 rounded-lg p-3 text-sm text-rose-700">{error}</p>}
    {pdfLoading && <p role="status" className="p-4 text-slate-500">Đang tạo và tải bản PDF...</p>}
    {pdfError && <div role="alert" className="text-rose-700 bg-rose-50 p-4 rounded-xl"><p>{pdfError}</p><button type="button" className="underline mt-2" onClick={() => setRevision(n => n + 1)}>Tải lại PDF</button></div>}
    {pdfUrl && <iframe key={pdfUrl} title={`Bản PDF hợp đồng ${draft.contractNumber}`} src={`${pdfUrl}#toolbar=1&navpanes=0`} className="w-full h-[65vh] min-h-80 rounded-xl border border-slate-300 bg-slate-100" />}
    <div className="grid sm:grid-cols-2 gap-4">{([
      ['Bên cho thuê (Bên A)', draft.snapshot.owner.fullName, signing?.ownerSignedAt, signing?.ownerSignature],
      ['Bên thuê (Bên B)', draft.snapshot.customer.fullName, signing?.customerSignedAt, signing?.customerSignature],
    ] as const).map(([title, name, at, image]) => <section key={title} className="border border-slate-200 rounded-xl p-4 space-y-2">
      <h4 className="font-bold text-sm">{title}</h4><p className="text-sm">{name}</p>
      <div className="h-28 rounded-lg border border-dashed border-slate-300 flex items-center justify-center bg-white">{image ? <img src={image} alt={`Chữ ký ${name}`} className="max-h-24 max-w-full object-contain" /> : <span className="text-sm text-slate-400">Chưa ký</span>}</div>
      {at && <p className="text-xs text-emerald-700 flex items-center gap-1"><CheckCircle2 size={13} />{new Date(at).toLocaleString('vi-VN')}</p>}
    </section>)}</div>
    {canSign && <section className="p-4 sm:p-5 border border-emerald-200 rounded-xl space-y-4 bg-white">
      <h3 className="font-bold flex items-center gap-2"><PenLine size={18} />Ký xác nhận · {isOwner ? 'Bên cho thuê (Bên A)' : 'Bên thuê (Bên B)'}</h3>
      <p className="text-sm text-slate-600">Đọc bản PDF ở trên, sau đó vẽ chữ ký của bạn vào khung. Nội dung sẽ bị khóa ngay khi có chữ ký đầu tiên.</p>
      <SignaturePad key={`${draft.id}-${draft.version}`} disabled={busy} onChange={setSignature} />
      <label className="flex gap-3 items-start text-sm"><input type="checkbox" checked={consent} disabled={busy} onChange={e => setConsent(e.target.checked)} className="mt-1" />Tôi đã đọc bản PDF và đồng ý toàn bộ nội dung hợp đồng; xác nhận sử dụng chữ ký vừa vẽ.</label>
      <button type="button" disabled={busy || !signature || !consent || !pdfUrl} onClick={() => void sign()} className="w-full rounded-xl py-3 px-4 bg-emerald-700 text-white font-semibold disabled:opacity-50">{busy ? 'Đang lưu chữ ký...' : 'Xác nhận ký hợp đồng'}</button>
    </section>}
    <ContractLifecyclePanel draft={draft} onUpdated={onUpdated} />
    <p className="text-xs text-slate-500 break-all">Mã nội dung SHA-256: {signing?.contentHash ?? 'Chưa có'}<br />Chữ ký tay điện tử được lưu cùng tài khoản và thời gian ký; không phải chữ ký số có chứng thư.</p>
  </section>;
}

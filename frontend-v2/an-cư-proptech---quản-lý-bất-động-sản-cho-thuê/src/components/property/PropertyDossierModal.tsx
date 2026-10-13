import { useEffect, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { getOwnerProperties } from '@/services/apartments/ownerApartmentService';
import { propertyDossiers, submitDossier, uploadEvidence } from '@/services/property/dossierService';
import { DossierDetails } from '@/components/property/DossierDetails';
import { evidenceLabels, type Dossier, type EvidenceFile, type EvidencePurpose, type OwnerProperty } from '@/types/dossier';
export function PropertyDossierModal({ propertyId, onClose, onSaved }: { propertyId: string; onClose: () => void; onSaved: () => void }) {
  const [property, setProperty] = useState<OwnerProperty | null>(null);const [history, setHistory] = useState<Dossier[]>([]);
  const [files, setFiles] = useState<EvidenceFile[]>([]);const [loading, setLoading] = useState(true);const [busy, setBusy] = useState(false);const [error, setError] = useState('');
  const [rightType, setRightType] = useState<Dossier['rightType']>('OWNERSHIP');const [bank, setBank] = useState('');const [accountNumber, setAccountNumber] = useState('');const [holder, setHolder] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;setLoading(true);setError('');
    Promise.all([getOwnerProperties(), propertyDossiers(propertyId)]).then(([properties, dossiers]) => {
      if (!active) return;const found = properties.find(p => p.id === propertyId);if (!found) throw new Error('Không tìm thấy tài sản.');
      setProperty(found);setHistory(dossiers);const latest = dossiers[0];
      if (latest) { setFiles(latest.files);setRightType(latest.rightType);setBank(latest.bank);setAccountNumber(latest.accountNumber);setHolder(latest.accountHolderName); }
    }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });return () => { active = false; };
  }, [propertyId, revision]);
  const editable = property && (['DRAFT', 'NEEDS_INFORMATION', 'REJECTED'].includes(property.approvalStatus) || (property.approvalStatus === 'PENDING_APPROVAL' && history.length === 0));
  const submit = async (event: FormEvent) => {
    event.preventDefault();if (!property || busy) return;setError('');
    if (!files.some(f => f.purpose === 'RIGHT_DOCUMENT')) { setError('Cần ít nhất một giấy tờ chứng minh sở hữu hoặc quyền khai thác.');return; }
    setBusy(true);
    try { await submitDossier(property.id, { propertyVersion: property.version, rightType, receivingAccount: { bank: bank.trim(), accountNumber, accountHolderName: holder.trim() },
      documentFileIds: files.filter(f => f.purpose === 'RIGHT_DOCUMENT').map(f => f.id), supportingFileIds: files.filter(f => f.purpose === 'SUPPORTING').map(f => f.id), ownerEvidenceFileIds: files.filter(f => f.purpose === 'OWNER_IDENTITY').map(f => f.id) });
      onSaved();setRevision(n => n + 1);
    } catch (e) { setError(e instanceof Error ? e.message : 'Không gửi được hồ sơ.'); } finally { setBusy(false); }
  };
  const field = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mt-1';
  return <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-3 md:p-6"><section role="dialog" aria-modal="true" aria-labelledby="property-dossier-title" className="bg-white rounded-2xl w-full max-w-2xl max-h-[92dvh] overflow-y-auto">
    <div className="p-5 border-b flex justify-between gap-3"><h2 id="property-dossier-title" className="text-lg font-bold">Hồ sơ kiểm duyệt tài sản</h2><button type="button" disabled={busy} onClick={onClose} aria-label="Đóng hồ sơ"><X /></button></div>
    <div className="p-5 space-y-5">
      {loading ? <p role="status">Đang tải hồ sơ...</p> : <>
        <div><h3 className="font-bold break-words">{property?.name}</h3><p className="text-sm text-slate-500 break-words">{property?.address}</p></div>
        <p className="text-sm bg-slate-50 p-3 rounded-lg">Chứng từ và tài khoản nhận tiền chỉ được xem bởi bạn và Admin kiểm duyệt. OTP email chỉ xác thực liên hệ; Admin đối chiếu hồ sơ tài sản riêng.</p>
        {history[0] && <DossierDetails dossier={history[0]} />}
        {property?.approvalStatus === 'PENDING_APPROVAL' && history.length === 0 && <p className="text-sm text-amber-900 bg-amber-50 p-3 rounded-lg">Tài sản đang ở trạng thái chờ duyệt cũ nhưng chưa có hồ sơ. Hãy gửi chứng từ để Admin kiểm duyệt; dữ liệu căn hộ hiện có được giữ nguyên.</p>}
        {editable && <form onSubmit={submit} className="space-y-4"><fieldset disabled={busy} className="space-y-4 disabled:opacity-60">
          <label className="block text-sm font-semibold">Quyền cho thuê<select value={rightType} onChange={e => setRightType(e.target.value as Dossier['rightType'])} className={field}><option value="OWNERSHIP">Chủ sở hữu</option><option value="AUTHORIZATION">Được ủy quyền / có quyền khai thác</option></select></label>
          <div className="grid sm:grid-cols-2 gap-3"><label className="text-sm">Ngân hàng *<input required maxLength={100} value={bank} onChange={e => setBank(e.target.value)} className={field} /></label><label className="text-sm">Số tài khoản *<input required inputMode="numeric" pattern="[0-9]{4,40}" maxLength={40} value={accountNumber} onChange={e => setAccountNumber(e.target.value)} className={field} /></label><label className="text-sm sm:col-span-2">Tên chủ tài khoản *<input required maxLength={100} value={holder} onChange={e => setHolder(e.target.value)} className={field} /></label></div>
          <p className="text-sm text-slate-600">{rightType === 'OWNERSHIP' ? 'Đính kèm ảnh Sổ đỏ/Sổ hồng hoặc giấy tờ sở hữu tương đương.' : 'Đính kèm hợp đồng ủy quyền, thuê/cho thuê lại hoặc giấy tờ chứng minh quyền khai thác.'} Chứng từ bổ sung có thể gồm hóa đơn điện/nước/internet cùng địa chỉ. Giấy tờ người nộp chỉ phục vụ hồ sơ tài sản.</p>
          <p className="text-xs text-slate-500">Nhận ảnh PNG/JPEG, tối đa 5 MB/ảnh, tối đa 20 ảnh/hồ sơ. PDF chưa được hỗ trợ; hãy dùng ảnh chụp hoặc bản scan.</p>
          {(Object.keys(evidenceLabels) as EvidencePurpose[]).map(purpose => <label key={purpose} className="block border rounded-lg p-3 text-sm">{evidenceLabels[purpose]}{purpose === 'RIGHT_DOCUMENT' ? ' *' : ' (không bắt buộc)'}<input type="file" accept="image/png,image/jpeg" multiple className="block mt-2 w-full text-xs" onChange={async event => {
            const chosen = Array.from(event.target.files ?? []);event.target.value = '';if (!property || !chosen.length) return;
            if (files.length + chosen.length > 20 || chosen.some(f => f.size > 5 * 1024 * 1024)) { setError('Tối đa 20 ảnh/hồ sơ và 5 MB/ảnh.');return; }
            setBusy(true);setError('');try { for (const file of chosen) { const saved = await uploadEvidence(property.id, purpose, file);setFiles(prev => [...prev, saved]); } } catch (e) { setError(e instanceof Error ? e.message : 'Không tải được chứng từ.'); } finally { setBusy(false); }
          }} /></label>)}
          <ul className="space-y-2">{files.map(file => <li key={file.id} className="text-sm flex justify-between gap-2 min-w-0"><span className="break-all">{file.filename} · {evidenceLabels[file.purpose]}</span><button type="button" onClick={() => setFiles(prev => prev.filter(f => f.id !== file.id))} className="shrink-0 text-rose-700 underline">Bỏ khỏi hồ sơ</button></li>)}</ul>
          <button type="submit" className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold text-sm">{busy ? 'Đang xử lý...' : history.length ? 'Gửi lại hồ sơ' : 'Gửi hồ sơ kiểm duyệt'}</button>
        </fieldset></form>}
        {!editable && property?.approvalStatus === 'APPROVED' && <p className="text-sm text-emerald-700">Tài sản đã được duyệt. Bạn có thể công khai từng căn trong Quản lý căn hộ.</p>}
        {history.length > 1 && <details className="text-sm"><summary className="cursor-pointer font-semibold">Lịch sử hồ sơ ({history.length - 1})</summary><div className="space-y-4 mt-3">{history.slice(1).map(d => <div key={d.id} className="border rounded-lg p-3"><DossierDetails dossier={d} /></div>)}</div></details>}
      </>}
      {error && <p role="alert" className="p-3 bg-rose-50 text-rose-700 rounded-lg text-sm">{error}</p>}
    </div>
  </section></div>;
}

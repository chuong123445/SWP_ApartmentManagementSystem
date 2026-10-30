import { useEffect, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { Link } from 'react-router';
import { useAccountVerification } from '@/hooks/useAccountVerification';
import { getPropertyApplications } from '@/services/property/propertyApplicationService';
import { getOwnerProperties } from '@/services/apartments/ownerApartmentService';
import { propertyDossiers, submitDossier, uploadEvidence } from '@/services/property/dossierService';
import { DossierDetails } from '@/components/property/DossierDetails';
import { evidenceLabels, type Dossier, type EvidenceFile, type EvidencePurpose, type OwnerProperty } from '@/types/dossier';
export function PropertyDossierModal({ propertyId, onClose, onSaved, selfService = false }: { propertyId: string; onClose: () => void; onSaved: () => void; selfService?: boolean }) {
  const verification = useAccountVerification();
  const [property, setProperty] = useState<OwnerProperty | null>(null);const [history, setHistory] = useState<Dossier[]>([]);
  const [files, setFiles] = useState<EvidenceFile[]>([]);const [loading, setLoading] = useState(true);const [busy, setBusy] = useState(false);const [error, setError] = useState('');
  const [rightType, setRightType] = useState<Dossier['rightType']>('OWNERSHIP');const [bank, setBank] = useState('');const [accountNumber, setAccountNumber] = useState('');const [holder, setHolder] = useState('');
  const [certificateNumber, setCertificateNumber] = useState('');const [certificateDate, setCertificateDate] = useState('');const [certificatePlace, setCertificatePlace] = useState('');const [rightDescription, setRightDescription] = useState('');
  const [revision, setRevision] = useState(0);
  const [validFrom,setValidFrom]=useState('');const [validUntil,setValidUntil]=useState('');const [leaseFrom,setLeaseFrom]=useState('');const [leaseUntil,setLeaseUntil]=useState('');const [principalName,setPrincipalName]=useState('');const [principalNumber,setPrincipalNumber]=useState('');
  useEffect(() => {
    let active = true;setLoading(true);setError('');
    Promise.all([selfService ? getPropertyApplications() : getOwnerProperties(), propertyDossiers(propertyId,selfService)]).then(([properties, dossiers]) => {
      if (!active) return;const found = properties.find(p => p.id === propertyId);if (!found) throw new Error('Không tìm thấy tài sản.');
      setProperty(found);setHistory(dossiers);const latest = dossiers[0];
      if (latest) { setFiles(latest.files);setRightType(latest.rightType);setBank(latest.bank);setAccountNumber(latest.accountNumber);setHolder(latest.accountHolderName); }
      else {setRightType(found.rightType ?? 'OWNERSHIP');setFiles([]);}
      setValidFrom(latest?.rightsValidFrom ?? '');setValidUntil(latest?.rightsValidUntil ?? '');setLeaseFrom(latest?.originalLeaseFrom ?? '');setLeaseUntil(latest?.originalLeaseUntil ?? '');setPrincipalName(latest?.principalName ?? '');setPrincipalNumber(latest?.principalDocumentNumber ?? '');
      setCertificateNumber(latest?.certificateNumber ?? '');setCertificateDate(latest?.certificateIssueDate ?? '');setCertificatePlace(latest?.certificateIssuePlace ?? '');setRightDescription(latest?.exploitationRightDescription ?? '');
    }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });return () => { active = false; };
  }, [propertyId, revision, selfService]);
  const limited = rightType !== 'OWNERSHIP';
  const verified = verification.data?.vneid.status === 'VERIFIED';
  const editable = verified && property && history[0]?.status !== 'PENDING_APPROVAL' && (['DRAFT', 'NEEDS_INFORMATION', 'REJECTED'].includes(property.approvalStatus) || (property.approvalStatus === 'PENDING_APPROVAL' && history.length === 0) || (property.approvalStatus === 'APPROVED' && property.rightType && property.rightType !== 'OWNERSHIP'));
  const requiredPurposes: EvidencePurpose[] = rightType === 'AUTHORIZATION' ? ['RIGHT_DOCUMENT','AUTHORIZATION_DOCUMENT'] : rightType === 'SUBLEASE' ? ['RIGHT_DOCUMENT','ORIGINAL_LEASE','SUBLEASE_CONSENT'] : ['RIGHT_DOCUMENT'];
  const submit = async (event: FormEvent) => {
    event.preventDefault();if (!property || busy) return;setError('');
    if (!files.some(f => f.purpose === 'RIGHT_DOCUMENT')) { setError('Cần ít nhất một giấy tờ chứng minh sở hữu hoặc quyền khai thác.');return; }
    if(requiredPurposes.some(p=>!files.some(f=>f.purpose===p))){setError('Cần đủ giấy tờ sở hữu gốc và các giấy tờ bắt buộc theo loại quyền đã chọn.');return;}
    if(limited && (!validFrom || !validUntil || validUntil<validFrom || (rightType==='SUBLEASE'&&(!leaseFrom||!leaseUntil||validFrom<leaseFrom||validUntil>leaseUntil)))){setError('Thời hạn quyền cho thuê phải hợp lệ và nằm trong hợp đồng thuê gốc khi cho thuê lại.');return;}
    setBusy(true);
    try { await submitDossier(property.id, { propertyVersion: property.version, rightType, receivingAccount: { bank: bank.trim(), accountNumber, accountHolderName: holder.trim() },
      certificateNumber: certificateNumber.trim() || null, certificateIssueDate: certificateDate || null, certificateIssuePlace: certificatePlace.trim() || null, exploitationRightDescription: rightDescription.trim() || null,
      rightsValidFrom: limited ? validFrom : null, rightsValidUntil: limited ? validUntil : null, originalLeaseFrom: rightType==='SUBLEASE'?leaseFrom:null, originalLeaseUntil: rightType==='SUBLEASE'?leaseUntil:null,
      principalName: limited?principalName.trim():null, principalDocumentNumber: limited?principalNumber:null,
      authorizationFileIds: files.filter(f=>f.purpose==='AUTHORIZATION_DOCUMENT').map(f=>f.id),originalLeaseFileIds: files.filter(f=>f.purpose==='ORIGINAL_LEASE').map(f=>f.id),subleaseConsentFileIds: files.filter(f=>f.purpose==='SUBLEASE_CONSENT').map(f=>f.id),
      documentFileIds: files.filter(f => f.purpose === 'RIGHT_DOCUMENT').map(f => f.id), supportingFileIds: files.filter(f => f.purpose === 'SUPPORTING').map(f => f.id), ownerEvidenceFileIds: files.filter(f => f.purpose === 'OWNER_IDENTITY').map(f => f.id) },selfService);
      onSaved();setRevision(n => n + 1);
    } catch (e) { setError(e instanceof Error ? e.message : 'Không gửi được hồ sơ.'); } finally { setBusy(false); }
  };
  const field = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mt-1';
  return <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-3 md:p-6"><section role="dialog" aria-modal="true" aria-labelledby="property-dossier-title" className="bg-white rounded-2xl w-full max-w-2xl max-h-[92dvh] overflow-y-auto">
    <div className="p-5 border-b flex justify-between gap-3"><h2 id="property-dossier-title" className="text-lg font-bold">Hồ sơ kiểm duyệt tài sản</h2><button type="button" disabled={busy} onClick={onClose} aria-label="Đóng hồ sơ"><X /></button></div>
    <div className="p-5 space-y-5">
      {loading ? <p role="status">Đang tải hồ sơ...</p> : <>
        <div><h3 className="font-bold break-words">{property?.name}</h3><p className="text-sm text-slate-500 break-words">{property?.address}</p></div>
        <p className="text-sm bg-slate-50 p-3 rounded-lg">Chứng từ và tài khoản nhận tiền không công khai. Khi bạn nộp hồ sơ, thông tin khai báo và ảnh/PDF gửi kèm có thể được gửi đến dịch vụ AI đã cấu hình để hỗ trợ đối chiếu. Nhận xét AI chỉ dành cho Admin; việc duyệt hoặc từ chối luôn do Admin thực hiện.</p>
        {history[0] && <DossierDetails dossier={history[0]} />}
        {property?.approvalStatus === 'PENDING_APPROVAL' && history.length === 0 && <p className="text-sm text-amber-900 bg-amber-50 p-3 rounded-lg">Tài sản đang ở trạng thái chờ duyệt cũ nhưng chưa có hồ sơ. Hãy gửi chứng từ để Admin kiểm duyệt; dữ liệu căn hộ hiện có được giữ nguyên.</p>}
        {editable && <form onSubmit={submit} className="space-y-4"><fieldset disabled={busy} className="space-y-4 disabled:opacity-60">
          <label className="block text-sm font-semibold">Quyền cho thuê<select disabled={!!property.onboardingApplication || property.approvalStatus==='APPROVED'} value={rightType} onChange={e => setRightType(e.target.value as Dossier['rightType'])} className={field}><option value="OWNERSHIP">Chủ sở hữu</option><option value="AUTHORIZATION">Đại diện theo ủy quyền</option><option value="SUBLEASE">Bên cho thuê lại</option></select></label>
          {limited&&<fieldset className="border rounded-xl p-3 grid sm:grid-cols-2 gap-3 min-w-0"><legend className="font-semibold text-sm px-1">Chủ sở hữu gốc và thời hạn quyền cho thuê</legend>
            <label className="text-sm">Họ tên chủ sở hữu gốc *<input required maxLength={100} value={principalName} onChange={e=>setPrincipalName(e.target.value)} className={field}/></label>
            <label className="text-sm">CCCD chủ sở hữu gốc *<input required pattern="[0-9]{12}" maxLength={12} inputMode="numeric" value={principalNumber} onChange={e=>setPrincipalNumber(e.target.value)} className={field}/></label>
            <label className="text-sm">Quyền cho thuê từ ngày *<input required type="date" value={validFrom} onChange={e=>setValidFrom(e.target.value)} className={field}/></label>
            <label className="text-sm">Quyền cho thuê đến hết ngày *<input required type="date" min={validFrom||undefined} value={validUntil} onChange={e=>setValidUntil(e.target.value)} className={field}/></label>
            {rightType==='SUBLEASE'&&<><label className="text-sm">Hợp đồng thuê gốc từ ngày *<input required type="date" value={leaseFrom} onChange={e=>setLeaseFrom(e.target.value)} className={field}/></label><label className="text-sm">Hợp đồng thuê gốc đến hết ngày *<input required type="date" min={leaseFrom||undefined} value={leaseUntil} onChange={e=>setLeaseUntil(e.target.value)} className={field}/></label></>}
            <p className="text-xs text-slate-500 sm:col-span-2">Điền theo giấy tờ để Admin đối chiếu. Hệ thống không tự cộng một năm khi giấy tờ thiếu thời hạn; quyền cho thuê lại không vượt hợp đồng thuê gốc.</p>
          </fieldset>}
          <label className="block text-sm">Căn cứ quyền khai thác<textarea maxLength={1000} value={rightDescription} onChange={e => setRightDescription(e.target.value)} className={field} rows={2} /></label>
          <div className="border rounded-xl p-3 space-y-3"><h3 className="font-semibold text-sm">Thông tin giấy chứng nhận</h3><p className="text-xs text-slate-500">Nếu cung cấp, hãy điền đủ số, ngày cấp và nơi cấp theo giấy tờ.</p>
            <label className="block text-sm">Số giấy chứng nhận<input required={!!(certificateDate || certificatePlace)} maxLength={100} value={certificateNumber} onChange={e => setCertificateNumber(e.target.value)} className={field} /></label>
            <label className="block text-sm">Ngày cấp giấy chứng nhận<input type="date" required={!!(certificateNumber || certificatePlace)} max={new Date().toLocaleDateString('en-CA')} value={certificateDate} onChange={e => setCertificateDate(e.target.value)} className={field} /></label>
            <label className="block text-sm">Nơi cấp giấy chứng nhận<input required={!!(certificateNumber || certificateDate)} maxLength={200} value={certificatePlace} onChange={e => setCertificatePlace(e.target.value)} className={field} /></label>
          </div>
          <div className="grid sm:grid-cols-2 gap-3"><label className="text-sm">Ngân hàng *<input required maxLength={100} value={bank} onChange={e => setBank(e.target.value)} className={field} /></label><label className="text-sm">Số tài khoản *<input required inputMode="numeric" pattern="[0-9]{4,40}" maxLength={40} value={accountNumber} onChange={e => setAccountNumber(e.target.value)} className={field} /></label><label className="text-sm sm:col-span-2">Tên chủ tài khoản *<input required maxLength={100} value={holder} onChange={e => setHolder(e.target.value)} className={field} /></label></div>
          <p className="text-sm text-slate-600">{rightType === 'OWNERSHIP' ? 'Đính kèm Sổ đỏ/Sổ hồng hoặc giấy tờ sở hữu tương đương.' : rightType==='AUTHORIZATION'?'Đính kèm giấy tờ sở hữu của chủ gốc và giấy ủy quyền.':'Đính kèm giấy tờ sở hữu của chủ gốc, hợp đồng thuê gốc và văn bản cho phép cho thuê lại riêng. Không dùng điều khoản trong hợp đồng để thay văn bản riêng.'}</p>
          <p className="text-xs text-slate-500">Nhận PDF/JPEG/PNG, tối đa 10 MB/file, 20 file/hồ sơ. PDF tối đa 100 trang, không mã hóa hoặc nội dung chủ động. Giấy tờ lưu riêng tư trong hệ thống.</p>
          {([...requiredPurposes,'SUPPORTING'] as EvidencePurpose[]).map(purpose => <label key={purpose} className="block border rounded-lg p-3 text-sm">{evidenceLabels[purpose]}{requiredPurposes.includes(purpose) ? ' *' : ' (không bắt buộc)'}<input type="file" accept="application/pdf,image/png,image/jpeg" multiple className="block mt-2 w-full text-xs" onChange={async event => {
            const chosen = Array.from(event.target.files ?? []);event.target.value = '';if (!property || !chosen.length) return;
            if (files.length + chosen.length > 20 || chosen.some(f => f.size > 10 * 1024 * 1024 || f.size===0 || !['application/pdf','image/png','image/jpeg'].includes(f.type))) { setError('Chỉ nhận PDF/JPEG/PNG, tối đa 20 file/hồ sơ và 10 MB/file.');return; }
            setBusy(true);setError('');try { for (const file of chosen) { const saved = await uploadEvidence(property.id, purpose, file,selfService);setFiles(prev => [...prev, saved]); } } catch (e) { setError(e instanceof Error ? e.message : 'Không tải được chứng từ.'); } finally { setBusy(false); }
          }} /></label>)}
          <ul className="space-y-2">{files.map(file => <li key={file.id} className="text-sm flex justify-between gap-2 min-w-0"><span className="break-all">{file.filename} · {evidenceLabels[file.purpose]}</span><button type="button" onClick={() => setFiles(prev => prev.filter(f => f.id !== file.id))} className="shrink-0 text-rose-700 underline">Bỏ khỏi hồ sơ</button></li>)}</ul>
          <button type="submit" className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold text-sm">{busy ? 'Đang xử lý...' : history.length ? 'Gửi lại hồ sơ' : 'Gửi hồ sơ kiểm duyệt'}</button>
        </fieldset></form>}
        {!editable && property?.approvalStatus === 'APPROVED' && <p className="text-sm text-emerald-700">Tài sản đã được duyệt. Bạn có thể công khai từng căn trong Quản lý căn hộ.</p>}
        {verification.loading&&<p role="status">Đang kiểm tra căn cước VNeID...</p>}{verification.error&&<p role="alert">{verification.error}<button onClick={verification.reload} className="ml-2 underline">Tải lại xác thực</button></p>}{!verification.loading&&!verification.error&&!verified&&<p className="text-amber-800">Cần căn cước VNeID đã xác thực để gửi hồ sơ. <Link to="/account/verification" className="underline" onClick={onClose}>Xác thực VNeID</Link></p>}
        {history.length > 1 && <details className="text-sm"><summary className="cursor-pointer font-semibold">Lịch sử hồ sơ ({history.length - 1})</summary><div className="space-y-4 mt-3">{history.slice(1).map(d => <div key={d.id} className="border rounded-lg p-3"><DossierDetails dossier={d} /></div>)}</div></details>}
      </>}
      {error && <p role="alert" className="p-3 bg-rose-50 text-rose-700 rounded-lg text-sm">{error}</p>}
    </div>
  </section></div>;
}

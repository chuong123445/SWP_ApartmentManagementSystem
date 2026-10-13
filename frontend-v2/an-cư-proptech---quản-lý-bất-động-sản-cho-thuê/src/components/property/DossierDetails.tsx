import { useState } from 'react';
import { downloadEvidence } from '@/services/property/dossierService';
import { dossierStatusLabels, evidenceLabels, type Dossier } from '@/types/dossier';
export function DossierDetails({ dossier }: { dossier: Dossier }) {
  const [error, setError] = useState('');
  return <div className="space-y-3 text-sm min-w-0">
    <p><strong>{dossierStatusLabels[dossier.status]}</strong> · Gửi lúc {new Date(dossier.submittedAt).toLocaleString('vi-VN')}</p>
    <p>Người nộp: <strong>{dossier.applicantName}</strong></p>
    <p>Quyền cho thuê: {dossier.rightType === 'OWNERSHIP' ? 'Chủ sở hữu' : 'Được ủy quyền / có quyền khai thác'}</p>
    <div className="rounded-lg bg-slate-50 p-3 space-y-1"><p>Ngân hàng: {dossier.bank}</p><p>Số tài khoản: {dossier.accountNumber}</p><p>Chủ tài khoản: {dossier.accountHolderName}</p></div>
    {dossier.reviewReason && <p className="p-3 rounded-lg bg-amber-50 text-amber-900 whitespace-pre-wrap">Ý kiến Admin: {dossier.reviewReason}</p>}
    <ul className="space-y-2">{dossier.files.map(file => <li key={file.id} className="break-words"><span className="block text-xs text-slate-500">{evidenceLabels[file.purpose]}</span><button type="button" onClick={async () => { setError('');try { await downloadEvidence(file); } catch (e) { setError(e instanceof Error ? e.message : 'Không tải được chứng từ.'); } }} className="text-emerald-700 underline text-left break-all">{file.filename}</button></li>)}</ul>
    {error && <p role="alert" className="text-rose-700">{error}</p>}
  </div>;
}

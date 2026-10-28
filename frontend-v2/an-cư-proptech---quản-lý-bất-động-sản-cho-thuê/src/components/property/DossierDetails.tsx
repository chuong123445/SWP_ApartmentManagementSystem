import { useState } from 'react';
import { downloadEvidence } from '@/services/property/dossierService';
import { dossierStatusLabels, evidenceLabels, rightLabels, type Dossier } from '@/types/dossier';
export function DossierDetails({ dossier }: { dossier: Dossier }) {
  const [error, setError] = useState('');
  return <div className="space-y-3 text-sm min-w-0">
    {dossier.localFixture && <p className="bg-amber-50 text-amber-900 p-3 rounded-lg font-semibold">Hồ sơ mẫu — thông tin và ảnh minh họa, không phải giấy tờ pháp lý đã được kiểm tra.</p>}
    <p><strong>{dossierStatusLabels[dossier.status]}</strong> · Gửi lúc {new Date(dossier.submittedAt).toLocaleString('vi-VN')}</p>
    <p>Người nộp: <strong>{dossier.applicantName}</strong></p>
    <p>Quyền cho thuê: {rightLabels[dossier.rightType]}</p>
    {dossier.applicantDocumentNumber&&<p>CCCD người nộp đã xác thực VNeID: {dossier.applicantDocumentNumber}</p>}
    {dossier.rightType!=='OWNERSHIP'&&<div className="border rounded-lg p-3 space-y-1"><p>Chủ sở hữu gốc: {dossier.principalName||'Chưa cung cấp'} · CCCD: {dossier.principalDocumentNumber||'Chưa cung cấp'}</p><p>Quyền cho thuê: {dossier.rightsValidFrom||'Chưa có'} đến hết {dossier.rightsValidUntil||'Chưa có'}</p>{dossier.rightType==='SUBLEASE'&&<p>Hợp đồng thuê gốc: {dossier.originalLeaseFrom||'Chưa có'} đến hết {dossier.originalLeaseUntil||'Chưa có'}</p>}{dossier.renewal&&<p>Hồ sơ gia hạn/bổ sung quyền cho thuê</p>}</div>}
    <p>Căn cứ quyền khai thác: {dossier.exploitationRightDescription || 'Chưa cung cấp'}</p>
    <div className="border rounded-lg p-3 space-y-1"><p>Số giấy chứng nhận: {dossier.certificateNumber || 'Chưa cung cấp'}</p><p>Ngày cấp: {dossier.certificateIssueDate || 'Chưa cung cấp'}</p><p>Nơi cấp: {dossier.certificateIssuePlace || 'Chưa cung cấp'}</p></div>
    <div className="rounded-lg bg-slate-50 p-3 space-y-1"><p>Ngân hàng: {dossier.bank}</p><p>Số tài khoản: {dossier.accountNumber}</p><p>Chủ tài khoản: {dossier.accountHolderName}</p></div>
    {dossier.reviewReason && <p className="p-3 rounded-lg bg-amber-50 text-amber-900 whitespace-pre-wrap">{dossier.localFixture ? 'Ghi chú hồ sơ mẫu' : 'Ý kiến Admin'}: {dossier.reviewReason}</p>}
    <ul className="space-y-2">{dossier.files.map(file => <li key={file.id} className="break-words"><span className="block text-xs text-slate-500">{evidenceLabels[file.purpose]}</span><button type="button" onClick={async () => { setError('');try { await downloadEvidence(file); } catch (e) { setError(e instanceof Error ? e.message : 'Không tải được chứng từ.'); } }} className="text-emerald-700 underline text-left break-all">{file.filename}</button></li>)}</ul>
    {error && <p role="alert" className="text-rose-700">{error}</p>}
  </div>;
}

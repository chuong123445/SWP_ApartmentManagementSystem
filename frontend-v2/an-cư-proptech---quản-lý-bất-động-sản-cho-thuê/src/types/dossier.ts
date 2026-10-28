import type { OwnerProperty } from '@/types/property';
export type EvidencePurpose = 'RIGHT_DOCUMENT' | 'SUPPORTING' | 'OWNER_IDENTITY' | 'AUTHORIZATION_DOCUMENT' | 'ORIGINAL_LEASE' | 'SUBLEASE_CONSENT';
export interface EvidenceFile { id: string; purpose: EvidencePurpose; filename: string; contentType: string; size: number }
export type DossierStatus = 'PENDING_APPROVAL' | 'NEEDS_INFORMATION' | 'APPROVED' | 'REJECTED';
export type ReviewDecision = 'APPROVE' | 'REQUEST_ADDITIONAL_INFORMATION' | 'REJECT';
export interface Dossier {
  id: string; propertyId: string; propertyName: string; propertyAddress: string; applicantName: string;
  rightType: 'OWNERSHIP' | 'AUTHORIZATION' | 'SUBLEASE'; bank: string; accountNumber: string; accountHolderName: string;
  status: DossierStatus; files: EvidenceFile[]; submittedAt: string; reviewedAt: string | null; reviewReason: string | null; version: number;
  certificateNumber?: string | null; certificateIssueDate?: string | null; certificateIssuePlace?: string | null; exploitationRightDescription?: string | null; localFixture?: boolean;
  rightsValidFrom?: string | null; rightsValidUntil?: string | null; originalLeaseFrom?: string | null; originalLeaseUntil?: string | null;
  principalName?: string | null; principalDocumentNumber?: string | null; applicantDocumentNumber?: string | null; renewal?: boolean;
}
export interface DossierSubmit {
  propertyVersion: number; rightType: Dossier['rightType']; receivingAccount: { bank: string; accountNumber: string; accountHolderName: string };
  documentFileIds: string[]; supportingFileIds: string[]; ownerEvidenceFileIds: string[];
  authorizationFileIds?: string[]; originalLeaseFileIds?: string[]; subleaseConsentFileIds?: string[];
  rightsValidFrom?: string | null; rightsValidUntil?: string | null; originalLeaseFrom?: string | null; originalLeaseUntil?: string | null;
  principalName?: string | null; principalDocumentNumber?: string | null;
  certificateNumber?: string | null; certificateIssueDate?: string | null; certificateIssuePlace?: string | null; exploitationRightDescription?: string | null;
}
export const dossierStatusLabels: Record<DossierStatus, string> = {
  PENDING_APPROVAL: 'Chờ duyệt', NEEDS_INFORMATION: 'Cần bổ sung hồ sơ', APPROVED: 'Đã duyệt', REJECTED: 'Bị từ chối',
};
export const evidenceLabels: Record<EvidencePurpose, string> = {
  RIGHT_DOCUMENT: 'Giấy tờ sở hữu / quyền khai thác', SUPPORTING: 'Chứng từ bổ sung', OWNER_IDENTITY: 'Giấy tờ người nộp (riêng tư)',
  AUTHORIZATION_DOCUMENT: 'Giấy ủy quyền', ORIGINAL_LEASE: 'Hợp đồng thuê gốc', SUBLEASE_CONSENT: 'Văn bản cho phép cho thuê lại riêng',
};
export const rightLabels = { OWNERSHIP: 'Chính chủ', AUTHORIZATION: 'Đại diện theo ủy quyền', SUBLEASE: 'Bên cho thuê lại' };
export type { OwnerProperty };

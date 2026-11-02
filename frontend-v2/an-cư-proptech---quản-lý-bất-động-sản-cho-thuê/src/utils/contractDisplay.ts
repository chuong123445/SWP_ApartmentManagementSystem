import type { ContractDraft } from '@/types/contract';

export function contractStatusLabel(status: string, endDate: string, today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())) {
  if (status === 'ENDED' || status === 'terminated') return 'Đã kết thúc';
  if (status === 'DRAFT' || status === 'draft') return 'Bản nháp';
  if (endDate < today) return 'Hết hạn — chờ xử lý';
  return status === 'expiring' ? 'Sắp hết hạn' : 'Đang hiệu lực';
}

export function contractActionLabel(draft: ContractDraft, accountId?: string) {
  const signedAt = accountId === draft.signing?.ownerAccountId ? draft.signing?.ownerSignedAt :
    accountId === draft.signing?.customerAccountId ? draft.signing?.customerSignedAt : null;
  return draft.status !== 'DRAFT' || draft.signing?.state === 'SIGNED' || signedAt ? 'Xem hợp đồng' : 'Xem / ký hợp đồng';
}

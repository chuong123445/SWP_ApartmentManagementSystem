import type { ContractDraft } from '@/types/contract';

export function contractLifecycleActions(draft: ContractDraft, accountId?: string) {
  const life = draft.lifecycle;
  const owner = !!accountId && accountId === (draft.signing?.ownerAccountId ?? draft.snapshot.owner.id);
  const customer = !!accountId && accountId === (draft.signing?.customerAccountId ?? draft.snapshot.customer.id);
  const eligible = !!life && draft.status === 'ACTIVE' && life.handover?.status !== 'PENDING' && !life.renewalContractId;
  return { owner, customer,
    canRequest: customer && eligible && life.renewalRequestAvailable === true && !life.renewalRequest,
    canCreate: owner && eligible && life?.renewalRequest?.status === 'ACCEPTED',
    canHandover: owner && draft.status === 'ACTIVE' && life?.handoverAvailable === true };
}

export function contractStatusLabel(status: string, endDate: string, today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())) {
  if (status === 'CANCELLED' || status === 'cancelled') return 'Đã hủy trước hiệu lực';
  if (status === 'ENDED' || status === 'terminated') return 'Đã kết thúc';
  if (status === 'DRAFT' || status === 'draft') return 'Bản nháp';
  if (endDate < today) return 'Hết hạn — chờ xử lý';
  return status === 'expiring' ? 'Sắp hết hạn' : 'Đang hiệu lực';
}

export function contractActionLabel(draft: ContractDraft, accountId?: string) {
  if (draft.cancellationState === 'PENDING') return 'Xem đề nghị hủy';
  const signedAt = accountId === draft.signing?.ownerAccountId ? draft.signing?.ownerSignedAt :
    accountId === draft.signing?.customerAccountId ? draft.signing?.customerSignedAt : null;
  return draft.status !== 'DRAFT' || draft.signing?.state === 'SIGNED' || signedAt ? 'Xem hợp đồng' : 'Xem / ký hợp đồng';
}

export function contractListTitle(draft: ContractDraft) {
  if (/^\[MẪU\]/iu.test(draft.snapshot.asset.title)) return `Hợp đồng thuê · ${draft.contractNumber}`;
  return `${draft.snapshot.asset.roomNumber} · ${draft.snapshot.asset.title}`;
}

export function contractSigningLabel(draft: ContractDraft) {
  if (draft.status === 'CANCELLED') return 'Đã hủy trước hiệu lực';
  if (draft.cancellationState === 'PENDING') return 'Chờ phản hồi đề nghị hủy';
  if (draft.status === 'ENDED') return 'Đã kết thúc';
  if (draft.status === 'DRAFT' && draft.signing?.state === 'SIGNED') return draft.lifecycle?.previousContractId ? 'Đã ký — chờ chuyển kỳ thuê' : 'Đã ký — chờ hiệu lực';
  if (draft.status === 'ACTIVE' && draft.lifecycle?.expired) return 'Hết hạn — chờ ký tiếp hoặc bàn giao';
  return draft.signing?.state === 'SIGNED' ? 'Hai bên đã ký' : draft.signing?.state === 'WAITING_CUSTOMER' ? 'Chờ khách thuê ký' : draft.signing?.state === 'WAITING_OWNER' ? 'Chờ chủ nhà ký' : draft.status === 'ACTIVE' ? 'Đang hiệu lực' : 'Chờ hai bên ký';
}

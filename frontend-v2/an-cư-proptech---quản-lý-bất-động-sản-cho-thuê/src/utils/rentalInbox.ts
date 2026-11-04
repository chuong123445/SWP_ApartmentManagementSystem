import type { RentalRequestStatus } from '@/types/rental';
export type OrdinaryInboxFilter = 'PENDING' | 'CONTRACTING' | 'SIGNED' | 'REJECTED' | 'CANCELLED' | 'ALL';
export const ordinaryInboxOptions: [OrdinaryInboxFilter, string][] = [
  ['PENDING', 'Chờ xử lý'], ['CONTRACTING', 'Đang làm hợp đồng'], ['SIGNED', 'Đã ký hợp đồng'], ['REJECTED', 'Đã từ chối'], ['CANCELLED', 'Đã hủy'], ['ALL', 'Tất cả'],
];
export function ordinaryInboxQuery(filter: OrdinaryInboxFilter): { status?: RentalRequestStatus; contractCompleted?: boolean } {
  if (filter === 'ALL') return {};
  if (filter === 'CONTRACTING' || filter === 'SIGNED') return { status: 'ACCEPTED', contractCompleted: filter === 'SIGNED' };
  return { status: filter };
}
export const renewalInboxLabels = { PENDING: 'Chờ xử lý', ACCEPTED: 'Đang làm hợp đồng', FULFILLED: 'Đã ký hợp đồng', REJECTED: 'Đã từ chối', CANCELLED: 'Đã hủy' };

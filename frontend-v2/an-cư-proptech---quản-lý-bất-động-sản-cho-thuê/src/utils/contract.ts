import type { ContractTerms } from '@/types/contract';
export function validateContractTerms(t: ContractTerms): string {
  if (!t.startDate || !t.endDate || t.endDate <= t.startDate) return 'Ngày kết thúc phải sau ngày bắt đầu.';
  for (const [value, positive] of [[t.monthlyRent, true], [t.deposit, false], [t.electricityUnitPrice, false], [t.waterUnitPrice, false]] as const) {
    if (!/^\d{1,13}(\.\d{1,2})?$/.test(value) || (positive && Number(value) <= 0)) return 'Nhập đầy đủ số tiền hợp lệ, tối đa 2 chữ số thập phân.';
  }
  if (!Number.isInteger(t.paymentDay) || t.paymentDay < 1 || t.paymentDay > 28) return 'Ngày thanh toán phải từ 1 đến 28.';
  if (!t.paymentMethod.trim() || !t.usagePurpose.trim()) return 'Nhập phương thức thanh toán và mục đích thuê.';
  if (t.clauses.length < 1 || t.clauses.length > 30 || t.clauses.some(c => !c.title.trim() || !c.body.trim())) return 'Mỗi điều khoản cần tiêu đề và nội dung; hợp đồng cần từ 1 đến 30 điều khoản.';
  return '';
}

import type { ContractTerms } from '@/types/contract';
export function contractToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  return ['year', 'month', 'day'].map(key => parts.find(part => part.type === key)!.value).join('-');
}
export function contractStartMinimum(rightsValidFrom?: string | null, today = contractToday()): string {
  return rightsValidFrom && rightsValidFrom > today ? rightsValidFrom : today;
}
export function contractStartMaximum(rightsValidUntil?: string | null, today = contractToday()): string {
  const date = new Date(`${today}T00:00:00Z`);date.setUTCDate(date.getUTCDate() + 90);
  const maximum = date.toISOString().slice(0, 10);
  return rightsValidUntil && rightsValidUntil < maximum ? rightsValidUntil : maximum;
}
export function contractMinimumEnd(start: string): string {
  const date = new Date(`${start}T00:00:00Z`);date.setUTCDate(date.getUTCDate() + 29);
  return date.toISOString().slice(0, 10);
}
export function oneMonthRentPackage(start: string, end: string): boolean {
  if (!start || !end || end < contractMinimumEnd(start)) return false;
  const date = new Date(`${start}T00:00:00Z`), day = date.getUTCDate();
  date.setUTCDate(1);date.setUTCMonth(date.getUTCMonth() + 1);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth()+1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day,lastDay));date.setUTCDate(date.getUTCDate()-1);
  return end === contractMinimumEnd(start) || end === date.toISOString().slice(0,10);
}
export function contractWholeMonths(start: string, end: string): number {
  if (!start || !end || end < contractMinimumEnd(start)) return 1;
  if (oneMonthRentPackage(start, end)) return 1;
  const startDate = new Date(`${start}T00:00:00Z`);
  const endDate = new Date(`${end}T00:00:00Z`);
  let firstYear = startDate.getUTCFullYear();
  let firstMonth = startDate.getUTCMonth();
  if (startDate.getUTCDate() !== 1) {
    firstMonth += 1;
  }
  const endPlusOne = new Date(endDate);
  endPlusOne.setUTCDate(endPlusOne.getUTCDate() + 1);
  const endYear = endPlusOne.getUTCFullYear();
  const endMonth = endPlusOne.getUTCMonth();
  const months = (endYear - firstYear) * 12 + (endMonth - firstMonth);
  return Math.max(1, months);
}
export function contractMaxRentCycle(start: string, end: string): number {
  if (oneMonthRentPackage(start, end)) return 1;
  return Math.min(12, contractWholeMonths(start, end));
}
export function validateContractTerms(t: ContractTerms, today = contractToday()): string {
  if (!t.startDate || !t.endDate || t.endDate <= t.startDate) return 'Ngày kết thúc phải sau ngày bắt đầu.';
  if (t.startDate < today) return 'Ngày bắt đầu hợp đồng không được trước ngày hôm nay.';
  if (t.startDate > contractStartMaximum(null, today)) return 'Chỉ được đặt trước tối đa 90 ngày.';
  if (t.endDate < contractMinimumEnd(t.startDate)) return 'Thời hạn thuê tối thiểu phải từ 30 ngày trở lên (tính cả ngày bắt đầu và kết thúc).';
  if (oneMonthRentPackage(t.startDate,t.endDate) && (t.rentCycleMonths??1)!==1) return 'Hợp đồng trọn một tháng chỉ được chọn chu kỳ 1 tháng/lần.';
  const maxCycle = contractMaxRentCycle(t.startDate, t.endDate);
  const cycle = t.rentCycleMonths ?? 1;
  if (!Number.isInteger(cycle) || cycle < 1 || cycle > 12) return 'Chu kỳ tiền thuê phải từ 1 đến 12 tháng.';
  if (cycle > maxCycle) return `Chu kỳ tiền thuê không được vượt quá số tháng tròn của hợp đồng (${maxCycle} tháng).`;
  for (const [value, positive] of [[t.monthlyRent, true], [t.deposit, false], [t.electricityUnitPrice, false], [t.waterUnitPrice, false], [t.internetFee??'0',false],[t.garbageFee??'0',false]] as const) {
    if (!/^\d{1,13}(\.\d{1,2})?$/.test(value) || (positive && Number(value) <= 0)) return 'Nhập đầy đủ số tiền hợp lệ, tối đa 2 chữ số thập phân.';
  }
  if(!Number.isInteger(t.occupantCount??1)||(t.occupantCount??1)<1||(t.occupantCount??1)>100)return 'Số người phải từ 1 đến 100.';
  if (!Number.isInteger(t.paymentDay) || t.paymentDay < 1 || t.paymentDay > 28) return 'Ngày thanh toán phải từ 1 đến 28.';
  if (!t.paymentMethod.trim() || !t.usagePurpose.trim()) return 'Nhập phương thức thanh toán và mục đích thuê.';
  if (t.clauses.length < 1 || t.clauses.length > 30 || t.clauses.some(c => !c.title.trim() || !c.body.trim())) return 'Mỗi điều khoản cần tiêu đề và nội dung; hợp đồng cần từ 1 đến 30 điều khoản.';
  return '';
}

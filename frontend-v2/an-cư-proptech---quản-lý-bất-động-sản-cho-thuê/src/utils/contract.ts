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
export type ContractFieldErrors = Record<string,string>;
export function contractTermErrors(t:ContractTerms,today=contractToday(),rights?:{rightsValidFrom?:string|null;rightsValidUntil?:string|null}):ContractFieldErrors {
  const errors:ContractFieldErrors={};
  if(!t.startDate)errors.startDate='Nhập ngày bắt đầu hợp đồng.';
  else if(t.startDate<today)errors.startDate='Ngày bắt đầu hợp đồng không được trước ngày hôm nay.';
  else if(t.startDate>contractStartMaximum(null,today))errors.startDate='Chỉ được đặt trước tối đa 90 ngày.';
  else if(rights?.rightsValidFrom&&t.startDate<rights.rightsValidFrom)errors.startDate='Ngày bắt đầu không được trước thời hạn quyền cho thuê đã duyệt.';
  if(!t.endDate)errors.endDate='Nhập ngày kết thúc hợp đồng.';
  else if(t.startDate&&t.endDate<=t.startDate)errors.endDate='Ngày kết thúc phải sau ngày bắt đầu.';
  else if(t.startDate&&t.endDate<contractMinimumEnd(t.startDate))errors.endDate='Thời hạn thuê tối thiểu phải từ 30 ngày trở lên (tính cả ngày bắt đầu và kết thúc).';
  else if(rights?.rightsValidUntil&&t.endDate>rights.rightsValidUntil)errors.endDate='Ngày kết thúc không được vượt thời hạn quyền cho thuê đã duyệt.';
  if(oneMonthRentPackage(t.startDate,t.endDate)&&(t.rentCycleMonths??1)!==1)errors.rentCycleMonths='Hợp đồng trọn một tháng chỉ được chọn chu kỳ 1 tháng/lần.';
  for(const key of ['monthlyRent','deposit','electricityUnitPrice','waterUnitPrice','internetFee','garbageFee'] as const){
    const value=t[key]??(key==='internetFee'||key==='garbageFee'?'0':'');
    if(!/^\d{1,13}(\.\d{1,2})?$/.test(value)||(key==='monthlyRent'&&Number(value)<=0))errors[key]='Nhập đầy đủ số tiền hợp lệ, tối đa 2 chữ số thập phân.';
  }
  if(!Number.isInteger(t.occupantCount??1)||(t.occupantCount??1)<1||(t.occupantCount??1)>100)errors.occupantCount='Số người phải từ 1 đến 100.';
  if(![1,3,6,12].includes(t.rentCycleMonths??1))errors.rentCycleMonths='Chu kỳ tiền thuê phải là 1, 3, 6 hoặc 12 tháng.';
  if(!Number.isInteger(t.paymentDay)||t.paymentDay<1||t.paymentDay>28)errors.paymentDay='Ngày thanh toán phải từ 1 đến 28.';
  if(!t.paymentMethod.trim())errors.paymentMethod='Nhập phương thức thanh toán.';
  if(!t.usagePurpose.trim())errors.usagePurpose='Nhập mục đích thuê.';
  if(t.clauses.length<1||t.clauses.length>30)errors.clauses='Hợp đồng cần từ 1 đến 30 điều khoản.';
  t.clauses.forEach((c,i)=>{if(!c.title.trim())errors[`clauses.${i}.title`]='Nhập tiêu đề điều khoản.';if(!c.body.trim())errors[`clauses.${i}.body`]='Nhập nội dung điều khoản.';});
  return errors;
}
export function validateContractTerms(t:ContractTerms,today=contractToday()):string {
  return Object.values(contractTermErrors(t,today))[0]??'';
}
export function contractServerErrorField(code:string):string|undefined {
  return ({CONTRACT_START_DATE_IN_PAST:'startDate',CONTRACT_START_DATE_TOO_FAR:'startDate',INVALID_CONTRACT_DATES:'endDate',CONTRACT_TERM_TOO_SHORT:'endDate',CONTRACT_EXCEEDS_PROPERTY_RIGHTS:'endDate',ONE_MONTH_RENT_CYCLE_REQUIRED:'rentCycleMonths'} as Record<string,string>)[code];
}

// Decimal strings come from the server. Conversion is for display only, never billing/request input.
export function formatRent(value: string) { return `${Number(value).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} đ`; }
export function formatRequestDate(value: string) { return new Date(value).toLocaleString('vi-VN'); }
export const availabilityLabel = { VACANT: 'Đang trống', CONTRACT_IN_PROGRESS: 'Đang làm hợp đồng', OCCUPIED: 'Đang thuê', MAINTENANCE: 'Đang sửa chữa' };
export const requestStatusLabel = { PENDING: 'Chờ xử lý', ACCEPTED: 'Đang làm hợp đồng', REJECTED: 'Đã từ chối', CANCELLED: 'Đã hủy' };

export function rentalRequestPresentation(request: {
  apartmentTitle: string; message: string; decisionReason?: string | null;
}) {
  const fixture = /^LOCAL-HH205-(?:EXPIRED-\d{8}|REMINDER-\d{8}-D\d+)$/.test(request.message);
  return {
    title: fixture ? request.apartmentTitle.replace(/^\[MẪU\]\s*/u, '') : request.apartmentTitle,
    message: fixture ? '' : request.message,
    decisionReason: fixture && request.decisionReason === 'Dữ liệu mẫu được cho phép tạo riêng ngày 02/11/2026.'
      ? null : request.decisionReason,
  };
}

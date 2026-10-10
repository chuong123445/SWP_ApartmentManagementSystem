// Decimal strings come from the server. Conversion is for display only, never billing/request input.
export function formatRent(value: string) { return `${Number(value).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} đ`; }
export function formatRequestDate(value: string) { return new Date(value).toLocaleString('vi-VN'); }
export const availabilityLabel = { VACANT: 'Đang trống', CONTRACT_IN_PROGRESS: 'Đang làm hợp đồng', OCCUPIED: 'Đang thuê', MAINTENANCE: 'Đang sửa chữa' };
export const requestStatusLabel = { PENDING: 'Chờ xử lý', ACCEPTED: 'Đã chấp nhận', REJECTED: 'Đã từ chối', CANCELLED: 'Đã hủy' };

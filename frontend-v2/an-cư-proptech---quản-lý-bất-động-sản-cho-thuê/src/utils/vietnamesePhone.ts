export function normalizeVietnamesePhone(raw: string): string | null {
  let phone = raw.trim().replace(/[ .()\-]/g, '');
  if (phone.startsWith('0')) phone = '+84' + phone.slice(1);
  return /^\+84(?:[35789][0-9]{8}|2[0-9]{9})$/.test(phone) ? phone : null;
}
export const vietnamesePhoneHint = 'Dùng số di động Việt Nam 10 chữ số hoặc số cố định 11 chữ số, bắt đầu bằng 0 hoặc +84.';

import type { AccountVerification } from '@/services/auth/vneidService';
import type { useAccountVerification } from '@/hooks/useAccountVerification';

export function VerifiedCitizenDetails({ verification }: { verification: AccountVerification['vneid'] }) {
  const identity = verification.identity;
  if (verification.status !== 'VERIFIED' || !identity) return null;
  const rows = [
    ['Số căn cước công dân', identity.documentNumber], ['Họ và tên', identity.legalName],
    ['Ngày sinh', new Date(`${identity.dateOfBirth}T00:00:00`).toLocaleDateString('vi-VN')],
    ['Giới tính', identity.gender], ['Địa chỉ', identity.address],
    ['Thời điểm xác thực', verification.verifiedAt ? new Date(verification.verifiedAt).toLocaleString('vi-VN') : 'Chưa có thông tin'],
  ];
  return <div className="mt-4">
    <h3 className="font-semibold text-slate-900">Thông tin căn cước đã xác thực</h3>
    <dl className="mt-3 grid gap-3 sm:grid-cols-2">{rows.map(([label, value]) => <div key={label} className="min-w-0">
      <dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 text-sm font-medium text-slate-900 break-words">{value}</dd>
    </div>)}</dl>
    <p className="text-xs text-slate-500 mt-4">Thông tin được ghi nhận từ VNeID và chỉ hiển thị cho chính bạn. Các trường này không chỉnh sửa trực tiếp tại đây.</p>
  </div>;
}

export function VerifiedCitizenPanel({ state }: { state: ReturnType<typeof useAccountVerification> }) {
  const { data, loading, error, reload } = state;
  if (loading) return <p role="status" className="mb-4 text-sm text-slate-500">Đang tải căn cước đã xác thực...</p>;
  if (error) return <p role="alert" className="mb-4 text-rose-700">{error}<button type="button" onClick={reload} className="ml-2 underline">Tải lại trạng thái xác thực</button></p>;
  if (data?.vneid.status !== 'VERIFIED') return null;
  return <section className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 sm:p-6 mb-5">
    <h2 className="font-bold text-emerald-900">Căn cước VNeID · Đã xác thực</h2>
    <VerifiedCitizenDetails verification={data.vneid} />
  </section>;
}

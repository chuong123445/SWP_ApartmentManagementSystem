import { Link } from 'react-router';
import { ShieldAlert, ArrowRight, X, CheckCircle2 } from 'lucide-react';

export function RequireOwnerIdentityModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="owner-identity-modal-title"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 sm:p-7 max-w-md w-full relative space-y-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-600 flex items-center justify-center shrink-0 shadow-xs">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-900 border border-amber-200">
                Xác thực danh tính chủ nhà
              </span>
              <h2 id="owner-identity-modal-title" className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
                Yêu cầu cập nhật CCCD
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-slate-600 leading-relaxed">
          Để đảm bảo tính pháp lý, minh bạch và an toàn khi đăng tin cho thuê căn hộ, hệ thống yêu cầu chủ nhà hoàn tất thông tin <strong>Căn cước công dân (CCDN/CCCD)</strong> trong mục Cài đặt tài khoản trước khi tạo tài sản mới.
        </p>

        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2 text-xs text-slate-700">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>Chỉ cần cập nhật một lần số CCCD và địa chỉ</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>Tự động đồng bộ vào hồ sơ pháp lý tài sản khi gửi duyệt</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>Bảo vệ quyền sở hữu và giao dịch cho thuê an toàn</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link
            to="/account/settings/identity"
            state={{ returnTo: '/app', returnLabel: 'Quay lại trang quản lý' }}
            onClick={onClose}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm py-2.5 px-4 rounded-xl shadow-sm shadow-emerald-700/20 transition-all hover:shadow-md"
          >
            <span>Xác thực danh tính ngay</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200 text-center"
          >
            Để sau
          </button>
        </div>
      </div>
    </div>
  );
}

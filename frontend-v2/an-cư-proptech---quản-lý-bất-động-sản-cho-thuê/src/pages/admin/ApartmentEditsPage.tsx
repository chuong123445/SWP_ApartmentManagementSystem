import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import {
  FileEdit,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Search,
  AlertCircle,
  Building2,
  TrendingUp,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { AdminLayout } from '@/layouts/AdminLayout';
import {
  getPendingApartmentEdits,
  approvePendingApartmentEdit,
  rejectPendingApartmentEdit
} from '@/services/apartments/ownerApartmentService';
import type { Room } from '@/types';

export function ApartmentEditsPage() {
  const [apartments, setApartments] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadPendingApartments = async () => {
    setLoading(true);
    setError('');
    try {
      const items = await getPendingApartmentEdits();
      setApartments(items);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Không thể tải danh sách chỉnh sửa căn hộ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPendingApartments();
  }, []);

  const handleApprove = async (aptId: string) => {
    setActionBusy(aptId);
    setError('');
    setNotice('');
    try {
      await approvePendingApartmentEdit(aptId);
      setNotice('Đã phê duyệt bản chỉnh sửa căn hộ thành công. Dữ liệu mới đã được áp dụng.');
      await loadPendingApartments();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Không thể phê duyệt bản chỉnh sửa.');
    } finally {
      setActionBusy(null);
    }
  };

  const handleReject = async (aptId: string) => {
    setActionBusy(aptId);
    setError('');
    setNotice('');
    try {
      await rejectPendingApartmentEdit(aptId);
      setNotice('Đã từ chối bản chỉnh sửa. Căn hộ vẫn giữ nguyên dữ liệu niêm yết hiện hành.');
      await loadPendingApartments();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Không thể từ chối bản chỉnh sửa.');
    } finally {
      setActionBusy(null);
    }
  };

  const filteredApartments = apartments.filter((apt) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      apt.roomNumber.toLowerCase().includes(query) ||
      Boolean(apt.title?.toLowerCase().includes(query)) ||
      Boolean(apt.propertyName?.toLowerCase().includes(query))
    );
  });

  return (
    <AdminLayout
      title="Duyệt sửa đổi căn hộ"
      subtitle="Thẩm định các thay đổi thông tin nhạy cảm (giá thuê, tiền cọc, công tơ) do Chủ nhà đề xuất"
      pendingEditCount={apartments.length}
    >
      {/* Alert Notices */}
      {error && (
        <div role="alert" className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}
      {notice && (
        <div role="status" className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          <span>{notice}</span>
        </div>
      )}

      {/* Control & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo số phòng, tòa nhà, tiêu đề..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 font-medium">
            Đang chờ duyệt: <strong className="text-slate-900 font-bold">{apartments.length}</strong> căn hộ
          </span>
          <button
            type="button"
            onClick={loadPendingApartments}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="p-12 bg-white border border-slate-200 rounded-2xl text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-slate-400 animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-700">Đang tải danh sách căn hộ cần thẩm định...</p>
        </div>
      ) : filteredApartments.length === 0 ? (
        <div className="p-12 bg-white border border-slate-200 rounded-2xl text-center space-y-3">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            {searchQuery ? 'Không tìm thấy căn hộ phù hợp' : 'Không có yêu cầu chỉnh sửa nào đang chờ'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {searchQuery
              ? 'Thử thay đổi từ khóa tìm kiếm hoặc làm mới danh sách.'
              : 'Mọi đề xuất chỉnh sửa trường dữ liệu nhạy cảm của các Chủ nhà đã được giải quyết xong.'}
          </p>
          <div className="pt-2">
            <Link
              to="/admin/property-dossiers"
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Chuyển sang kiểm duyệt hồ sơ bất động sản</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredApartments.map((apt) => {
            const draft = apt.pendingEdit;
            const isBusy = actionBusy === apt.id;
            return (
              <div
                key={apt.id}
                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4 hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* Apartment header */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-base">Căn hộ {apt.roomNumber}</span>
                        <span className="text-[11px] bg-amber-100 text-amber-800 font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Chờ Admin duyệt
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>{apt.propertyName} · Tầng {apt.floor}</span>
                      </p>
                      <p className="text-xs font-medium text-slate-700 mt-1">{apt.title}</p>
                    </div>
                  </div>

                  {/* Comparison Box */}
                  {draft && (
                    <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                          Đối chiếu thông tin nhạy cảm
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          Gửi: {new Date(draft.requestedAt).toLocaleString('vi-VN')}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5 text-xs">
                        {/* Monthly Rent */}
                        <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                          <span className="text-slate-400 text-[11px] block">Giá thuê hiện tại</span>
                          <span className="font-semibold text-slate-800">
                            {apt.price.toLocaleString('vi-VN')} đ/tháng
                          </span>
                        </div>
                        <div className="bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-200 space-y-1">
                          <span className="text-emerald-700 text-[11px] block font-medium">Giá thuê đề xuất</span>
                          <span className="font-bold text-emerald-900">
                            {Number(draft.advertisedMonthlyRent).toLocaleString('vi-VN')} đ/tháng
                          </span>
                        </div>

                        {/* Deposit */}
                        <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                          <span className="text-slate-400 text-[11px] block">Tiền cọc hiện tại</span>
                          <span className="font-semibold text-slate-800">
                            {apt.deposit ? `${apt.deposit.toLocaleString('vi-VN')} đ` : 'Không yêu cầu cọc'}
                          </span>
                        </div>
                        <div className="bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-200 space-y-1">
                          <span className="text-emerald-700 text-[11px] block font-medium">Tiền cọc đề xuất</span>
                          <span className="font-bold text-emerald-900">
                            {draft.deposit ? `${Number(draft.deposit).toLocaleString('vi-VN')} đ` : 'Không yêu cầu cọc'}
                          </span>
                        </div>

                        {/* Area */}
                        <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                          <span className="text-slate-400 text-[11px] block">Diện tích hiện tại</span>
                          <span className="font-semibold text-slate-800">{apt.area} m²</span>
                        </div>
                        <div className="bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-200 space-y-1">
                          <span className="text-emerald-700 text-[11px] block font-medium">Diện tích đề xuất</span>
                          <span className="font-bold text-emerald-900">{draft.areaM2} m²</span>
                        </div>

                        {/* Meter Indices */}
                        <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                          <span className="text-slate-400 text-[11px] block">Điện / Nước cơ sở hiện tại</span>
                          <span className="font-semibold text-slate-800">
                            {apt.electricityIndex} kWh / {apt.waterIndex} m³
                          </span>
                        </div>
                        <div className="bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-200 space-y-1">
                          <span className="text-emerald-700 text-[11px] block font-medium">Điện / Nước đề xuất</span>
                          <span className="font-bold text-emerald-900">
                            {draft.electricityIndex ?? 'N/A'} kWh / {draft.waterIndex ?? 'N/A'} m³
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleApprove(apt.id)}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isBusy ? 'Đang xử lý...' : 'Phê duyệt thay đổi'}</span>
                  </button>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleReject(apt.id)}
                    className="px-5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Từ chối</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AdminLayout>
  );
}

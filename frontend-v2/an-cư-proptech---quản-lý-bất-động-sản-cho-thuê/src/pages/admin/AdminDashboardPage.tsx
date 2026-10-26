import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import {
  ShieldCheck,
  FileEdit,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Building2,
  ArrowRight,
  RefreshCw,
  FileText,
  BadgeCheck,
  AlertCircle
} from 'lucide-react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { adminDossiers } from '@/services/property/dossierService';
import { getPendingApartmentEdits, approvePendingApartmentEdit, rejectPendingApartmentEdit } from '@/services/apartments/ownerApartmentService';
import { dossierStatusLabels, type Dossier } from '@/types/dossier';
import type { Room } from '@/types';

export function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Counters
  const [pendingDossiersCount, setPendingDossiersCount] = useState<number>(0);
  const [approvedDossiersCount, setApprovedDossiersCount] = useState<number>(0);
  const [needsInfoDossiersCount, setNeedsInfoDossiersCount] = useState<number>(0);
  const [rejectedDossiersCount, setRejectedDossiersCount] = useState<number>(0);

  // Queues preview
  const [recentPendingDossiers, setRecentPendingDossiers] = useState<Dossier[]>([]);
  const [pendingApartments, setPendingApartments] = useState<Room[]>([]);
  const [aptActionBusy, setAptActionBusy] = useState<string | null>(null);

  const loadDashboardData = async () => {
    try {
      setError('');
      // 1. Fetch pending dossiers
      const pendingRes = await adminDossiers(0, 'PENDING_APPROVAL');
      setPendingDossiersCount(pendingRes.totalElements);
      setRecentPendingDossiers(pendingRes.items.slice(0, 4));

      // 2. Fetch approved count
      const approvedRes = await adminDossiers(0, 'APPROVED');
      setApprovedDossiersCount(approvedRes.totalElements);

      // 3. Fetch need info count
      const needInfoRes = await adminDossiers(0, 'NEEDS_INFORMATION');
      setNeedsInfoDossiersCount(needInfoRes.totalElements);

      // 4. Fetch rejected count
      const rejectedRes = await adminDossiers(0, 'REJECTED');
      setRejectedDossiersCount(rejectedRes.totalElements);

      // 5. Fetch pending apartment edits
      const apts = await getPendingApartmentEdits();
      setPendingApartments(apts);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Không thể tải dữ liệu bảng điều khiển Admin.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const handleApproveApartmentEdit = async (aptId: string) => {
    setAptActionBusy(aptId);
    setError('');
    setNotice('');
    try {
      await approvePendingApartmentEdit(aptId);
      setNotice('Đã phê duyệt bản chỉnh sửa căn hộ thành công.');
      await loadDashboardData();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Không thể phê duyệt bản chỉnh sửa.');
    } finally {
      setAptActionBusy(null);
    }
  };

  const handleRejectApartmentEdit = async (aptId: string) => {
    setAptActionBusy(aptId);
    setError('');
    setNotice('');
    try {
      await rejectPendingApartmentEdit(aptId);
      setNotice('Đã từ chối bản chỉnh sửa căn hộ.');
      await loadDashboardData();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Không thể từ chối bản chỉnh sửa.');
    } finally {
      setAptActionBusy(null);
    }
  };

  return (
    <AdminLayout
      title="Tổng quan Bảng điều khiển"
      pendingDossierCount={pendingDossiersCount}
      pendingEditCount={pendingApartments.length}
    >
      {/* Alert / Notice messages */}
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

      {/* Header action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900">Trung tâm Điều hành & Thẩm định</h2>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing || loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>{refreshing ? 'Đang làm mới...' : 'Cập nhật số liệu'}</span>
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Pending Dossiers */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-amber-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Hồ sơ chờ duyệt</span>
              <span className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
                <Clock className="w-5 h-5" />
              </span>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-extrabold text-slate-900">{pendingDossiersCount}</span>
              <p className="text-xs text-slate-500 mt-1">Bất động sản nộp chứng từ mới</p>
            </div>
          </div>
          <Link
            to="/admin/property-dossiers?status=PENDING_APPROVAL"
            className="mt-4 pt-3 border-t border-slate-100 text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center justify-between group"
          >
            <span>Xử lý ngay</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Card 2: Pending Apartment Edits */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Sửa đổi căn hộ chờ duyệt</span>
              <span className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                <FileEdit className="w-5 h-5" />
              </span>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-extrabold text-slate-900">{pendingApartments.length}</span>
              <p className="text-xs text-slate-500 mt-1">Thay đổi giá thuê, cọc, chỉ số</p>
            </div>
          </div>
          <Link
            to="/admin/apartment-edits"
            className="mt-4 pt-3 border-t border-slate-100 text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center justify-between group"
          >
            <span>Thẩm định thay đổi</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Card 3: Approved Dossiers */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-blue-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Tài sản đã phê duyệt</span>
              <span className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                <CheckCircle2 className="w-5 h-5" />
              </span>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-extrabold text-slate-900">{approvedDossiersCount}</span>
              <p className="text-xs text-slate-500 mt-1">Đủ điều kiện xuất bản lên sàn</p>
            </div>
          </div>
          <Link
            to="/admin/property-dossiers?status=APPROVED"
            className="mt-4 pt-3 border-t border-slate-100 text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center justify-between group"
          >
            <span>Xem danh sách</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Card 4: Needs Info / Rejected */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Yêu cầu bổ sung / Từ chối</span>
              <span className="p-2.5 rounded-xl bg-slate-100 text-slate-600">
                <AlertTriangle className="w-5 h-5" />
              </span>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-extrabold text-slate-900">
                {needsInfoDossiersCount + rejectedDossiersCount}
              </span>
              <p className="text-xs text-slate-500 mt-1">
                {needsInfoDossiersCount} cần bổ sung · {rejectedDossiersCount} từ chối
              </p>
            </div>
          </div>
          <Link
            to="/admin/property-dossiers?status=NEEDS_INFORMATION"
            className="mt-4 pt-3 border-t border-slate-100 text-xs font-bold text-slate-600 hover:text-slate-800 flex items-center justify-between group"
          >
            <span>Lịch sử xét duyệt</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>

      {/* Main Grid: Pending Queues */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1: Recent Pending Property Dossiers */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Hồ sơ tài sản chờ duyệt</h3>
              </div>
            </div>
            <Link
              to="/admin/property-dossiers?status=PENDING_APPROVAL"
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              <span>Xem tất cả ({pendingDossiersCount})</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400">Đang tải hồ sơ...</div>
          ) : recentPendingDossiers.length === 0 ? (
            <div className="py-8 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200 space-y-1.5">
              <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto" />
              <p className="text-xs font-semibold text-slate-700">Hàng đợi hồ sơ trống</p>
              <p className="text-[11px] text-slate-400">Hiện tại không có hồ sơ bất động sản nào đang chờ duyệt.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentPendingDossiers.map((d) => (
                <Link
                  key={d.id}
                  to={`/admin/property-dossiers`}
                  className="block p-3.5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:shadow-xs transition-all bg-slate-50/40 hover:bg-white"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-slate-900 truncate">{d.propertyName}</p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{d.propertyAddress}</p>
                      <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-500">
                        <span className="font-medium text-slate-700">Chủ nhà: {d.applicantName}</span>
                        <span>•</span>
                        <span>{d.files?.length || 0} chứng từ đính kèm</span>
                      </div>
                    </div>
                    <span className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                      Chờ duyệt
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Recent Pending Apartment Edits */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                <FileEdit className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Chỉnh sửa căn hộ chờ thẩm định</h3>
              </div>
            </div>
            <Link
              to="/admin/apartment-edits"
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              <span>Xem tất cả ({pendingApartments.length})</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400">Đang tải căn hộ...</div>
          ) : pendingApartments.length === 0 ? (
            <div className="py-8 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200 space-y-1.5">
              <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto" />
              <p className="text-xs font-semibold text-slate-700">Không có yêu cầu chỉnh sửa</p>
              <p className="text-[11px] text-slate-400">Mọi đề xuất chỉnh sửa nhạy cảm đã được xử lý.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingApartments.slice(0, 3).map((apt) => {
                const draft = apt.pendingEdit;
                const isBusy = aptActionBusy === apt.id;
                return (
                  <div
                    key={apt.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/40 hover:bg-white transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-slate-900">Căn {apt.roomNumber}</span>
                          <span className="text-xs text-slate-500">• {apt.propertyName}</span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5 truncate">{apt.title}</p>
                      </div>
                      <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                        Chờ duyệt
                      </span>
                    </div>

                    {draft && (
                      <div className="grid grid-cols-2 gap-2 text-[11px] bg-white p-2.5 rounded-lg border border-slate-200">
                        <div>
                          <span className="text-slate-400 block">Giá hiện tại</span>
                          <span className="font-medium text-slate-700">{apt.price.toLocaleString('vi-VN')} đ</span>
                        </div>
                        <div className="bg-emerald-50/60 p-1 rounded border border-emerald-100">
                          <span className="text-emerald-700 block font-medium">Giá đề xuất</span>
                          <span className="font-bold text-emerald-800">
                            {Number(draft.advertisedMonthlyRent).toLocaleString('vi-VN')} đ
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleApproveApartmentEdit(apt.id)}
                        className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        {isBusy ? 'Đang duyệt...' : 'Phê duyệt'}
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleRejectApartmentEdit(apt.id)}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        Từ chối
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Verification Guidelines / Compliance Checklist */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
            <BadgeCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Tiêu chuẩn Kiểm duyệt Hồ sơ Bất động sản (Admin Compliance Checklist)</h3>
            <p className="text-xs text-slate-500">Quy tắc bắt buộc theo nghiệp vụ SWP391 để bảo vệ quyền lợi người thuê</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-1">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[11px]">1</span>
              Chứng minh quyền khai thác
            </span>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              Đối chiếu Giấy chứng nhận quyền sử dụng đất / Hợp đồng ủy quyền khai thác với họ tên Chủ tài sản nộp hồ sơ. Đảm bảo bản chụp rõ nét, không bị che khuất số hiệu.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[11px]">2</span>
              Tài khoản nhận tiền VietQR
            </span>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              Kiểm tra tên chủ tài khoản ngân hàng và số tài khoản nhận tiền thuê nhà. Tên thụ hưởng phải trùng khớp hoặc được ủy quyền hợp pháp từ chủ hồ sơ.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[11px]">3</span>
              Kiểm soát sửa đổi nhạy cảm
            </span>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              Khi Chủ nhà sửa giá niêm yết hoặc tiền cọc sau khi đã được cấp phép, kiểm tra lý do biến động. Ngăn chặn hành vi tự ý nâng khống giá phòng khi có khách hỏi thuê.
            </p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

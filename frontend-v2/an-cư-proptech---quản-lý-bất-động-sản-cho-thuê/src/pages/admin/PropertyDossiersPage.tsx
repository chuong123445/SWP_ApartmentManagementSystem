import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useAuth } from '@/hooks/useAuth';
import { AccountMenu } from '@/components/navigation/AccountMenu';
import { Pagination } from '@/components/common/Pagination';
import { DossierDetails } from '@/components/property/DossierDetails';
import { adminDossier, adminDossiers, reviewDossier } from '@/services/property/dossierService';
import { getPendingApartmentEdits, approvePendingApartmentEdit, rejectPendingApartmentEdit } from '@/services/apartments/ownerApartmentService';
import { dossierStatusLabels, type Dossier, type DossierStatus, type ReviewDecision } from '@/types/dossier';
import type { PageResult } from '@/types/apartment';
import type { Room } from '@/types';
import { ShieldCheck, FileEdit, CheckCircle2, XCircle, Clock } from 'lucide-react';

import { AdminLayout } from '@/layouts/AdminLayout';

export function PropertyDossiersPage() {
  const { user, logout, isLoggingOut, error: authError } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'dossiers' | 'apartment_edits'>('dossiers');

  // Dossiers state: read initial status from search params if present
  const queryStatus = searchParams.get('status');
  const getInitialStatus = (): DossierStatus | '' => {
    if (queryStatus === 'APPROVED' || queryStatus === 'PENDING_APPROVAL' || queryStatus === 'NEEDS_INFORMATION' || queryStatus === 'REJECTED') {
      return queryStatus;
    }
    if (queryStatus === '' || queryStatus === 'ALL') {
      return '';
    }
    return 'PENDING_APPROVAL';
  };

  const [data, setData] = useState<PageResult<Dossier> | null>(null);
  const [status, setStatus] = useState<DossierStatus | ''>(getInitialStatus);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState<Dossier | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [notice, setNotice] = useState('');

  // Apartment pending edits state
  const [pendingApartments, setPendingApartments] = useState<Room[]>([]);
  const [pendingAptLoading, setPendingAptLoading] = useState(false);
  const [aptActionBusy, setAptActionBusy] = useState<string | null>(null);

  useEffect(() => {
    const s = searchParams.get('status');
    if (s === 'APPROVED' || s === 'PENDING_APPROVAL' || s === 'NEEDS_INFORMATION' || s === 'REJECTED') {
      setStatus(s);
      setPage(0);
      setSelected(null);
    } else if (s === '' || s === 'ALL') {
      setStatus('');
      setPage(0);
      setSelected(null);
    }
    const tabParam = searchParams.get('tab');
    if (tabParam === 'apartment_edits' || tabParam === 'dossiers') {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    adminDossiers(page, status)
      .then((result) => {
        if (active) setData(result);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page, status, revision]);

  useEffect(() => {
    if (activeTab === 'apartment_edits') {
      loadPendingApartments();
    }
  }, [activeTab]);

  const loadPendingApartments = async () => {
    setPendingAptLoading(true);
    setError('');
    try {
      const items = await getPendingApartmentEdits();
      setPendingApartments(items);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Không thể tải danh sách chỉnh sửa căn hộ.');
    } finally {
      setPendingAptLoading(false);
    }
  };

  const handleApproveApartmentEdit = async (aptId: string) => {
    setAptActionBusy(aptId);
    setError('');
    setNotice('');
    try {
      await approvePendingApartmentEdit(aptId);
      setNotice('Đã phê duyệt bản chỉnh sửa căn hộ thành công.');
      await loadPendingApartments();
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
      await loadPendingApartments();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Không thể từ chối bản chỉnh sửa.');
    } finally {
      setAptActionBusy(null);
    }
  };

  const decide = async (decision: ReviewDecision) => {
    if (!selected || busy) return;
    setError('');
    setNotice('');
    if (decision !== 'APPROVE' && !reason.trim()) {
      setError('Cần nhập lý do từ chối hoặc yêu cầu bổ sung.');
      return;
    }
    if (decision === 'APPROVE' && !confirmed) {
      setError('Cần xác nhận đã đối chiếu hồ sơ trước khi phê duyệt.');
      return;
    }
    setBusy(true);
    try {
      const saved = await reviewDossier(selected.id, decision, reason.trim(), selected.version);
      setSelected(saved);
      setRevision((n) => n + 1);
      setNotice(`Đã cập nhật hồ sơ: ${dossierStatusLabels[saved.status]}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không cập nhật được hồ sơ.');
      try {
        setSelected(await adminDossier(selected.id));
      } catch {
        /* original action error is shown */
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminLayout
      title="Duyệt hồ sơ & Kiểm định tài sản"
      subtitle="Đối chiếu hồ sơ pháp lý bất động sản và thẩm định các thay đổi thông tin nhạy cảm của căn hộ"
      pendingDossierCount={data?.totalElements}
      pendingEditCount={pendingApartments.length}
    >
      <div className="space-y-5">

        {/* Tab selection */}
        <div className="flex border-b border-slate-200 gap-3">
          <button
            type="button"
            onClick={() => {
              setActiveTab('dossiers');
              setError('');
              setNotice('');
            }}
            className={`pb-3 px-1 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'dossiers'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Hồ sơ bất động sản</span>
            {data && data.totalElements > 0 && (
              <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.2 rounded-full font-semibold">
                {data.totalElements}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('apartment_edits');
              setError('');
              setNotice('');
            }}
            className={`pb-3 px-1 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'apartment_edits'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <FileEdit className="w-4 h-4" />
            <span>Duyệt sửa đổi căn hộ</span>
            {pendingApartments.length > 0 && (
              <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.2 rounded-full font-semibold">
                {pendingApartments.length}
              </span>
            )}
          </button>
        </div>

        {error && (
          <p role="alert" className="bg-rose-50 p-3 rounded-lg text-rose-700 text-sm">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="bg-emerald-50 p-3 rounded-lg text-emerald-700 text-sm">
            {notice}
          </p>
        )}

        {activeTab === 'dossiers' ? (
          /* DOSSIERS TAB CONTENT */
          <>
            <div className="flex flex-wrap gap-3 items-center">
              <label className="text-sm font-semibold">
                Trạng thái hồ sơ
                <select
                  className="ml-2 border rounded-lg px-3 py-2 bg-white"
                  value={status}
                  onChange={(e) => {
                    const newStatus = e.target.value as DossierStatus | '';
                    setStatus(newStatus);
                    setPage(0);
                    setSelected(null);
                    setSearchParams(newStatus ? { status: newStatus } : {});
                  }}
                >
                  <option value="">Tất cả</option>
                  {(Object.keys(dossierStatusLabels) as DossierStatus[]).map((value) => (
                    <option key={value} value={value}>
                      {dossierStatusLabels[value]}
                    </option>
                  ))}
                </select>
              </label>
              <button onClick={() => setRevision((n) => n + 1)} className="text-sm text-emerald-700 underline">
                Tải lại hồ sơ
              </button>
              <span className="text-sm text-slate-500">{data?.totalElements ?? 0} hồ sơ</span>
            </div>

            <div className="grid lg:grid-cols-2 gap-5">
              <section className="space-y-3">
                {loading ? (
                  <p role="status">Đang tải hồ sơ...</p>
                ) : !error && !data?.items.length ? (
                  <p className="bg-white border rounded-xl p-6 text-sm text-slate-500">Chưa có hồ sơ phù hợp.</p>
                ) : (
                  data?.items.map((d) => (
                    <button
                      key={d.id}
                      data-testid="admin-dossier-card"
                      type="button"
                      disabled={busy}
                      onClick={async () => {
                        setError('');
                        setNotice('');
                        setReason('');
                        setConfirmed(false);
                        setBusy(true);
                        try {
                          setSelected(await adminDossier(d.id));
                        } catch (e) {
                          setError(e instanceof Error ? e.message : 'Không tải được hồ sơ.');
                        } finally {
                          setBusy(false);
                        }
                      }}
                      className={`text-left w-full bg-white border rounded-xl p-4 space-y-2 ${
                        selected?.id === d.id ? 'border-emerald-600 shadow-sm' : 'border-slate-200'
                      }`}
                    >
                      <strong className="block break-words">{d.propertyName}</strong>
                      <span className="block text-sm text-slate-500 break-words">{d.propertyAddress}</span>
                      <span className="text-xs">
                        {dossierStatusLabels[d.status]} · {d.applicantName}
                      </span>
                    </button>
                  ))
                )}
                {data && !loading && (
                  <Pagination
                    page={data.page}
                    totalPages={data.totalPages}
                    onChange={(value) => {
                      setPage(value);
                      setSelected(null);
                    }}
                  />
                )}
              </section>

              {selected && (
                <section
                  aria-label="Chi tiết hồ sơ kiểm duyệt"
                  className="bg-white border rounded-xl p-5 space-y-4 min-w-0"
                >
                  <h2 className="text-lg font-bold break-words">{selected.propertyName}</h2>
                  <DossierDetails dossier={selected} />
                  {selected.status === 'PENDING_APPROVAL' && (
                    <fieldset disabled={busy} className="space-y-4 disabled:opacity-60">
                      <label className="block text-sm font-semibold">
                        Ý kiến kiểm duyệt
                        <textarea
                          value={reason}
                          maxLength={2000}
                          rows={3}
                          onChange={(e) => setReason(e.target.value)}
                          className="w-full mt-1 border rounded-lg p-3 text-sm"
                        />
                      </label>
                      <label className="flex items-start gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={confirmed}
                          onChange={(e) => setConfirmed(e.target.checked)}
                          className="mt-1"
                        />
                        Đã đối chiếu người nộp, chủ tài khoản nhận tiền, quyền cho thuê và chứng từ của tài sản này.
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => void decide('APPROVE')}
                          disabled={!confirmed}
                          className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold text-sm disabled:opacity-50"
                        >
                          Phê duyệt tài sản
                        </button>
                        <button
                          onClick={() => void decide('REQUEST_ADDITIONAL_INFORMATION')}
                          className="bg-amber-100 text-amber-900 px-4 py-2 rounded-lg text-sm"
                        >
                          Yêu cầu bổ sung
                        </button>
                        <button
                          onClick={() => void decide('REJECT')}
                          className="bg-rose-100 text-rose-800 px-4 py-2 rounded-lg text-sm"
                        >
                          Từ chối hồ sơ
                        </button>
                      </div>
                    </fieldset>
                  )}
                </section>
              )}
            </div>
          </>
        ) : (
          /* APARTMENT PENDING EDITS TAB CONTENT */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">
                Danh sách căn hộ có thay đổi nhạy cảm (giá thuê, tiền cọc, chỉ số công tơ, diện tích) đang chờ duyệt.
              </p>
              <button
                type="button"
                onClick={loadPendingApartments}
                className="text-sm text-emerald-700 underline font-medium"
              >
                Làm mới danh sách
              </button>
            </div>

            {pendingAptLoading ? (
              <p role="status" className="p-6 bg-white border rounded-xl text-sm text-slate-500">
                Đang tải danh sách căn hộ chờ duyệt...
              </p>
            ) : pendingApartments.length === 0 ? (
              <div className="p-8 bg-white border rounded-2xl text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <h3 className="font-bold text-slate-800">Không có yêu cầu chỉnh sửa nào đang chờ</h3>
                <p className="text-xs text-slate-500">Mọi yêu cầu chỉnh sửa thông tin căn hộ đã được xử lý.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {pendingApartments.map((apt) => {
                  const draft = apt.pendingEdit;
                  const isBusy = aptActionBusy === apt.id;
                  return (
                    <div
                      key={apt.id}
                      className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4 hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-base">Căn hộ {apt.roomNumber}</span>
                            <span className="text-[11px] bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Chờ duyệt
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{apt.propertyName} • Tầng {apt.floor}</p>
                          <p className="text-xs text-slate-700 font-medium mt-1">{apt.title}</p>
                        </div>
                      </div>

                      {draft && (
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                          <span className="font-bold text-slate-700 block">So sánh dữ liệu thay đổi:</span>
                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            <div className="bg-white p-2 rounded-lg border">
                              <span className="text-slate-400 block">Giá thuê hiện tại</span>
                              <span className="font-semibold">{apt.price.toLocaleString('vi-VN')} đ</span>
                            </div>
                            <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                              <span className="text-emerald-700 block">Giá thuê đề xuất mới</span>
                              <span className="font-bold text-emerald-800">
                                {Number(draft.advertisedMonthlyRent).toLocaleString('vi-VN')} đ
                              </span>
                            </div>

                            <div className="bg-white p-2 rounded-lg border">
                              <span className="text-slate-400 block">Tiền cọc hiện tại</span>
                              <span className="font-semibold">
                                {apt.deposit ? `${apt.deposit.toLocaleString('vi-VN')} đ` : 'Không'}
                              </span>
                            </div>
                            <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                              <span className="text-emerald-700 block">Tiền cọc đề xuất mới</span>
                              <span className="font-bold text-emerald-800">
                                {draft.deposit ? `${Number(draft.deposit).toLocaleString('vi-VN')} đ` : 'Không'}
                              </span>
                            </div>

                            <div className="bg-white p-2 rounded-lg border">
                              <span className="text-slate-400 block">Diện tích hiện tại</span>
                              <span className="font-semibold">{apt.area} m²</span>
                            </div>
                            <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                              <span className="text-emerald-700 block">Diện tích đề xuất mới</span>
                              <span className="font-bold text-emerald-800">{draft.areaM2} m²</span>
                            </div>

                            <div className="bg-white p-2 rounded-lg border">
                              <span className="text-slate-400 block">Điện / Nước hiện tại</span>
                              <span className="font-semibold">{apt.electricityIndex} kWh / {apt.waterIndex} m³</span>
                            </div>
                            <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                              <span className="text-emerald-700 block">Điện / Nước đề xuất mới</span>
                              <span className="font-bold text-emerald-800">
                                {draft.electricityIndex ?? 'N/A'} kWh / {draft.waterIndex ?? 'N/A'} m³
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-400 block">
                            Gửi yêu cầu lúc: {new Date(draft.requestedAt).toLocaleString('vi-VN')}
                          </span>
                        </div>
                      )}

                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleApproveApartmentEdit(apt.id)}
                          className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-xs"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{isBusy ? 'Đang xử lý...' : 'Phê duyệt thay đổi'}</span>
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleRejectApartmentEdit(apt.id)}
                          className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
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
          </div>
        )}
      </div>
    </AdminLayout>
  );
}


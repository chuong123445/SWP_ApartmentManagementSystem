import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { CustomerLayout } from '@/layouts/CustomerLayout';
import { ContractDocument } from '@/components/contract/ContractDocument';
import { getContract } from '@/services/contract/contractService';
import type { ContractDraft } from '@/types/contract';
import { useAuth } from '@/hooks/useAuth';
import { ApiError } from '@/services/http/client';
import { myTenancies, ownerTenancies, billingMoney } from '@/services/billing/billingService';
import type { Tenancy } from '@/types/billing';
import { contractStatusLabel } from '@/utils/contractDisplay';
export function ContractDetailPage() {
  const { user } = useAuth();
  const { id } = useParams();const [draft, setDraft] = useState<ContractDraft | null>(null);const [error, setError] = useState('');
  const [legacy, setLegacy] = useState<Tenancy | null>(null);
  const owner = Boolean(user?.roles.includes('OWNER'));
  useEffect(() => {
    let active = true;setDraft(null);setLegacy(null);setError('');
    const load = async () => {
      try { const value = await getContract(id!);if (active) setDraft(value); }
      catch (error) {
        if (!(error instanceof ApiError) || error.status !== 404) throw error;
        const items = await (owner ? ownerTenancies() : myTenancies());
        let saved = items.find(item => item.id === id);
        if (!saved && owner) saved = (await myTenancies()).find(item => item.id === id);
        if (!saved) throw error;
        if (active) setLegacy(saved);
      }
    };
    void load().catch(error => { if (active) setError(error instanceof Error ? error.message : 'Không thể tải hợp đồng.'); });
    return () => { active = false; };
  }, [id, owner, user?.id]);
  return <CustomerLayout><main className="max-w-4xl mx-auto p-4 sm:p-6 py-8 space-y-5"><Link to={owner ? '/app' : '/my/contracts'} className="text-sm text-emerald-700">← {owner ? 'Về quản lý' : 'Hợp đồng của tôi'}</Link><h1 className="text-2xl font-bold">Chi tiết hợp đồng</h1>{error ? <p role="alert" className="text-rose-700">{error}</p> : draft ? <ContractDocument draft={draft} onUpdated={setDraft} /> : legacy ? <section aria-label="Hồ sơ quan hệ thuê cũ" className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
    <h2 className="text-xl font-bold">HD-{legacy.id} · {legacy.roomNumber}</h2>
    <p className="font-semibold text-amber-800">{contractStatusLabel(legacy.status, legacy.endDate)}</p>
    <dl className="grid sm:grid-cols-2 gap-4 text-sm">
      <div><dt className="text-slate-500">Tài sản / căn hộ</dt><dd>{legacy.propertyName} · {legacy.apartmentTitle}</dd></div>
      <div><dt className="text-slate-500">Khách thuê</dt><dd>{legacy.customerName}</dd></div>
      <div><dt className="text-slate-500">Thời hạn</dt><dd>{legacy.startDate} → {legacy.endDate}</dd></div>
      <div><dt className="text-slate-500">Tiền thuê / tháng</dt><dd>{billingMoney(legacy.monthlyRent)}</dd></div>
    </dl>
    <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">Hồ sơ cũ chỉ có thông tin quan hệ thuê. Hệ thống chưa lưu bản nội dung hợp đồng và chữ ký gốc để xem PDF; không thể ký lại hoặc xử lý ký tiếp, bàn giao từ hồ sơ này.</p>
  </section> : <p role="status">Đang tải hợp đồng...</p>}</main></CustomerLayout>;
}

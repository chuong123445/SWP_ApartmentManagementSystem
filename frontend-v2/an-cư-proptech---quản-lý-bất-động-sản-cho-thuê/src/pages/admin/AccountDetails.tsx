import { useEffect, useRef, useState } from 'react';
import { Pagination } from '@/components/common/Pagination';
import { billingMoney } from '@/services/billing/billingService';
import {
  adminAccountContracts, adminAccountPaidInvoices, adminAccountProfile,
  type AccountContract, type AccountProfile, type AdminHistoryPage, type PaidAccountInvoice,
} from '@/services/auth/adminAccountService';

const statuses: Record<string, string> = {
  ACTIVE: 'Đang hoạt động', PENDING_VERIFICATION: 'Chờ xác thực', LOCKED: 'Đã khóa',
  INACTIVE: 'Ngừng hoạt động', DRAFT: 'Bản nháp', ENDED: 'Đã kết thúc',
};
const roles: Record<string, string> = { OWNER: 'Chủ nhà', CUSTOMER: 'Khách thuê', ADMIN: 'Quản trị viên' };
const message = (error: unknown) => error instanceof Error ? error.message : 'Không thể tải thông tin.';
const present = (value?: string | null) => value?.trim() || 'Chưa cập nhật';

export function AccountDetails({ accountId, onClose }: { accountId: string; onClose: () => void }) {
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [contracts, setContracts] = useState<AdminHistoryPage<AccountContract> | null>(null);
  const [invoices, setInvoices] = useState<AdminHistoryPage<PaidAccountInvoice> | null>(null);
  const [profileError, setProfileError] = useState('');
  const [contractError, setContractError] = useState('');
  const [invoiceError, setInvoiceError] = useState('');
  const [contractPage, setContractPage] = useState(0);
  const [invoicePage, setInvoicePage] = useState(0);
  const [revision, setRevision] = useState(0);
  const close = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    close.current?.focus();
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [onClose]);

  useEffect(() => {
    const controller = new AbortController();
    setProfile(null); setProfileError('');
    adminAccountProfile(accountId, controller.signal).then(value => {
      if (!controller.signal.aborted) setProfile(value);
    }).catch(error => { if (!controller.signal.aborted) setProfileError(message(error)); });
    return () => controller.abort();
  }, [accountId, revision]);

  useEffect(() => {
    const controller = new AbortController();
    setContracts(null); setContractError('');
    adminAccountContracts(accountId, contractPage, controller.signal).then(value => {
      if (!controller.signal.aborted) setContracts(value);
    }).catch(error => { if (!controller.signal.aborted) setContractError(message(error)); });
    return () => controller.abort();
  }, [accountId, contractPage, revision]);

  useEffect(() => {
    const controller = new AbortController();
    setInvoices(null); setInvoiceError('');
    adminAccountPaidInvoices(accountId, invoicePage, controller.signal).then(value => {
      if (!controller.signal.aborted) setInvoices(value);
    }).catch(error => { if (!controller.signal.aborted) setInvoiceError(message(error)); });
    return () => controller.abort();
  }, [accountId, invoicePage, revision]);

  return <div className="fixed inset-0 z-50 bg-slate-900/50 p-3 sm:p-6 flex items-center justify-center">
    <section role="dialog" aria-modal="true" aria-labelledby="account-detail-title"
      className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-auto p-4 sm:p-6 space-y-6 min-w-0">
      <header className="flex items-start justify-between gap-3">
        <h2 id="account-detail-title" className="text-xl font-bold">Chi tiết tài khoản</h2>
        <div className="flex gap-2 shrink-0">
          <button className="border rounded-lg px-3 py-2 text-sm" onClick={() => setRevision(value => value + 1)}>Tải lại</button>
          <button ref={close} className="border rounded-lg px-3 py-2 text-sm" onClick={onClose}>Đóng</button>
        </div>
      </header>
      {profileError ? <p role="alert" className="text-rose-700">{profileError}</p> : profile ? <section aria-label="Thông tin tài khoản" className="space-y-3">
        <h3 className="font-bold break-words">{profile.account.fullName}</h3>
        <dl className="grid gap-3 sm:grid-cols-2">
          {[
            ['Email', profile.account.email], ['Vai trò', roles[profile.account.role]],
            ['Trạng thái', profile.account.deletedAt ? 'Đã xóa mềm' : statuses[profile.account.status]],
            ['Số điện thoại', present(profile.phone)], ['Địa chỉ liên hệ', present(profile.address)],
            ['Ngày sinh', profile.dateOfBirth ?? 'Chưa cập nhật'],
            ['Xác thực email', profile.emailVerified ? 'Đã xác thực' : 'Chưa xác thực'],
            ['Xác thực điện thoại', profile.phoneVerified ? 'Đã xác thực' : 'Chưa xác thực'],
          ].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-sm text-slate-500">{label}</dt><dd className="break-words">{value}</dd></div>)}
        </dl>
        {profile.bio && <p className="whitespace-pre-wrap break-words">{profile.bio}</p>}
      </section> : <p role="status">Đang tải thông tin tài khoản...</p>}
      <section aria-label="Hợp đồng của tài khoản" className="space-y-3 border-t pt-4">
        <h3 className="font-bold">Hợp đồng {contracts && `(${contracts.totalElements})`}</h3>
        {contractError ? <p role="alert" className="text-rose-700">{contractError}</p> : contracts ? <>
          {!contracts.items.length && <p>Chưa có hợp đồng.</p>}
          {contracts.items.map(contract => <article key={contract.id} className="border rounded-lg p-3 space-y-1 break-words">
            <h4 className="font-semibold">Hợp đồng #{contract.id} · {contract.roomNumber} · {contract.propertyName}</h4>
            <p>{contract.relationship === 'OWNER' ? 'Bên cho thuê' : 'Bên thuê'} · {statuses[contract.status] ?? contract.status}</p>
            <p>Chủ nhà: {contract.ownerName} · Người thuê: {contract.tenantName}</p>
            <p>Thời hạn: {contract.startDate} → {contract.endDate}</p>
            <p>Tiền thuê: {billingMoney(contract.monthlyRent)}/tháng</p>
          </article>)}
          <Pagination page={contracts.page} totalPages={contracts.totalPages} onChange={setContractPage} />
        </> : <p role="status">Đang tải hợp đồng...</p>}
      </section>
      <section aria-label="Hóa đơn đã thanh toán của tài khoản" className="space-y-3 border-t pt-4">
        <h3 className="font-bold">Hóa đơn đã thanh toán {invoices && `(${invoices.totalElements})`}</h3>
        {invoiceError ? <p role="alert" className="text-rose-700">{invoiceError}</p> : invoices ? <>
          {!invoices.items.length && <p>Chưa có hóa đơn đã thanh toán.</p>}
          {invoices.items.map(invoice => <article key={invoice.source + invoice.id} className="border rounded-lg p-3 space-y-1 break-words">
            <h4 className="font-semibold">{invoice.source === 'MONTHLY' ? 'Hóa đơn tháng' : 'Khoản thu bổ sung'} #{invoice.id} · {invoice.roomNumber}</h4>
            <p>Hợp đồng #{invoice.contractId}{invoice.period && ` · Kỳ ${invoice.period}`}</p>
            <p>Chủ nhà: {invoice.ownerName} · Người thuê: {invoice.tenantName}</p>
            <p className="font-semibold">{billingMoney(invoice.amount)}</p>
            <p>Đã thanh toán · {new Date(invoice.paidAt).toLocaleString('vi-VN')}</p>
          </article>)}
          <Pagination page={invoices.page} totalPages={invoices.totalPages} onChange={setInvoicePage} />
        </> : <p role="status">Đang tải hóa đơn đã thanh toán...</p>}
      </section>
    </section>
  </div>;
}

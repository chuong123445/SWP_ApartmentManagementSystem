import { useEffect, useState, type FormEvent } from 'react';
import { Pagination } from '@/components/common/Pagination';
import { Link } from 'react-router';
import {
  listAdminAccounts, manageAccount, type AccountAction, type AccountFilter, type ManagedAccount,
} from '@/services/auth/adminAccountService';

const filters: Record<AccountFilter, string> = {
  ALL: 'Tất cả tài khoản hiện có',
  ACTIVE: 'Đang hoạt động',
  PENDING_VERIFICATION: 'Chờ xác thực',
  LOCKED: 'Đã khóa',
  INACTIVE: 'Ngừng hoạt động',
  DELETED: 'Đã xóa mềm',
};
const roles = { OWNER: 'Chủ nhà', CUSTOMER: 'Khách thuê', ADMIN: 'Quản trị viên' };
const actions: Record<AccountAction, string> = { LOCK: 'Khóa tài khoản', UNLOCK: 'Mở khóa tài khoản', DELETE: 'Xóa tài khoản' };
const outcomes: Record<string, string> = {
  LOCKED: 'Đã khóa tài khoản và thu hồi các phiên đăng nhập.',
  UNLOCKED: 'Đã mở khóa tài khoản. Người dùng có thể đăng nhập lại.',
  SOFT_DELETED: 'Đã xóa mềm tài khoản và lưu lại lịch sử nghiệp vụ.',
  HARD_DELETED: 'Đã xóa cứng tài khoản trắng.',
};
const button = 'rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-50';

export function AccountsPage() {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<AccountFilter>('ALL');
  const [page, setPage] = useState(0);
  const [data, setData] = useState<Awaited<ReturnType<typeof listAdminAccounts>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [selected, setSelected] = useState<{ account: ManagedAccount; action: AccountAction } | null>(null);
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    listAdminAccounts(query, filter, page, controller.signal).then(result => {
      if (!controller.signal.aborted) setData(result);
    }).catch(error => {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Không thể tải tài khoản.');
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [query, filter, page, revision]);

  function choose(account: ManagedAccount, action: AccountAction) {
    setSelected({ account, action });
    setReason('');
    setActionError('');
    setConfirmed(false);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!selected || busy || !reason.trim() || (selected.action === 'DELETE' && !confirmed)) return;
    setBusy(true);
    setActionError('');
    setNotice('');
    try {
      const result = await manageAccount(selected.account, selected.action, reason.trim());
      setNotice(outcomes[result.outcome] ?? 'Đã cập nhật tài khoản.');
      setSelected(null);
      setRevision(value => value + 1);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Không thể cập nhật tài khoản.');
    } finally {
      setBusy(false);
    }
  }

  return <section aria-label="Quản lý tài khoản người dùng" className="space-y-5">
    <h1 className="app-page-title">Tài khoản người dùng</h1>
    <form className="flex flex-wrap gap-3 items-end" onSubmit={event => {
      event.preventDefault(); setQuery(search.trim()); setPage(0);
    }}>
      <label className="flex-1 min-w-0">Tìm tên hoặc email<input value={search} maxLength={120}
        onChange={event => setSearch(event.target.value)} className="block w-full border rounded-lg p-2 mt-1" /></label>
      <button className={button}>Tìm kiếm</button>
      <label>Trạng thái<select aria-label="Trạng thái tài khoản" value={filter} className="block border rounded-lg p-2 mt-1 max-w-full"
        onChange={event => { setFilter(event.target.value as AccountFilter); setPage(0); }}>
        {Object.entries(filters).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>
      <button type="button" className={button} onClick={() => setRevision(value => value + 1)}>Tải lại</button>
    </form>
    {notice && <p role="status" className="rounded-lg bg-emerald-50 text-emerald-800 p-3">{notice}</p>}
    {error && <p role="alert" className="text-rose-700">{error}</p>}
    {loading ? <p role="status">Đang tải tài khoản...</p> : !error && <>
      <p className="text-sm text-slate-600">{data?.totalElements ?? 0} tài khoản</p>
      <div className="space-y-3">
        {data?.items.map(account => <article key={account.id} aria-label={'Tài khoản ' + account.email}
          className="rounded-xl border bg-white p-4 flex flex-wrap items-center gap-3 min-w-0">
          <Link to={'/admin/accounts/' + encodeURIComponent(account.id)} aria-label={'Xem tài khoản ' + account.email}
            className="flex-1 min-w-0 text-left space-y-1 rounded-lg focus-visible:outline-brand-600">
          <h2 className="font-semibold break-words text-emerald-800">{account.fullName}</h2>
          <p className="break-all">{account.email}</p>
          <p className="text-sm text-slate-600">#{account.id} · {account.roles.map(role => roles[role]).join(' · ')} · {account.deletedAt ? filters.DELETED : filters[account.status]}</p>
          </Link>
          {account.canManage && <div className="flex flex-wrap gap-2">
            {(account.status === 'ACTIVE' || account.status === 'PENDING_VERIFICATION') &&
              <button className={button} disabled={busy} onClick={() => choose(account, 'LOCK')}>Khóa</button>}
            {account.canUnlock && <button className={button} disabled={busy} onClick={() => choose(account, 'UNLOCK')}>Mở khóa</button>}
            <button className={button + ' text-rose-700'} disabled={busy} onClick={() => choose(account, 'DELETE')}>Xóa</button>
          </div>}
        </article>)}
      </div>
      {!data?.items.length && <p>Chưa có tài khoản phù hợp.</p>}
      {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />}
    </>}
    {selected && <div className="fixed inset-0 z-50 bg-slate-900/50 p-4 flex items-center justify-center">
      <section role="dialog" aria-modal="true" aria-labelledby="account-action-title"
        className="rounded-xl bg-white p-5 w-full max-w-lg max-h-[90vh] overflow-auto space-y-4">
        <h2 id="account-action-title" className="text-xl font-bold">{actions[selected.action]}</h2>
        <p className="break-words">{selected.account.fullName}</p><p className="break-all">{selected.account.email}</p>
        {selected.action === 'DELETE' && <p className="text-sm text-slate-600">
          Tài khoản có dữ liệu nghiệp vụ sẽ được xóa mềm để giữ lịch sử. Tài khoản trắng sẽ được xóa cứng.
        </p>}
        <form onSubmit={event => void submit(event)} className="space-y-4">
          <label className="block">Lý do<textarea required autoFocus maxLength={500} value={reason}
            disabled={busy} onChange={event => setReason(event.target.value)} className="block w-full border rounded-lg p-3 mt-1" /></label>
          {selected.action === 'DELETE' && <label className="flex gap-2 items-start">
            <input type="checkbox" checked={confirmed} disabled={busy} onChange={event => setConfirmed(event.target.checked)} />
            Tôi xác nhận xóa tài khoản đã chọn.
          </label>}
          {actionError && <p role="alert" className="text-rose-700">{actionError}</p>}
          <div className="flex flex-wrap gap-2">
            <button disabled={busy || !reason.trim() || (selected.action === 'DELETE' && !confirmed)}
              className={button + ' bg-brand-700 text-white'}>{busy ? 'Đang xử lý...' : 'Xác nhận'}</button>
            <button type="button" disabled={busy} className={button} onClick={() => setSelected(null)}>Hủy</button>
          </div>
        </form>
      </section>
    </div>}
  </section>;
}

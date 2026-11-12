import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { AccountLayout } from '@/layouts/AccountLayout';
import { PrivatePaymentQr } from '@/components/billing/PrivatePaymentQr';
import { Pagination } from '@/components/common/Pagination';
import { billingMoney } from '@/services/billing/billingService';
import type { SepayConfig } from '@/services/payment/sepayService';
import {
  decideWithdrawal, getSettlementConnection, getWallet, getWithdrawals, requestWithdrawal,
  type SettlementWallet, type Withdrawal, type WithdrawalAction, type WithdrawalStatus,
} from '@/services/payment/settlementService';

const labels: Record<WithdrawalStatus, string> = {
  PENDING: 'Chờ xử lý',
  PROCESSING: 'Đang chuyển',
  PAID: 'Đã chuyển',
  REJECTED: 'Đã từ chối',
  CANCELLED: 'Đã hủy',
};

const entryLabels: Record<SettlementWallet['entries'][number]['kind'], string> = {
  INVOICE: 'Thu hóa đơn',
  ADDITIONAL_RECEIPT: 'Thu khoản bổ sung',
  RESERVE: 'Giữ tiền cho yêu cầu rút',
  RELEASE: 'Trả lại số dư có thể rút',
  PAYOUT: 'Chi trả đã ghi nhận',
};

const field = 'block w-full border rounded-lg px-3 py-2 mt-1 bg-white';
const button = 'border rounded-lg px-3 py-2 disabled:opacity-50';
const primary = `${button} bg-brand-700 text-white`;
const card = 'bg-white rounded-xl border p-4 space-y-3 min-w-0';

export function SettlementPage() {
  return <AccountLayout><SettlementPanel /></AccountLayout>;
}

export function SettlementPanel({ admin = false }: { admin?: boolean }) {
  const [wallet, setWallet] = useState<SettlementWallet | null>(null);
  const [connection, setConnection] = useState<SepayConfig | null>(null);
  const [data, setData] = useState<Awaited<ReturnType<typeof getWithdrawals>> | null>(null);
  const [filter, setFilter] = useState<WithdrawalStatus | ''>(admin ? 'PENDING' : '');
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState('');
  const [amount, setAmount] = useState('');
  const [selected, setSelected] = useState<Withdrawal | null>(null);
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const requestKey = useRef<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError('');
    const summary = admin
      ? getSettlementConnection(controller.signal).then(value => { if (!controller.signal.aborted) setConnection(value); })
      : getWallet(controller.signal).then(value => { if (!controller.signal.aborted) setWallet(value); });
    const list = getWithdrawals(admin, page, filter, controller.signal).then(value => {
      if (!controller.signal.aborted) setData(value);
    });
    void Promise.allSettled([summary, list]).then(results => {
      if (controller.signal.aborted) return;
      const failure = results.find(result => result.status === 'rejected');
      if (failure) setLoadError(failure.reason instanceof Error ? failure.reason.message : 'Không thể tải dữ liệu quyết toán.');
      setLoading(false);
    });
    return () => controller.abort();
  }, [admin, page, filter, revision]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || !wallet?.destination || wallet.available === '0') return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      requestKey.current ??= crypto.randomUUID();
      await requestWithdrawal({ amount, qrId: wallet.destination.qrId, requestKey: requestKey.current });
      requestKey.current = null;
      setAmount('');
      setPage(0);
      setNotice('Đã gửi yêu cầu rút tiền. Số tiền yêu cầu đang được giữ để xử lý.');
      setRevision(value => value + 1);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Không thể gửi yêu cầu.');
      setRevision(value => value + 1);
    } finally {
      setBusy(false);
    }
  }

  function select(item: Withdrawal | null) {
    setSelected(item);
    setReference('');
    setNote('');
    setConfirmed(false);
  }

  async function decide(item: Withdrawal, action: WithdrawalAction) {
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const updated = await decideWithdrawal(admin, item, action, reference, note);
      select(updated);
      setNotice(`Yêu cầu #${updated.id} · ${labels[updated.status]}.`);
      setRevision(value => value + 1);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Không thể cập nhật yêu cầu.');
      select(null);
      setRevision(value => value + 1);
    } finally {
      setBusy(false);
    }
  }

  return <div className="space-y-5">
      {!admin && <Link className="underline text-emerald-800" to="/app?tab=invoices">Hóa đơn & thu</Link>}
      <h1 className="app-page-title">{admin ? 'Xử lý yêu cầu rút tiền' : 'Số dư và rút tiền'}</h1>
      {admin && connection && <section className={card} aria-label="Kết nối SePay dùng chung">
        <h2 className="font-semibold">Kết nối SePay dùng chung</h2>
        <p>{connection.configured && connection.enabled && connection.webhookUrl ? 'Đã cấu hình' : 'Chưa sẵn sàng nhận thanh toán'}</p>
        {connection.configured && <p className="break-words">{connection.bank} · {connection.virtualAccount ?? connection.accountNumber} · {connection.accountHolderName}</p>}
        {connection.lastWebhookAt && <p>Webhook gần nhất: {new Date(connection.lastWebhookAt).toLocaleString('vi-VN')}</p>}
      </section>}
      {!admin && wallet && <>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {([['Có thể rút', wallet.available], ['Đang xử lý', wallet.reserved], ['Đã chi trả', wallet.paid], ['Tổng tiền đã thu', wallet.received]] as const).map(([label, value]) =>
            <div className={card} key={label}><p>{label}</p><p className="font-bold text-lg break-words">{billingMoney(value)}</p></div>)}
        </div>
        <form className={card} onSubmit={event => void submit(event)}>
          <h2 className="font-semibold">Gửi yêu cầu rút tiền</h2>
          {wallet.destination ? <>
            <div aria-label="Tài khoản nhận tiền" className="space-y-1 break-words">
              <p className="text-sm text-slate-600">Tiền sẽ được chuyển vào tài khoản nhận tiền chung đã xác nhận.</p>
              <p>{wallet.destination.bank} · {wallet.destination.accountNumber} · {wallet.destination.accountHolder}</p>
            </div>
            <fieldset disabled={busy} className="space-y-3 min-w-0">
              <label>Số tiền (đồng)<input className={field} required inputMode="numeric" pattern="[1-9][0-9]{0,14}" value={amount} onChange={event => {
                requestKey.current = null;
                setAmount(event.target.value);
              }} /></label>
              <button className={primary} disabled={wallet.available === '0'}>{busy ? 'Đang gửi...' : 'Gửi yêu cầu rút'}</button>
            </fieldset>
          </> : <>
            <p>Hãy tải và xác nhận QR nhận tiền chung trong Cài đặt đơn giá trước khi gửi yêu cầu rút.</p>
            <Link to="/app?tab=settings" className="inline-block underline text-emerald-800">Mở Cài đặt đơn giá</Link>
          </>}
          {wallet.available === '0' && <p className="text-sm text-slate-600">Chưa có số dư có thể rút.</p>}
        </form>
      </>}
      {error && <p role="alert" className="text-rose-700">{error}</p>}
      {loadError && <p role="alert" className="text-rose-700">{loadError}</p>}
      {notice && <p role="status" className="text-emerald-800">{notice}</p>}
      <section className={card} aria-label="Danh sách yêu cầu rút tiền">
        <div className="flex flex-wrap gap-3 justify-between items-start">
          <h2 className="font-semibold">Yêu cầu rút tiền</h2>
          <button type="button" className={button} disabled={busy} onClick={() => { select(null); setRevision(value => value + 1); }}>Tải lại</button>
        </div>
        {admin && <label>Trạng thái<select className={field} value={filter} onChange={event => {
          setFilter(event.target.value as WithdrawalStatus | ''); setPage(0); select(null);
        }}>
          <option value="">Tất cả</option>
          {Object.entries(labels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
        </select></label>}
        {loading ? <p role="status">Đang tải yêu cầu...</p> : data?.items.length ? data.items.map(item =>
          <button type="button" key={item.id} disabled={busy} onClick={() => select(item)} className="w-full text-left rounded-lg border p-3 break-words">
            #{item.id} · {labels[item.status]} · {billingMoney(item.amount)}{admin && ` · Chủ nhà #${item.ownerId}`}
          </button>) : !loadError && <p>Chưa có yêu cầu rút tiền.</p>}
        {!loading && data && <Pagination page={data.page} totalPages={data.totalPages} onChange={value => { setPage(value); select(null); }} />}
      </section>
      {selected && <section className={card} aria-label="Chi tiết yêu cầu rút tiền">
        <h2 className="font-semibold">Yêu cầu #{selected.id} · {labels[selected.status]}</h2>
        <p>Số tiền: {billingMoney(selected.amount)}</p>
        <p className="break-words">{selected.bank} · {selected.accountNumber} · {selected.accountHolder}</p>
        <p>Ngày gửi: {new Date(selected.createdAt).toLocaleString('vi-VN')}</p>
        {selected.transferReference && <p className="break-all">Mã giao dịch: {selected.transferReference}</p>}
        {selected.note && <p className="break-words">Ghi chú: {selected.note}</p>}
        {!admin && selected.status === 'PENDING' && <button className={button} disabled={busy} onClick={() => void decide(selected, 'CANCEL')}>Hủy yêu cầu</button>}
        {admin && (selected.status === 'PENDING' || selected.canComplete) && <fieldset disabled={busy} className="space-y-3 min-w-0">
          {selected.status === 'PENDING' && <button className={primary} onClick={() => void decide(selected, 'START')}>Nhận xử lý</button>}
          {selected.canComplete && <>
            <div className="space-y-2">
              <p>Quét QR hoặc nhập thông tin ở trên trong ứng dụng ngân hàng. Đối chiếu người nhận và số tiền trước khi chuyển.</p>
              <PrivatePaymentQr key={selected.id} path={`/api/v1/admin/settlements/withdrawals/${encodeURIComponent(selected.id)}/qr`}
                alt="QR chuyển khoản cho chủ nhà" />
            </div>
            <label className="block">Mã giao dịch ngân hàng<input className={field} maxLength={100} value={reference} onChange={event => setReference(event.target.value)} /></label>
            <label className="flex items-start gap-2"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} /> Tôi đã chuyển khoản thành công theo thông tin trên.</label>
            <button className={primary} disabled={!confirmed || !reference.trim()} onClick={() => void decide(selected, 'PAID')}>Ghi nhận đã chuyển</button>
          </>}
          <label className="block border-t border-slate-200 pt-3">Lý do từ chối<textarea className={field} maxLength={300} value={note} onChange={event => setNote(event.target.value)} /></label>
          <button className={button} disabled={!note.trim() || confirmed} onClick={() => void decide(selected, 'REJECT')}>
            {selected.canComplete ? 'Xác nhận chưa chuyển và từ chối' : 'Từ chối yêu cầu'}
          </button>
        </fieldset>}
      </section>}
      {!admin && wallet && <section className={card} aria-label="Sổ giao dịch">
        <h2 className="font-semibold">Giao dịch gần đây</h2>
        {!wallet.entries.length && <p>Chưa có giao dịch.</p>}
        <ul className="space-y-2">{wallet.entries.map(entry => <li className="flex flex-wrap gap-x-3 justify-between" key={entry.id}>
          <span>{entryLabels[entry.kind]} · {new Date(entry.createdAt).toLocaleString('vi-VN')}</span>
          <strong className="break-all">{billingMoney(entry.amount)}</strong>
        </li>)}</ul>
      </section>}
  </div>;
}

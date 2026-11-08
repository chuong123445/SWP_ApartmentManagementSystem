import { useRef, useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/hooks/useAuth';
import { ContractWizard } from '@/components/contract/ContractWizard';
import { cancelHandover, cancelRenewal, confirmHandover, getContract, proposeHandover, requestRenewal, decideRenewalRequest, cancelAcceptedRenewalRequest } from '@/services/contract/contractService';
import { billingMoney } from '@/services/billing/billingService';
import type { ContractDraft } from '@/types/contract';
import { contractLifecycleActions } from '@/utils/contractDisplay';

const button = 'rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-50';
const primary = `${button} bg-emerald-700 border-emerald-700 text-white`;
const input = 'mt-2 block w-full border border-slate-300 bg-white rounded-lg p-3 text-sm';

export function ContractLifecyclePanel({ draft, onUpdated, initialAction }: { draft: ContractDraft; onUpdated: (draft: ContractDraft) => void; initialAction?: 'renewal' | 'handover' }) {
  const { user } = useAuth();const life = draft.lifecycle;
  const { owner, customer, canRequest, canCreate, canHandover } = contractLifecycleActions(draft, user?.id);
  const [renewing, setRenewing] = useState(false);const [formOpen, setFormOpen] = useState(initialAction === 'handover');
  const [returnDate, setReturnDate] = useState(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date()));
  const [electricity, setElectricity] = useState('');const [water, setWater] = useState('');const [notes, setNotes] = useState('');
  const [electricityStart, setElectricityStart] = useState('');const [waterStart, setWaterStart] = useState('');
  const [deduction, setDeduction] = useState('0');const [keys, setKeys] = useState(false);const [consent, setConsent] = useState(false);
  const [confirmConsent, setConfirmConsent] = useState(false);const [error, setError] = useState('');const [busy, setBusy] = useState(false);
  const operating = useRef(false);
  const [requestMessage, setRequestMessage] = useState('');const [requestConsent, setRequestConsent] = useState(false);const [decisionReason, setDecisionReason] = useState('');
  if (!life) return null;
  const pending = life.handover?.status === 'PENDING';
  const activeExpired = draft.status === 'ACTIVE' && life.expired;
  const renewal = life.renewalRequest;
  const perform = async (operation: () => Promise<ContractDraft>) => {
    if (operating.current) return;operating.current = true;setBusy(true);setError('');
    try { onUpdated(await operation());setFormOpen(false);setConsent(false);setConfirmConsent(false);window.dispatchEvent(new Event('ancu:tenancy-changed')); }
    catch (err) { setError(err instanceof Error ? err.message : 'Không thể cập nhật hợp đồng.'); }
    finally { operating.current = false;setBusy(false); }
  };
  return <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4" aria-label="Ký tiếp hoặc bàn giao">
    <h3 className="text-lg font-bold">{activeExpired ? 'Hợp đồng đã hết hạn — chọn hướng xử lý' : 'Vòng đời hợp đồng'}</h3>
    {life.previousContractId && <p className="text-sm text-slate-600">Đây là bản ký tiếp của <Link className="underline text-emerald-700" to={`/contracts/${life.previousContractId}`}>HD-{life.previousContractId}</Link>. Cần chữ ký mới của cả hai bên.</p>}
    {draft.status === 'ACTIVE' && !life.expired && <p className="text-sm text-slate-600">Thời hạn đến {draft.endDate}. Yêu cầu thuê tiếp mở trong 10 ngày cuối{life.renewalRequestOpensOn && `, từ ngày ${life.renewalRequestOpensOn}`}. Hệ thống nhắc trong ứng dụng trước hạn 20 và 10 ngày; hợp đồng không tự gia hạn.</p>}
    {draft.status === 'ENDED' && <p className="text-sm bg-slate-50 p-3 rounded-lg">{life.endReason === 'RENEWED' ? 'Đã kết thúc để chuyển sang hợp đồng ký tiếp.' : life.endReason === 'HANDOVER' ? 'Hai bên đã xác nhận bàn giao; phòng đã được trả và quan hệ thuê kết thúc.' : life.endReason === 'RENEWAL_CANCELLED' ? 'Bản ký tiếp này đã hủy. Hợp đồng cũ không bị thay đổi.' : 'Hợp đồng đã kết thúc.'} PDF, chữ ký và hóa đơn cũ vẫn được lưu.</p>}
    {life.renewalContractId && <p className="text-sm bg-emerald-50 p-3 rounded-lg">Có bản ký tiếp <Link className="font-semibold underline text-emerald-800" to={`/contracts/${life.renewalContractId}`}>HD-{life.renewalContractId} — mở để xem và ký</Link>. Hợp đồng cũ giữ đến hết kỳ; bản mới cần đủ hai chữ ký và đến ngày bắt đầu mới chuyển kỳ.</p>}
    {draft.status === 'DRAFT' && draft.signing?.state === 'SIGNED' && life.previousContractId && <p className="text-sm bg-emerald-50 p-3 rounded-lg">Hai bên đã ký. Bản này chờ đến ngày {draft.startDate} để chuyển kỳ; nếu còn hóa đơn nháp hoặc điều kiện thuê chưa hợp lệ, chủ nhà cần xử lý trước. Không ký lại hoặc sửa nội dung đã ký.</p>}
    {renewal && <section aria-label="Yêu cầu thuê tiếp" className="border border-amber-200 rounded-xl p-4 space-y-3">
      <h4 className="font-bold">Yêu cầu thuê tiếp · {{ PENDING: 'Chờ chủ nhà xử lý', ACCEPTED: 'Đã chấp nhận', REJECTED: 'Đã từ chối', FULFILLED: 'Đã ký hợp đồng kỳ mới', CANCELLED: 'Đã hủy ký tiếp' }[renewal.status]}</h4>
      {renewal.message && <p className="text-sm whitespace-pre-wrap break-words">{renewal.message}</p>}
      {renewal.decisionReason && <p className="text-sm whitespace-pre-wrap break-words">Phản hồi của chủ nhà: {renewal.decisionReason}</p>}
      {owner && renewal.status === 'PENDING' && <div className="space-y-3"><label className="block text-sm">Phản hồi (bắt buộc khi từ chối)<textarea className={input} maxLength={1000} value={decisionReason} onChange={e => setDecisionReason(e.target.value)} disabled={busy} /></label>
        <div className="flex flex-wrap gap-3"><button type="button" className={primary} disabled={busy} onClick={() => void perform(() => decideRenewalRequest(draft.id, renewal.version, 'ACCEPT', decisionReason))}>Chấp nhận thuê tiếp</button>
        <button type="button" className={button} disabled={busy || !decisionReason.trim()} onClick={() => void perform(() => decideRenewalRequest(draft.id, renewal.version, 'REJECT', decisionReason))}>Từ chối thuê tiếp</button></div></div>}
      {canCreate && <button type="button" className={`${button} text-rose-700`} disabled={busy} onClick={() => { if (window.confirm('Hủy chấp nhận thuê tiếp? Lịch sử được giữ; đến hạn có thể lập bàn giao.')) void perform(() => cancelAcceptedRenewalRequest(draft.id, renewal.version)); }}>Hủy chấp nhận thuê tiếp</button>}
    </section>}
    {canRequest && <form aria-label="Gửi yêu cầu thuê tiếp" className="space-y-3" onSubmit={e => { e.preventDefault();if (requestConsent) void perform(() => requestRenewal(draft.id, life.version, requestMessage)); }}>
      <label className="block text-sm">Lời nhắn thuê tiếp (không bắt buộc)<textarea className={input} value={requestMessage} onChange={e => setRequestMessage(e.target.value)} maxLength={1000} disabled={busy} /></label>
      <label className="flex gap-2 text-sm"><input type="checkbox" checked={requestConsent} onChange={e => setRequestConsent(e.target.checked)} disabled={busy} />Tôi muốn thuê tiếp và gửi yêu cầu cho chủ nhà xem xét. Đây chưa phải ký hợp đồng mới.</label>
      <button type="submit" className={primary} disabled={busy || !requestConsent}>Gửi yêu cầu thuê tiếp</button>
      <p className="text-xs text-slate-500">Không có nhu cầu thuê tiếp thì không cần gửi. Đến hạn, chủ nhà lập biên bản để bạn kiểm tra và xác nhận bàn giao.</p>
    </form>}
    {(canCreate || canHandover) && <div className="flex flex-wrap gap-3">
      {canCreate && <button type="button" className={primary} disabled={busy} onClick={() => setRenewing(true)}>Tạo hợp đồng ký tiếp</button>}
      {canHandover && initialAction !== 'handover' && <button type="button" className={button} disabled={busy} onClick={() => { setFormOpen(value => !value);setError(''); }}>Lập biên bản bàn giao</button>}
    </div>}
    {owner && draft.status === 'DRAFT' && draft.signing?.state !== 'SIGNED' && life.previousContractId && <button type="button" className={`${button} text-rose-700`} disabled={busy} onClick={() => {
      if (window.confirm('Hủy bản ký tiếp chưa đủ hai chữ ký? Bản cũ và mọi chữ ký đã lưu vẫn được giữ trong lịch sử.')) void perform(() => cancelRenewal(draft.id, life.version));
    }}>Hủy bản ký tiếp</button>}
    {formOpen && canHandover && <form aria-label="Thông tin bàn giao" className="space-y-4 rounded-xl border border-amber-200 bg-amber-50/30 p-4" onSubmit={event => {
      event.preventDefault();if (!keys || !consent) return;
      void perform(() => proposeHandover(draft.id, { version: life.version, returnDate, electricityReading: electricity, waterReading: water,
        electricityStartReading: electricityStart || undefined, waterStartReading: waterStart || undefined,
        keysReturned: keys, conditionNotes: notes, deductionAmount: deduction, consent }));
    }}>
      <p className="text-sm text-slate-600">Nhập số đo thực tế và tình trạng trả phòng. Phòng chỉ trở về trống khi khách thuê xác nhận. Chưa ghi nhận bất kỳ giao dịch hoàn cọc nào.</p>
      <fieldset disabled={busy} className="grid sm:grid-cols-2 gap-4">
        <label className="text-sm">Ngày bàn giao<input className={input} required type="date" min={draft.endDate} value={returnDate} onChange={e => setReturnDate(e.target.value)} /></label>
        <label className="text-sm">Khấu trừ khác theo thỏa thuận (đ)<input className={input} required type="number" min="0" step="0.01" value={deduction} onChange={e => setDeduction(e.target.value)} /></label>
        <label className="text-sm">Chỉ số điện bàn giao<input className={input} required type="number" min="0" max="2147483647" step="1" value={electricity} onChange={e => setElectricity(e.target.value)} /></label>
        <label className="text-sm">Chỉ số nước bàn giao<input className={input} required type="number" min="0" max="2147483647" step="1" value={water} onChange={e => setWater(e.target.value)} /></label>
        <label className="text-sm">Chỉ số điện đầu đã đối chiếu (nếu chưa có)<input className={input} type="number" min="0" max="2147483647" step="1" value={electricityStart} onChange={e => setElectricityStart(e.target.value)} /></label>
        <label className="text-sm">Chỉ số nước đầu đã đối chiếu (nếu chưa có)<input className={input} type="number" min="0" max="2147483647" step="1" value={waterStart} onChange={e => setWaterStart(e.target.value)} /></label>
        <label className="text-sm sm:col-span-2">Tình trạng phòng, tài sản và ghi chú đối soát<textarea className={input} required rows={4} maxLength={3000} value={notes} onChange={e => setNotes(e.target.value)} /></label>
      </fieldset>
      <label className="flex gap-2 text-sm"><input type="checkbox" required disabled={busy} checked={keys} onChange={e => setKeys(e.target.checked)} />Đã kiểm tra và nhận đủ chìa khóa, tài sản theo thỏa thuận.</label>
      <label className="flex gap-2 text-sm"><input type="checkbox" required disabled={busy} checked={consent} onChange={e => setConsent(e.target.checked)} />Tôi đã rà soát thông tin và gửi khách thuê xác nhận bàn giao.</label>
      <button type="submit" disabled={busy || !keys || !consent} className={primary}>{busy ? 'Đang lưu...' : 'Gửi bàn giao cho khách xác nhận'}</button>
    </form>}
    {life.handover && life.handover.status !== 'CANCELLED' && <section className="border border-slate-200 rounded-xl p-4 space-y-4" aria-label="Biên bản bàn giao">
      <h4 className="font-bold">Bàn giao · {pending ? 'Chờ khách thuê xác nhận' : 'Đã xác nhận'}</h4>
      <dl className="grid sm:grid-cols-2 gap-3 text-sm">{([
        ['Ngày trả phòng', life.handover.returnDate], ['Chìa khóa / tài sản', life.handover.keysReturned ? 'Đã kiểm tra nhận đủ' : 'Chưa xác nhận'],
        ['Chỉ số điện bàn giao', life.handover.electricityReading], ['Chỉ số nước bàn giao', life.handover.waterReading],
        ['Điện đầu đối soát', life.handover.electricityStartReading ?? 'Chưa có'], ['Nước đầu đối soát', life.handover.waterStartReading ?? 'Chưa có'],
        ['Cọc theo hợp đồng', billingMoney(life.handover.depositAmount)], ['Điện/nước chưa đưa vào hóa đơn đã gửi', billingMoney(life.handover.utilityAmount)],
        ['Khấu trừ khác', billingMoney(life.handover.deductionAmount)], ['Số cọc dự kiến hoàn', billingMoney(life.handover.refundAmount)],
        ['Số tiền cần bù thêm', billingMoney(life.handover.extraAmountDue)],
      ] as const).map(([label, value]) => <div key={label}><dt className="text-slate-500 text-xs">{label}</dt><dd className="font-medium mt-1">{value}</dd></div>)}</dl>
      <p className="whitespace-pre-wrap text-sm bg-slate-50 p-3 rounded-lg">{life.handover.conditionNotes}</p>
      <p className="text-xs text-amber-800">Đây là số liệu đối soát, không xác nhận đã thu/hoàn cọc hoặc thanh toán hóa đơn. Hóa đơn cũ vẫn giữ nguyên và cần xử lý riêng.</p>
      {pending && owner && <button type="button" className={`${button} text-rose-700`} disabled={busy} onClick={() => {
        if (window.confirm('Hủy đề nghị bàn giao này để lập lại hoặc ký tiếp? Lịch sử biên bản vẫn được giữ.')) void perform(() => cancelHandover(draft.id, life.handover!.version));
      }}>Hủy đề nghị bàn giao</button>}
      {pending && customer && <div className="space-y-3"><label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={confirmConsent} disabled={busy} onChange={e => setConfirmConsent(e.target.checked)} />Tôi đã kiểm tra chỉ số, tài sản, số liệu đối soát và đồng ý xác nhận trả phòng, kết thúc quan hệ thuê.</label>
        <button type="button" disabled={busy || !confirmConsent} className={primary} onClick={() => void perform(() => confirmHandover(draft.id, life.handover!.version))}>Xác nhận bàn giao và trả phòng</button></div>}
    </section>}
    {error && <p role="alert" className="text-sm text-rose-700 bg-rose-50 p-3 rounded-lg">{error}</p>}
    {renewing && <ContractWizard renewalOf={draft} onClose={() => { setRenewing(false);void getContract(draft.id).then(onUpdated).catch(() => {}); }}
      onSaved={() => { void getContract(draft.id).then(onUpdated).catch(() => {});window.dispatchEvent(new Event('ancu:tenancy-changed')); }} />}
  </section>;
}

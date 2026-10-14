import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Check, FileText, Plus, Trash2, X } from 'lucide-react';
import { AssetReview, ContractReview, PartyReview, ReceivingAccountReview } from '@/components/contract/ContractReview';
import { getContractContext, saveContract } from '@/services/contract/contractService';
import { ApiError } from '@/services/http/client';
import { validateContractTerms } from '@/utils/contract';
import type { ContractContext, ContractDraft, ContractTerms } from '@/types/contract';

const steps = ['Chọn mẫu', 'Bên cho thuê', 'Bên thuê', 'Tài sản & điều kiện thuê', 'Điều khoản', 'Xem lại'];
const button = 'rounded-lg px-4 py-2 text-sm font-semibold border border-slate-300 disabled:opacity-50';
const primary = `${button} bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700`;
const input = 'w-full rounded-lg border border-slate-300 p-3 text-sm bg-white focus:outline-emerald-600';

export function ContractWizard({ requestId, onClose, onSaved }: { requestId: string; onClose: () => void; onSaved: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const scrollArea = useRef<HTMLDivElement>(null);
  const [context, setContext] = useState<ContractContext | null>(null);
  const [terms, setTerms] = useState<ContractTerms | null>(null);
  const [existing, setExisting] = useState<ContractDraft | null>(null);
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => { dialog.current?.showModal();return () => { dialog.current?.close(); }; }, []);
  useEffect(() => {
    let active = true;setContext(null);setError('');setConflict(false);setSavedNotice(false);
    getContractContext(requestId).then(c => {
      if (!active) return;
      setContext(c);setExisting(c.existingDraft);setDirty(false);
      setTerms(c.existingDraft ? extractTerms(c.existingDraft) : {
        startDate: '', endDate: '', monthlyRent: c.advertisedMonthlyRent, deposit: c.suggestedDeposit ?? '', electricityUnitPrice: '', waterUnitPrice: '',
        paymentDay: 5, paymentMethod: 'Chuyển khoản', usagePurpose: 'Để ở', clauses: c.templateClauses.map(clause => ({ ...clause })),
      });setStep(c.existingDraft ? 5 : 0);
    }).catch(e => { if (active) setError(e instanceof Error ? e.message : 'Không thể tải thông tin hợp đồng.'); });
    return () => { active = false; };
  }, [requestId, reloadKey]);
  useEffect(() => { scrollArea.current?.scrollTo({ top: 0 }); }, [step]);
  const close = () => { if (!saving && (!dirty || window.confirm('Đóng sẽ bỏ các thay đổi chưa lưu. Bạn có muốn đóng?'))) onClose(); };
  const change = <K extends keyof ContractTerms>(key: K, value: ContractTerms[K]) => {
    setTerms(t => t && { ...t, [key]: value });setDirty(true);setSavedNotice(false);setError('');
  };
  const next = () => {
    if (!terms) return;
    if (step === 3 || step === 4) {
      const problem = validateContractTerms(terms);
      // Clause editing follows the commercial form; full validation is repeated before save.
      if (problem && !(step === 3 && problem.startsWith('Mỗi điều khoản'))) { setError(problem);return; }
    }
    setError('');setStep(s => Math.min(s + 1, 5));
  };
  const save = async () => {
    if (!context || !terms || saving) return;
    const problem = validateContractTerms(terms);if (problem) { setError(problem);return; }
    setSaving(true);setError('');
    try { const result = await saveContract(context, terms, existing);setExisting(result);setTerms(extractTerms(result));setDirty(false);setSavedNotice(true);onSaved(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Không thể lưu hợp đồng.');if (e instanceof ApiError && e.status === 409) setConflict(true); }
    finally { setSaving(false); }
  };
  const moveClause = (from: number, to: number) => {
    if (!terms || to < 0 || to >= terms.clauses.length) return;
    const clauses = [...terms.clauses];[clauses[from], clauses[to]] = [clauses[to], clauses[from]];change('clauses', clauses);
  };
  const snapshot = existing?.snapshot ?? context?.snapshot;
  return <dialog ref={dialog} aria-labelledby="contract-wizard-title" onCancel={event => { event.preventDefault();close(); }} className="m-auto p-0 rounded-2xl w-[calc(100%-1rem)] max-w-4xl max-h-[94dvh] bg-white shadow-2xl backdrop:bg-slate-900/50">
    <div className="flex flex-col max-h-[94dvh]">
      <header className="flex justify-between items-start gap-3 border-b border-slate-200 p-4 sm:p-6 shrink-0"><div><h2 id="contract-wizard-title" className="text-lg sm:text-xl font-bold text-slate-900">{existing ? 'Rà soát hợp đồng đã lưu' : 'Tạo hợp đồng thuê căn hộ'}</h2><p className="text-xs text-slate-500 mt-1">Thông tin hai bên và tài sản được lấy từ hồ sơ đã lưu.</p></div><button type="button" onClick={close} disabled={saving} aria-label="Đóng trình tạo hợp đồng" className="p-2 rounded-lg hover:bg-slate-100"><X className="w-5 h-5" /></button></header>
      <div ref={scrollArea} className="overflow-y-auto p-4 sm:p-6 space-y-6 min-h-0">
        {!context && !error && <p role="status">Đang tải thông tin đã lưu...</p>}
        {context && terms && snapshot && <>
          <ol aria-label="Tiến trình tạo hợp đồng" className="grid grid-cols-3 sm:grid-cols-6 gap-2">{steps.map((label, index) => <li key={label} aria-current={step === index ? 'step' : undefined} className={`text-center rounded-lg p-2 text-[11px] ${step === index ? 'bg-emerald-50 text-emerald-800 font-bold' : 'text-slate-500'}`}><span className={`w-7 h-7 mx-auto mb-1 rounded-full border flex items-center justify-center ${index < step ? 'bg-emerald-600 text-white border-emerald-600' : ''}`}>{index < step ? <Check className="w-4 h-4" /> : index + 1}</span>{label}</li>)}</ol>
          {step === 0 && <section className="space-y-5"><h3 className="text-lg font-bold">Chọn mẫu hợp đồng</h3><div className="border-2 border-emerald-600 bg-emerald-50 rounded-xl p-5 flex gap-3"><FileText className="text-emerald-700 shrink-0" /><div><h4 className="font-bold">Chung cư / Căn hộ</h4><p className="mt-1 text-sm text-slate-600">Mẫu thuê căn hộ có {context.templateClauses.length} điều khoản gợi ý. Bạn có thể sửa, xóa hoặc thay bằng điều khoản riêng ở bước 5.</p></div></div><p className="text-sm text-slate-500">Đúng căn hộ và khách thuê của yêu cầu đã chấp nhận; số hợp đồng được hệ thống tạo khi lưu.</p></section>}
          {step === 1 && <PartyReview party={snapshot.owner} title="Thông tin bên cho thuê (Bên A)" />}
          {step === 2 && <PartyReview party={snapshot.customer} title="Thông tin bên thuê (Bên B)" />}
          {step === 3 && <div className="space-y-6"><AssetReview snapshot={snapshot} /><ReceivingAccountReview snapshot={snapshot} />
            <section className="rounded-xl border border-slate-200 p-4 space-y-5"><h3 className="font-bold text-lg">Điều kiện thuê</h3><p className="text-xs text-slate-500">Owner xác định các điều kiện cho hợp đồng này. Giá niêm yết chỉ là gợi ý; nhập rõ đơn giá điện, nước và tiền cọc, kể cả khi bằng 0.</p><div className="grid sm:grid-cols-2 gap-4">
              {([['startDate', 'Ngày bắt đầu', 'date'], ['endDate', 'Ngày kết thúc', 'date'], ['monthlyRent', 'Tiền thuê mỗi tháng (VND)', 'number'], ['deposit', 'Tiền đặt cọc (VND)', 'number'], ['electricityUnitPrice', 'Đơn giá điện (VND/kWh)', 'number'], ['waterUnitPrice', 'Đơn giá nước (VND/m³)', 'number']] as const).map(([key, label, type]) => <label key={key} className="block text-sm font-medium space-y-2">{label}<input type={type} required value={terms[key]} min={type === 'number' ? (key === 'monthlyRent' ? '0.01' : '0') : undefined} step={type === 'number' ? '0.01' : undefined} onChange={event => change(key, event.target.value)} className={input} /></label>)}
              <label className="block text-sm font-medium space-y-2">Ngày thanh toán mỗi tháng<input type="number" min={1} max={28} step={1} value={terms.paymentDay || ''} onChange={event => change('paymentDay', Number(event.target.value))} className={input} /></label>
              <label className="block text-sm font-medium space-y-2">Phương thức thanh toán<input value={terms.paymentMethod} maxLength={300} onChange={event => change('paymentMethod', event.target.value)} className={input} /></label>
              <label className="block text-sm font-medium space-y-2 sm:col-span-2">Mục đích thuê<input value={terms.usagePurpose} maxLength={300} onChange={event => change('usagePurpose', event.target.value)} className={input} /></label>
            </div></section></div>}
          {step === 4 && <section className="space-y-4"><h3 className="text-lg font-bold">Điều khoản chi tiết</h3><p className="text-sm text-slate-500">Chỉnh sửa mẫu, đổi thứ tự, xóa hoặc nhập nội dung riêng. Các điều khoản là nội dung thỏa thuận để hai bên rà soát.</p><div className="flex flex-wrap gap-2"><button type="button" className={button} onClick={() => { if (window.confirm('Thay toàn bộ điều khoản hiện tại bằng mẫu căn hộ?')) change('clauses', context.templateClauses.map(c => ({ ...c }))); }}>Dùng lại mẫu căn hộ</button><button type="button" className={button} onClick={() => { if (window.confirm('Xóa mẫu để nhập điều khoản riêng?')) change('clauses', [{ title: '', body: '' }]); }}>Sử dụng điều khoản riêng</button></div>
            {terms.clauses.map((clause, index) => <section key={index} data-testid="contract-clause" className="border border-slate-200 rounded-xl p-4 space-y-3"><div className="flex justify-between gap-2"><span className="text-sm font-bold text-emerald-700">Điều {index + 1}</span><div className="flex gap-1"><button type="button" disabled={index === 0} aria-label={`Đưa điều khoản ${index + 1} lên`} onClick={() => moveClause(index, index - 1)} className="p-1 disabled:opacity-30"><ArrowUp className="w-4 h-4" /></button><button type="button" disabled={index === terms.clauses.length - 1} aria-label={`Đưa điều khoản ${index + 1} xuống`} onClick={() => moveClause(index, index + 1)} className="p-1 disabled:opacity-30"><ArrowDown className="w-4 h-4" /></button><button type="button" aria-label={`Xóa điều khoản ${index + 1}`} onClick={() => change('clauses', terms.clauses.filter((_, i) => i !== index))} className="p-1 text-rose-600"><Trash2 className="w-4 h-4" /></button></div></div>
              <label htmlFor={`clause-title-${index}`} className="block text-sm">Tiêu đề điều khoản {index + 1}</label><input id={`clause-title-${index}`} maxLength={150} value={clause.title} onChange={event => change('clauses', terms.clauses.map((c, i) => i === index ? { ...c, title: event.target.value } : c))} className={input} />
              <label htmlFor={`clause-body-${index}`} className="block text-sm">Nội dung điều khoản {index + 1}</label><textarea id={`clause-body-${index}`} rows={4} maxLength={4000} value={clause.body} onChange={event => change('clauses', terms.clauses.map((c, i) => i === index ? { ...c, body: event.target.value } : c))} className={input} />
            </section>)}<button type="button" className={button} disabled={terms.clauses.length >= 30} onClick={() => change('clauses', [...terms.clauses, { title: '', body: '' }])}><Plus className="inline w-4 h-4 mr-2" />Thêm điều khoản</button>
            <p className="text-xs text-slate-500">Mẫu tham khảo: <a href="https://homedy.com/news/6-luu-y-khi-lap-hop-dong-thue-can-ho-ne4363" target="_blank" rel="noreferrer" className="underline">Homedy</a>, <a href="https://thuecanho123.com/hop-dong-cho-thue-can-ho-chung-cu-day-du-don-gian-post6.html" target="_blank" rel="noreferrer" className="underline">Thuecanho123</a>.</p>
          </section>}
          {step === 5 && <><ContractReview snapshot={snapshot} terms={terms} number={existing?.contractNumber} status={existing?.status} />{existing && <p className="text-xs text-slate-500">Thông tin hồ sơ là bản lưu tại thời điểm tạo hợp đồng. Chỉnh sửa bản nháp chỉ thay đổi điều kiện thuê và điều khoản.</p>}</>}
        </>}
        {savedNotice && <p role="status" className="bg-emerald-50 text-emerald-800 rounded-lg p-4">Đã lưu bản nháp. Khách thuê được chọn có thể rà soát trong “Hợp đồng của tôi”.</p>}
        {error && <div role="alert" className="bg-rose-50 text-rose-700 p-4 rounded-xl space-y-3"><p>{error}</p>{(!context || conflict) && <button type="button" className={button} onClick={() => { if (!dirty || window.confirm('Tải lại sẽ bỏ thay đổi chưa lưu. Tiếp tục?')) setReloadKey(n => n + 1); }}>Tải lại thông tin</button>}</div>}
      </div>
      <footer className="border-t border-slate-200 p-4 sm:px-6 flex flex-wrap justify-between gap-3 shrink-0"><button type="button" className={button} disabled={saving} onClick={() => { if (step === 0) close();else { setError('');setStep(s => s - 1); } }}>{step === 0 ? 'Đóng' : 'Quay lại'}</button>
        {context && terms && <div className="flex flex-wrap gap-2">{step === 5 ? <><button type="button" className={button} disabled={saving || existing?.status !== 'DRAFT' && !!existing} onClick={() => setStep(3)}>Chỉnh sửa</button><button type="button" className={primary} disabled={saving || conflict || !!existing && (!dirty || existing.status !== 'DRAFT')} onClick={() => void save()}>{saving ? 'Đang lưu...' : existing ? 'Lưu thay đổi' : 'Lưu bản nháp'}</button></> : <button type="button" className={primary} disabled={saving} onClick={next}>Tiếp theo →</button>}</div>}
      </footer>
    </div>
  </dialog>;
}
function extractTerms(draft: ContractDraft): ContractTerms {
  return { startDate: draft.startDate, endDate: draft.endDate, monthlyRent: draft.monthlyRent, deposit: draft.deposit,
    electricityUnitPrice: draft.electricityUnitPrice, waterUnitPrice: draft.waterUnitPrice, paymentDay: draft.paymentDay,
    paymentMethod: draft.paymentMethod, usagePurpose: draft.usagePurpose, clauses: draft.clauses.map(c => ({ ...c })) };
}

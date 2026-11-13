import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import { getOwnerRentalRequests } from '@/services/rental/rentalService';
import { getBillingContext } from '@/services/billing/billingService';
import { UtilityInvoiceAssistant } from '@/components/billing/UtilityInvoiceAssistant';
import { CreateInvoiceModal } from '@/components/billing/CreateInvoiceModal';
import type { BillingContext, Tenancy } from '@/types/billing';
import type { Invoice, ActiveTab } from '@/types';
import '@/styles/ai-chat.css';

type Message = { role: 'user' | 'assistant'; text: string; requests?: boolean };
export function OwnerAssistant({ hidden, propertyId, tenancies, onNavigate, onCreateInvoice }: {
  hidden: boolean; propertyId: string; tenancies: Tenancy[]; onNavigate: (tab: ActiveTab) => void;
  onCreateInvoice: (invoice: Invoice) => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [billing, setBilling] = useState(false);
  const [contractId, setContractId] = useState('');
  const [context, setContext] = useState<BillingContext | null>(null);
  const [invoice, setInvoice] = useState<{context: BillingContext; electricity: string; water: string} | null>(null);
  const generation = useRef(0);
  const log = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const active = tenancies.filter(t => t.status === 'ACTIVE');
  useEffect(() => { generation.current++; setMessages([]);setContext(null);setContractId('');setInvoice(null);setError('');setBusy(false);setBilling(false);return()=>{generation.current++;}; }, [propertyId]);
  useEffect(() => { if (log.current) log.current.scrollTop = log.current.scrollHeight; }, [messages, context, busy, open, invoice, billing]);
  useEffect(() => { if(open&&!invoice) input.current?.focus({preventScroll:true}); }, [open, invoice]);
  useEffect(() => {
    let current = true;setContext(null);setError('');
    if (contractId) getBillingContext(contractId).then(c => { if (current) setContext(c); }).catch(e => { if (current) setError(e.message); });
    return () => { current = false; };
  }, [contractId]);
  const close = () => { setOpen(false);launcher.current?.focus(); };
  async function send(question = text) {
    if (!question.trim() || busy) return;
    const scope = generation.current;
    setText('');setError('');setMessages(m => [...m,{role:'user',text:question}]);
    const normalized = question.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    if (/yeu cau|thue moi/.test(normalized)) {
      setBusy(true);
      try {
        const result = await getOwnerRentalRequests(0,'PENDING',propertyId === 'all' ? undefined : propertyId);
        if (scope !== generation.current) return;
        setMessages(m => [...m,{role:'assistant',requests:true,text:result.totalElements
          ? `Có ${result.totalElements} yêu cầu thuê đang chờ xử lý trong phạm vi tài sản bạn chọn. ${result.items.slice(0,3).map(r => `${r.customerName}: ${r.apartmentTitle}`).join('; ')}. Số liệu vừa được kiểm tra.`
          : 'Hiện không có yêu cầu thuê đang chờ xử lý trong phạm vi tài sản bạn chọn.'}]);
      } catch(e) { if (scope === generation.current) setError(e instanceof Error ? e.message : 'Chưa tải được yêu cầu thuê.'); }
      finally { if (scope === generation.current) setBusy(false); }
    } else if (/hoa don|dien|nuoc/.test(normalized)) {
      setBilling(true);
      setMessages(m => [...m,{role:'assistant',text:'Chọn phòng bên dưới, nhập mã phòng và chỉ số điện/nước cuối tháng. Mình sẽ đề xuất số liệu để bạn kiểm tra trước khi lập hóa đơn.'}]);
    } else {
      setMessages(m => [...m,{role:'assistant',text:'Mình có thể kiểm tra yêu cầu thuê đang chờ và hỗ trợ lập hóa đơn điện nước. Hãy chọn một câu hỏi gợi ý hoặc nhập yêu cầu về hai nội dung này.'}]);
    }
  }
  if (hidden) return null;
  return <>
    {!invoice && <div className="ai-chat-widget">
      {open && <section role="dialog" aria-modal="false" aria-labelledby="owner-assistant-title" className="ai-chat-panel" onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();close();}}}>
        <header className="ai-chat-header"><MessageCircle size={24}/><div><h2 id="owner-assistant-title">Trợ lý chủ nhà</h2><p>Yêu cầu thuê & hóa đơn</p></div><button type="button" aria-label="Đóng trợ lý chủ nhà" onClick={close}><X size={20}/></button></header>
        <div ref={log} className="ai-chat-messages" role="log" aria-live="polite">
          <div className="ai-chat-bubble ai-chat-assistant"><p>Mình hỗ trợ kiểm tra yêu cầu thuê và điền hóa đơn từ chỉ số công tơ bạn cung cấp.</p><div className="ai-chat-starters">{['Có yêu cầu thuê mới không?','Lập hóa đơn điện nước'].map(q=><button type="button" key={q} disabled={busy} onClick={()=>void send(q)}>{q}</button>)}</div></div>
          {messages.map((m,i)=><div key={i} className={`ai-chat-bubble ai-chat-${m.role}`}><p>{m.text}</p>{m.requests&&<button type="button" className="underline font-semibold" onClick={()=>{onNavigate('rental_requests');close();}}>Xem yêu cầu thuê</button>}</div>)}
          {busy&&<p role="status">Đang kiểm tra yêu cầu thuê…</p>}
          {billing&&<div className="ai-chat-bubble ai-chat-assistant">
            {!active.length?<p>Chưa có hợp đồng đang hiệu lực để lập hóa đơn.</p>:<label className="block">Phòng cần lập hóa đơn<select aria-label="Phòng cần lập hóa đơn" className="mt-2 w-full min-w-0 border rounded-lg p-2" value={contractId} onChange={e=>setContractId(e.target.value)}><option value="">Chọn phòng</option>{active.map(t=><option key={t.id} value={t.id}>{t.roomNumber} — {t.customerName}</option>)}</select></label>}
            {contractId&&!context&&!error&&<p role="status">Đang tải kỳ hóa đơn…</p>}
            {context&&active.some(t=>t.id===context.contractId)&&<UtilityInvoiceAssistant key={`${context.contractId}-${context.period}-${context.baselineVersion}`} context={context} onApply={(electricity,water)=>setInvoice({context,electricity,water})}/>}
          </div>}
          {error&&<p role="alert" className="text-rose-700">{error}</p>}
        </div>
        <form className="ai-chat-input" onSubmit={e=>{e.preventDefault();void send();}}><label className="sr-only" htmlFor="owner-assistant-input">Tin nhắn cho trợ lý chủ nhà</label><textarea ref={input} id="owner-assistant-input" value={text} maxLength={2000} rows={2} onChange={e=>setText(e.target.value)} placeholder="Hỏi về yêu cầu thuê hoặc hóa đơn…"/><button type="submit" aria-label="Gửi tin nhắn" disabled={busy||!text.trim()}><Send size={20}/></button></form>
      </section>}
      <button ref={launcher} type="button" className="ai-chat-launcher" aria-label={open?'Thu gọn trợ lý chủ nhà':'Mở trợ lý chủ nhà'} aria-expanded={open} onClick={()=>open?close():setOpen(true)}><MessageCircle size={26}/></button>
    </div>}
    {invoice&&<CreateInvoiceModal tenancies={tenancies} initialContractId={invoice.context.contractId} initialSuggestion={invoice} onClose={()=>setInvoice(null)} onCreateInvoice={onCreateInvoice}/>}
  </>;
}

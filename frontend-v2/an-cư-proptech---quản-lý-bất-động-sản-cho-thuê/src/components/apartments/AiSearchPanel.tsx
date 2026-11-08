import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MessageCircle, Send, Sparkles, X } from 'lucide-react';
import { chatWithAi, applyAiSearch, toApartmentFilters, hasAiFilters, type ChatMessage } from '@/services/apartments/aiSearchService';
import type { ApartmentFilters } from '@/types/apartment';
import '@/styles/ai-chat.css';

type Bubble = ChatMessage & { status?: string };
export function AiSearchPanel({ onApply }: { onApply:(filters:ApartmentFilters)=>void }) {
  const [open,setOpen]=useState(false);
  const [text,setText]=useState('');
  const [consent,setConsent]=useState(false);
  const [messages,setMessages]=useState<Bubble[]>([]);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const controller=useRef<AbortController|null>(null);
  const input=useRef<HTMLTextAreaElement>(null);
  const log=useRef<HTMLDivElement>(null);
  const launcher=useRef<HTMLButtonElement>(null);
  useEffect(()=>()=>controller.current?.abort(),[]);
  useEffect(()=>{ if(open&&!busy) input.current?.focus({preventScroll:true}); },[open,busy]);
  useEffect(()=>{ if(open&&log.current) log.current.scrollTop=log.current.scrollHeight; },[open,messages,busy,error]);
  const close=()=>{setOpen(false);launcher.current?.focus({preventScroll:true});};
  const send=async()=>{
    if(controller.current||!consent||!text.trim())return;
    const submitted=text.trim();
    const history=messages.slice(-8).map(({role,text})=>({role,text}));
    const c=new AbortController();controller.current=c;
    setBusy(true);setError('');setText('');setMessages(previous=>[...previous,{role:'user',text:submitted}]);
    try {
      const result=await chatWithAi(submitted,history,c.signal);
      if(c.signal.aborted)return;
      const answer:Bubble={role:'assistant',text:[result.reply,...result.search.notes].join('\n\n').slice(0,2000)};
      setMessages(previous=>[...previous,answer]);
      if(result.search.canApply&&hasAiFilters(result.search.filters)){
        const accepted=await applyAiSearch(result.search.runId,result.search.filters,c.signal);
        if(c.signal.aborted)return;
        onApply(toApartmentFilters(accepted));
        setMessages(previous=>previous.map((message,index)=>index===previous.length-1?{...message,status:'Đã cập nhật bộ lọc và tìm căn hộ. Xem kết quả trên trang; bạn có thể sửa bộ lọc bất cứ lúc nào.'}:message));
      }
    } catch(e) {
      if(!c.signal.aborted){setError(e instanceof Error?e.message:'Chưa gửi được tin nhắn. Hãy thử lại.');setText(submitted);}
    } finally { if(!c.signal.aborted){controller.current=null;setBusy(false);} }
  };
  return createPortal(<div className="ai-chat-widget">
    {open&&<section id="ai-chat-panel" role="dialog" aria-modal="false" aria-labelledby="ai-chat-title" className="ai-chat-panel" onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();close();}}}>
      <header className="ai-chat-header"><span className="ai-chat-avatar"><Sparkles size={22} aria-hidden="true"/></span><div><h2 id="ai-chat-title">Trợ lý An Cư AI</h2><p>Hỏi đáp & tìm căn hộ</p></div><button type="button" aria-label="Đóng chat AI" onClick={close}><X size={20}/></button></header>
      <div className="ai-chat-messages" role="log" aria-label="Hội thoại với AI" aria-live="polite" ref={log}>
        <div className="ai-chat-bubble ai-chat-assistant"><strong>Xin chào! Mình có thể giúp gì cho bạn?</strong><p>Bạn có thể hỏi về việc thuê nhà, cách sử dụng An Cư hoặc nhờ mình tìm căn hộ phù hợp.</p><p>Ví dụ: “Tìm phòng dưới 5 triệu, từ 25 m², cho 2 người”. Mình sẽ tự cập nhật bộ lọc và tìm trên trang này.</p></div>
        {messages.map((message,index)=><div key={index} className={`ai-chat-bubble ai-chat-${message.role}`}><span className="ai-chat-sender">{message.role==='user'?'Bạn':'An Cư AI'}</span><p>{message.text}</p>{message.status&&<p className="ai-chat-applied">{message.status}</p>}</div>)}
        {busy&&<p role="status" className="ai-chat-thinking">An Cư AI đang trả lời…</p>}
      </div>
      <form className="ai-chat-compose" onSubmit={e=>{e.preventDefault();void send();}}>
        {error&&<p role="alert" className="ai-chat-error">{error} Bạn vẫn có thể dùng bộ lọc trên trang.</p>}
        <p className="ai-chat-privacy">AI có thể nhầm. Không gửi thông tin cá nhân hoặc giấy tờ.</p>
        <label className="ai-chat-consent"><input type="checkbox" checked={consent} disabled={busy} onChange={e=>setConsent(e.target.checked)}/><span>Đồng ý gửi hội thoại đến Gemini để được hỗ trợ.</span></label>
        <div className="ai-chat-input"><textarea ref={input} aria-label="Tin nhắn cho AI" placeholder="Nhập tin nhắn…" rows={2} maxLength={1000} disabled={busy} value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();void send();}}}/><button type="submit" aria-label="Gửi tin nhắn" disabled={busy||!consent||!text.trim()}><Send size={19}/></button></div>
      </form>
    </section>}
    <button ref={launcher} type="button" className="ai-chat-launcher" aria-label={open?'Thu gọn chat AI':'Mở chat AI'} aria-expanded={open} aria-controls="ai-chat-panel" onClick={()=>open?close():setOpen(true)}>{open?<X size={25}/>:<MessageCircle size={27}/>}<span>AI</span></button>
  </div>,document.body);
}

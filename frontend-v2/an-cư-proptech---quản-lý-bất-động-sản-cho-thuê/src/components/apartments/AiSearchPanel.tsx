import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router';
import { MessageCircle, Send, Sparkles, X } from 'lucide-react';
import { chatWithAi, applyAiSearch, toApartmentFilters, hasAiFilters, type ChatMessage } from '@/services/apartments/aiSearchService';
import { getApartments } from '@/services/apartments/apartmentService';
import { formatRent } from '@/utils/format';
import type { ApartmentFilters, ApartmentSummary, PageResult } from '@/types/apartment';
import '@/styles/ai-chat.css';

type SearchPreview = { filters: ApartmentFilters; rooms: PageResult<ApartmentSummary> | null };
type Bubble = ChatMessage & { preview?: SearchPreview };
const starterQuestions = [
  ['Tìm phòng theo ngân sách', 'Tìm phòng dưới 5 triệu mỗi tháng, từ 25 m², cho 2 người.'],
  ['Chuẩn bị đi xem phòng', 'Mình nên kiểm tra và hỏi chủ nhà những gì khi đi xem phòng?'],
  ['Cách gửi yêu cầu thuê', 'Mình tìm được phòng ưng ý rồi. Làm sao để gửi và theo dõi yêu cầu thuê trên An Cư?'],
];
export function AiSearchPanel({ onApply, onViewResults }: {
  onApply: (filters: ApartmentFilters) => void;
  onViewResults: () => void;
}) {
  const [open,setOpen]=useState(false);
  const [text,setText]=useState('');
  const [messages,setMessages]=useState<Bubble[]>([]);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const controller=useRef<AbortController|null>(null);
  const input=useRef<HTMLTextAreaElement>(null);
  const log=useRef<HTMLDivElement>(null);
  const launcher=useRef<HTMLButtonElement|null>(null);
  useEffect(()=>()=>controller.current?.abort(),[]);
  useEffect(()=>{ if(open&&!busy) input.current?.focus({preventScroll:true}); },[open,busy]);
  useEffect(()=>{ if(open&&log.current) log.current.scrollTop=log.current.scrollHeight; },[open,messages,busy,error]);
  const close=()=>{setOpen(false);launcher.current?.focus({preventScroll:true});};
  const toggle = (button: HTMLButtonElement) => {
    if (open) {
      close();
      return;
    }
    launcher.current = button;
    setOpen(true);
  };
  const send=async()=>{
    if(controller.current||!text.trim())return;
    const submitted=text.trim();
    const history=messages.slice(-8).map(({role,text})=>({role,text}));
    const c=new AbortController();controller.current=c;
    let answered = false;
    setBusy(true);setError('');setText('');setMessages(previous=>[...previous,{role:'user',text:submitted}]);
    try {
      const result=await chatWithAi(submitted,history,c.signal);
      if(c.signal.aborted)return;
      const answer:Bubble={role:'assistant',text:[result.reply,...result.search.notes].join('\n\n').slice(0,2000)};
      setMessages(previous=>[...previous,answer]);
      answered = true;
      if(result.search.canApply&&hasAiFilters(result.search.filters)){
        const accepted=await applyAiSearch(result.search.runId,result.search.filters,c.signal);
        if(c.signal.aborted)return;
        const filters = toApartmentFilters(accepted);
        onApply(filters);
        const rooms = await getApartments({ ...filters, page: 0, size: 3 }, c.signal).catch(() => null);
        if (c.signal.aborted) return;
        setMessages(previous => [...previous.slice(0, -1), { ...answer, preview: { filters, rooms } }]);
      }
    } catch(e) {
      if(!c.signal.aborted){
        setError(e instanceof Error?e.message:'Chưa gửi được tin nhắn. Hãy thử lại.');
        if (!answered) {
          setMessages(previous => previous.slice(0, -1));
          setText(submitted);
        }
      }
    } finally { if(!c.signal.aborted){controller.current=null;setBusy(false);} }
  };
  return <>
    <button type="button" className="home-primary home-search ai-search-entry" aria-expanded={open} aria-controls="ai-chat-panel" onClick={e => toggle(e.currentTarget)}>
      <Sparkles size={18} aria-hidden="true" />TOBA
    </button>
    {createPortal(<div className="ai-chat-widget">
    {open&&<section id="ai-chat-panel" role="dialog" aria-modal="false" aria-labelledby="ai-chat-title" className="ai-chat-panel" onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();close();}}}>
      <header className="ai-chat-header"><span className="ai-chat-avatar"><Sparkles size={22} aria-hidden="true"/></span><div><h2 id="ai-chat-title">TOBA</h2><p>Hỏi đáp & tìm căn hộ</p></div><button type="button" aria-label="Đóng TOBA" onClick={close}><X size={20}/></button></header>
      <div className="ai-chat-messages" role="log" aria-label="Hội thoại với TOBA" aria-live="polite" ref={log}>
        {messages.length === 0 && <div className="ai-chat-bubble ai-chat-assistant">
          <strong>Bạn cần tìm phòng hay có câu hỏi về thuê nhà?</strong>
          <div className="ai-chat-starters">{starterQuestions.map(([label, question]) =>
            <button key={label} type="button" onClick={() => { setText(question); input.current?.focus({ preventScroll: true }); }}>{label}</button>
          )}</div>
        </div>}
        {messages.map((message,index)=><div key={index} className={`ai-chat-bubble ai-chat-${message.role}`}><span className="ai-chat-sender">{message.role==='user'?'Bạn':'TOBA'}</span><p>{message.text}</p>
          {message.preview && <RoomPreview preview={message.preview} onView={filters => {
            onApply(filters);
            setOpen(false);
            onViewResults();
          }} />}
        </div>)}
        {busy&&<p role="status" className="ai-chat-thinking">TOBA đang trả lời…</p>}
      </div>
      <form className="ai-chat-compose" onSubmit={e=>{e.preventDefault();e.stopPropagation();void send();}}>
        <p className="ai-chat-privacy">Tin nhắn và các lượt trao đổi gần đây được gửi đến Gemini. Tránh nhập thông tin cá nhân.</p>
        {error&&<p role="alert" className="ai-chat-error">{error} Bạn vẫn có thể dùng bộ lọc trên trang.</p>}
        <div className="ai-chat-input"><textarea ref={input} aria-label="Tin nhắn cho TOBA" placeholder="Nhập tin nhắn…" rows={2} maxLength={1000} disabled={busy} value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();void send();}}}/><button type="submit" aria-label="Gửi tin nhắn" disabled={busy||!text.trim()}><Send size={19}/></button></div>
      </form>
    </section>}
    <button type="button" className="ai-chat-launcher" aria-label={open?'Thu gọn TOBA':'Mở TOBA'} aria-expanded={open} aria-controls="ai-chat-panel" onClick={e => toggle(e.currentTarget)}>{open?<X size={25}/>:<MessageCircle size={27}/>}<span>TOBA</span></button>
  </div>,document.body)}
  </>;
}

function RoomPreview({ preview: { rooms, filters }, onView }: {
  preview: SearchPreview;
  onView: (filters: ApartmentFilters) => void;
}) {
  return <div className="ai-chat-results">
    <p className="ai-chat-applied">Đã cập nhật bộ lọc</p>
    <p>{rooms
      ? rooms.totalElements > 0
        ? `Tìm thấy ${rooms.totalElements} căn/phòng phù hợp.`
        : 'Chưa có căn/phòng phù hợp. Bạn có thể đổi khu vực hoặc ngân sách.'
      : 'Chưa tải được danh sách trong chat. Bạn có thể xem kết quả trên trang.'}</p>
    {rooms?.items.map(room => <Link key={room.id} to={`/apartments/${encodeURIComponent(room.id)}`} className="ai-chat-room">
      <strong>{room.title}</strong>
      <span>{room.address}</span>
      <span>{formatRent(room.advertisedMonthlyRent)}/tháng · {room.areaM2} m²</span>
    </Link>)}
    <button type="button" className="ai-chat-action" onClick={() => onView(filters)}>Xem kết quả trên trang</button>
  </div>;
}

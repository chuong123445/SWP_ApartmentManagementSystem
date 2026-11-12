import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, MessageCircle, Send } from 'lucide-react';
import { CustomerLayout } from '@/layouts/CustomerLayout';
import { Pagination } from '@/components/common/Pagination';
import {
  listConversations, readConversation, sendRentalMessage,
  type Conversation, type RentalMessage,
} from '@/services/messaging/rentalMessagingService';
import type { PageResult } from '@/types/apartment';

const messageDate = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh',
});
const linkStyle = 'inline-flex items-center gap-2 font-semibold text-brand-700 hover:underline';
const surface = 'app-panel';

function Inbox() {
  const [page, setPage] = useState(0);
  const [data, setData] = useState<PageResult<Conversation>>();
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let running = false;
    async function refresh() {
      if (running || controller.signal.aborted) return;
      running = true;
      try {
        const next = await listConversations(page, controller.signal);
        if (!controller.signal.aborted) { setData(next); setError(''); }
      } catch {
        if (!controller.signal.aborted) setError('Chưa tải được hộp thư. Hãy thử lại.');
      } finally {
        running = false;
      }
    }
    const onFocus = () => { if (document.visibilityState === 'visible') void refresh(); };
    void refresh();
    const timer = window.setInterval(onFocus, 10000);
    window.addEventListener('focus', onFocus);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [page, revision]);

  return <section className={`${surface} mt-5 overflow-hidden`} aria-label="Hộp thư">
    {error && <div role="alert" className="p-4 text-sm text-rose-700">{error}{' '}
      <button type="button" className="underline" onClick={() => setRevision(value => value + 1)}>Tải lại</button>
    </div>}
    {!error && data?.page !== page && <p role="status" className="p-5 text-slate-600">Đang tải hộp thư…</p>}
    {data?.page === page && <>
      {!data.items.length && <div className="p-8 text-center">
        <p className="mb-3 text-slate-600">Bạn chưa có cuộc trò chuyện nào.</p>
        <Link to="/" className={linkStyle}>Xem phòng đang cho thuê</Link>
      </div>}
      <ul className="divide-y divide-slate-100">
        {data.items.map(item => <li key={item.id}>
          <Link to={`/my/messages/${encodeURIComponent(item.id)}`} className="flex flex-wrap items-center gap-3 p-4 hover:bg-brand-50 sm:px-6">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-700"><MessageCircle size={19} aria-hidden="true" /></span>
            <span className="min-w-0 flex-1 break-words">
              <strong className="block text-slate-900">{item.otherName}</strong>
              <span className="text-sm text-slate-600">{item.apartmentTitle}</span>
            </span>
            {item.lastMessageAt && <time dateTime={item.lastMessageAt} className="text-xs text-slate-500">{messageDate.format(new Date(item.lastMessageAt))}</time>}
          </Link>
        </li>)}
      </ul>
      {data.totalPages > 1 && <div className="px-4 pb-4"><Pagination page={page} totalPages={data.totalPages} onChange={setPage} /></div>}
    </>}
  </section>;
}

function mergeMessages(previous: RentalMessage[], added: RentalMessage[]) {
  const unique = new Map([...previous, ...added].map(message => [message.id, message]));
  return [...unique.values()].sort((a, b) => BigInt(a.id) < BigInt(b.id) ? -1 : 1);
}

function ConversationThread({ id }: { id: string }) {
  const [conversation, setConversation] = useState<Conversation>();
  const [messages, setMessages] = useState<RentalMessage[]>([]);
  const [hasOlder, setHasOlder] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [revision, setRevision] = useState(0);
  const request = useRef<AbortController | null>(null);
  const lastSynced = useRef<string | undefined>(undefined);
  const retry = useRef<{ key: string; body: string } | null>(null);
  const log = useRef<HTMLDivElement>(null);
  const scrollToEnd = useRef(true);

  useEffect(() => {
    const controller = new AbortController();
    request.current = controller;
    let running = false;
    async function sync() {
      if (running || controller.signal.aborted) return;
      running = true;
      try {
        const after = lastSynced.current;
        const result = await readConversation(id, controller.signal, after ? { after } : undefined);
        if (controller.signal.aborted) return;
        setConversation(result.conversation);
        setLoadError('');
        if (!after) setHasOlder(result.hasMore);
        if (result.messages.length) {
          const list = log.current;
          if (!list || list.scrollHeight - list.scrollTop - list.clientHeight < 100) scrollToEnd.current = true;
          lastSynced.current = result.messages.at(-1)?.id;
          setMessages(previous => mergeMessages(previous, result.messages));
        }
      } catch {
        if (!controller.signal.aborted) setLoadError('Chưa cập nhật được tin nhắn.');
      } finally {
        running = false;
      }
    }
    const onFocus = () => { if (document.visibilityState === 'visible') void sync(); };
    void sync();
    const timer = window.setInterval(onFocus, 5000);
    window.addEventListener('focus', onFocus);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [id, revision]);

  useLayoutEffect(() => {
    if (scrollToEnd.current && log.current) {
      log.current.scrollTop = log.current.scrollHeight;
      scrollToEnd.current = false;
    }
  }, [messages]);

  async function loadOlder() {
    const before = messages[0]?.id;
    const signal = request.current?.signal;
    if (!signal || !before || loadingOlder) return;
    setLoadingOlder(true);
    setActionError('');
    try {
      const result = await readConversation(id, signal, { before });
      if (signal.aborted) return;
      setHasOlder(result.hasMore);
      setMessages(previous => mergeMessages(previous, result.messages));
    } catch {
      if (!signal.aborted) setActionError('Chưa tải được tin nhắn cũ.');
    } finally {
      setLoadingOlder(false);
    }
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    const body = text.trim();
    const signal = request.current?.signal;
    if (!signal || sending || !body) return;
    const key = retry.current?.body === body ? retry.current.key : crypto.randomUUID();
    retry.current = { key, body };
    setSending(true);
    setActionError('');
    try {
      const sent = await sendRentalMessage(id, body, key, signal);
      if (signal.aborted) return;
      scrollToEnd.current = true;
      setMessages(previous => mergeMessages(previous, [sent]));
      setText('');
      retry.current = null;
    } catch (error) {
      if (!signal.aborted) setActionError(error instanceof Error ? error.message : 'Chưa gửi được tin nhắn.');
    } finally {
      setSending(false);
    }
  }

  return <section className={`${surface} mt-5 overflow-hidden`} aria-label="Cuộc trò chuyện">
    {loadError && <div role="alert" className="p-4 text-sm text-rose-700">{loadError}{' '}
      <button type="button" className="underline" disabled={sending || loadingOlder} onClick={() => setRevision(value => value + 1)}>Tải lại</button>
    </div>}
    {!conversation && !loadError && <p role="status" className="p-5 text-slate-600">Đang tải cuộc trò chuyện…</p>}
    {conversation && <>
      <header className="border-b border-slate-100 p-4 sm:px-6">
        <h2 className="break-words font-bold">{conversation.otherName}</h2>
        <Link to={`/apartments/${encodeURIComponent(conversation.apartmentId)}`} className={`${linkStyle} break-words text-sm`}>{conversation.apartmentTitle}</Link>
      </header>
      <div ref={log} role="log" aria-label="Lịch sử tin nhắn" className="min-h-48 max-h-[50dvh] overflow-y-auto bg-brand-50 p-4 sm:p-6">
        {hasOlder && <button type="button" className={linkStyle} disabled={loadingOlder} onClick={() => void loadOlder()}>{loadingOlder ? 'Đang tải…' : 'Tải tin nhắn cũ'}</button>}
        {!messages.length && <p className="text-sm text-slate-600">Bạn có thể hỏi về phòng hoặc hẹn thời gian xem phòng.</p>}
        <ol className="space-y-3">
          {messages.map(message => <li key={message.id} className={`flex ${message.mine ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${message.mine ? 'bg-brand-700 text-white' : 'border border-slate-200 bg-white text-slate-900'}`}>
              <span className="sr-only">{message.mine ? 'Bạn' : conversation.otherName}</span>
              <p className="whitespace-pre-wrap break-words text-sm">{message.body}</p>
              <time dateTime={message.sentAt} className="mt-1 block text-xs opacity-80">{messageDate.format(new Date(message.sentAt))}</time>
            </div>
          </li>)}
        </ol>
      </div>
      <form onSubmit={send} className="border-t border-slate-100 p-4 sm:px-6">
        {actionError && <p role="alert" className="mb-2 text-sm text-rose-700">{actionError}</p>}
        <div className="flex items-end gap-2">
          <textarea aria-label="Nội dung tin nhắn" placeholder="Nhập tin nhắn…" rows={2} maxLength={2000} value={text}
            disabled={sending} onChange={event => setText(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-slate-300 p-3 text-sm" />
          <button type="submit" disabled={sending || !text.trim()} className="inline-flex items-center gap-2 rounded-xl bg-brand-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">
            <Send size={16} aria-hidden="true" />{sending ? 'Đang gửi…' : 'Gửi'}
          </button>
        </div>
      </form>
    </>}
  </section>;
}

export function RentalMessagesPage() {
  const { id } = useParams();
  return <CustomerLayout><main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
    {id && <Link to="/my/messages" className={`${linkStyle} mb-3 text-sm`}><ArrowLeft size={16} aria-hidden="true" /> Về hộp thư</Link>}
    <h1 className="app-page-title">Tin nhắn</h1>
    {id ? <ConversationThread key={id} id={id} /> : <Inbox />}
  </main></CustomerLayout>;
}

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, MessagesSquare, X } from 'lucide-react';
import { useLocation } from 'react-router';
import { useAuth } from '@/hooks/useAuth';
import { ConversationThread, Inbox } from '@/pages/customer/RentalMessagesPage';

const MessagesContext = createContext<(id?: string) => void>(() => {});
export const useOpenMessages = () => useContext(MessagesContext);

export function FloatingMessages({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [active, setActive] = useState<{ accountId: string; id?: string } | null>(null);
  const view = active?.accountId === user?.id ? active : null;
  const opener = useRef<HTMLElement | null>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const allowed = user?.accountStatus === 'ACTIVE' && user.contactVerificationStatus === 'VERIFIED'
    && user.roles.some(role => role === 'OWNER' || role === 'CUSTOMER');
  const visible = allowed && !pathname.startsWith('/my/messages');

  useEffect(() => {
    const closeForToba = () => setActive(null);
    window.addEventListener('ancu:toba-open', closeForToba);
    return () => window.removeEventListener('ancu:toba-open', closeForToba);
  }, []);
  useEffect(() => { if (view && visible) closeButton.current?.focus(); }, [view, visible]);
  useEffect(() => { setActive(null); }, [user?.id]);

  function open(id?: string) {
    if (!visible || !user) return;
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    window.dispatchEvent(new Event('ancu:messages-open'));
    setActive({ accountId: user.id, id });
  }
  function close() {
    setActive(null);
    opener.current?.focus({ preventScroll: true });
  }

  return <MessagesContext.Provider value={open}>
    {children}
    {visible && createPortal(<div className="fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-24 z-[81] max-sm:bottom-4 max-sm:right-20">
      {view && <section id="floating-messages" role="dialog" aria-labelledby="floating-messages-title"
        onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); close(); } }}
        className="fixed bottom-24 right-4 flex max-h-[calc(100dvh-7rem)] w-[min(25rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-xl sm:right-6">
        <header className="flex shrink-0 items-center gap-2 bg-brand-800 px-3 py-2 text-white">
          {view.id && <button type="button" aria-label="Về hộp thư" onClick={() => setActive({ accountId: view.accountId })} className="rounded-lg p-2 hover:bg-white/15"><ArrowLeft size={19} /></button>}
          <h2 id="floating-messages-title" className="flex-1 font-bold">Tin nhắn</h2>
          <button ref={closeButton} type="button" aria-label="Đóng tin nhắn" onClick={close} className="rounded-lg p-2 hover:bg-white/15"><X size={20} /></button>
        </header>
        <div className="min-h-0 overflow-y-auto overscroll-contain bg-brand-50 p-2 [&>section]:mt-0">
          {view.id ? <ConversationThread key={view.id} id={view.id} /> : <Inbox onSelect={id => setActive({ accountId: view.accountId, id })} />}
        </div>
      </section>}
      <button type="button" aria-label="Mở hộp thư" title="Tin nhắn" aria-expanded={!!view} aria-controls={view ? 'floating-messages' : undefined}
        onClick={() => view ? close() : open()} className="grid size-14 place-items-center rounded-full border border-brand-200 bg-white text-brand-800 shadow-lg hover:bg-brand-50">
        <MessagesSquare size={24} aria-hidden="true" />
      </button>
    </div>, document.body)}
  </MessagesContext.Provider>;
}

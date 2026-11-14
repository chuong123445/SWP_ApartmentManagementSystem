import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useOpenMessages } from '@/components/navigation/FloatingMessages';
import { MessageCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { openConversation, type ConversationTarget } from '@/services/messaging/rentalMessagingService';

const actionClass = 'mb-4 flex w-full items-center justify-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-center text-sm font-semibold text-brand-800 hover:bg-brand-100 disabled:opacity-50';
const landlordLabel = 'Nhắn tin cho chủ nhà';

export function StartRentalConversation({ apartmentId, verified, checking }: {
  apartmentId: string; verified: boolean; checking: boolean;
}) {
  const { user } = useAuth();
  const label = <><MessageCircle size={17} aria-hidden="true" />{landlordLabel}</>;
  const returnTo = `/apartments/${encodeURIComponent(apartmentId)}`;
  if (!user) return <Link to="/login" state={{ returnTo }} className={actionClass}>{label}</Link>;
  if (!user.roles.includes('CUSTOMER')) return null;
  if (!checking && !verified) return <Link to="/account/verification" state={{ returnTo }} className={actionClass}>{label}</Link>;
  return <OpenConversationButton target={{ apartmentId }} className={actionClass} label={landlordLabel} disabled={checking} />;
}

export function OpenConversationButton({ target, className, label, accessibleName, disabled }: {
  target: ConversationTarget; className: string; label: string; accessibleName?: string; disabled?: boolean;
}) {
  const openMessages = useOpenMessages();
  const pending = useRef<AbortController | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => () => pending.current?.abort(), []);

  async function start() {
    if (pending.current) return;
    const controller = new AbortController();
    pending.current = controller;
    setLoading(true);
    setError('');
    try {
      const result = await openConversation(target, controller.signal);
      if (!controller.signal.aborted) openMessages(result.id);
    } catch (error) {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Chưa mở được cuộc trò chuyện.');
    } finally {
      pending.current = null;
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  return <>
    <button type="button" className={className} aria-label={accessibleName} onClick={() => void start()} disabled={disabled || loading}>
      {loading ? 'Đang mở…' : <><MessageCircle size={17} aria-hidden="true" />{label}</>}
    </button>
    {error && <p role="alert" className="mb-3 text-sm text-rose-700">{error}</p>}
  </>;
}

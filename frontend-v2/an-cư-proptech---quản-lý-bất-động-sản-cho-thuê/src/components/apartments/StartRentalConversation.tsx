import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { MessageCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { openConversation } from '@/services/messaging/rentalMessagingService';

const actionClass = 'mb-4 flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50';

export function StartRentalConversation({ apartmentId, verified, checking }: {
  apartmentId: string; verified: boolean; checking: boolean;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const pending = useRef<AbortController | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => () => pending.current?.abort(), []);

  const label = <><MessageCircle size={17} aria-hidden="true" />Nhắn tin cho chủ nhà</>;
  const returnTo = `/apartments/${encodeURIComponent(apartmentId)}`;
  if (!user) return <Link to="/login" state={{ returnTo }} className={actionClass}>{label}</Link>;
  if (!user.roles.includes('CUSTOMER')) return null;
  if (!checking && !verified) return <Link to="/account/verification" state={{ returnTo }} className={actionClass}>{label}</Link>;

  async function start() {
    if (pending.current) return;
    const controller = new AbortController();
    pending.current = controller;
    setLoading(true);
    setError('');
    try {
      const result = await openConversation(apartmentId, controller.signal);
      if (!controller.signal.aborted) navigate(`/my/messages/${encodeURIComponent(result.id)}`);
    } catch (error) {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Chưa mở được cuộc trò chuyện.');
    } finally {
      pending.current = null;
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  return <>
    <button type="button" className={actionClass} onClick={() => void start()} disabled={checking || loading}>
      {loading ? 'Đang mở cuộc trò chuyện…' : label}
    </button>
    {error && <p role="alert" className="mb-3 text-sm text-rose-700">{error}</p>}
  </>;
}

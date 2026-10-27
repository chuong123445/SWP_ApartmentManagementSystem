import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getAccountVerification, type AccountVerification } from '@/services/auth/vneidService';

export function useAccountVerification() {
  const { user } = useAuth(); const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{ accountId?: string; data: AccountVerification | null; loading: boolean; error: string }>({ data: null, loading: true, error: '' });
  useEffect(() => {
    const controller = new AbortController();
    setState({ accountId: user?.id, data: null, loading: true, error: '' });
    if (!user) return () => controller.abort();
    getAccountVerification(controller.signal).then(data => {
      if (!controller.signal.aborted) setState({ accountId: user.id, data, loading: false, error: '' });
    }).catch(error => {
      if (!controller.signal.aborted) setState({ accountId: user.id, data: null, loading: false,
        error: error instanceof Error ? error.message : 'Không tải được trạng thái xác thực.' });
    });
    return () => controller.abort();
  }, [user?.id, user?.version, revision]);
  return { ...state, data: state.accountId === user?.id ? state.data : null, reload: () => setRevision(value => value + 1) };
}

import { useEffect, useState } from 'react';
import { getRenewalInbox } from '@/services/contract/contractService';
import type { RenewalInboxItem } from '@/types/contract';
import type { PageResult } from '@/types/apartment';

export function useRenewalInbox(page: number, status?: RenewalInboxItem['status'], propertyId?: string) {
  const [data, setData] = useState<PageResult<RenewalInboxItem> | null>(null);
  const [loading, setLoading] = useState(true);const [error, setError] = useState('');const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;let inFlight = false;
    const load = async (silent = false) => {
      if (!active || inFlight) return;inFlight = true;
      if (!silent) { setLoading(true);setError(''); }
      try { const value = await getRenewalInbox(page, status, propertyId);if (active) { setData(value);setError(''); } }
      catch (error) { if (active) setError(error instanceof Error ? error.message : 'Không thể tải yêu cầu thuê tiếp.'); }
      finally { inFlight = false;if (active) setLoading(false); }
    };
    void load();const refresh = () => { if (document.visibilityState === 'visible') void load(true); };
    const timer = window.setInterval(refresh, 10000);
    window.addEventListener('focus', refresh);window.addEventListener('ancu:tenancy-changed', refresh);document.addEventListener('visibilitychange', refresh);
    return () => { active = false;window.clearInterval(timer);window.removeEventListener('focus', refresh);window.removeEventListener('ancu:tenancy-changed', refresh);document.removeEventListener('visibilitychange', refresh); };
  }, [page, status, propertyId, revision]);
  return { data, loading, error, reload: () => setRevision(value => value + 1) };
}

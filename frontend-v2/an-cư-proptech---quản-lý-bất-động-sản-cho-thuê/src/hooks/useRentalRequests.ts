import { useEffect, useState } from 'react';
import { getMyRentalRequests, getOwnerRentalRequests } from '@/services/rental/rentalService';
import type { PageResult } from '@/types/apartment';
import type { RentalRequest, RentalRequestStatus } from '@/types/rental';

export function useRentalRequests(owner: boolean, page: number, status?: RentalRequestStatus) {
  const [data, setData] = useState<PageResult<RentalRequest> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;let inFlight = false;
    const load = async (silent = false) => {
      if (inFlight || !active) return;
      inFlight = true;if (!silent) { setLoading(true);setError(''); }
      try {
        const result = owner ? await getOwnerRentalRequests(page, status) : await getMyRentalRequests(page);
        if (active) { setData(result);setError(''); }
      } catch (err) { if (active) setError(err instanceof Error ? err.message : 'Không thể tải yêu cầu thuê.'); }
      finally { inFlight = false;if (active) setLoading(false); }
    };
    void load();
    const refreshVisible = () => { if (document.visibilityState === 'visible') void load(true); };
    const timer = window.setInterval(refreshVisible, 10000);
    window.addEventListener('focus', refreshVisible);document.addEventListener('visibilitychange', refreshVisible);
    return () => { active = false;window.clearInterval(timer);window.removeEventListener('focus', refreshVisible);document.removeEventListener('visibilitychange', refreshVisible); };
  }, [owner, page, status, revision]);
  return { data, loading, error, reload: () => setRevision(value => value + 1) };
}

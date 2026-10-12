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
    let active = true;
    setLoading(true); setError('');
    const promise = owner ? getOwnerRentalRequests(page, status) : getMyRentalRequests(page);
    promise.then(result => { if (active) setData(result); }).catch(err => {
      if (active) setError(err instanceof Error ? err.message : 'Không thể tải yêu cầu thuê.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [owner, page, status, revision]);
  return { data, loading, error, reload: () => setRevision(value => value + 1) };
}

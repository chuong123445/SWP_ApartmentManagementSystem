import { useEffect, useState } from 'react';
import { getApartments } from '@/services/apartments/apartmentService';
import type { ApartmentFilters, ApartmentSummary, PageResult } from '@/types/apartment';

export function useApartments(filters: ApartmentFilters) {
  const [data, setData] = useState<PageResult<ApartmentSummary> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    getApartments(filters, controller.signal).then(setData).catch(err => {
      if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Không thể tải căn hộ.');
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [filters.q, filters.city, filters.district, filters.minRent, filters.maxRent, filters.page, filters.size, revision]);
  return { data, loading, error, reload: () => setRevision(value => value + 1) };
}

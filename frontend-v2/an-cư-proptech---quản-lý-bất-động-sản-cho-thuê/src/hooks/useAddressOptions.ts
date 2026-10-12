import { useEffect, useState } from 'react';
import { getAddressOptions } from '@/services/apartments/apartmentService';
import type { AddressOption } from '@/types/apartment';
export function useAddressOptions() {
  const [options, setOptions] = useState<AddressOption[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    getAddressOptions(controller.signal).then(data => { if (!controller.signal.aborted) setOptions(data); })
      .catch(error => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Không thể tải địa chỉ.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);
  return { options, error, loading };
}

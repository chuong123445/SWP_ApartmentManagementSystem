import { useEffect, useState } from 'react';
import { myInvoices } from '@/services/billing/billingService';
import type { BillingInvoice } from '@/types/billing';
import type { PageResult } from '@/types/apartment';
export function useTenantInvoices(enabled = true) {
  const [page, setPage] = useState(0); const [revision, setRevision] = useState(0);
  const [data, setData] = useState<PageResult<BillingInvoice> | null>(null);
  const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  const reload = () => setRevision(value => value + 1);
  useEffect(() => {
    if (!enabled) return;
    let active = true; setLoading(true); setError('');
    myInvoices(page).then(value => { if (active) setData(value); }).catch(e => { if (active) setError(e.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [enabled, page, revision]);
  useEffect(() => {
    if (!enabled) return;
    const refresh = () => { if (document.visibilityState === 'visible') reload(); };
    const timer = window.setInterval(refresh, 30000); window.addEventListener('focus', refresh);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [enabled]);
  return { data, error, loading, page, setPage, reload };
}

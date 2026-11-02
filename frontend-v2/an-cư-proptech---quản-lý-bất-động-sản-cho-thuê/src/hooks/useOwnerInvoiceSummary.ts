import { useEffect, useState } from 'react';
import { ownerInvoiceSummary } from '@/services/billing/billingService';

// This count covers the selected property, independently of the visible invoice page.
export function useOwnerInvoiceSummary(enabled: boolean, propertyId: string, revision: number) {
  const [state, setState] = useState<{ scope: string; count: number | null; error: string }>({ scope: '', count: null, error: '' });
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    let inFlight = false;
    setState({ scope: propertyId, count: null, error: '' });
    const load = async () => {
      if (!active || inFlight) return;
      inFlight = true;
      try {
        const summary = await ownerInvoiceSummary(propertyId === 'all' ? undefined : propertyId);
        if (active) setState({ scope: propertyId, count: summary.unpaidCount, error: '' });
      } catch (error) {
        if (active) setState({ scope: propertyId, count: null, error: error instanceof Error ? error.message : 'Không thể tải số hóa đơn chưa thanh toán.' });
      } finally { inFlight = false; }
    };
    const refresh = () => { if (document.visibilityState === 'visible') void load(); };
    void load();
    const timer = window.setInterval(refresh, 10000);
    window.addEventListener('focus', refresh);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [enabled, propertyId, revision]);
  return enabled && state.scope === propertyId ? state : { count: null, error: '' };
}

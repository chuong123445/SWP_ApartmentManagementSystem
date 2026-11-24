import { useCallback, useEffect, useState } from 'react';
import { getOwnerFinancialSummary, type FinancialScope } from '@/services/owner/financialService';
import type { OwnerFinancialSummary } from '@/types/financialReport';

export type PresetRange = 'THIS_MONTH' | 'LAST_3_MONTHS' | 'THIS_YEAR' | 'CUSTOM';

function getVnToday() {
  const now = new Date();
  const year = Number(new Intl.DateTimeFormat('en', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric' }).format(now));
  const month = Number(new Intl.DateTimeFormat('en', { timeZone: 'Asia/Ho_Chi_Minh', month: 'numeric' }).format(now));
  return { year, month, period: `${year}-${String(month).padStart(2, '0')}` };
}

function getMonthsAgoPeriod(monthsAgo: number) {
  const now = new Date();
  now.setMonth(now.getMonth() - monthsAgo);
  const year = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric' }).format(now);
  const month = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Ho_Chi_Minh', month: '2-digit' }).format(now);
  return `${year}-${month}`;
}

export function useOwnerFinancialSummary(enabled: boolean, propertyId: string, externalRevision: string) {
  const vn = getVnToday();
  const [fromMonth, setFromMonth] = useState(() => `${vn.year}-01`);
  const [toMonth, setToMonth] = useState(() => `${vn.year}-12`);
  const [year, setYear] = useState(() => vn.year);
  const [month, setMonth] = useState(() => vn.month);
  const [revision, setRevision] = useState(0);

  const reload = useCallback(() => setRevision(v => v + 1), []);

  const setRange = useCallback((from: string, to: string) => {
    setFromMonth(from);
    setToMonth(to);
    const endYear = Number(to.split('-')[0]);
    if (!Number.isNaN(endYear)) setYear(endYear);
  }, []);

  const setSingleYear = useCallback((newYear: number) => {
    setYear(newYear);
    setFromMonth(`${newYear}-01`);
    setToMonth(`${newYear}-12`);
  }, []);

  const applyPreset = useCallback((preset: 'THIS_MONTH' | 'LAST_3_MONTHS' | 'THIS_YEAR') => {
    const today = getVnToday();
    if (preset === 'THIS_MONTH') {
      setRange(today.period, today.period);
    } else if (preset === 'LAST_3_MONTHS') {
      setRange(getMonthsAgoPeriod(2), today.period);
    } else if (preset === 'THIS_YEAR') {
      setRange(`${today.year}-01`, `${today.year}-12`);
    }
  }, [setRange]);

  const activePreset: PresetRange = (() => {
    const today = getVnToday();
    if (fromMonth === today.period && toMonth === today.period) return 'THIS_MONTH';
    if (fromMonth === getMonthsAgoPeriod(2) && toMonth === today.period) return 'LAST_3_MONTHS';
    if (fromMonth === `${today.year}-01` && toMonth === `${today.year}-12`) return 'THIS_YEAR';
    return 'CUSTOM';
  })();

  const scope: FinancialScope = { fromMonth, toMonth, year };
  const key = JSON.stringify([propertyId, fromMonth, toMonth, revision, externalRevision]);
  const [snapshot, setSnapshot] = useState<{ key: string; data: OwnerFinancialSummary | null; error: string } | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    let running = false;
    const load = async () => {
      if (!active || running) return;
      running = true;
      try {
        const data = await getOwnerFinancialSummary(scope, propertyId);
        if (active) setSnapshot({ key, data, error: '' });
      } catch (e) {
        if (active) setSnapshot({ key, data: null, error: e instanceof Error ? e.message : 'Không tải được báo cáo.' });
      } finally {
        running = false;
      }
    };
    const refresh = () => { if (document.visibilityState === 'visible') void load(); };
    void load();
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [enabled, propertyId, fromMonth, toMonth, key]);

  const current = enabled && snapshot?.key === key ? snapshot : null;
  return {
    fromMonth,
    toMonth,
    setRange,
    year,
    setYear: setSingleYear,
    month,
    setMonth,
    applyPreset,
    activePreset,
    reload,
    data: current?.data ?? null,
    error: current?.error ?? '',
    loading: enabled && !current,
  };
}

export type OwnerFinancialReport = ReturnType<typeof useOwnerFinancialSummary>;

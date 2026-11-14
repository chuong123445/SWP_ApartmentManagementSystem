import { useEffect, useRef, useState } from 'react';
import { cashCreateIntent, cashSummary, listCashEntries } from '@/services/finance/cashService';
import type { CashDirection, CashStatus } from '@/types/finance';

export function cashToday() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
export function useCashbook(enabled: boolean, propertyId: string) {
  const [month, changeMonth] = useState(() => cashToday().slice(0, 7));
  const [direction, changeDirection] = useState<CashDirection | ''>('');
  const [status, changeStatus] = useState<CashStatus | ''>('');
  const scope = JSON.stringify([propertyId, month, direction, status]);
  const [pagination, setPagination] = useState({ scope, page: 0 });
  const page = pagination.scope === scope ? pagination.page : 0;
  const [revision, setRevision] = useState(0);
  const key = JSON.stringify([scope, page, revision, enabled]);
  const [data, setData] = useState<{ key: string; list?: Awaited<ReturnType<typeof listCashEntries>>; summary?: Awaited<ReturnType<typeof cashSummary>>; error?: string } | null>(null);
  const create = useRef(cashCreateIntent()).current;
  useEffect(() => {
    if (!enabled) return;
    let ignore = false;
    const filters = { month, propertyId, direction: direction || undefined, status: status || undefined };
    Promise.all([listCashEntries(filters, page), cashSummary(filters)])
      .then(([list, summary]) => { if (!ignore) setData({ key, list, summary }); })
      .catch(error => { if (!ignore) setData({ key, error: error instanceof Error ? error.message : 'Không tải được sổ quỹ.' }); });
    return () => { ignore = true; };
  }, [enabled, propertyId, month, direction, status, page, revision, key]);
  const current = data?.key === key ? data : null;
  return {
    month, setMonth: changeMonth, direction, setDirection: changeDirection, status, setStatus: changeStatus,
    page, setPage: (value: number) => setPagination({ scope, page: value }),
    list: current?.list, summary: current?.summary, error: current?.error ?? '', loading: enabled && !current,
    reload: () => setRevision(value => value + 1), create,
  };
}
export type Cashbook = ReturnType<typeof useCashbook>;

/**
 * Unit tests for reportUtils.ts
 *
 * Key conventions:
 * - All date-sensitive tests use vi.setSystemTime() so they do not break when
 *   the calendar month changes. Always call vi.useRealTimers() in afterEach.
 * - Period source of truth is apiInvoice.period ("YYYY-MM").
 *   inv.monthYear ("MM/YYYY") is display-only and parsed as fallback.
 * - Revenue = accrual: status !== DRAFT (see EXCLUDE_FROM_REVENUE in reportUtils).
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import {
  getTrailingMonths,
  getCurrentYearMonths,
  getInvoicePeriod,
  isRevenueInvoice,
  calculateMonthlyRevenueData,
  calculateYearlyRevenueData,
  calculateRevenueStructure,
  calculateBuildingOccupancy,
  calculateReportsSummary,
} from '@/utils/reportUtils';
import type { Room, Building, Contract, Invoice } from '@/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeInvoice(overrides: Partial<Invoice> & { period?: string; backendStatus?: 'DRAFT' | 'SENT' }): Invoice {
  const { period, backendStatus, ...rest } = overrides;
  return {
    id: 'inv-test',
    invoiceCode: 'HD-TEST',
    monthYear: period ? `${period.slice(5)}-${period.slice(0, 4)}`.replace('-', '/') : '10/2026',
    roomId: 'room-1',
    roomNumber: '101',
    tenantName: 'Tenant',
    tenantPhone: '',
    createdAt: '2026-10-01',
    dueDate: '2026-10-15',
    status: 'unpaid',
    paidAmount: 0,
    totalAmount: 5_000_000,
    items: [],
    ...rest,
    ...(period || backendStatus
      ? {
          apiInvoice: {
            id: 'inv-test',
            contractId: 'c-1',
            apartmentId: 'room-1',
            customerId: 'cust-1',
            roomNumber: '101',
            apartmentTitle: 'P.101',
            tenantName: 'Tenant',
            period: period ?? '2026-10',
            dueDate: '2026-10-15',
            monthlyRent: String(rest.totalAmount ?? 5_000_000),
            electricityStartReading: '0',
            electricityEndReading: '0',
            electricityQuantity: '0',
            electricityUnitPrice: '3500',
            electricityAmount: '0',
            waterStartReading: '0',
            waterEndReading: '0',
            waterQuantity: '0',
            waterUnitPrice: '15000',
            waterAmount: '0',
            totalAmount: String(rest.totalAmount ?? 5_000_000),
            status: backendStatus ?? 'SENT',
            createdAt: '2026-10-01',
            sentAt: '2026-10-01',
            version: 1,
          },
        }
      : {}),
  };
}

// ---------------------------------------------------------------------------
// getTrailingMonths
// ---------------------------------------------------------------------------
describe('getTrailingMonths', () => {
  it('returns N consecutive months ending at the reference date', () => {
    const ref = new Date(2026, 9, 15); // Oct 2026
    const months = getTrailingMonths(6, ref);
    expect(months).toEqual(['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10']);
  });

  it('crosses year boundary correctly (Jan 2027 → trailing 6 months include 2026)', () => {
    const ref = new Date(2027, 0, 15); // Jan 2027
    const months = getTrailingMonths(6, ref);
    expect(months).toEqual([
      '2026-08', '2026-09', '2026-10', '2026-11', '2026-12', '2027-01',
    ]);
  });

  it('does not produce month=0 or negative months', () => {
    const ref = new Date(2027, 0, 1);
    const months = getTrailingMonths(6, ref);
    months.forEach((m) => {
      const [, mm] = m.split('-').map(Number);
      expect(mm).toBeGreaterThanOrEqual(1);
      expect(mm).toBeLessThanOrEqual(12);
    });
  });

  it('returns single month when count=1', () => {
    expect(getTrailingMonths(1, new Date(2026, 0, 1))).toEqual(['2026-01']);
  });
});

// ---------------------------------------------------------------------------
// getCurrentYearMonths
// ---------------------------------------------------------------------------
describe('getCurrentYearMonths', () => {
  it('returns 12 months for the given year', () => {
    const months = getCurrentYearMonths(2026);
    expect(months).toHaveLength(12);
    expect(months[0]).toBe('2026-01');
    expect(months[11]).toBe('2026-12');
  });

  it('works across year boundary (2025)', () => {
    const months = getCurrentYearMonths(2025);
    expect(months[0]).toBe('2025-01');
    expect(months[11]).toBe('2025-12');
  });
});

// ---------------------------------------------------------------------------
// getInvoicePeriod
// ---------------------------------------------------------------------------
describe('getInvoicePeriod', () => {
  it('prefers apiInvoice.period over monthYear', () => {
    const inv = makeInvoice({ period: '2026-09' });
    inv.monthYear = '10/2026'; // deliberately different
    expect(getInvoicePeriod(inv)).toBe('2026-09');
  });

  it('falls back to parsing monthYear "MM/YYYY" when no apiInvoice', () => {
    const inv: Invoice = {
      id: 'x', invoiceCode: 'X', monthYear: '09/2026', roomId: 'r', roomNumber: '101',
      tenantName: 'T', tenantPhone: '', createdAt: '', dueDate: '', status: 'unpaid',
      paidAmount: 0, totalAmount: 0, items: [],
    };
    expect(getInvoicePeriod(inv)).toBe('2026-09');
  });

  it('returns null for invalid monthYear format — does not crash', () => {
    const inv: Invoice = {
      id: 'x', invoiceCode: 'X', monthYear: 'invalid-date', roomId: 'r', roomNumber: '101',
      tenantName: 'T', tenantPhone: '', createdAt: '', dueDate: '', status: 'unpaid',
      paidAmount: 0, totalAmount: 0, items: [],
    };
    expect(getInvoicePeriod(inv)).toBeNull();
  });

  it('returns null for empty monthYear', () => {
    const inv: Invoice = {
      id: 'x', invoiceCode: 'X', monthYear: '', roomId: 'r', roomNumber: '101',
      tenantName: 'T', tenantPhone: '', createdAt: '', dueDate: '', status: 'unpaid',
      paidAmount: 0, totalAmount: 0, items: [],
    };
    expect(getInvoicePeriod(inv)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// isRevenueInvoice
// ---------------------------------------------------------------------------
describe('isRevenueInvoice', () => {
  it('includes SENT invoices', () => {
    expect(isRevenueInvoice(makeInvoice({ backendStatus: 'SENT' }))).toBe(true);
  });

  it('excludes DRAFT invoices', () => {
    expect(isRevenueInvoice(makeInvoice({ backendStatus: 'DRAFT' }))).toBe(false);
  });

  it('includes UI-only invoices (no apiInvoice) by default', () => {
    const inv: Invoice = {
      id: 'x', invoiceCode: 'X', monthYear: '10/2026', roomId: 'r', roomNumber: '101',
      tenantName: 'T', tenantPhone: '', createdAt: '', dueDate: '', status: 'unpaid',
      paidAmount: 0, totalAmount: 5_000_000, items: [],
    };
    expect(isRevenueInvoice(inv)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// calculateYearlyRevenueData — period vs issueDate
// ---------------------------------------------------------------------------
describe('calculateYearlyRevenueData — period assignment', () => {
  afterEach(() => vi.useRealTimers());

  it('assigns invoice to its billing period year, not issueDate year', () => {
    // Invoice for Dec 2025 issued on Jan 5, 2026
    const inv = makeInvoice({ period: '2025-12', totalAmount: 5_000_000 });
    if (inv.apiInvoice) inv.apiInvoice.createdAt = '2026-01-05'; // issueDate = 2026

    const ref2025 = new Date(2025, 11, 31); // Dec 2025
    const ref2026 = new Date(2026, 9, 1);  // Oct 2026

    const data2025 = calculateYearlyRevenueData([inv], 2025, ref2025);
    const data2026 = calculateYearlyRevenueData([inv], 2026, ref2026);

    expect(data2025[11].revenue).toBe(5.0);  // T12/2025 → 5 triệu
    expect(data2026[0].revenue).toBe(0);     // T01/2026 không bị tính
  });

  it('marks future months isFuture=true', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-15'));
    const ref = new Date();
    const data = calculateYearlyRevenueData([], 2026, ref);

    // T11 and T12 are future
    expect(data[10].isFuture).toBe(true); // T11
    expect(data[11].isFuture).toBe(true); // T12
    // T10 is current
    expect(data[9].isCurrent).toBe(true);
    expect(data[9].isFuture).toBe(false);
    // T01–T09 are past
    for (let i = 0; i < 9; i++) {
      expect(data[i].isFuture).toBe(false);
      expect(data[i].isCurrent).toBe(false);
    }
  });

  it('future months always have revenue=0 regardless of invoices', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-15'));
    const ref = new Date();
    // Invoice dated Nov 2026 (future)
    const inv = makeInvoice({ period: '2026-11', totalAmount: 6_000_000 });
    const data = calculateYearlyRevenueData([inv], 2026, ref);
    const nov = data.find((m) => m.month === 'T11')!;
    expect(nov.isFuture).toBe(true);
    expect(nov.revenue).toBe(0); // future → always 0, regardless
  });
});

// ---------------------------------------------------------------------------
// calculateMonthlyRevenueData — Dashboard 6 months
// ---------------------------------------------------------------------------
describe('calculateMonthlyRevenueData — Dashboard', () => {
  afterEach(() => vi.useRealTimers());

  it('returns 6 items anchored to refDate', () => {
    const ref = new Date(2026, 9, 15);
    const data = calculateMonthlyRevenueData([], [], 6, ref);
    expect(data).toHaveLength(6);
    expect(data[0].month).toBe('T05');
    expect(data[5].month).toBe('T10');
  });

  it('handles year boundary: Jan 2027 trailing 6 months', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2027-01-15'));
    const ref = new Date();
    const data = calculateMonthlyRevenueData([], [], 6, ref);
    expect(data.map((m) => m.month)).toEqual(['T08', 'T09', 'T10', 'T11', 'T12', 'T01']);
  });

  it('places invoice in the correct month slot', () => {
    const ref = new Date(2026, 9, 15); // Oct 2026
    const inv = makeInvoice({ period: '2026-09', totalAmount: 6_000_000 });
    const data = calculateMonthlyRevenueData([inv], [], 6, ref);
    const sep = data.find((m) => m.month === 'T09')!;
    expect(sep.revenue).toBe(6.0);
    const oct = data.find((m) => m.month === 'T10')!;
    expect(oct.revenue).toBe(0); // not yet invoiced
  });

  it('does not project from active contracts when invoices are empty', () => {
    const ref = new Date(2026, 9, 15);
    const contracts: Contract[] = [
      {
        id: 'c-1', contractNumber: 'HD-01', tenantId: 't-1', tenantName: 'A',
        roomId: 'r-1', roomNumber: '101', buildingName: 'B1',
        startDate: '2026-01-01', endDate: '2026-12-31',
        monthlyRent: 11_500_000, deposit: 0, paymentCycle: 1, status: 'active',
      },
    ];
    const data = calculateMonthlyRevenueData([], contracts, 6, ref);
    expect(data.every((m) => m.revenue === 0)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// DRAFT exclusion from revenue
// ---------------------------------------------------------------------------
describe('DRAFT invoice exclusion', () => {
  it('excludes DRAFT from revenue calculation', () => {
    const ref = new Date(2026, 9, 15);
    const draft = makeInvoice({ period: '2026-09', backendStatus: 'DRAFT', totalAmount: 5_000_000 });
    const sent = makeInvoice({ period: '2026-08', backendStatus: 'SENT', totalAmount: 4_000_000 });
    const data = calculateMonthlyRevenueData([draft, sent], [], 6, ref);

    const sep = data.find((m) => m.month === 'T09')!;
    expect(sep.revenue).toBe(0); // DRAFT → excluded

    const aug = data.find((m) => m.month === 'T08')!;
    expect(aug.revenue).toBe(4.0); // SENT → included
  });

  it('excludes DRAFT from cumulative revenue in summary', () => {
    const ref = new Date(2026, 9, 15);
    const rooms: Room[] = [{ id: 'r-1', roomNumber: '101', buildingId: 'b-1', floor: 1, area: 30, price: 5_000_000, status: 'rented', electricityIndex: 0, waterIndex: 0, amenities: [], maxOccupants: 2 }];
    const buildings: Building[] = [{ id: 'b-1', name: 'Tòa 1', address: '', totalRooms: 1, pcccCertified: true, legalStatus: 'APPROVED' }];
    const invoices = [
      makeInvoice({ period: '2026-09', backendStatus: 'SENT', totalAmount: 5_000_000 }),
      makeInvoice({ period: '2026-10', backendStatus: 'DRAFT', totalAmount: 5_000_000 }),
    ];
    const summary = calculateReportsSummary(rooms, buildings, invoices, [], 'all', ref);
    expect(summary.invoiceCount).toBe(1);       // only SENT
    expect(summary.cumulativeRevenue).toBe(5_000_000); // only SENT
  });
});

// ---------------------------------------------------------------------------
// isFuture months excluded from meaningful totals
// ---------------------------------------------------------------------------
describe('Future months do not pollute totals', () => {
  afterEach(() => vi.useRealTimers());

  it('revenue total is not inflated by future month zeros', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-15'));
    const ref = new Date();
    const inv = makeInvoice({ period: '2026-05', backendStatus: 'SENT', totalAmount: 5_000_000 });
    const data = calculateYearlyRevenueData([inv], 2026, ref);

    // Only T05 has revenue; T11 and T12 are future with isFuture=true
    const nonFuture = data.filter((m) => !m.isFuture);
    const total = nonFuture.reduce((s, m) => s + m.revenue, 0);
    expect(total).toBe(5.0); // only the one real invoice
    expect(data.filter((m) => m.isFuture).every((m) => m.revenue === 0)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// calculateRevenueStructure
// ---------------------------------------------------------------------------
describe('calculateRevenueStructure', () => {
  it('computes percentages from SENT invoices only, excludes DRAFT', () => {
    // Use apiInvoice fields as source of truth for amounts
    const sent = makeInvoice({ period: '2026-10', backendStatus: 'SENT', totalAmount: 10_000_000 });
    if (sent.apiInvoice) {
      sent.apiInvoice.monthlyRent = '8000000';
      sent.apiInvoice.electricityAmount = '1000000';
      sent.apiInvoice.waterAmount = '500000';
      sent.apiInvoice.totalAmount = '10000000';
    }
    const draft = makeInvoice({ period: '2026-10', backendStatus: 'DRAFT', totalAmount: 99_000_000 });
    const structure = calculateRevenueStructure([sent, draft]);
    const rent = structure.find((s) => s.name === 'Tiền thuê phòng')!;
    const elec = structure.find((s) => s.name === 'Tiền điện')!;
    const water = structure.find((s) => s.name === 'Tiền nước')!;
    expect(rent.value).toBe(80); // 8M / 10M — based only on SENT invoice
    expect(elec.value).toBe(10);
    expect(water.value).toBe(5);
  });

  it('returns 100% placeholder when no revenue invoices exist', () => {
    const structure = calculateRevenueStructure([]);
    expect(structure.find((s) => s.name === 'Tiền thuê phòng')!.value).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// calculateReportsSummary — scope & year dynamic
// ---------------------------------------------------------------------------
describe('calculateReportsSummary', () => {
  const ref = new Date(2026, 9, 15); // Oct 2026

  it('scopes to single building correctly', () => {
    const buildings: Building[] = [
      { id: 'b-1', name: 'Tòa 1', address: '', totalRooms: 1, pcccCertified: true, legalStatus: 'APPROVED' },
      { id: 'b-2', name: 'Tòa 2', address: '', totalRooms: 1, pcccCertified: true, legalStatus: 'APPROVED' },
    ];
    const rooms: Room[] = [
      { id: 'r-1', roomNumber: '101', buildingId: 'b-1', floor: 1, area: 30, price: 5_000_000, status: 'rented', electricityIndex: 0, waterIndex: 0, amenities: [], maxOccupants: 2 },
      { id: 'r-2', roomNumber: '201', buildingId: 'b-2', floor: 2, area: 30, price: 8_000_000, status: 'rented', electricityIndex: 0, waterIndex: 0, amenities: [], maxOccupants: 2 },
    ];
    const invoices = [
      makeInvoice({ period: '2026-09', backendStatus: 'SENT', totalAmount: 5_000_000, roomId: 'r-1' }),
      makeInvoice({ period: '2026-09', backendStatus: 'SENT', totalAmount: 8_000_000, roomId: 'r-2' }),
    ];

    const all = calculateReportsSummary(rooms, buildings, invoices, [], 'all', ref);
    expect(all.cumulativeRevenue).toBe(13_000_000);

    const b1 = calculateReportsSummary(rooms, buildings, invoices, [], 'b-1', ref);
    expect(b1.cumulativeRevenue).toBe(5_000_000);
    expect(b1.invoiceCount).toBe(1);
  });

  it('monthlyRevenueData has 12 items for the reference year', () => {
    const summary = calculateReportsSummary([], [], [], [], 'all', ref);
    expect(summary.monthlyRevenueData).toHaveLength(12);
    expect(summary.monthlyRevenueData[0].month).toBe('T01');
    expect(summary.monthlyRevenueData[11].month).toBe('T12');
  });

  it('currentYear is dynamic — not hardcoded 2026', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2030-06-01'));
    const refFuture = new Date();
    const summary = calculateReportsSummary([], [], [], [], 'all', refFuture);
    // Should show 12 months of 2030, not 2026
    expect(summary.monthlyRevenueData[0].month).toBe('T01');
    expect(summary.monthlyRevenueData.filter((m) => m.isFuture).length).toBeGreaterThan(0);
    vi.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// calculateBuildingOccupancy
// ---------------------------------------------------------------------------
describe('calculateBuildingOccupancy', () => {
  it('uses invoice revenue when available; contract revenue only as fallback', () => {
    const buildings: Building[] = [
      { id: 'b-1', name: 'Tòa 1', address: '', totalRooms: 1, pcccCertified: true, legalStatus: 'APPROVED' },
    ];
    const rooms: Room[] = [
      { id: 'r-1', roomNumber: '101', buildingId: 'b-1', floor: 1, area: 30, price: 5_000_000, status: 'rented', electricityIndex: 0, waterIndex: 0, amenities: [], maxOccupants: 2 },
    ];
    const inv = makeInvoice({ period: '2026-10', backendStatus: 'SENT', totalAmount: 5_500_000, roomId: 'r-1' });
    const contracts: Contract[] = [
      { id: 'c-1', contractNumber: 'HD-01', tenantId: 't-1', tenantName: 'A', roomId: 'r-1', roomNumber: '101', buildingName: 'Tòa 1', startDate: '2026-10-01', endDate: '2027-09-30', monthlyRent: 99_000_000, deposit: 0, paymentCycle: 1, status: 'active' },
    ];
    // Invoice exists → should use invoice revenue (5.5M), not contract (99M)
    const perf = calculateBuildingOccupancy(buildings, rooms, [inv], contracts);
    expect(perf[0].revenue).toBe(5.5);
  });
});

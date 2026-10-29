import { Room, Building, Contract, Invoice } from '@/types';

// ---------------------------------------------------------------------------
// NOTE (2026-10): Frontend Invoice.status ('paid'|'unpaid'|'overdue') is a
// UI-derived mapping and does NOT match backend statuses (DRAFT, SENT).
// All revenue calculations MUST use apiInvoice.status (backend source of truth).
// When backend adds PAID / OVERDUE / CANCELLED, update the EXCLUDE_FROM_REVENUE
// constant below — do not hardcode 'SENT' anywhere in revenue logic.
//
// Period source of truth: apiInvoice.period (format "YYYY-MM").
// inv.monthYear ("MM/YYYY") is for display only.
// ---------------------------------------------------------------------------

/** Backend invoice statuses excluded from accrual revenue recognition. */
const EXCLUDE_FROM_REVENUE = new Set(['DRAFT']);

export interface MonthlyChartItem {
  month: string;
  revenue: number;
  profit: number;
  /** True when this month is strictly after the current calendar month. */
  isFuture: boolean;
  /** True when this month equals the current calendar month (invoice may not exist yet). */
  isCurrent: boolean;
}

export interface RevenueStructureItem {
  name: string;
  value: number;
  color: string;
}

export interface BuildingPerformanceItem {
  name: string;
  occupancy: number;
  rooms: number;
  revenue: number;
}

export interface ReportsSummary {
  cumulativeRevenue: number;
  cumulativeRevenueFormatted: string;
  averageRevenuePerRoom: number;
  averageRevenuePerRoomFormatted: string;
  onTimeCollectionRate: number;
  onTimeCollectionRateFormatted: string;
  invoiceCount: number;
  monthlyRevenueData: MonthlyChartItem[];
  revenueStructure: RevenueStructureItem[];
  buildingOccupancy: BuildingPerformanceItem[];
}

// ---------------------------------------------------------------------------
// Period helpers
// ---------------------------------------------------------------------------

/**
 * Returns the canonical billing period ("YYYY-MM") for an invoice.
 * Prefers apiInvoice.period; falls back to parsing inv.monthYear ("MM/YYYY").
 * Returns null if period cannot be determined.
 */
export function getInvoicePeriod(inv: Invoice): string | null {
  if (inv.apiInvoice?.period) return inv.apiInvoice.period;
  // Parse "MM/YYYY" → "YYYY-MM"
  if (inv.monthYear) {
    const parts = inv.monthYear.split('/');
    if (parts.length === 2 && parts[0].length <= 2 && parts[1].length === 4) {
      return `${parts[1]}-${parts[0].padStart(2, '0')}`;
    }
  }
  return null;
}

/**
 * Returns true when an invoice should be counted as accrual revenue.
 * Excludes DRAFT and any future excluded statuses (e.g. CANCELLED).
 * If apiInvoice is absent (UI-only invoice), includes by default.
 */
export function isRevenueInvoice(inv: Invoice): boolean {
  const backendStatus = inv.apiInvoice?.status;
  if (!backendStatus) return true; // UI-only invoice: include by default
  return !EXCLUDE_FROM_REVENUE.has(backendStatus);
}

/**
 * Generate the trailing N months ("YYYY-MM") ending at the reference date.
 * Used for Dashboard short-term view (default 6 months).
 */
export function getTrailingMonths(count = 6, refDate = new Date()): string[] {
  const months: string[] = [];
  const year = refDate.getFullYear();
  const month = refDate.getMonth(); // 0-indexed
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(year, month - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return months;
}

/**
 * Generate all 12 months of the given year ("YYYY-MM"), January through December.
 * Used for the annual Reports page view.
 */
export function getCurrentYearMonths(year = new Date().getFullYear()): string[] {
  return Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);
}

// ---------------------------------------------------------------------------
// Chart data builders
// ---------------------------------------------------------------------------

/**
 * Builds MonthlyChartItem[] from a list of canonical periods and revenue invoices.
 * - Months after the current calendar month → isFuture=true, revenue=0.
 * - Current month → isCurrent=true (may have 0 if not yet invoiced).
 * - Only invoices passing isRevenueInvoice() (accrual, status ≠ DRAFT) are counted.
 */
function _buildMonthlyItems(
  periods: string[],
  invoices: Invoice[],
  refDate = new Date()
): MonthlyChartItem[] {
  const currentPeriod = `${refDate.getFullYear()}-${String(refDate.getMonth() + 1).padStart(2, '0')}`;
  const revenueInvoices = invoices.filter(isRevenueInvoice);

  return periods.map((period) => {
    const [, monthNum] = period.split('-');
    const label = `T${monthNum}`;
    const isFuture = period > currentPeriod;
    const isCurrent = period === currentPeriod;

    if (isFuture) {
      return { month: label, revenue: 0, profit: 0, isFuture: true, isCurrent: false };
    }

    const periodInvoices = revenueInvoices.filter((inv) => getInvoicePeriod(inv) === period);

    if (periodInvoices.length === 0) {
      return { month: label, revenue: 0, profit: 0, isFuture: false, isCurrent };
    }

    const totalRev = periodInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

    const netProfit = periodInvoices.reduce((sum, inv) => {
      const elecAmt = Number(inv.apiInvoice?.electricityAmount || 0) ||
        inv.items.find((it) => it.name.includes('điện'))?.amount || 0;
      const waterAmt = Number(inv.apiInvoice?.waterAmount || 0) ||
        inv.items.find((it) => it.name.includes('nước'))?.amount || 0;
      const rentAmt = Number(inv.apiInvoice?.monthlyRent || 0) ||
        inv.items.find((it) => it.name.includes('thuê'))?.amount || 0;
      if (rentAmt > 0) return sum + rentAmt;
      return sum + Math.max(0, (inv.totalAmount || 0) - elecAmt - waterAmt);
    }, 0);

    return {
      month: label,
      revenue: Number((totalRev / 1_000_000).toFixed(1)),
      profit: Number((netProfit / 1_000_000).toFixed(1)),
      isFuture: false,
      isCurrent,
    };
  });
}

/**
 * Calculates trailing N-month revenue for the Dashboard.
 * No fallback from contracts — only accrual invoices (status ≠ DRAFT).
 */
export function calculateMonthlyRevenueData(
  invoices: Invoice[] = [],
  _contracts: Contract[] = [],
  monthCount = 6,
  refDate = new Date()
): MonthlyChartItem[] {
  return _buildMonthlyItems(getTrailingMonths(monthCount, refDate), invoices, refDate);
}

/**
 * Calculates revenue for all 12 months of a given year.
 * Future months are flagged isFuture=true so the chart can render them differently.
 */
export function calculateYearlyRevenueData(
  invoices: Invoice[] = [],
  year = new Date().getFullYear(),
  refDate = new Date()
): MonthlyChartItem[] {
  return _buildMonthlyItems(getCurrentYearMonths(year), invoices, refDate);
}

// ---------------------------------------------------------------------------
// Revenue structure
// ---------------------------------------------------------------------------

/**
 * Calculates breakdown of revenue sources from accrual invoices (status ≠ DRAFT).
 * Returns a 100%-rent placeholder when no qualifying invoices exist.
 */
export function calculateRevenueStructure(
  invoices: Invoice[] = [],
  _contracts: Contract[] = []
): RevenueStructureItem[] {
  const revenueInvoices = invoices.filter(isRevenueInvoice);
  let rentSum = 0, elecSum = 0, waterSum = 0, otherSum = 0;

  for (const inv of revenueInvoices) {
    const elec = Number(inv.apiInvoice?.electricityAmount || 0) ||
      inv.items.find((it) => it.name.includes('điện'))?.amount || 0;
    const water = Number(inv.apiInvoice?.waterAmount || 0) ||
      inv.items.find((it) => it.name.includes('nước'))?.amount || 0;
    const rent = Number(inv.apiInvoice?.monthlyRent || 0) ||
      inv.items.find((it) => it.name.includes('thuê'))?.amount || 0;
    const total = inv.totalAmount || 0;

    elecSum += elec;
    waterSum += water;
    if (rent > 0) {
      rentSum += rent;
      otherSum += Math.max(0, total - rent - elec - water);
    } else {
      rentSum += Math.max(0, total - elec - water);
    }
  }

  const grand = rentSum + elecSum + waterSum + otherSum;
  if (grand === 0) {
    return [
      { name: 'Tiền thuê phòng', value: 100, color: '#059669' },
      { name: 'Tiền điện', value: 0, color: '#f59e0b' },
      { name: 'Tiền nước', value: 0, color: '#0284c7' },
      { name: 'Internet & Dịch vụ', value: 0, color: '#8b5cf6' },
    ];
  }

  const pct = (v: number) => Math.round((v / grand) * 100);
  return [
    { name: 'Tiền thuê phòng', value: pct(rentSum), color: '#059669' },
    { name: 'Tiền điện', value: pct(elecSum), color: '#f59e0b' },
    { name: 'Tiền nước', value: pct(waterSum), color: '#0284c7' },
    { name: 'Internet & Dịch vụ', value: pct(otherSum), color: '#8b5cf6' },
  ];
}

// ---------------------------------------------------------------------------
// Building occupancy
// ---------------------------------------------------------------------------

/**
 * Per-building occupancy and revenue from accrual invoices.
 * When no invoices exist, shows contracted monthly rent for display.
 */
export function calculateBuildingOccupancy(
  buildings: Building[] = [],
  rooms: Room[] = [],
  invoices: Invoice[] = [],
  contracts: Contract[] = []
): BuildingPerformanceItem[] {
  const revenueInvoices = invoices.filter(isRevenueInvoice);

  return buildings.map((b) => {
    const buildingRooms = rooms.filter((r) => r.buildingId === b.id);
    const roomIds = new Set(buildingRooms.map((r) => r.id));

    const occupied = buildingRooms.filter(
      (r) =>
        r.status === 'rented' ||
        r.status === 'expiring' ||
        (r as unknown as { availability?: string }).availability === 'OCCUPIED'
    ).length;
    const occupancy = buildingRooms.length > 0
      ? Math.round((occupied / buildingRooms.length) * 100)
      : 0;

    const invoiceRevenue = revenueInvoices
      .filter((inv) => roomIds.has(inv.roomId))
      .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

    const contractRevenue = invoiceRevenue === 0
      ? contracts
          .filter((c) => c.status === 'active' && roomIds.has(c.roomId))
          .reduce((sum, c) => sum + (c.monthlyRent || 0), 0)
      : 0;

    return {
      name: b.name,
      occupancy,
      rooms: buildingRooms.length,
      revenue: Number(((invoiceRevenue || contractRevenue) / 1_000_000).toFixed(1)),
    };
  });
}

// ---------------------------------------------------------------------------
// Aggregate summary
// ---------------------------------------------------------------------------

/**
 * Aggregates all report KPIs for the Reports page.
 * Cumulative revenue is strictly accrual (status ≠ DRAFT) from real invoices.
 * Monthly chart shows 12 months of the current year with isFuture flag for visual handling.
 */
export function calculateReportsSummary(
  rooms: Room[] = [],
  buildings: Building[] = [],
  invoices: Invoice[] = [],
  contracts: Contract[] = [],
  selectedPropertyId = 'all',
  refDate = new Date()
): ReportsSummary {
  const isAll = selectedPropertyId === 'all';
  const scopedRooms = isAll ? rooms : rooms.filter((r) => r.buildingId === selectedPropertyId);
  const scopedRoomIds = new Set(scopedRooms.map((r) => r.id));

  const scopedInvoices = isAll ? invoices : invoices.filter((i) => scopedRoomIds.has(i.roomId));
  const scopedContracts = isAll ? contracts : contracts.filter((c) => scopedRoomIds.has(c.roomId));
  const scopedBuildings = isAll ? buildings : buildings.filter((b) => b.id === selectedPropertyId);

  const revenueInvoices = scopedInvoices.filter(isRevenueInvoice);

  // Cumulative revenue: accrual only — no contract-based projection
  const cumulativeRevenue = revenueInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

  const cumulativeRevenueFormatted =
    cumulativeRevenue >= 1_000_000
      ? `${(cumulativeRevenue / 1_000_000).toLocaleString('vi-VN', {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        })} Triệu VNĐ`
      : `${Math.round(cumulativeRevenue).toLocaleString('vi-VN')} đ`;

  const occupiedRoomsCount = scopedRooms.filter(
    (r) =>
      r.status === 'rented' ||
      r.status === 'expiring' ||
      (r as unknown as { availability?: string }).availability === 'OCCUPIED'
  ).length;
  const divisor = occupiedRoomsCount > 0 ? occupiedRoomsCount : scopedRooms.length;
  const averageRevenuePerRoom = divisor > 0 ? cumulativeRevenue / divisor : 0;
  const averageRevenuePerRoomFormatted = `${Math.round(averageRevenuePerRoom).toLocaleString('vi-VN')} đ`;

  let onTimeCollectionRate = 100;
  if (revenueInvoices.length > 0) {
    const overdueCount = revenueInvoices.filter((i) => i.status === 'overdue').length;
    onTimeCollectionRate = ((revenueInvoices.length - overdueCount) / revenueInvoices.length) * 100;
  }
  const onTimeCollectionRateFormatted = `${onTimeCollectionRate.toFixed(1)}%`;

  return {
    cumulativeRevenue,
    cumulativeRevenueFormatted,
    averageRevenuePerRoom,
    averageRevenuePerRoomFormatted,
    onTimeCollectionRate,
    onTimeCollectionRateFormatted,
    invoiceCount: revenueInvoices.length,
    monthlyRevenueData: calculateYearlyRevenueData(scopedInvoices, refDate.getFullYear(), refDate),
    revenueStructure: calculateRevenueStructure(scopedInvoices, scopedContracts),
    buildingOccupancy: calculateBuildingOccupancy(scopedBuildings, scopedRooms, scopedInvoices, scopedContracts),
  };
}

// ---------------------------------------------------------------------------
// CSV Export
// ---------------------------------------------------------------------------

export function exportReportsToCsv(summary: ReportsSummary, buildings: Building[], invoices: Invoice[]) {
  const bom = '\uFEFF';
  const rows: string[] = [
    'BÁO CÁO HOẠT ĐỘNG VÀ HIỆU QUẢ KINH DOANH - AN CƯ PROPTECH',
    `Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`,
    '',
    'CHỈ SỐ TỔNG QUAN',
    `Doanh thu lũy kế,${summary.cumulativeRevenueFormatted}`,
    `Doanh thu trung bình / phòng,${summary.averageRevenuePerRoomFormatted}`,
    `Tỷ lệ thu hồi đúng hạn,${summary.onTimeCollectionRateFormatted}`,
    `Tổng số hóa đơn phát hành,${summary.invoiceCount}`,
    '',
    'HIỆU SUẤT KHAI THÁC TỪNG TÒA NHÀ',
    'Tên tòa nhà,Quy mô (phòng),Tỷ lệ lấp đầy (%),Doanh thu (Triệu VNĐ/tháng)',
    ...summary.buildingOccupancy.map((b) => `"${b.name}",${b.rooms},${b.occupancy}%,${b.revenue}`),
    '',
    'DOANH THU THEO THÁNG (hóa đơn phát hành)',
    'Tháng,Tổng thu (Triệu VNĐ),Lợi nhuận ròng (Triệu VNĐ),Ghi chú',
    ...summary.monthlyRevenueData.map((m) =>
      `${m.month},${m.isFuture ? '' : m.revenue},${m.isFuture ? '' : m.profit},${m.isFuture ? 'Chưa đến kỳ' : m.isCurrent ? 'Đang diễn ra' : ''}`
    ),
    '',
    'CƠ CẤU NGUỒN THU',
    'Khoản thu,Tỷ trọng (%)',
    ...summary.revenueStructure.map((s) => `"${s.name}",${s.value}%`),
    '',
    'DANH SÁCH HÓA ĐƠN PHÁT HÀNH',
    'Mã hóa đơn,Kỳ,Phòng,Khách thuê,Tổng tiền (VNĐ),Trạng thái backend,Hạn thanh toán',
    ...invoices
      .filter(isRevenueInvoice)
      .map(
        (inv) =>
          `"${inv.invoiceCode}","${inv.apiInvoice?.period ?? inv.monthYear}","${inv.roomNumber}","${inv.tenantName}",${inv.totalAmount},"${inv.apiInvoice?.status ?? 'N/A'}","${inv.dueDate}"`
      ),
  ];

  const csvContent = bom + rows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Bao-Cao-Tai-Chinh-AnCu-${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

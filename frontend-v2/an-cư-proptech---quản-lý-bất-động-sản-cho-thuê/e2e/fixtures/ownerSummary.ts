import type { Route } from '@playwright/test';

export function ownerSummaryFixture(route: Route): Promise<void> | undefined {
  const { pathname, searchParams } = new URL(route.request().url());
  const propertyId = searchParams.get('propertyId');
  const asOf = '2026-11-13';
  if (pathname === '/api/v1/owner/workspace-summary') {
    return route.fulfill({ json: {
      propertyId, asOf, expiringThrough: '2026-12-03', unpaidMonthlyInvoiceCount: 0,
      unpaidAdditionalReceiptCount: 0, unpaidCount: 0, expiringContractCount: 0, expiredContractCount: 0,
    } });
  }
  if (pathname === '/api/v1/owner/financial-summary') {
    const year = Number(searchParams.get('year'));
    const totals = {
      invoiceCount: 0, paidInvoiceCount: 0, onTimePaidInvoiceCount: 0, billedAmount: '0',
      paidInvoiceAmount: '0', unpaidInvoiceAmount: '0', rentAmount: '0',
      electricityAmount: '0', waterAmount: '0', serviceAmount: '0',
    };
    const receipts = { monthlyInvoiceAmount: '0', additionalAmount: '0', totalAmount: '0' };
    return route.fulfill({ json: {
      propertyId, year, asOf, totals, receipts, inventory: { units: 0, occupied: 0, vacant: 0 },
      arrears: { monthlyInvoiceCount: 0, monthlyInvoiceAmount: '0', overdueInvoiceCount: 0, overdueInvoiceAmount: '0', additionalCount: 0, additionalAmount: '0' },
      properties: [],
      months: Array.from({ length: 12 }, (_, index) => ({
        period: `${year}-${String(index + 1).padStart(2, '0')}`, invoices: totals, receipts,
      })),
    } });
  }
}

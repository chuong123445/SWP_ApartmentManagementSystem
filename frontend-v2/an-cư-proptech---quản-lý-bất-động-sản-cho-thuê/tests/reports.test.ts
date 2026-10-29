import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  calculateReportsSummary,
  calculateMonthlyRevenueData,
  calculateRevenueStructure,
  calculateBuildingOccupancy,
  getTrailingMonths,
} from '@/utils/reportUtils';
import type { Room, Building, Contract, Invoice } from '@/types';

test('getTrailingMonths returns N consecutive months ending in reference date', () => {
  const ref = new Date(2026, 9, 15); // October 2026
  const months = getTrailingMonths(6, ref);
  assert.equal(months.length, 6);
  assert.equal(months[0], '2026-05');
  assert.equal(months[5], '2026-10');
});

test('calculateMonthlyRevenueData calculates revenue and operating profit from invoices', () => {
  const ref = new Date(2026, 9, 15);
  const sampleInvoices: Invoice[] = [
    {
      id: 'inv-1',
      invoiceCode: 'HD-2026-09-01',
      monthYear: '2026-09',
      roomId: 'room-1',
      roomNumber: '101',
      tenantName: 'Nguyen Van A',
      tenantPhone: '',
      createdAt: '2026-09-01',
      dueDate: '2026-09-05',
      status: 'paid',
      paidAmount: 6000000,
      totalAmount: 6000000,
      items: [
        { name: 'Tiền thuê', unit: 'tháng', quantity: 1, unitPrice: 5000000, amount: 5000000 },
        { name: 'Tiền điện', unit: 'kWh', quantity: 100, unitPrice: 3500, amount: 350000 },
        { name: 'Tiền nước', unit: 'm³', quantity: 10, unitPrice: 15000, amount: 150000 },
      ],
      apiInvoice: {
        id: 'inv-1',
        contractId: 'c-1',
        apartmentId: 'room-1',
        customerId: 'cust-1',
        roomNumber: '101',
        apartmentTitle: 'P.101',
        tenantName: 'Nguyen Van A',
        period: '2026-09',
        dueDate: '2026-09-05',
        monthlyRent: '5000000',
        electricityStartReading: '0',
        electricityEndReading: '100',
        electricityQuantity: '100',
        electricityUnitPrice: '3500',
        electricityAmount: '350000',
        waterStartReading: '0',
        waterEndReading: '10',
        waterQuantity: '10',
        waterUnitPrice: '15000',
        waterAmount: '150000',
        totalAmount: '6000000',
        status: 'SENT',
        createdAt: '2026-09-01',
        sentAt: '2026-09-01',
        version: 1,
      },
    },
  ];

  const data = calculateMonthlyRevenueData(sampleInvoices, [], 6, ref);
  assert.equal(data.length, 6);

  // Month 4 is September (T09)
  const sep = data.find((d) => d.month === 'T09');
  assert.ok(sep);
  assert.equal(sep.revenue, 6.0); // 6M VNĐ
  assert.equal(sep.profit, 5.0); // 5M VNĐ net room rent

  // Month 5 is October (T10) with no invoices -> 0
  const oct = data.find((d) => d.month === 'T10');
  assert.ok(oct);
  assert.equal(oct.revenue, 0);
  assert.equal(oct.profit, 0);
});

test('calculateRevenueStructure computes exact percentages from invoices', () => {
  const sampleInvoices: Invoice[] = [
    {
      id: 'inv-1',
      invoiceCode: 'HD-1',
      monthYear: '2026-10',
      roomId: 'room-1',
      roomNumber: '101',
      tenantName: 'Tenant',
      tenantPhone: '',
      createdAt: '2026-10-01',
      dueDate: '2026-10-05',
      status: 'unpaid',
      paidAmount: 0,
      totalAmount: 10000000,
      items: [
        { name: 'Tiền thuê', unit: 'tháng', quantity: 1, unitPrice: 8000000, amount: 8000000 },
        { name: 'Tiền điện', unit: 'kWh', quantity: 1, unitPrice: 1000000, amount: 1000000 },
        { name: 'Tiền nước', unit: 'm³', quantity: 1, unitPrice: 500000, amount: 500000 },
      ],
      apiInvoice: {
        id: 'inv-1',
        contractId: 'c-1',
        apartmentId: 'room-1',
        customerId: 'cust-1',
        roomNumber: '101',
        apartmentTitle: 'P.101',
        tenantName: 'Tenant',
        period: '2026-10',
        dueDate: '2026-10-05',
        monthlyRent: '8000000',
        electricityStartReading: '0',
        electricityEndReading: '1',
        electricityQuantity: '1',
        electricityUnitPrice: '1000000',
        electricityAmount: '1000000',
        waterStartReading: '0',
        waterEndReading: '1',
        waterQuantity: '1',
        waterUnitPrice: '500000',
        waterAmount: '500000',
        totalAmount: '10000000',
        status: 'SENT',
        createdAt: '2026-10-01',
        sentAt: '2026-10-01',
        version: 1,
      },
    },
  ];

  const structure = calculateRevenueStructure(sampleInvoices);
  const rent = structure.find((s) => s.name === 'Tiền thuê phòng')!;
  const elec = structure.find((s) => s.name === 'Tiền điện')!;
  const water = structure.find((s) => s.name === 'Tiền nước')!;
  const other = structure.find((s) => s.name === 'Internet & Dịch vụ')!;

  assert.equal(rent.value, 80);
  assert.equal(elec.value, 10);
  assert.equal(water.value, 5);
  assert.equal(other.value, 5);
});

test('calculateBuildingOccupancy maps real DB buildings and calculates occupancy %', () => {
  const buildings: Building[] = [
    {
      id: 'b-1',
      name: 'An Cư local - Xuân Hòa',
      address: '123 Xuân Hòa',
      totalRooms: 2,
      pcccCertified: true,
      legalStatus: 'APPROVED',
    },
  ];

  const rooms: Room[] = [
    {
      id: 'r-1',
      roomNumber: '101',
      buildingId: 'b-1',
      floor: 1,
      area: 30,
      price: 5000000,
      status: 'rented',
      electricityIndex: 0,
      waterIndex: 0,
      amenities: [],
      maxOccupants: 2,
    },
    {
      id: 'r-2',
      roomNumber: '102',
      buildingId: 'b-1',
      floor: 1,
      area: 30,
      price: 5000000,
      status: 'available',
      electricityIndex: 0,
      waterIndex: 0,
      amenities: [],
      maxOccupants: 2,
    },
  ];

  const contracts: Contract[] = [
    {
      id: 'c-1',
      contractNumber: 'HD-001',
      tenantId: 'cust-1',
      tenantName: 'Tenant 1',
      roomId: 'r-1',
      roomNumber: '101',
      buildingName: 'An Cư local - Xuân Hòa',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      monthlyRent: 5000000,
      deposit: 5000000,
      paymentCycle: 1,
      status: 'active',
    },
  ];

  const performance = calculateBuildingOccupancy(buildings, rooms, [], contracts);
  assert.equal(performance.length, 1);
  assert.equal(performance[0].name, 'An Cư local - Xuân Hòa');
  assert.equal(performance[0].rooms, 2);
  assert.equal(performance[0].occupancy, 50); // 1 out of 2 rented -> 50%
  assert.equal(performance[0].revenue, 5.0); // 5.0M VNĐ
});

test('calculateReportsSummary scopes metrics when selectedPropertyId is specified', () => {
  const buildings: Building[] = [
    { id: 'b-1', name: 'Tòa 1', address: '', totalRooms: 1, pcccCertified: true, legalStatus: 'APPROVED' },
    { id: 'b-2', name: 'Tòa 2', address: '', totalRooms: 1, pcccCertified: true, legalStatus: 'APPROVED' },
  ];

  const rooms: Room[] = [
    { id: 'r-1', roomNumber: '101', buildingId: 'b-1', floor: 1, area: 30, price: 5000000, status: 'rented', electricityIndex: 0, waterIndex: 0, amenities: [], maxOccupants: 2 },
    { id: 'r-2', roomNumber: '201', buildingId: 'b-2', floor: 2, area: 30, price: 8000000, status: 'rented', electricityIndex: 0, waterIndex: 0, amenities: [], maxOccupants: 2 },
  ];

  const invoices: Invoice[] = [
    {
      id: 'inv-1', invoiceCode: 'HD-1', monthYear: '2026-10', roomId: 'r-1', roomNumber: '101', tenantName: 'A', tenantPhone: '',
      createdAt: '2026-10-01', dueDate: '2026-10-05', status: 'paid', paidAmount: 5000000, totalAmount: 5000000, items: []
    },
    {
      id: 'inv-2', invoiceCode: 'HD-2', monthYear: '2026-10', roomId: 'r-2', roomNumber: '201', tenantName: 'B', tenantPhone: '',
      createdAt: '2026-10-01', dueDate: '2026-10-05', status: 'unpaid', paidAmount: 0, totalAmount: 8000000, items: []
    },
  ];

  // Scoped to 'all'
  const allSummary = calculateReportsSummary(rooms, buildings, invoices, [], 'all');
  assert.equal(allSummary.cumulativeRevenue, 13000000);
  assert.equal(allSummary.invoiceCount, 2);

  // Scoped to 'b-1' only
  const b1Summary = calculateReportsSummary(rooms, buildings, invoices, [], 'b-1');
  assert.equal(b1Summary.cumulativeRevenue, 5000000);
  assert.equal(b1Summary.invoiceCount, 1);
  assert.equal(b1Summary.buildingOccupancy.length, 1);
  assert.equal(b1Summary.buildingOccupancy[0].name, 'Tòa 1');
});


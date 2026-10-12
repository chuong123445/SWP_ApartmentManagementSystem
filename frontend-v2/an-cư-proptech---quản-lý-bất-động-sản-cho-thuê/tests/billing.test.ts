import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { createInvoice, sendInvoice, myInvoices, getInvoice, tenancyViews, billingMoney } from '@/services/billing/billingService';
import { getApartments, getAddressOptions } from '@/services/apartments/apartmentService';
const originalFetch = globalThis.fetch;
test('Money rendering preserves decimal precision beyond JavaScript safe integers', () => {
  assert.equal(billingMoney('12345678901234567890.1250'), '12.345.678.901.234.567.890,125 đ');
  assert.equal(billingMoney('5540000.0000'), '5.540.000 đ');
});
afterEach(() => { globalThis.fetch = originalFetch; });
test('Invoice create sends only period/end readings/due date/server baseline version', async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/v1/owner/contracts/contract-uuid/invoices');
    assert.deepEqual(JSON.parse(options!.body as string), { period: '2026-10', electricityEndReading: '1120.25', waterEndReading: '208.50', dueDate: '2026-11-05', baselineVersion: 2 });
    return Response.json({ id: 'invoice-uuid', status: 'DRAFT' });
  };
  const result = await createInvoice('contract-uuid', { period: '2026-10', electricityEndReading: '1120.25', waterEndReading: '208.50', dueDate: '2026-11-05', baselineVersion: 2 });
  assert.equal(result.status, 'DRAFT');
});
test('Send is an authenticated server command with invoice version', async () => {
  globalThis.fetch = async (url, options) => { assert.equal(url, '/api/v1/owner/invoices/invoice-uuid/send');assert.deepEqual(JSON.parse(options!.body as string), { version: 3 });return Response.json({ status: 'SENT' }); };
  assert.equal((await sendInvoice('invoice-uuid', 3)).status, 'SENT');
});
test('Tenant invoice history is derived from principal, without client customer ID', async () => {
  globalThis.fetch = async url => { assert.equal(url, '/api/v1/me/invoices?page=2&size=20');return Response.json({ items: [] }); };
  assert.deepEqual((await myInvoices(2)).items, []);
});
test('Cross-tenant or hidden invoice errors remain errors, with no sample fallback', async () => {
  globalThis.fetch = async () => Response.json({ message: 'Not found' }, { status: 404 });
  await assert.rejects(getInvoice('foreign-id'), /Not found/);
});
test('Owner tenant view retains real account/apartment/contract relationships', () => {
  const result = tenancyViews([{ id: 'contract-id', apartmentId: 'apartment-id', roomNumber: 'T.101', apartmentTitle: 'Apartment', propertyName: 'Property', customerId: 'account-id', customerName: 'Tenant', customerEmail: 'tenant@example.invalid', status: 'ACTIVE', startDate: '2026-10-01', endDate: '2027-09-30', monthlyRent: '5000000.00', version: 0 }]);
  assert.equal(result.tenants[0].id, 'account-id');assert.equal(result.tenants[0].roomId, 'apartment-id');assert.equal(result.contracts[0].tenantId, 'account-id');assert.equal(result.contracts[0].roomId, 'apartment-id');
  assert.equal(result.tenants[0].idCard, '');assert.equal(result.contracts[0].signingMethod, undefined);
});
test('Address filters send city/district/ward and address options use a public endpoint', async () => {
  globalThis.fetch = async url => { assert.match(String(url), /city=City&district=District&ward=Ward/);return Response.json({ items: [] }); };
  await getApartments({ city: 'City', district: 'District', ward: 'Ward' });
  globalThis.fetch = async url => { assert.equal(url, '/api/v1/apartments/address-options');return Response.json([]); };
  assert.deepEqual(await getAddressOptions(), []);
});

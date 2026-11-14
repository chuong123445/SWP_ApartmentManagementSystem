import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { createInvoice, sendInvoice, myInvoices, getInvoice, tenancyViews, billingMoney, ownerInvoices, ownerReceivedInvoices, getOwnerReceivedInvoice } from '@/services/billing/billingService';
import { updateInvoiceDraft, cancelInvoiceDraft, invoiceHistory, invoiceView } from '@/services/billing/billingService';
import { isRevenueInvoice } from '@/utils/reportUtils';
import type { BillingInvoice } from '@/types/billing';
import { getApartments, getAddressOptions } from '@/services/apartments/apartmentService';
const originalFetch = globalThis.fetch;
test('Draft commands carry invoice and chain versions, exact decimal strings and cancellation reason', async () => {
  const calls: { url: string; method: string; body?: unknown }[] = [];
  globalThis.fetch = async (url, options) => { calls.push({url:String(url),method:options?.method ?? 'GET',body:options?.body ? JSON.parse(String(options.body)) : undefined});return Response.json({status:'CANCELLED'}); };
  const command = {version:3,billingVersion:7,reason:'Correct meter'};
  const update = {...command,electricityEndReading:'9999999999999.99',waterEndReading:'200.25',dueDate:'2026-11-10'};
  await updateInvoiceDraft('invoice/21',update);await cancelInvoiceDraft('invoice/21',command);await invoiceHistory('invoice/21');await ownerInvoices(0,20,'property-2','CANCELLED');
  assert.deepEqual(calls.slice(0,3),[
    {url:'/api/v1/owner/invoices/invoice%2F21/draft',method:'PATCH',body:update},
    {url:'/api/v1/owner/invoices/invoice%2F21/cancel',method:'POST',body:command},
    {url:'/api/v1/owner/invoices/invoice%2F21/history',method:'GET',body:undefined},
  ]);
  assert.equal(calls[3].url,'/api/v1/owner/invoices?page=0&size=20&propertyId=property-2&filter=CANCELLED');
});
test('Stale invoice commands surface the server conflict without an automatic mutation retry', async () => {
  let calls=0;globalThis.fetch=async()=>{calls++;return Response.json({message:'Hóa đơn đã thay đổi',code:'VERSION_CONFLICT'},{status:409});};
  await assert.rejects(cancelInvoiceDraft('21',{version:0,billingVersion:1,reason:'Duplicate'}),/Hóa đơn đã thay đổi/);assert.equal(calls,1);
});
test('Cancelled monthly invoice remains available for display and is excluded from accrual revenue', () => {
  const invoice={id:'21',period:'2026-10',status:'CANCELLED',totalAmount:'5000000',electricityQuantity:'0',electricityUnitPrice:'0',electricityAmount:'0',waterQuantity:'0',waterUnitPrice:'0',waterAmount:'0',monthlyRent:'5000000'} as BillingInvoice;
  const view=invoiceView(invoice);assert.equal(view.apiInvoice?.status,'CANCELLED');assert.equal(isRevenueInvoice(view),false);
});
test('Money rendering preserves decimal precision beyond JavaScript safe integers', () => {
  assert.equal(billingMoney('12345678901234567890.1250'), '12.345.678.901.234.567.890,125 đ');
  assert.equal(billingMoney('5540000.0000'), '5.540.000 đ');
});
afterEach(() => { globalThis.fetch = originalFetch; });
test('Owner history requests server payment filters and independent receipt pagination using GET only', async () => {
  const urls: string[] = [];
  globalThis.fetch = async (url, options) => { urls.push(String(url));assert.equal(options?.method ?? 'GET', 'GET');return Response.json({ items: [] }); };
  await ownerInvoices();await ownerInvoices(1, 20, 'property-2', 'PAID');
  await ownerReceivedInvoices(2, 20, 'property-2', 'PAID');await getOwnerReceivedInvoice('receipt/21');
  assert.deepEqual(urls, ['/api/v1/owner/invoices?page=0&size=20', '/api/v1/owner/invoices?page=1&size=20&propertyId=property-2&filter=PAID', '/api/v1/owner/invoices/additional?page=2&size=20&paymentStatus=PAID&propertyId=property-2', '/api/v1/owner/invoices/additional/receipt%2F21']);
});
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
  globalThis.fetch = async url => { assert.equal(url, '/api/v1/me/invoices?page=2&size=20&paymentStatus=ALL');return Response.json({ items: [] }); };
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
test('Same account in multiple apartments preserves separate contract deposits and row identities', () => {
  const common = { customerId:'same-account', customerName:'Người thuê', customerEmail:'tenant@example.invalid', propertyName:'Tòa nhà', apartmentTitle:'Phòng', status:'ACTIVE' as const, startDate:'2026-01-01', endDate:'2027-01-01', monthlyRent:'5000000', version:0 };
  const result = tenancyViews([
    {...common,id:'101',apartmentId:'1',roomNumber:'A101',contractDeposit:'5000000.25',customerEmailVerified:true,customerIdentityStatus:'NOT_VERIFIED',inAppSigningStatus:'BOTH_SIGNED'},
    {...common,id:'102',apartmentId:'2',roomNumber:'A102',contractDeposit:'0.00',customerEmailVerified:false,customerIdentityStatus:'VERIFIED',customerIdentitySource:'AUTH0_VNEID_SIMULATION',inAppSigningStatus:'UNSIGNED'},
    {...common,id:'103',apartmentId:'3',roomNumber:'A103',contractDeposit:null},
  ]);
  assert.equal(new Set(result.tenants.map(t=>t.id)).size,1);
  assert.deepEqual(result.tenants.map(t=>t.contractId),['101','102','103']);
  assert.deepEqual(result.tenants.map(t=>t.contractDeposit),['5000000.25','0.00',null]);
  assert.deepEqual(result.tenants.map(t=>t.deposit),[5000000.25,0,null]);
  assert.equal(result.tenants[0].identityStatus,'NOT_VERIFIED');assert.equal(result.tenants[0].emailVerified,true);
  assert.equal(result.tenants[1].identitySource,'AUTH0_VNEID_SIMULATION');assert.equal(result.tenants[1].emailVerified,false);
  assert.equal(result.tenants[0].inAppSigningStatus,'BOTH_SIGNED');assert.equal(result.tenants[1].inAppSigningStatus,'UNSIGNED');
  assert.equal(result.tenants[2].inAppSigningStatus,undefined);assert.equal(result.tenants[2].ekycVerified,undefined);assert.equal(result.tenants[2].smartCaRegistered,undefined);
});
test('Older tenancy responses without deposit/signing fields remain unknown', () => {
  const views=tenancyViews([{id:'11',apartmentId:'1',roomNumber:'A101',apartmentTitle:'Room',propertyName:'Property',customerId:'1',customerName:'User',customerEmail:'u@example.invalid',status:'ACTIVE',startDate:'2026-01-01',endDate:'2027-01-01',monthlyRent:'1000000',version:0}]);
  assert.equal(views.tenants[0].deposit,null);assert.equal(views.tenants[0].contractDeposit,null);
  assert.equal(views.tenants[0].emailVerified,undefined);assert.equal(views.tenants[0].identityStatus,undefined);
});
test('Address filters send city/district/ward and address options use a public endpoint', async () => {
  globalThis.fetch = async url => { assert.match(String(url), /city=City&district=District&ward=Ward/);return Response.json({ items: [] }); };
  await getApartments({ city: 'City', district: 'District', ward: 'Ward' });
  globalThis.fetch = async url => { assert.equal(url, '/api/v1/apartments/address-options');return Response.json([]); };
  assert.deepEqual(await getAddressOptions(), []);
});

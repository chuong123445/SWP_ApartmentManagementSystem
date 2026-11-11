import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRentInvoice, invoiceView, tenancyViews} from '../src/services/billing/billingService';
import type {BillingInvoice, Tenancy} from '../src/types/billing';
test('Rent invoice command sends server version and start date without client-selected amount', async () => {
  globalThis.fetch=async(url,init)=>{assert.equal(url,'/api/v1/owner/contracts/42/rent-invoices');assert.deepEqual(JSON.parse(String(init?.body)),{billingVersion:3,coverageStart:'2026-11-01',dueDate:'2026-11-05'});return Response.json({id:'91'});};
  await createRentInvoice('42',{billingVersion:3,coverageStart:'2026-11-01',dueDate:'2026-11-05'});
});
test('Rent and utility presentation keeps charges separate and preserves legacy rows', () => {
  const base={id:'91',period:'2026-11',monthlyRent:'30000000',totalAmount:'30000000',rentMonths:6,rentUnitPrice:'5000000',coverageStart:'2026-11-01',coverageEnd:'2027-04-30',electricityStartReading:'0',electricityEndReading:'0',waterStartReading:'0',waterEndReading:'0',internetFee:'0',garbageFee:'0'} as BillingInvoice;
  const rent=invoiceView({...base,kind:'RENT'});assert.equal(rent.items.length,1);assert.equal(rent.items[0].quantity,6);assert.equal(rent.items[0].unitPrice,5000000);
  const utilities=invoiceView({...base,kind:'UTILITY',monthlyRent:'0'});assert.equal(utilities.items.some(i=>i.name==='Tiền thuê'),false);
  assert.equal(invoiceView({...base,kind:'LEGACY'}).items.length,3);
  const history=invoiceView({...base,kind:null,rentMonths:0,rentUnitPrice:null});assert.equal(history.items[0].quantity,1);assert.equal(history.items[0].unitPrice,30000000);
});

test('Saved lease views expose agreed cycles and default legacy records to monthly',()=>{
  assert.equal(tenancyViews([{id:'42',status:'ACTIVE',rentCycleMonths:6} as Tenancy]).contracts[0].paymentCycle,6);
  assert.equal(tenancyViews([{id:'42',status:'ACTIVE'} as Tenancy]).contracts[0].paymentCycle,1);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { utilityInvoiceTotal } from '../src/utils/invoicePreview.ts';
import type { BillingContext } from '../src/types/billing.ts';

const context = {
  electricityStartReading:'300', electricityUnitPrice:'3500',
  waterStartReading:'20', waterUnitPrice:'15000',
  internetFee:'0', garbageFee:'0', maintenanceAmount:'200000',
} as BillingContext;
test('preview includes only the customer repair share once alongside electricity and water', () => {
  assert.equal(utilityInvoiceTotal(context,'400','25'),'625000.0000');
  assert.equal(utilityInvoiceTotal({...context,maintenanceAmount:'0'},'400','25'),'425000.0000');
});
test('per-person water preview and fractional meters preserve exact money', () => {
  assert.equal(utilityInvoiceTotal({...context,waterBillingMode:'PER_PERSON',occupantCount:2,waterUnitPrice:'50000'},'400',''),'650000.0000');
  assert.equal(utilityInvoiceTotal({...context,electricityUnitPrice:'3500.25'},'300.10','20'),'200350.0250');
  assert.equal(utilityInvoiceTotal(context,'','25'),null);
  assert.equal(utilityInvoiceTotal(context,'299','25'),null);
});

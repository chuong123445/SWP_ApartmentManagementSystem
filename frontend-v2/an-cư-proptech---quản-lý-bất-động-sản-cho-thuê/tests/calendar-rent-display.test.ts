import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {InvoiceBreakdown} from '../src/components/billing/InvoiceBreakdown';
import type {BillingInvoice} from '../src/types/billing';
const invoice={id:'1',kind:'RENT',roomNumber:'A101',tenantName:'Khách thuê',period:'2027-01',coverageStart:'2027-01-15',coverageEnd:'2027-03-31',dueDate:'2027-01-15',status:'SENT',monthlyRent:'7645161',rentUnitPrice:'3000000',rentMonths:3,totalAmount:'7645161',rentCalculation:'15/01/2027–31/01/2027: 3000000 × 17/31\nTháng 2 và tháng 3 trọn kỳ.'} as BillingInvoice;
test('calendar rent shows cycle months and hides raw calculation block',()=>{const html=renderToStaticMarkup(createElement(InvoiceBreakdown,{invoice}));assert.match(html,/Chu kỳ/);assert.match(html,/3 tháng/);assert.doesNotMatch(html,/Cách tính tiền thuê/);assert.doesNotMatch(html,/Theo ngày thuê thực tế/);});
test('cancelled calendar invoice retains amount with cancellation label',()=>{const html=renderToStaticMarkup(createElement(InvoiceBreakdown,{invoice:{...invoice,status:'CANCELLED'}}));assert.match(html,/Đã hủy/);assert.match(html,/3 tháng/);assert.doesNotMatch(html,/Cách tính tiền thuê/);});

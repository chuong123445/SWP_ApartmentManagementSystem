import assert from 'node:assert/strict';
import {afterEach,test} from 'node:test';
import {getOwnerFinancialSummary} from '@/services/owner/financialService';
const originalFetch=globalThis.fetch;
afterEach(()=>{globalThis.fetch=originalFetch;});
const amounts={invoiceCount:21,paidInvoiceCount:1,onTimePaidInvoiceCount:1,billedAmount:'21000002.6250',paidInvoiceAmount:'1000000.1250',unpaidInvoiceAmount:'20000002.5000',rentAmount:'21000000',electricityAmount:'2.6250',waterAmount:'0',serviceAmount:'0'};
const receipts={monthlyInvoiceAmount:'10000000.1250',additionalAmount:'1234',totalAmount:'10001234.1250'};
const sample=(year:number)=>({year,propertyId:null as string|null,asOf:'2026-11-08',totals:amounts,receipts,arrears:{monthlyInvoiceCount:21,monthlyInvoiceAmount:'27000002.5',overdueInvoiceCount:0,overdueInvoiceAmount:'0',additionalCount:1,additionalAmount:'1000'},inventory:{units:21,occupied:21,vacant:0},months:Array.from({length:12},(_,i)=>({period:`${year}-${String(i+1).padStart(2,'0')}`,invoices:amounts,receipts})),properties:[]});
test('Financial requests carry year/property but no list pagination and preserve decimal strings',async()=>{
  const urls:string[]=[];globalThis.fetch=async(url,options)=>{urls.push(String(url));assert.equal(options?.method??'GET','GET');return Response.json({...sample(2026),propertyId:new URL(String(url),'http://localhost').searchParams.get('propertyId')});};
  const result=await getOwnerFinancialSummary(2026);await getOwnerFinancialSummary(2026,'42');
  assert.deepEqual(urls,['/api/v1/owner/financial-summary?year=2026','/api/v1/owner/financial-summary?year=2026&propertyId=42']);
  assert.equal(result.totals.invoiceCount,21);assert.equal(result.totals.billedAmount,'21000002.6250');assert.equal(result.receipts.totalAmount,'10001234.1250');
});
test('Financial API error or stale year never becomes a valid zero report',async()=>{
  globalThis.fetch=async()=>Response.json({message:'Không có quyền trên tài sản.'},{status:404});await assert.rejects(()=>getOwnerFinancialSummary(2026,'42'),/Không có quyền/);
  globalThis.fetch=async()=>Response.json(sample(2025));await assert.rejects(()=>getOwnerFinancialSummary(2026),/chưa đầy đủ/);
});
test('Incomplete financial response is rejected instead of taking a page of invoices as fallback',async()=>{
  for(const body of [{items:[],totalPages:0}, {...sample(2026),months:[]}]){globalThis.fetch=async()=>Response.json(body);await assert.rejects(()=>getOwnerFinancialSummary(2026),/chưa đầy đủ/);}
});

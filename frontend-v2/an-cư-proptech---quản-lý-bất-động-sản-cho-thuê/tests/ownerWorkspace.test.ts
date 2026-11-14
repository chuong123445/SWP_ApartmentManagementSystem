import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { getOwnerWorkspaceSummary } from '@/services/owner/workspaceService';
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
const summary = { propertyId:null, asOf:'2026-11-08', expiringThrough:'2026-11-28', unpaidMonthlyInvoiceCount:21, unpaidAdditionalReceiptCount:2, unpaidCount:23, expiringContractCount:3, expiredContractCount:1 };

test('Owner counters read whole scope without page/size/filter and keep source breakdown', async () => {
  const urls:string[]=[];
  globalThis.fetch=async(url,options)=>{urls.push(String(url));assert.equal(options?.method??'GET','GET');return Response.json(summary);};
  const result=await getOwnerWorkspaceSummary();await getOwnerWorkspaceSummary('42');
  assert.deepEqual(urls,['/api/v1/owner/workspace-summary','/api/v1/owner/workspace-summary?propertyId=42']);
  assert.equal(result.unpaidCount,23);assert.equal(result.unpaidMonthlyInvoiceCount,21);assert.equal(result.unpaidAdditionalReceiptCount,2);assert.equal(result.expiredContractCount,1);
});
test('Counter errors and incomplete data never become valid zero counts', async () => {
  globalThis.fetch=async()=>Response.json({message:'Tài sản không thuộc tài khoản.'},{status:404});
  await assert.rejects(()=>getOwnerWorkspaceSummary('42'),/Tài sản không thuộc/);
  for(const body of [{}, {...summary,unpaidCount:99}, {...summary,expiredContractCount:-1}]){
    globalThis.fetch=async()=>Response.json(body);await assert.rejects(()=>getOwnerWorkspaceSummary(),/Số đếm tổng hợp không đầy đủ/);
  }
});
test('Real empty scope is accepted only when server explicitly returns complete zero counts', async () => {
  globalThis.fetch=async()=>Response.json({...summary,unpaidMonthlyInvoiceCount:0,unpaidAdditionalReceiptCount:0,unpaidCount:0,expiringContractCount:0,expiredContractCount:0});
  assert.equal((await getOwnerWorkspaceSummary()).unpaidCount,0);
});

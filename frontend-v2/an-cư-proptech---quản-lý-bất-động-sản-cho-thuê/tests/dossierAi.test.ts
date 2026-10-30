import assert from 'node:assert/strict';
import {afterEach,test} from 'node:test';
import {adminAiReview,retryAiReview} from '@/services/property/dossierAiService';
const originalFetch=globalThis.fetch;
afterEach(()=>{globalThis.fetch=originalFetch;});
test('Kết quả AI chỉ đọc từ endpoint admin và quét lại chỉ gửi phiên bản',async()=>{
  globalThis.fetch=async(url,options)=>{
    assert.match(String(url),/^\/api\/v1\/admin\/property-dossiers\/7\/ai-review/);
    if(options?.method==='POST')assert.deepEqual(JSON.parse(options.body as string),{version:3});
    return Response.json({status:options?.method==='POST'?'QUEUED':'COMPLETED',version:3});
  };
  assert.equal((await adminAiReview('7')).status,'COMPLETED');assert.equal((await retryAiReview('7',3)).status,'QUEUED');
});
test('Lỗi AI vẫn là lỗi, không biến thành kết quả hồ sơ hợp lệ',async()=>{
  globalThis.fetch=async()=>Response.json({message:'Không tải được AI'},{status:500});
  await assert.rejects(()=>adminAiReview('7'),/Không tải được AI/);
});

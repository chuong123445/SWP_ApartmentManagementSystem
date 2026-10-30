import assert from 'node:assert/strict';
import { afterEach,test } from 'node:test';
import { roomInvoices,roomMaintenance } from '@/services/resident/residentService';
const originalFetch=globalThis.fetch;
afterEach(()=>{globalThis.fetch=originalFetch;});
test('Hóa đơn của phòng lấy đủ trang, không trộn phòng khác và không hiện bản nháp',async()=>{
 let page=0;
 globalThis.fetch=async(url)=>{
  const query=new URL(String(url),'http://localhost').searchParams;
  assert.equal(query.get('page'),String(page));assert.equal(query.has('customerId'),false);
  return Response.json({items:page++===0?[{id:'1',apartmentId:'a',status:'SENT'},{id:'2',apartmentId:'b',status:'SENT'}]:[{id:'3',apartmentId:'a',status:'SENT'},{id:'4',apartmentId:'a',status:'DRAFT'}],totalPages:2});
 };
 assert.deepEqual((await roomInvoices('a')).map(i=>i.id),['1','3']);
});
test('Sự cố gắn bằng mã phòng, không dựa vào tên phòng trùng nhau',async()=>{
 globalThis.fetch=async()=>Response.json({items:[{id:'1',apartmentId:'a',roomNumber:'101',category:'WATER',priority:'NORMAL',status:'PENDING'},{id:'2',apartmentId:'b',roomNumber:'101',category:'WATER',priority:'NORMAL',status:'PENDING'},{id:'3',apartmentId:null,roomNumber:'Toàn tòa',category:'OTHER',priority:'NORMAL',status:'PENDING'}],totalPages:1});
 assert.deepEqual((await roomMaintenance('a')).map(t=>t.id),['1']);
});

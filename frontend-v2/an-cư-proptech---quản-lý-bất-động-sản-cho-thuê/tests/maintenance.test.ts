import assert from 'node:assert/strict';
import { test, afterEach } from 'node:test';
import { ownerMaintenance } from '@/services/maintenance/maintenanceService';
const originalFetch=globalThis.fetch;
afterEach(()=>{globalThis.fetch=originalFetch;});
test('Danh sách sự cố tải đủ trang và lọc đúng tài sản',async()=>{
 let calls=0;
 globalThis.fetch=async(url)=>{
  const query=new URL(String(url),'http://localhost').searchParams;
  assert.equal(query.get('propertyId'),'7');assert.equal(query.get('page'),String(calls));calls++;
  return Response.json({items:[{id:String(calls),propertyId:'7',roomNumber:'A.101',reporterName:'Khách kiểm thử',title:'Rò nước',description:'Mô tả',category:'WATER',priority:'NORMAL',status:calls===1?'PENDING':'RESOLVED',createdAt:'2026-10-30T00:00:00Z'}],totalPages:2});
 };
 const result=await ownerMaintenance('7');assert.equal(calls,2);assert.equal(result.length,2);assert.equal(result[0].apiStatus,'PENDING');assert.equal(result[1].status,'resolved');
});
test('Không chèn dữ liệu mẫu khi danh sách rỗng hoặc máy chủ báo lỗi',async()=>{
 globalThis.fetch=async()=>Response.json({items:[],totalPages:0});assert.deepEqual(await ownerMaintenance('all'),[]);
 globalThis.fetch=async()=>Response.json({message:'Không thể tải sự cố'},{status:500});
 await assert.rejects(()=>ownerMaintenance('all'));
});

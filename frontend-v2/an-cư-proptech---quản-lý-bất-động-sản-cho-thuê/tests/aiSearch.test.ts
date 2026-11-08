import { test,afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { suggestSearch,applyAiSearch,toApartmentFilters,type AiFilters } from '@/services/apartments/aiSearchService';
const original=globalThis.fetch;afterEach(()=>{globalThis.fetch=original;});
const filters:AiFilters={q:null,city:'TP. Hồ Chí Minh',district:null,ward:null,minRent:'0',maxRent:'4999999.99',minArea:'25.50',maxArea:null,bedrooms:0,occupants:2};
test('AI conversion preserves exact decimals, zero-bedroom studio and same-room capacity',()=>{assert.deepEqual(toApartmentFilters(filters),{city:'TP. Hồ Chí Minh',minRent:'0',maxRent:'4999999.99',minArea:'25.50',bedrooms:'0',occupants:'2'});});
test('Search suggestion requires explicit consent payload; applying carries only reviewed filters',async()=>{
 const calls:any[]=[];globalThis.fetch=async(url,opts)=>{calls.push({url,method:opts?.method,body:JSON.parse(String(opts?.body))});return Response.json({filters});};
 await suggestSearch('Phòng dưới 5 triệu');await applyAiSearch('run/id',filters);
 assert.deepEqual(calls,[{url:'/api/v1/apartments/ai-search',method:'POST',body:{text:'Phòng dưới 5 triệu',consent:true}},{url:'/api/v1/apartments/ai-search/run%2Fid/apply',method:'POST',body:{filters}}]);
});
test('AI provider failure stays an error with no generated or fallback inventory',async()=>{let calls=0;globalThis.fetch=async()=>{calls++;return Response.json({message:'AI chưa sẵn sàng'},{status:503});};await assert.rejects(suggestSearch('test'),/AI chưa sẵn sàng/);assert.equal(calls,1);});

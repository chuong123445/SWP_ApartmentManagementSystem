import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {getContractExit,actOnContractExit,uploadExitEvidence,signHandover,getHandoverPdf} from '@/services/contract/contractExitService';
const original=globalThis.fetch;afterEach(()=>{globalThis.fetch=original;});
test('Contract exit reads exact scope and sends explicit version/consent without account, status or refund commands',async()=>{
 const calls:any[]=[];globalThis.fetch=async(url,opts)=>{calls.push({url,method:opts?.method??'GET',body:opts?.body?JSON.parse(String(opts.body)):undefined});return Response.json({});};
 await getContractExit('42/other');await actOnContractExit('42','DISPUTE_HANDOVER','a'.repeat(64),{reason:'Meter incorrect',evidenceIds:['7']});
 assert.deepEqual(calls,[{url:'/api/v1/contracts/42%2Fother/exit',method:'GET',body:undefined},{url:'/api/v1/contracts/42/exit/actions',method:'POST',body:{reason:'Meter incorrect',evidenceIds:['7'],action:'DISPUTE_HANDOVER',sourceVersion:'a'.repeat(64),consent:true}}]);
});
test('Early termination preserves exact proposed amount and payer for review, without triggering payment',async()=>{
 let body:any;globalThis.fetch=async(_url,opts)=>{body=JSON.parse(String(opts?.body));return Response.json({terminationState:'PENDING'});};
 await actOnContractExit('42','PROPOSE_TERMINATION','b'.repeat(64),{termination:{returnDate:'2026-11-08',reason:'Move',clauseReference:'Parties agree on date',penaltyAmount:'1000000.25',penaltyPayer:'CUSTOMER'}});
 assert.equal(body.termination.penaltyAmount,'1000000.25');assert.equal(body.termination.penaltyPayer,'CUSTOMER');assert.equal(body.action,'PROPOSE_TERMINATION');
 assert.equal('refundAmount'in body,false);assert.equal('paymentStatus'in body,false);
});
test('A changed handover stays a conflict and is not silently retried with fresh consent',async()=>{let calls=0;globalThis.fetch=async()=>{calls++;return Response.json({message:'Chỉ số nguồn đã đổi'},{status:409});};await assert.rejects(actOnContractExit('42','CONFIRM_HANDOVER','a'.repeat(64),{}),/Chỉ số nguồn đã đổi/);assert.equal(calls,1);});
test('Evidence upload uses multipart file only; backend determines uploader and contract scope',async()=>{let body:any;globalThis.fetch=async(_url,opts)=>{body=opts?.body;return Response.json({id:'7'});};await uploadExitEvidence('42',new File(['test'],'test.png',{type:'image/png'}));assert.ok(body instanceof FormData);assert.deepEqual([...body.keys()],['file']);});

test('Handover signature binds the exact document and source without choosing another signer',async()=>{
 let body:any;let called='';globalThis.fetch=async(url,opts)=>{called=String(url);body=JSON.parse(String(opts?.body));return Response.json({});};
 await signHandover('42','a'.repeat(64),'b'.repeat(64),'data:image/png;base64,test');
 assert.equal(called,'/api/v1/contracts/42/exit/sign');assert.deepEqual(body,{sourceVersion:'a'.repeat(64),contentHash:'b'.repeat(64),signature:'data:image/png;base64,test',consent:true});
});
test('Handover PDF uses private no-store fetch and keeps failures visible',async()=>{
 let options:any;globalThis.fetch=async(_url,opts)=>{options=opts;return new Response('%PDF-1.4',{headers:{'Content-Type':'application/pdf'}});};
 assert.equal((await getHandoverPdf('42')).type,'application/pdf');assert.equal(options.cache,'no-store');
 globalThis.fetch=async()=>Response.json({message:'Chưa có biên bản PDF'},{status:409});await assert.rejects(getHandoverPdf('42'),/Chưa có biên bản PDF/);
});

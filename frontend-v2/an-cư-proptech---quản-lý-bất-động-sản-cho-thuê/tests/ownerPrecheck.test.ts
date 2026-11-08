import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {precheckDossier,acknowledgePrecheck,precheckConflicts,type PrecheckView} from '@/services/property/ownerPrecheckService';
import type {DossierSubmit} from '@/types/dossier';
const original=globalThis.fetch;afterEach(()=>{globalThis.fetch=original;});
const draft:DossierSubmit={propertyVersion:3,rightType:'OWNERSHIP',documentFileIds:['7'],supportingFileIds:[],ownerEvidenceFileIds:[]};
test('Owner precheck sends draft/source/consent only to its private route, with applicant route for onboarding',async()=>{
 const calls:any[]=[];globalThis.fetch=async(url,opts)=>{calls.push({url,body:JSON.parse(String(opts?.body))});return Response.json({sourceHash:'hash'});};
 await precheckDossier('property/1',draft);await precheckDossier('property/1',draft,{fileId:'7',sourceHash:'hash',consent:true},undefined,true);
 assert.deepEqual(calls,[{url:'/api/v1/owner/properties/property%2F1/ai-precheck',body:{draft}},{url:'/api/v1/me/rental-properties/property%2F1/ai-precheck',body:{draft,fileId:'7',sourceHash:'hash',consent:true}}]);
});
test('Review acknowledgement carries exact draft/source and accepts a bodyless response',async()=>{globalThis.fetch=async(url,opts)=>{assert.equal(url,'/api/v1/owner/properties/1/ai-precheck/run%2F1/acknowledge');assert.deepEqual(JSON.parse(String(opts?.body)),{draft,sourceHash:'hash'});return new Response(null,{status:204});};await acknowledgePrecheck('1','run/1',draft,'hash');});
test('Stale precheck stays an error and never falls back to Admin review',async()=>{let calls=0;globalThis.fetch=async()=>{calls++;return Response.json({message:'Nguồn đã thay đổi'},{status:409});};await assert.rejects(precheckDossier('1',draft,{fileId:'7',sourceHash:'old',consent:true}),/Nguồn đã thay đổi/);assert.equal(calls,1);});
test('Cross-file conflicts compare identifiers after formatting normalization, never names',()=>{
 const make=(certificate:string,name:string)=>({review:{extractedFields:[{field:'certificateNumber',value:certificate},{field:'applicantName',value:name}]}} as PrecheckView);
 assert.deepEqual(precheckConflicts([make('ABC-1','Nguyễn Văn A'),make('ABC 1','NGUYEN VAN A')]),[]);
 assert.deepEqual(precheckConflicts([make('ABC-1','A'),make('ABC-2','A')]),['Số giấy chứng nhận đọc được khác nhau giữa các tệp. Hãy đối chiếu bản gốc.']);
});

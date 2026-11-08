import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {getSelectionCancellation,actOnSelectionCancellation} from '@/services/rental/selectionCancellationService';
import {contractStatusLabel,contractActionLabel,contractLifecycleActions} from '@/utils/contractDisplay';
import type {ContractDraft} from '@/types/contract';
import type {Tenancy} from '@/types/billing';
import {tenancyViews} from '@/services/billing/billingService';
const original=globalThis.fetch;afterEach(()=>{globalThis.fetch=original;});
test('Cancellation reads exact request; command sends immutable source token without role, room or money flags',async()=>{
 const calls:any[]=[];globalThis.fetch=async(url,opts)=>{calls.push({url,method:opts?.method??'GET',body:opts?.body?JSON.parse(String(opts.body)):undefined});return Response.json({state:'PENDING'});};
 await getSelectionCancellation('request/1');await actOnSelectionCancellation('request/1','START','a'.repeat(64),'Discuss cancellation');
 assert.deepEqual(calls,[{url:'/api/v1/rental-requests/request%2F1/cancellation',method:'GET',body:undefined},{url:'/api/v1/rental-requests/request%2F1/cancellation/actions',method:'POST',body:{action:'START',sourceVersion:'a'.repeat(64),reason:'Discuss cancellation'}}]);
});
test('Stale cancellation stays a conflict and is not automatically retried with another source',async()=>{let count=0;globalThis.fetch=async()=>{count++;return Response.json({message:'Chữ ký đã thay đổi'},{status:409});};await assert.rejects(actOnSelectionCancellation('1','ACCEPT','a'.repeat(64),''),/Chữ ký đã thay đổi/);assert.equal(count,1);});
test('Cancelled initial drafts are not labelled active or expired and have no renewal/handover actions',()=>{
 assert.equal(contractStatusLabel('CANCELLED','2020-01-01','2026-11-08'),'Đã hủy trước hiệu lực');
 const draft={status:'CANCELLED',snapshot:{owner:{id:'1'},customer:{id:'2'}},lifecycle:{expired:true,handoverAvailable:true,renewalRequestAvailable:true}} as ContractDraft;
 assert.equal(contractLifecycleActions(draft,'1').canHandover,false);assert.equal(contractLifecycleActions(draft,'2').canRequest,false);assert.equal(contractActionLabel(draft,'2'),'Xem hợp đồng');
});
test('Pending cancellation points to its proposal instead of offering edit/sign from the list',()=>{assert.equal(contractActionLabel({status:'DRAFT',cancellationState:'PENDING'} as ContractDraft,'2'),'Xem đề nghị hủy');});
test('Owner stored tenancy rows preserve cancellation separately from an ended lease',()=>{
 const base={id:'42',customerId:'2',apartmentId:'3',endDate:'2020-01-01',monthlyRent:'5000000'};
 const view=tenancyViews([{...base,status:'CANCELLED'},{...base,id:'43',status:'ENDED'}] as Tenancy[]);
 assert.equal(view.tenants.length,0);
 assert.equal(contractStatusLabel(view.contracts[0].status,view.contracts[0].endDate,'2026-11-08'),'Đã hủy trước hiệu lực');
 assert.equal(contractStatusLabel(view.contracts[1].status,view.contracts[1].endDate,'2026-11-08'),'Đã kết thúc');
});

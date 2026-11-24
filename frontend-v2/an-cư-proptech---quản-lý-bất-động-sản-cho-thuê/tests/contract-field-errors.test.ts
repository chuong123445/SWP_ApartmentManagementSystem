import test from 'node:test';
import assert from 'node:assert/strict';
import {contractTermErrors,contractServerErrorField} from '../src/utils/contract.ts';
import type {ContractTerms} from '../src/types/contract.ts';
const valid:ContractTerms={startDate:'2026-12-01',endDate:'2027-12-01',monthlyRent:'3000000',deposit:'0',electricityUnitPrice:'3500',waterUnitPrice:'0',internetFee:'0',garbageFee:'0',occupantCount:1,rentCycleMonths:1,paymentDay:5,paymentMethod:'Chuyển khoản',usagePurpose:'Để ở',clauses:[{title:'Thỏa thuận',body:'Nội dung'}]};
test('Reports each invalid field together so correcting one does not hide the others',()=>{
 const bad={...valid,endDate:'2026-11-30',monthlyRent:'0',deposit:'-1',paymentDay:29,paymentMethod:' ',usagePurpose:''};
 const errors=contractTermErrors(bad,'2026-11-24');
 assert.deepEqual(Object.keys(errors).sort(),['endDate','monthlyRent','deposit','paymentDay','paymentMethod','usagePurpose'].sort());
 const corrected=contractTermErrors({...bad,endDate:valid.endDate},'2026-11-24');assert.equal(corrected.endDate,undefined);assert.ok(corrected.deposit);
});
test('Missing dates and rights violations attach to the affected dates',()=>{
 const missing=contractTermErrors({...valid,startDate:'',endDate:''},'2026-11-24');assert.ok(missing.startDate);assert.ok(missing.endDate);
 const rights=contractTermErrors(valid,'2026-11-24',{rightsValidFrom:'2026-12-02',rightsValidUntil:'2027-01-01'});assert.ok(rights.startDate);assert.ok(rights.endDate);
 assert.deepEqual(contractTermErrors(valid,'2026-11-24'),{});
});
test('Clause errors identify the exact title/body rather than a remote summary',()=>{
 const errors=contractTermErrors({...valid,clauses:[{title:'',body:'Valid'},{title:'Valid',body:''}]},'2026-11-24');
 assert.deepEqual(Object.keys(errors),['clauses.0.title','clauses.1.body']);
 assert.ok(contractTermErrors({...valid,clauses:[]},'2026-11-24').clauses);
});
test('Known server validation codes locate fields while conflicts/network errors stay general',()=>{
 assert.equal(contractServerErrorField('CONTRACT_TERM_TOO_SHORT'),'endDate');assert.equal(contractServerErrorField('CONTRACT_START_DATE_IN_PAST'),'startDate');
 assert.equal(contractServerErrorField('SOURCE_CHANGED'),undefined);assert.equal(contractServerErrorField(''),undefined);
});

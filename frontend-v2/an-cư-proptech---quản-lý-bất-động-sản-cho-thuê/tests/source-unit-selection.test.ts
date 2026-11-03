import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {availableSourceUnits,sourceAppendMessage,appendVneidUnits,type VneidAssetCandidate} from '../src/services/property/vneidPropertyService.ts';
import {setAccessToken,setRefreshHandler,ApiError} from '../src/services/http/client.ts';
const original=globalThis.fetch;
afterEach(()=>{globalThis.fetch=original;setAccessToken(null);setRefreshHandler(null);});
function candidate():VneidAssetCandidate{return {asset:{externalAssetId:'asset',name:'Asset',address:'Address',rentalMode:'MULTI_UNIT',units:[
  {externalUnitId:'one',code:'P.101',areaM2:24,bedrooms:0,bathrooms:1},{externalUnitId:'two',code:'P.201',areaM2:30,bedrooms:1,bathrooms:1}]},sourceVersion:'source',imported:false};}
test('Initial import offers every source room without selecting or changing source metadata',()=>{
  const item=candidate();assert.deepEqual(availableSourceUnits(item).map(u=>u.externalUnitId),['one','two']);assert.equal(item.asset.rentalMode,'MULTI_UNIT');
});
test('Existing hidden rooms are already imported and cannot be selected again',()=>{
  const item={...candidate(),imported:true,propertyId:'11',propertyVersion:3,unitStates:[{externalUnitId:'one',apartmentId:'21',publicationStatus:'HIDDEN'}]};
  assert.deepEqual(availableSourceUnits(item).map(u=>u.externalUnitId),['two']);
});
test('Foreign or legacy incompatible responses fail closed, not all-source selection',()=>{
  assert.equal(availableSourceUnits({...candidate(),imported:true}).length,0);
  const item={...candidate(),imported:true,propertyId:'11',propertyVersion:3,unitStates:[],appendBlockedReason:'SOURCE_UNIT_RECONCILIATION_REQUIRED'};
  assert.equal(availableSourceUnits(item).length,0);assert.match(sourceAppendMessage(item),/đối chiếu/);
});
test('Append sends only selected terms and source/property versions with the internal token',async()=>{
  setAccessToken('internal');const input={version:3,sourceVersion:'source',units:[{externalUnitId:'two',monthlyRent:'5000000',deposit:'0',electricityUnitPrice:'3500',waterUnitPrice:'15000',electricityIndex:120,waterIndex:30,floor:2,maxOccupants:2,description:''}]};
  globalThis.fetch=async(url,init)=>{
    assert.equal(url,'/api/v1/owner/properties/11/vneid-units');assert.equal(init?.method,'POST');
    assert.equal(new Headers(init?.headers).get('Authorization'),'Bearer internal');assert.deepEqual(JSON.parse(init?.body as string),input);
    return Response.json({property:{id:'11'}});
  };
  assert.equal((await appendVneidUnits('11',input)).property.id,'11');
});
test('A duplicate or stale append stays an explicit error without retrying as a new property',async()=>{
  setAccessToken('internal');let calls=0;globalThis.fetch=async()=>{calls++;return Response.json({code:'SOURCE_UNIT_ALREADY_IMPORTED',message:'Tải lại danh sách.'},{status:409});};
  await assert.rejects(appendVneidUnits('11',{version:3,sourceVersion:'source',units:[]}),(e:ApiError)=>e.status===409&&e.code==='SOURCE_UNIT_ALREADY_IMPORTED');assert.equal(calls,1);
});

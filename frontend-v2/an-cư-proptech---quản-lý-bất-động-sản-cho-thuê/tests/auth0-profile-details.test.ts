import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const users=JSON.parse(readFileSync('../../docs/samples/auth0/users.json','utf8'));
test('ten complete profiles keep their original identifiers/assets and contain no credential or placeholder issuer',()=>{
  assert.equal(users.length,10);let assets=0,units=0;
  const numbers=new Set(),phones=new Set();
  for(const user of users){
    const c=user.app_metadata.vneid.citizen;
    assert.match(user.email,/@example\.com$/);assert.equal(user.email_verified,false);
    assert.equal(user.password,undefined);assert.equal(user.password_hash,undefined);assert.match(c.cccd_number,/^999\d{9}$/);
    numbers.add(c.cccd_number);phones.add(c.phone_number);assert.match(c.phone_number,/^\+84\d{9}$/);
    assert.match(c.document_issue_date,/^\d{2}\/\d{2}\/\d{4}$/);assert.ok(c.document_issue_place.length>30);assert.ok(c.permanent_address.length>50);
    assert.doesNotMatch(c.document_issue_place,/mẫu|sample|TBD|placeholder/i);
    for(const asset of user.app_metadata.vneid.assets){assets++;units+=asset.units.length;assert.doesNotMatch(asset.certificate.issued_place,/mẫu|bộ dữ liệu|SWP|TBD|placeholder/i);assert.ok(asset.certificate.issued_place.length>30);}
  }
  assert.equal(numbers.size,10);assert.equal(phones.size,10);assert.equal(assets,21);assert.equal(units,43);
});
test('the deployable Auth0 Action forwards all 12 trusted fields on both tokens for each profile',async()=>{
  const sandbox={exports:{} as {onExecutePostLogin?: (event:unknown,api:unknown)=>Promise<void>}};
  runInNewContext(readFileSync('../../docs/setup/vneid-post-login.js','utf8'),sandbox);
  for(const user of users){
    const claims:Record<string,unknown>={},access:Record<string,unknown>={};
    await sandbox.exports.onExecutePostLogin!({secrets:{SPA_CLIENT_ID:'spa',API_AUDIENCE:'api',VNEID_CONNECTION:'connection'},client:{client_id:'spa'},connection:{name:'connection'},resource_server:{identifier:'api'},user},
      {idToken:{setCustomClaim:(k:string,v:unknown)=>claims[k]=v},accessToken:{setCustomClaim:(k:string,v:unknown)=>access[k]=v}});
    assert.equal(Object.keys(claims).length,12);assert.deepEqual(claims,access);
    for(const field of ['phone_number','document_issue_date','document_issue_place','permanent_address'])assert.equal(claims['https://vneid.gov.vn/'+field],user.app_metadata.vneid.citizen[field]);
  }
});

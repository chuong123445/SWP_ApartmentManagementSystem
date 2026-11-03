import test from 'node:test';
import assert from 'node:assert/strict';
const {prepareUsernamePatches}=await import(new URL('../../../ancu-proptech-backend/tools/prepare-auth0-username-patches.cjs',import.meta.url).href);
const profile=(email:string,number:string)=>({email,password:'never-export',email_verified:true,app_metadata:{vneid:{citizen:{cccd_number:number}}}});
test('username preparation preserves leading zeros and only changes username',()=>{
  assert.deepEqual(prepareUsernamePatches([profile(' USER@example.invalid ','001234567890')]),[{email:'user@example.invalid',connection:'Username-Password-Authentication',patch:{username:'001234567890'}}]);
});
test('username preparation rejects malformed/duplicate identifiers and email',()=>{
  assert.throws(()=>prepareUsernamePatches([profile('bad','001234567890')]));
  assert.throws(()=>prepareUsernamePatches([profile('u@example.invalid','123')]));
  assert.throws(()=>prepareUsernamePatches([profile('u@example.invalid','001234567890'),profile('v@example.invalid','001234567890')]));
  assert.throws(()=>prepareUsernamePatches([profile('u@example.invalid','001234567890'),profile('U@example.invalid','001234567891')]));
});

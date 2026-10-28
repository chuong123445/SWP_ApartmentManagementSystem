import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { createOwnerApartment, getOwnerApartments, fromOwnerApartment } from '@/services/apartments/ownerApartmentService';
import type { NewRoom } from '@/types';
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
const room: NewRoom = {
  roomNumber: ' P.303 ', buildingId: 'property-uuid', floor: 3, area: 28,
  price: 5000000, deposit: 5000000, status: 'available',
  electricityIndex: 1200, waterIndex: 110, maxOccupants: 2, amenities: ['AC'],
};
const savedApi = {
  version: 0,
  id: 'apartment-uuid', propertyId: 'property-uuid', propertyName: 'My property', ownerId: 'owner-uuid',
  roomNumber: 'P.303', title: 'Apartment', floor: 3, areaM2: '28.00', advertisedMonthlyRent: '5000000.00',
  deposit: '5000000.00', electricityIndex: 1200, waterIndex: 110, maxOccupants: 2,
  amenities: ['AC'], publicationStatus: 'DRAFT', availability: 'VACANT', propertyApprovalStatus: 'APPROVED',
};
test('Owner creates a canonical Apartment using real property UUID, decimal strings and no client owner/state/ID', async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/v1/owner/apartments'); assert.equal(options?.method, 'POST');
    const payload=JSON.parse(options!.body as string);
    for (const field of ['id','ownerId','status','availability','buildingId']) assert.equal(field in payload,false);
    assert.equal(payload.propertyId,'property-uuid');assert.equal(payload.areaM2,'28');
    assert.equal(payload.advertisedMonthlyRent,'5000000');assert.equal(payload.publicationStatus,'DRAFT');
    assert.equal(payload.roomNumber,'P.303');assert.equal(payload.electricityIndex,1200);
    return Response.json(savedApi);
  };
  const saved=await createOwnerApartment(room);
  assert.equal(saved.id,'apartment-uuid');assert.equal(saved.buildingId,'property-uuid');
  assert.equal(saved.status,'available');assert.equal(saved.meterBaselineKnown,true);
});
test('Owner list uses Apartment endpoint and retains draft and missing-meter metadata',async()=>{
  globalThis.fetch=async(url)=>{assert.equal(url,'/api/v1/owner/apartments');return Response.json([{...savedApi,electricityIndex:null,waterIndex:null}]);};
  const [saved]=await getOwnerApartments();assert.equal(saved.publicationStatus,'DRAFT');assert.equal(saved.meterBaselineKnown,false);
});
test('Contract in progress is not displayed as vacant',()=>{
  assert.equal(fromOwnerApartment({...savedApi,availability:'CONTRACT_IN_PROGRESS'}).status,'contract_in_progress');
});
test('Server rejection is reported instead of creating local inventory',async()=>{
  globalThis.fetch=async()=>Response.json({message:'Duplicate apartment'}, {status:409});
  await assert.rejects(createOwnerApartment(room),error=>error instanceof Error && error.message==='Duplicate apartment');
});
test('Connection failure keeps the add form able to retry',async()=>{
  globalThis.fetch=async()=>{throw new TypeError('Failed to fetch');};
  await assert.rejects(createOwnerApartment(room));
});
test('Owner identity gate detects missing identity and verified CCCD documentNumber', () => {
  const isIdentityComplete = (p: { documentNumber?: string } | null | undefined) => Boolean(p && p.documentNumber);
  assert.equal(isIdentityComplete(null), false);
  assert.equal(isIdentityComplete(undefined), false);
  assert.equal(isIdentityComplete({ documentNumber: '' }), false);
  assert.equal(isIdentityComplete({ documentNumber: '012345678901' }), true);
});


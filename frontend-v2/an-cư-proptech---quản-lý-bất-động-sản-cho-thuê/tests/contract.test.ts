import test from 'node:test';
import assert from 'node:assert/strict';
import { saveContract } from '../src/services/contract/contractService.ts';
import { validateContractTerms } from '../src/utils/contract.ts';
import { tenancyViews } from '../src/services/billing/billingService.ts';
import { setAccessToken } from '../src/services/http/client.ts';
import type { ContractContext, ContractDraft, ContractTerms } from '../src/types/contract.ts';
const terms: ContractTerms = { startDate: '2026-11-01', endDate: '2027-11-01', monthlyRent: '9007199254740.50', electricityUnitPrice: '3500', waterUnitPrice: '15000', deposit: '0', paymentDay: 5, paymentMethod: 'Chuyển khoản', usagePurpose: 'Để ở', clauses: [{ title: 'Riêng', body: 'Nội dung riêng' }] };
test('Draft command sends decimal strings and server context versions, never saved identity/asset data', async () => {
  setAccessToken('contract-test-token');
  globalThis.fetch = async (url, init) => {
    assert.equal(url, '/api/v1/owner/rental-requests/request-id/contract');assert.equal(init?.method, 'POST');
    const sent = JSON.parse(init!.body as string);assert.deepEqual(sent, { ...terms, requestVersion: 2, sourceVersion: 'server-version' });
    assert.equal(new Headers(init?.headers).get('Authorization'), 'Bearer contract-test-token');return Response.json({ id: 'draft-id' });
  };
  await saveContract({ rentalRequestId: 'request-id', requestVersion: 2, sourceVersion: 'server-version', snapshot: { owner: { fullName: 'Private' } } } as ContractContext, terms, null);
});
test('Draft edit submits only terms and independent content version', async () => {
  globalThis.fetch = async (url, init) => { assert.equal(url, '/api/v1/owner/contracts/draft-id/draft');assert.equal(init?.method, 'PUT');assert.deepEqual(JSON.parse(init!.body as string), { ...terms, version: 3 });return Response.json({ id: 'draft-id' }); };
  await saveContract({} as ContractContext, terms, { id: 'draft-id', version: 3, snapshot: { customer: { fullName: 'Private' } } } as ContractDraft);
});
test('Contract validation prevents incomplete/decreasing dates and implicit zero prices while permitting explicit zero', () => {
  assert.equal(validateContractTerms(terms), '');
  for (const values of [{ endDate: terms.startDate }, { electricityUnitPrice: '' }, { deposit: '-1' }, { monthlyRent: '1.001' }, { waterUnitPrice: '10000000000000' }, { paymentDay: 29 }, { clauses: [{ title: ' ', body: 'Body' }] }]) assert.notEqual(validateContractTerms({ ...terms, ...values }), '');
  assert.equal(validateContractTerms({ ...terms, electricityUnitPrice: '0', waterUnitPrice: '0' }), '');
});
test('DRAFT cannot be mapped as ended or create an active Tenant relationship', () => {
  const result = tenancyViews([{ id: 'draft', status: 'DRAFT' } as never]);assert.equal(result.contracts[0].status, 'draft');assert.equal(result.tenants.length, 0);
});
test('Contract PDF export generates valid legal document containing audit code, parties, and digital signatures', async () => {
  const { generateContractHtml } = await import('../src/utils/contractPdf.ts');
  const sampleContract = {
    id: 'test-contract-id',
    contractNumber: 'HD-9bbb5425',
    roomId: 'room-1',
    roomNumber: 'T.102',
    buildingName: 'Tòa nhà kiểm thử',
    paymentCycle: 1,
    tenantId: 'tenant-1',
    tenantName: 'Khách thuê Hai',
    startDate: '2026-10-01',
    endDate: '2027-09-30',
    monthlyRent: 6500000,
    deposit: 0,
    status: 'active' as const,
    signingMethod: 'VNPT SmartCA' as const,
    escrowCode: 'MBBANK-ESCROW-88899977',
    trustGuardAuditCode: 'TG-AUD-2025-08912',
    signedDate: '15/01/2025 09:32:15'
  };
  const html = generateContractHtml(sampleContract);
  assert.ok(html.includes('HD-9bbb5425'));
  assert.ok(html.includes('TG-AUD-2025-08912'));
  assert.ok(html.includes('Khách thuê Hai'));
  assert.ok(html.includes('T.102'));
  assert.ok(html.includes('6.500.000'));
  assert.ok(html.includes('CHỨNG THƯ SỐ VNPT-CA'));
  assert.ok(html.includes('eKYC CHIP & DIGITAL OTP'));
});


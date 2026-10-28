import test from 'node:test';
import assert from 'node:assert/strict';
import { saveContract, signContract, getContractPdf } from '../src/services/contract/contractService.ts';
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

test('Signature command binds to the saved version and hash without allowing a caller-selected signer', async () => {
  setAccessToken('signer-token');
  globalThis.fetch = async (url, init) => {
    assert.equal(url, '/api/v1/contracts/42/signatures');assert.equal(init?.method, 'POST');
    assert.equal(new Headers(init?.headers).get('Authorization'), 'Bearer signer-token');
    assert.deepEqual(JSON.parse(init!.body as string), { version: 3, contentHash: 'a'.repeat(64), signature: 'data:image/png;base64,sample', consent: true });
    return Response.json({ id: '42' });
  };
  await signContract({ id: '42', version: 3, signing: { contentHash: 'a'.repeat(64) } } as ContractDraft, 'data:image/png;base64,sample');
});

test('PDF is fetched privately as a real PDF blob and server errors are not rendered as documents', async () => {
  globalThis.fetch = async (url, init) => {
    assert.equal(url, '/api/v1/contracts/42/pdf');assert.equal(init?.cache, 'no-store');
    return new Response('%PDF-1.7 sample', { headers: { 'Content-Type': 'application/pdf' } });
  };
  assert.equal((await getContractPdf('42')).type, 'application/pdf');
  globalThis.fetch = async () => Response.json({ code: 'RESOURCE_NOT_FOUND', message: 'Không tìm thấy hợp đồng.' }, { status: 404 });
  await assert.rejects(getContractPdf('42'), /Không tìm thấy hợp đồng/);
  globalThis.fetch = async () => new Response('<html>error</html>', { headers: { 'Content-Type': 'text/html' } });
  await assert.rejects(getContractPdf('42'), /chưa trả về tệp PDF/);
});
test('Contract validation prevents incomplete/decreasing dates and implicit zero prices while permitting explicit zero', () => {
  assert.equal(validateContractTerms(terms), '');
  for (const values of [{ endDate: terms.startDate }, { electricityUnitPrice: '' }, { deposit: '-1' }, { monthlyRent: '1.001' }, { waterUnitPrice: '10000000000000' }, { paymentDay: 29 }, { clauses: [{ title: ' ', body: 'Body' }] }]) assert.notEqual(validateContractTerms({ ...terms, ...values }), '');
  assert.equal(validateContractTerms({ ...terms, electricityUnitPrice: '0', waterUnitPrice: '0' }), '');
});
test('DRAFT cannot be mapped as ended or create an active Tenant relationship', () => {
  const result = tenancyViews([{ id: 'draft', status: 'DRAFT' } as never]);assert.equal(result.contracts[0].status, 'draft');assert.equal(result.tenants.length, 0);
});

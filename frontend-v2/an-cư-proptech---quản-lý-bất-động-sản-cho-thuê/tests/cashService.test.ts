import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { cashCreateIntent, cashSummary, listCashEntries, postCashEntry, cancelCashEntry } from '@/services/finance/cashService';
import type { CashCreate } from '@/types/finance';
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

test('Cash summary uses whole scope, not page or status filter', async () => {
  const urls: URL[] = [];
  globalThis.fetch = async url => { urls.push(new URL(String(url), 'http://localhost'));return Response.json({}); };
  const filters = { month: '2026-11', propertyId: '21', direction: 'INCOME' as const, status: 'DRAFT' as const };
  await listCashEntries(filters, 2);await cashSummary(filters);
  assert.equal(urls[0].searchParams.get('page'), '2');assert.equal(urls[0].searchParams.get('status'), 'DRAFT');
  for (const url of urls) { assert.equal(url.searchParams.get('month'), '2026-11');assert.equal(url.searchParams.get('propertyId'), '21');assert.equal(url.searchParams.get('direction'), 'INCOME'); }
  assert.equal(urls[1].searchParams.has('page'), false);assert.equal(urls[1].searchParams.has('status'), false);
  await listCashEntries({ month: '2026-11', propertyId: 'all' });assert.equal(urls[2].searchParams.has('propertyId'), false);
});

test('Lost create response retries same requestKey and payload, next successful intent gets a fresh key', async () => {
  const bodies: CashCreate[] = [];let first = true;
  globalThis.fetch = async (_url, options) => {
    bodies.push(JSON.parse(options?.body as string));
    if (first) { first = false;throw new TypeError('Lost response after commit'); }
    return Response.json({ id: 9, status: 'DRAFT' });
  };
  const create = cashCreateIntent();
  const input: Omit<CashCreate, 'requestKey'> = { propertyId: 1, direction: 'EXPENSE', paymentMethod: 'CASH', amount: '100.25', transactionDate: '2026-01-01', category: 'Sửa chữa', counterparty: 'Thợ', description: 'Bảo trì', reference: '' };
  await assert.rejects(() => create(input), /Lost response/);assert.equal((await create(input)).id, 9);
  assert.deepEqual(bodies[0], bodies[1]);assert.equal(typeof bodies[0].amount, 'string');
  await create(input);assert.notEqual(bodies[2].requestKey, bodies[0].requestKey);
});

test('Cash actions send server version and cancellation reason; API errors remain errors', async () => {
  const calls: { url: string; body: unknown }[] = [];
  globalThis.fetch = async (url, options) => { calls.push({ url: String(url), body: JSON.parse(options?.body as string) });return Response.json({ message: 'Phiếu đã thay đổi.', code: 'CASH_ENTRY_CONFLICT' }, { status: 409 }); };
  await assert.rejects(() => postCashEntry(9, 4), /Phiếu đã thay đổi/);
  await assert.rejects(() => cancelCashEntry(9, 5, 'Ghi trùng'), /Phiếu đã thay đổi/);
  assert.deepEqual(calls, [{ url: '/api/v1/owner/cash-entries/9/post', body: { version: 4 } }, { url: '/api/v1/owner/cash-entries/9/cancel', body: { version: 5, reason: 'Ghi trùng' } }]);
});

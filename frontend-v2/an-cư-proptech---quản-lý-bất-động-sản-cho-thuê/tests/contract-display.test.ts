import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contractActionLabel, contractStatusLabel } from '../src/utils/contractDisplay.ts';
import type { ContractDraft } from '../src/types/contract.ts';

test('past end date stays pending resolution until ended; drafts are not expired tenancies', () => {
  assert.equal(contractStatusLabel('active', '2026-10-31', '2026-11-02'), 'Hết hạn — chờ xử lý');
  assert.equal(contractStatusLabel('ACTIVE', '2026-11-02', '2026-11-02'), 'Đang hiệu lực');
  assert.equal(contractStatusLabel('ENDED', '2026-10-31', '2026-11-02'), 'Đã kết thúc');
  assert.equal(contractStatusLabel('DRAFT', '2026-10-31', '2026-11-02'), 'Bản nháp');
});

test('only a draft unsigned by the current party offers signing', () => {
  const draft = { status: 'DRAFT', signing: { ownerAccountId: '3', customerAccountId: '2', state: 'WAITING_CUSTOMER', ownerSignedAt: '2026-10-30T00:00:00Z', customerSignedAt: null } } as ContractDraft;
  assert.equal(contractActionLabel(draft, '3'), 'Xem hợp đồng');
  assert.equal(contractActionLabel(draft, '2'), 'Xem / ký hợp đồng');
  assert.equal(contractActionLabel({ ...draft, status: 'ACTIVE' }, '2'), 'Xem hợp đồng');
  assert.equal(contractActionLabel({ ...draft, status: 'ENDED' }, '2'), 'Xem hợp đồng');
});

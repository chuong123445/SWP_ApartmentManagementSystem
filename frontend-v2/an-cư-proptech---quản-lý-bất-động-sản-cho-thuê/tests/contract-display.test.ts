import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contractActionLabel, contractStatusLabel, contractLifecycleActions, contractListTitle } from '../src/utils/contractDisplay.ts';
import type { ContractDraft } from '../src/types/contract.ts';

test('list lifecycle actions follow exact party, request/handover conflicts and server handover permission', () => {
  const draft = { status: 'ACTIVE', snapshot: { owner: { id: '3' }, customer: { id: '2' } }, lifecycle: { version: 4, renewalRequestAvailable: true, handoverAvailable: true, renewalRequest: null, renewalContractId: null, handover: null } } as unknown as ContractDraft;
  assert.equal(contractLifecycleActions(draft, '2').canRequest, true);
  assert.equal(contractLifecycleActions(draft, '3').canRequest, false);
  assert.equal(contractLifecycleActions(draft, '3').canHandover, true);
  assert.equal(contractLifecycleActions(draft, '9').canHandover, false);
  for (const blocked of [
    { ...draft, status: 'ENDED' },
    { ...draft, lifecycle: undefined },
    { ...draft, lifecycle: { ...draft.lifecycle, renewalRequestAvailable: false } },
    { ...draft, lifecycle: { ...draft.lifecycle, renewalRequestAvailable: undefined } },
    { ...draft, lifecycle: { ...draft.lifecycle, handover: { status: 'PENDING' } } },
    { ...draft, lifecycle: { ...draft.lifecycle, renewalContractId: '10' } },
    { ...draft, lifecycle: { ...draft.lifecycle, renewalRequest: { status: 'PENDING' } } },
  ]) assert.equal(contractLifecycleActions(blocked as ContractDraft, '2').canRequest, false);
  assert.equal(contractLifecycleActions({ ...draft, status: 'ENDED' }, '3').canHandover, false);
});

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

test('existing fixture contracts use ordinary contract headings', () => {
  for (const [id, title] of [['HD-5','[MẪU] Nhắc hạn 10 ngày - HH205.D10'],['HD-4','[MẪU] Hết hạn - HH205.TEST']]) {
    const draft={contractNumber:id,snapshot:{asset:{roomNumber:'HH205.TEST',title}}} as ContractDraft;
    assert.equal(contractListTitle(draft),`Hợp đồng thuê · ${id}`);
    assert.equal(draft.snapshot.asset.title,title);
  }
  const regular={contractNumber:'HD-8',snapshot:{asset:{roomNumber:'A101',title:'Căn hộ Lê Văn Sỹ'}}} as ContractDraft;
  assert.equal(contractListTitle(regular),'A101 · Căn hộ Lê Văn Sỹ');
});

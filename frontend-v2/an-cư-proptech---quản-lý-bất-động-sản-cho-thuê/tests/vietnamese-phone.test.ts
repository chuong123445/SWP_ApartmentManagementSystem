import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeVietnamesePhone } from '../src/utils/vietnamesePhone.ts';
test('Vietnamese mobile/landline domestic and international forms normalize consistently',()=>{
  assert.equal(normalizeVietnamesePhone('0912 345 678'),'+84912345678');
  assert.equal(normalizeVietnamesePhone('+84 312.345.678'),'+84312345678');
  assert.equal(normalizeVietnamesePhone('028-1234-5678'),'+842812345678');
});
test('invalid lengths, foreign numbers, old mobile prefix, letters and blanks fail',()=>{
  for(const phone of ['', ' ', '+12025550123', '+840912345678', '0612345678', '091234567', '09123456789', '01234567890', '09123456ab', '０９１２３４５６７８'])assert.equal(normalizeVietnamesePhone(phone),null,phone);
});

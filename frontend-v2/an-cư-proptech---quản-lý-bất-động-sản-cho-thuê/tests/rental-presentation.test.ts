import test from 'node:test';
import assert from 'node:assert/strict';
import { rentalRequestPresentation } from '../src/utils/format';

test('hide known fixture labels and setup metadata in rental request presentation', () => {
  for (const message of ['LOCAL-HH205-EXPIRED-20261102', 'LOCAL-HH205-REMINDER-20261102-D10']) {
    assert.deepEqual(rentalRequestPresentation({apartmentTitle:'[MẪU] Hết hạn - HH205.TEST',message,
      decisionReason:'Dữ liệu mẫu được cho phép tạo riêng ngày 02/11/2026.'}),
      {title:'Hết hạn - HH205.TEST',message:'',decisionReason:null});
  }
});

test('preserve actual messages and decisions, including later decisions on fixture requests', () => {
  const request={apartmentTitle:'Căn hộ mẫu thiết kế mới',message:'Tôi muốn thuê',decisionReason:'Không đủ điều kiện'};
  assert.deepEqual(rentalRequestPresentation(request),{title:request.apartmentTitle,message:request.message,decisionReason:request.decisionReason});
  assert.equal(rentalRequestPresentation({...request,message:'LOCAL-HH205-EXPIRED-20261102'}).decisionReason,request.decisionReason);
});

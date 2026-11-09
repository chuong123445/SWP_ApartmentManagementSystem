import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyExtractedFields, blankListing, addressParts } from '../src/utils/listingWizard';
import { dossierDateDisplay, dossierDateIso } from '../src/utils/dossierDates';

test('automatically fills name, address subdivisions and dates from extraction', () => {
  const source={fileId:'7',filename:'certificate.pdf',page:1};
  const filled=applyExtractedFields(blankListing(),[
    {...source,field:'propertyName',value:'Nhà An Cư'},
    {...source,field:'propertyAddress',value:'12 Đường A, Phường Linh Trung, Thành phố Thủ Đức, TP. Hồ Chí Minh'},
    {...source,field:'certificateIssueDate',value:'15/12/2025'},
  ]);
  assert.equal(filled.name,'Nhà An Cư');assert.equal(filled.city,'TP. Hồ Chí Minh');
  assert.equal(filled.district,'Thủ Đức');assert.equal(filled.ward,'Linh Trung');
  assert.equal(filled.legal.certificateIssueDate,'2025-12-15');
});
test('explicit address subdivisions take precedence over literal fallback', () => {
  const source={fileId:'7',filename:'certificate.pdf'};
  const filled=applyExtractedFields(blankListing(),[
    {...source,field:'propertyAddress',value:'12 Đường A, Phường A, TP. Hồ Chí Minh'},
    {...source,field:'ward',value:'Phường đã khai trên giấy'},
  ]);
  assert.equal(filled.ward,'Phường đã khai trên giấy');
  assert.equal(addressParts('12 Đường A').district,undefined);
});
test('automatic refresh preserves a user correction', () => {
  const source={fileId:'7',filename:'certificate.pdf',field:'certificateNumber'};
  const first=applyExtractedFields(blankListing(),[{...source,value:'GCN-A'}]);
  first.legal.certificateNumber='GCN-ĐÃ-SỬA';
  assert.equal(applyExtractedFields(first,[{...source,value:'GCN-B'}]).legal.certificateNumber,'GCN-ĐÃ-SỬA');
});
test('date-only fields consistently use day/month/year and reject impossible dates', () => {
  assert.equal(dossierDateIso('05/06/2026'),'2026-06-05');
  assert.equal(dossierDateDisplay('2026-06-05'),'05/06/2026');
  assert.equal(dossierDateIso('12/31/2026'),null);
  assert.equal(dossierDateIso('31/02/2026'),null);
  assert.equal(dossierDateIso('29/02/2028'),'2028-02-29');
});

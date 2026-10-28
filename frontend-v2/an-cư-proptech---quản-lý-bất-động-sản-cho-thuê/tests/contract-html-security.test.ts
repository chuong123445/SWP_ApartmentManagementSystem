import test from 'node:test';
import assert from 'node:assert/strict';
import { generateContractBody, generateContractHtml } from '../src/utils/contractPdf.ts';
import type { Contract } from '../src/types';

const contract: Contract = {
  id: '123', contractNumber: 'HD-123', tenantId: '41', tenantName: 'Nguyễn Văn A & B',
  roomId: '32', roomNumber: 'A.01', buildingName: 'Tòa A', startDate: '2026-11-01', endDate: '2027-10-31',
  monthlyRent: 4500000, deposit: 1000000, paymentCycle: 1, status: 'active',
};

test('every dynamic HTML text field is escaped in print, PDF and download markup', () => {
  const payload = '</title><img src=x onerror="globalThis.__xss=1"><script>alert(1)</script>';
  for (const field of ['contractNumber', 'tenantName', 'roomNumber', 'startDate', 'endDate', 'escrowCode', 'trustGuardAuditCode', 'signedDate', 'signingMethod', 'id']) {
    const value = { ...contract, [field]: payload } as Contract;
    for (const html of [generateContractBody(value), generateContractHtml(value)]) {
      assert.ok(!/<(?:img|script)\b/i.test(html), `raw HTML from ${field}`);
      assert.ok(!html.includes(payload), `unescaped payload from ${field}`);
    }
  }
});

test('escaping preserves Vietnamese text and encodes HTML punctuation once', () => {
  const html = generateContractBody({ ...contract, tenantName: `Nguyễn <A> & "B" 'C'` });
  assert.ok(html.includes('Nguyễn &lt;A&gt; &amp; &quot;B&quot; &#39;C&#39;'));
  assert.ok(!html.includes('&amp;lt;'));
  assert.ok(html.includes('4.500.000'));
});

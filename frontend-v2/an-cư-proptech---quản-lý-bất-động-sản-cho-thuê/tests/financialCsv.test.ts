import assert from 'node:assert/strict';
import {test} from 'node:test';
import {buildFinancialCsv,financialCsvFilename} from '@/utils/financialCsv';
import type {OwnerFinancialSummary} from '@/types/financialReport';
const amounts={invoiceCount:21,paidInvoiceCount:0,onTimePaidInvoiceCount:0,billedAmount:'12345678901234567890.1250',paidInvoiceAmount:'0',unpaidInvoiceAmount:'12345678901234567890.1250',rentAmount:'12345678901234567890.0000',electricityAmount:'0.1250',waterAmount:'0',serviceAmount:'0'};
const receipts={monthlyInvoiceAmount:'100',additionalAmount:'1234',totalAmount:'1334'};
const data:OwnerFinancialSummary={allocatedRentAmount:'102000000.1234',year:2026,propertyId:null,asOf:'2026-11-08',totals:amounts,receipts,arrears:{monthlyInvoiceCount:21,monthlyInvoiceAmount:amounts.unpaidInvoiceAmount,overdueInvoiceCount:0,overdueInvoiceAmount:'0',additionalCount:0,additionalAmount:'0'},inventory:{units:40,occupied:40,vacant:0},months:Array.from({length:12},(_,i)=>({period:`2026-${String(i+1).padStart(2,'0')}`,invoices:amounts,receipts,allocatedRentAmount:'8500000.0100'})),properties:Array.from({length:40},(_,i)=>({id:String(i+1),name:'Tòa '+(i+1),inventory:{units:1,occupied:1,vacant:0},invoices:amounts,receipts,allocatedRentAmount:'8500000.0100'}))};
test('CSV exports the current full snapshot with 12 months and all properties, retaining exact decimal strings',()=>{
  const csv=buildFinancialCsv(data);assert.equal(csv.charCodeAt(0),0xFEFF);assert.ok(csv.includes('\r\n'));
  assert.ok(csv.includes('"Hóa đơn đã gửi theo kỳ","12345678901234567890.1250"'));assert.ok(csv.includes('"Tiền nhận trong năm từ phiếu bổ sung","1234"'));
  for(let month=1;month<=12;month++)assert.ok(csv.includes(`"2026-${String(month).padStart(2,'0')}","21"`));
  assert.ok(csv.includes('"40","Tòa 40"'));assert.equal(financialCsvFilename(data),'bao-cao-tai-chinh-2026-tat-ca.csv');
});
test('CSV quotes names/newlines and neutralizes spreadsheet formulas from property text',()=>{
  const name=' =HYPERLINK("https://example.invalid", "mở")\nTòa thử';const csv=buildFinancialCsv({...data,properties:[{...data.properties[0],name}]});
  assert.ok(csv.includes('"\' =HYPERLINK(""https://example.invalid"", ""mở"")\nTòa thử"'));assert.ok(!csv.includes('" =HYPERLINK('));
});
test('CSV filename and metadata reflect the selected property/year; missing on-time denominator is not zero/100 percent',()=>{
  const selected={...data,year:2025,propertyId:'42',months:data.months.map(month=>({...month,period:month.period.replace('2026','2025')})),properties:[{...data.properties[0],id:'42'}]};const csv=buildFinancialCsv(selected);
  assert.equal(financialCsvFilename(selected),'bao-cao-tai-chinh-2025-tai-san-42.csv');assert.ok(csv.includes('"Năm","2025"'));assert.ok(csv.includes('"Phạm vi tài sản","42"'));
  assert.ok(csv.includes('"2025-01","21"'));assert.ok(!csv.includes('"2026-01","21"'));
  assert.ok(csv.includes('"Tỷ lệ đúng hạn trong số đã thanh toán (%)","Chưa có dữ liệu"'));
});

test('CSV includes server monthly allocation separately from cash and preserves decimals',()=>{const csv=buildFinancialCsv(data);assert.ok(csv.includes('\"Tiền thuê phân bổ trong năm\",\"102000000.1234\"'));assert.ok(csv.includes('\"8500000.0100\"'));});

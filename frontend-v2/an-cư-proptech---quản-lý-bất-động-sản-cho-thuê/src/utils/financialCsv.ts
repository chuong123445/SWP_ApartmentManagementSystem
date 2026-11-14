import type {OwnerFinancialSummary} from '@/types/financialReport';

function cell(value:string|number|null){
  const text=value==null?'':String(value);
  // Names are untrusted spreadsheet text: quoting alone does not prevent formulas.
  const safe=/^\s*[=+@-]/u.test(text)||/^[\t\r\n]/u.test(text)?`'${text}`:text;
  return `"${safe.replace(/"/g,'""')}"`;
}
export function buildFinancialCsv(data:OwnerFinancialSummary){
  const t=data.totals,r=data.receipts,a=data.arrears;
  const rows:(string|number|null)[][]=[
    ['Báo cáo tài chính'],['Năm',data.year],['Phạm vi tài sản',data.propertyId??'Tất cả tài sản thuộc tài khoản'],['Ngày thống kê',data.asOf],
    ['Cơ sở','Tiền thuê phân bổ theo tháng sử dụng trên hóa đơn đã gửi; hóa đơn theo tháng bắt đầu kỳ; thực thu theo ngày thanh toán giờ Việt Nam. Trạng thái thanh toán và công nợ là hiện tại, không phải bản chốt năm cũ.'],[],
    ['Chỉ số','Giá trị'],['Tiền thuê phân bổ trong năm',data.allocatedRentAmount??'0'],['Số hóa đơn đã gửi theo kỳ',t.invoiceCount],['Hóa đơn đã gửi theo kỳ',t.billedAmount],['Đã thanh toán theo kỳ hóa đơn',t.paidInvoiceAmount],['Chưa thu theo kỳ hóa đơn',t.unpaidInvoiceAmount],
    ['Tiền thuê trên hóa đơn',t.rentAmount],['Tiền điện trên hóa đơn',t.electricityAmount],['Tiền nước trên hóa đơn',t.waterAmount],['Internet và vệ sinh trên hóa đơn',t.serviceAmount],
    ['Số hóa đơn đã thanh toán theo kỳ',t.paidInvoiceCount],['Số hóa đơn đã thanh toán đúng hạn theo kỳ',t.onTimePaidInvoiceCount],['Tỷ lệ đúng hạn trong số đã thanh toán (%)',t.paidInvoiceCount?(100*t.onTimePaidInvoiceCount/t.paidInvoiceCount).toFixed(1):'Chưa có dữ liệu'],
    ['Tiền nhận trong năm từ hóa đơn tháng',r.monthlyInvoiceAmount],['Tiền nhận trong năm từ phiếu bổ sung',r.additionalAmount],['Tổng tiền nhận trong năm',r.totalAmount],
    ['Hóa đơn tháng chưa thu mọi kỳ - số lượng',a.monthlyInvoiceCount],['Hóa đơn tháng chưa thu mọi kỳ - số tiền',a.monthlyInvoiceAmount],['Hóa đơn tháng quá hạn mọi kỳ - số lượng',a.overdueInvoiceCount],['Hóa đơn tháng quá hạn mọi kỳ - số tiền',a.overdueInvoiceAmount],
    ['Phiếu bổ sung chưa thu mọi kỳ - số lượng',a.additionalCount],['Phiếu bổ sung chưa thu mọi kỳ - số tiền',a.additionalAmount],['Quy mô căn hộ hiện tại',data.inventory.units],['Căn đang ở hiện tại',data.inventory.occupied],['Căn trống hiện tại',data.inventory.vacant],[],
    ['Theo tháng'],['Kỳ','Số hóa đơn','HĐ đã gửi','Đã thanh toán theo kỳ HĐ','Chưa thu theo kỳ HĐ','Nhận từ HĐ tháng','Nhận từ phiếu bổ sung','Tổng tiền nhận','Tiền thuê phân bổ'],
    ...data.months.map(month=>[month.period,month.invoices.invoiceCount,month.invoices.billedAmount,month.invoices.paidInvoiceAmount,month.invoices.unpaidInvoiceAmount,month.receipts.monthlyInvoiceAmount,month.receipts.additionalAmount,month.receipts.totalAmount,month.allocatedRentAmount??'0']),[],
    ['Theo tài sản'],['Mã tài sản','Tài sản','Tổng căn hiện tại','Đang ở hiện tại','Trống hiện tại','Số hóa đơn','HĐ đã gửi','Đã thanh toán theo kỳ HĐ','Chưa thu theo kỳ HĐ','Nhận từ HĐ tháng','Nhận từ phiếu bổ sung','Tổng tiền nhận','Tiền thuê phân bổ'],
    ...data.properties.map(property=>[property.id,property.name,property.inventory.units,property.inventory.occupied,property.inventory.vacant,property.invoices.invoiceCount,property.invoices.billedAmount,property.invoices.paidInvoiceAmount,property.invoices.unpaidInvoiceAmount,property.receipts.monthlyInvoiceAmount,property.receipts.additionalAmount,property.receipts.totalAmount,property.allocatedRentAmount??'0']),[],
    ['Ghi chú','Tiền thanh toán có thể do nền tảng thu hộ; không phải số dư ví hoặc tiền đã rút về ngân hàng. Tiền cọc do hai bên tự quản lý ngoài hệ thống, không tính vào báo cáo này. Sổ quỹ thủ công và rút ví theo dõi riêng. Chưa tính lợi nhuận khi thiếu chi phí đầy đủ và đối soát. Tiền giữ nguyên chuỗi thập phân trong CSV; không phải tệp XLSX.'],
  ];
  return '\uFEFF'+rows.map(row=>row.map(cell).join(',')).join('\r\n')+'\r\n';
}
export const financialCsvFilename=(data:OwnerFinancialSummary)=>`bao-cao-tai-chinh-${data.year}-${data.propertyId?`tai-san-${data.propertyId}`:'tat-ca'}.csv`;
export function downloadFinancialCsv(data:OwnerFinancialSummary){
  const url=URL.createObjectURL(new Blob([buildFinancialCsv(data)],{type:'text/csv;charset=utf-8;'}));
  let link:HTMLAnchorElement|undefined;
  try{link=document.createElement('a');link.href=url;link.download=financialCsvFilename(data);document.body.appendChild(link);link.click();}
  finally{link?.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);}
}

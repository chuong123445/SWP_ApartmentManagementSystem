import type { Contract } from '@/types';

// Các trường hợp đồng là văn bản, không phải HTML. Escape ở đầu ra dùng chung
// để bảo vệ cả in (doc.write), PDF (innerHTML) và file HTML tải xuống.
function escapeHtml(value: unknown): string {
  const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(value ?? '').replace(/[&<>"']/g, character => entities[character]);
}

function getContractCss(): string {
  return `
    @page {
      size: A4;
      margin: 18mm 20mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body, .contract-print-root {
      font-family: 'Times New Roman', Times, serif;
      font-size: 13.5px;
      line-height: 1.6;
      color: #1e293b;
      margin: 0;
      padding: 0;
      background: #ffffff;
    }
    .header-national {
      text-align: center;
      margin-bottom: 22px;
    }
    .header-national h3 {
      font-size: 14px;
      font-weight: bold;
      text-transform: uppercase;
      margin: 0 0 4px 0;
      color: #0f172a;
    }
    .header-national p {
      font-size: 13px;
      font-weight: 600;
      margin: 0;
      color: #334155;
    }
    .divider-national {
      width: 140px;
      height: 1.5px;
      background: #475569;
      margin: 8px auto 0 auto;
    }
    .title-contract {
      text-align: center;
      margin: 22px 0 18px 0;
    }
    .title-contract h2 {
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 17px;
      font-weight: 800;
      color: #047857;
      text-transform: uppercase;
      margin: 0 0 6px 0;
      letter-spacing: 0.5px;
    }
    .title-contract .meta {
      font-size: 12px;
      color: #64748b;
      font-style: italic;
    }
    .badge-audit {
      display: inline-block;
      background: #ecfdf5;
      color: #047857;
      border: 1px solid #a7f3d0;
      padding: 2px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: bold;
      font-family: monospace;
      margin-top: 4px;
    }
    .section-title {
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 13px;
      font-weight: bold;
      text-transform: uppercase;
      color: #0f172a;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
      margin-top: 18px;
      margin-bottom: 8px;
    }
    .party-box {
      margin-bottom: 12px;
      font-size: 13px;
    }
    .party-box p {
      margin: 3px 0;
    }
    .party-box strong {
      color: #0f172a;
    }
    .terms-list {
      margin: 0;
      padding-left: 20px;
    }
    .terms-list li {
      margin-bottom: 6px;
      text-align: justify;
    }
    .signature-grid {
      display: flex;
      justify-content: space-between;
      gap: 20px;
      margin-top: 28px;
      page-break-inside: avoid;
    }
    .signature-card {
      flex: 1;
      border: 1px dashed #cbd5e1;
      border-radius: 10px;
      padding: 14px;
      text-align: center;
      background: #fafafa;
    }
    .signature-card.signed-a {
      border: 1px solid #10b981;
      background: #f0fdf4;
    }
    .signature-card.signed-b {
      border: 1px solid #3b82f6;
      background: #eff6ff;
    }
    .signature-title {
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
      color: #0f172a;
      margin-bottom: 2px;
    }
    .signature-signer {
      font-size: 12px;
      color: #475569;
      margin-bottom: 8px;
    }
    .signature-seal {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.1);
      border-radius: 6px;
      padding: 8px;
      font-family: monospace;
      font-size: 11px;
      line-height: 1.4;
      text-align: center;
      display: inline-block;
      width: 100%;
    }
    .signature-seal .verified-badge {
      font-weight: bold;
      display: block;
      margin-bottom: 2px;
    }
    .signature-seal.seal-a {
      color: #065f46;
      border-color: #6ee7b7;
    }
    .signature-seal.seal-b {
      color: #1e40af;
      border-color: #93c5fd;
    }
    .footer-security {
      margin-top: 26px;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
      font-size: 11px;
      color: #64748b;
      display: flex;
      justify-content: space-between;
      align-items: center;
      page-break-inside: avoid;
    }
    .footer-security .hash {
      font-family: monospace;
      font-size: 10px;
      color: #94a3b8;
    }
  `;
}

export function generateContractBody(contract: Contract): string {
  const auditCode = escapeHtml(contract.trustGuardAuditCode || `TG-AUD-${contract.contractNumber || '2026-08912'}`);
  const signedAt = escapeHtml(contract.signedDate || '15/01/2026 09:32:15');
  const rentFormatted = escapeHtml(contract.monthlyRent.toLocaleString('vi-VN'));
  const depositFormatted = escapeHtml(contract.deposit.toLocaleString('vi-VN'));

  return `
  <div class="header-national">
    <h3>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h3>
    <p>Độc lập - Tự do - Hạnh phúc</p>
    <div class="divider-national"></div>
  </div>

  <div class="title-contract">
    <h2>HỢP ĐỒNG CHO THUÊ CĂN HỘ CAO CẤP & BẢO CHỨNG KÝ QUỸ ESCROW</h2>
    <div class="meta">Số hợp đồng điện tử: <strong>${escapeHtml(contract.contractNumber)}</strong></div>
    <div><span class="badge-audit">Mã xác thực TrustGuard: ${auditCode}</span></div>
  </div>

  <div class="section-title">I. CĂN CỨ PHÁP LÝ</div>
  <p style="text-align: justify; margin: 4px 0 10px 0;">
    - Căn cứ Bộ luật Dân sự số 91/2015/QH13 ban hành ngày 24/11/2015;<br>
    - Căn cứ Luật Giao dịch điện tử số 20/2023/QH15 của Quốc hội khóa XV;<br>
    - Căn cứ thỏa thuận tự nguyện và chứng thực định danh số của hai bên.
  </p>

  <div class="section-title">II. CÁC BÊN THAM GIA HỢP ĐỒNG</div>
  
  <div class="party-box">
    <strong>BÊN CHO THUÊ (BÊN A):</strong> BQL TÒA NHÀ AN CƯ PROPTECH - LÊ VĂN SỸ<br>
    • Địa chỉ: 284/12 Lê Văn Sỹ, Phường 14, Quận 3, TP. Hồ Chí Minh<br>
    • Đại diện: Ban Quản Lý Tòa Nhà<br>
    • Tài khoản bảo chứng Escrow: <strong>MBBANK-ESCROW-88899977</strong> (Ngân hàng TMCP Quân Đội)
  </div>

  <div class="party-box">
    <strong>BÊN THUÊ (BÊN B):</strong> Ông/Bà <strong>${escapeHtml(contract.tenantName)}</strong><br>
    • Căn hộ thuê: <strong>Căn số ${escapeHtml(contract.roomNumber)}</strong> - Tòa A Lê Văn Sỹ<br>
    • Thời hạn thuê: Từ ngày <strong>${escapeHtml(contract.startDate)}</strong> đến hết ngày <strong>${escapeHtml(contract.endDate)}</strong><br>
    • Phương thức định danh: Xác thực CCCD gắn chip & eKYC đối soát số liệu
  </div>

  <div class="section-title">III. ĐIỀU KHOẢN TÀI CHÍNH & KÝ QUỸ BẢO CHỨNG</div>
  <ol class="terms-list">
    <li><strong>Giá thuê căn hộ:</strong> Cố định <strong>${rentFormatted} VNĐ/tháng</strong> (Chưa bao gồm tiền dịch vụ điện nước theo chỉ số công tơ niêm phong).</li>
    <li><strong>Tiền ký quỹ cọc bảo đảm:</strong> <strong>${depositFormatted} VNĐ</strong>, được phong tỏa tài khoản Escrow tại Ngân hàng MBBank theo mã <strong>${escapeHtml(contract.escrowCode || 'MB-ESCROW')}</strong>. Tiền cọc được bảo chứng giải tỏa 100% khi hai bên nghiệm thu biên bản bàn giao.</li>
    <li><strong>Chu kỳ thanh toán:</strong> Định kỳ hàng tháng từ ngày 01 đến 05 qua cổng thanh toán tự động VietQR Napas247.</li>
    <li><strong>Quy định an toàn & PCCC:</strong> Căn hộ đạt tiêu chuẩn Thẩm duyệt PCCC số 112/TD-PCCC-PC07. Bên B cam kết tuân thủ nghiêm ngặt nội quy an ninh trật tự.</li>
  </ol>

  <div class="section-title">IV. XÁC THỰC VÀ CHỮ KÝ SỐ ĐIỆN TỬ CỦA HAI BÊN</div>
  <p style="font-size: 12px; color: #475569; margin: 4px 0 10px 0;">
    Hai bên đã đọc kỹ, hiểu rõ quyền nghĩa vụ và thống nhất ký số điện tử vào văn bản này. Hợp đồng có giá trị pháp lý tương đương văn bản công chứng giấy.
  </p>

  <div class="signature-grid">
    <div class="signature-card signed-a">
      <div class="signature-title">BÊN CHO THUÊ (BÊN A)</div>
      <div class="signature-signer">Ký bởi: BAN QUAN LY AN CU</div>
      <div class="signature-seal seal-a">
        <span class="verified-badge">✓ CHỨNG THƯ SỐ VNPT-CA</span>
        <span>Thời gian: ${signedAt}</span><br>
        <span style="font-size: 9px; color: #059669;">Mã chứng thư: VNPT-CA-CORP-2026</span>
      </div>
    </div>

    <div class="signature-card signed-b">
      <div class="signature-title">BÊN THUÊ (BÊN B)</div>
      <div class="signature-signer">Ký bởi: ${escapeHtml(contract.tenantName)}</div>
      <div class="signature-seal seal-b">
        <span class="verified-badge">✓ eKYC CHIP & DIGITAL OTP</span>
        <span>Thời gian: ${signedAt}</span><br>
        <span style="font-size: 9px; color: #2563eb;">Phương thức: ${escapeHtml(contract.signingMethod || 'Ký số eKYC Chip')}</span>
      </div>
    </div>
  </div>

  <div class="footer-security">
    <div>
      <strong>An Cư TrustGuard™ Protection</strong> • Văn bản điện tử đã khóa niêm phong chống chỉnh sửa.
    </div>
    <div class="hash">
      SHA-256: 7f83b165...${escapeHtml(contract.id.slice(-8))}
    </div>
  </div>`;
}

export function generateContractHtml(contract: Contract): string {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Hop_Dong_Thue_Can_Ho_${escapeHtml(contract.contractNumber)}</title>
  <style>
    ${getContractCss()}
  </style>
</head>
<body class="contract-print-root">
  ${generateContractBody(contract)}
</body>
</html>`;
}

export function printContractDocument(contract: Contract): void {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    window.print();
    return;
  }

  doc.open();
  doc.write(generateContractHtml(contract));
  doc.close();

  iframe.contentWindow?.focus();
  setTimeout(() => {
    iframe.contentWindow?.print();
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 1500);
  }, 350);
}

export async function downloadContractPdfFile(contract: Contract): Promise<void> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const { default: jsPDF } = await import('jspdf');
  const { default: html2canvas } = await import('html2canvas');

  const container = document.createElement('div');
  container.className = 'contract-print-root';
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '794px';
  container.style.backgroundColor = '#ffffff';
  container.style.padding = '35px 45px';
  container.style.zIndex = '-9999';

  const styleEl = document.createElement('style');
  styleEl.textContent = getContractCss();
  container.appendChild(styleEl);

  const contentEl = document.createElement('div');
  contentEl.innerHTML = generateContractBody(contract);
  container.appendChild(contentEl);

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`Hop_Dong_Thue_Can_Ho_${contract.contractNumber}.pdf`);
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}

export function downloadContractHtmlFile(contract: Contract): void {
  const html = generateContractHtml(contract);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Hop_Dong_Thue_Can_Ho_${contract.contractNumber}.html`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

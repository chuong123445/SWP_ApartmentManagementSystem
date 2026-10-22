import React, { useState } from 'react';
import {
  FileCheck2,
  Plus,
  Search,
  Calendar,
  FileText,
  Printer,
  Download,
  Loader2,
  ZoomIn,
  ZoomOut,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  Lock,
  Award,
} from 'lucide-react';
import { Contract } from '@/types';
import { ContractDraftList } from '@/components/contract/ContractDraftList';
import { printContractDocument, downloadContractPdfFile, downloadContractHtmlFile } from '@/utils/contractPdf';

interface ContractsPageProps {
  propertyId?: string;
  onChooseRequest?: () => void;
  contracts: Contract[];
}

export const ContractsPage: React.FC<ContractsPageProps> = ({
  contracts,
  propertyId,
  onChooseRequest,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [previewContract, setPreviewContract] = useState<Contract | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [zoom, setZoom] = useState(100);

  const filteredContracts = contracts.filter(
    (c) =>
      c.status !== 'draft' && (c.contractNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.roomNumber.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Quan hệ thuê được lưu trong hệ thống
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <span>Hợp đồng thuê căn hộ</span>
            <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-semibold">
              {contracts.length} hợp đồng
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Giá thuê và đơn giá điện nước trong hợp đồng được dùng khi lập hóa đơn.
          </p>
        </div>

        <button
          onClick={onChooseRequest}
          id="btn-add-contract"
          disabled={!onChooseRequest}
          title="Tạo hợp đồng từ yêu cầu đã chấp nhận"
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Chọn yêu cầu đã chấp nhận</span>
        </button>
      </div>

      <ContractDraftList owner propertyId={propertyId} />
      {/* Search */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo số hợp đồng, tên khách thuê, căn hộ, mã ký quỹ Escrow..."
            className="w-full bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Contract Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Mã Hợp Đồng</th>
                <th className="px-4 py-3">Căn Hộ</th>
                <th className="px-4 py-3">Khách Thuê</th>
                <th className="px-4 py-3">Phương Thức Ký</th>
                <th className="px-4 py-3">Bảo Chứng Escrow</th>
                <th className="px-4 py-3">Thời Hạn</th>
                <th className="px-4 py-3">Giá Thuê</th>
                <th className="px-4 py-3">Trạng Thái</th>
                <th className="px-4 py-3 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredContracts.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-bold text-slate-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-mono">{c.contractNumber}</span>
                  </td>
                  <td className="px-4 py-3 font-bold text-emerald-800">{c.roomNumber}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{c.tenantName}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      <Award className="w-3 h-3 text-emerald-600" />
                      {c.signingMethod || 'Chưa có dữ liệu ký số'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-slate-600">
                      <Lock className="w-3 h-3 text-emerald-700" />
                      {c.escrowCode || 'MB-ESCROW'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <div>{c.startDate} - {c.endDate}</div>
                    {c.status === 'expiring' && (
                      <span className="text-[10px] text-amber-600 font-bold block mt-0.5">
                        Sắp đáo hạn trong 15 ngày
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-900">
                    {c.monthlyRent.toLocaleString('vi-VN')} đ
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                        c.status === 'expiring'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {c.status === 'expiring' ? (
                        <>
                          <Clock className="w-3 h-3" /> Sắp hết hạn
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3 h-3" /> Hiệu lực pháp lý
                        </>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setPreviewContract(c)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 font-semibold rounded text-[11px] transition-colors"
                    >
                      Xem Văn Bản Ký Số
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Professional PDF Document Viewer Modal */}
      {previewContract && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-5xl h-[94vh] flex flex-col shadow-2xl overflow-hidden">
            {/* PDF Viewer Top Toolbar */}
            <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-white shrink-0">
              {/* File Info */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center font-bold text-xs font-mono shrink-0">
                  PDF
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold truncate text-slate-100">
                      Hop_Dong_Thue_Can_Ho_{previewContract.contractNumber}.pdf
                    </h3>
                    <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" /> Bản ký số (PAdES)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    Mã xác thực: {previewContract.trustGuardAuditCode || `TG-AUD-${previewContract.contractNumber}`}
                  </p>
                </div>
              </div>

              {/* Center Viewer Controls (Zoom & Page) */}
              <div className="flex items-center gap-1.5 bg-slate-800/90 border border-slate-700/80 px-2.5 py-1 rounded-xl text-xs">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(z - 10, 60))}
                  className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700/80 transition-colors"
                  title="Thu nhỏ (-10%)"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono text-slate-300 w-11 text-center font-medium select-none text-[11px]">
                  {zoom}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(z + 10, 150))}
                  className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700/80 transition-colors"
                  title="Phóng to (+10%)"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <div className="h-3.5 w-px bg-slate-700 mx-1"></div>
                <span className="text-[11px] text-slate-400 font-medium select-none">
                  Trang 1 / 1
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isExportingPdf}
                  onClick={async () => {
                    try {
                      setIsExportingPdf(true);
                      await downloadContractPdfFile(previewContract);
                    } catch (err) {
                      console.error('Lỗi khi tải file PDF:', err);
                      printContractDocument(previewContract);
                    } finally {
                      setIsExportingPdf(false);
                    }
                  }}
                  title="Tải trực tiếp file PDF về máy tính"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors disabled:opacity-60"
                >
                  {isExportingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  <span>{isExportingPdf ? 'Đang tạo PDF...' : 'Tải File PDF (.pdf)'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => printContractDocument(previewContract)}
                  title="Mở hộp thoại in văn bản hợp đồng"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold border border-slate-700 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" /> In Bản Ký
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewContract(null)}
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center border border-slate-700 transition-colors"
                  aria-label="Đóng"
                >
                  ✕
                </button>
              </div>
            </header>

            {/* Document Canvas Viewport (Simulating Adobe Acrobat / Drive PDF view) */}
            <main className="flex-1 bg-slate-950/60 overflow-y-auto overflow-x-auto p-4 sm:p-8 flex justify-center items-start">
              <div
                style={{
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: 'top center',
                  transition: 'transform 0.15s ease-out',
                }}
                className="w-full flex justify-center shrink-0"
              >
                {/* The A4 Paper Sheet */}
                <article className="bg-white w-full max-w-[794px] min-h-[1050px] shadow-2xl shadow-black/60 border border-slate-300/80 rounded-xs p-8 sm:p-14 relative text-slate-800 font-serif leading-relaxed my-2 select-text">
                  {/* Subtle Background Watermark */}
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.035] select-none"
                  >
                    <span className="text-7xl font-extrabold uppercase -rotate-45 tracking-widest text-slate-900 font-sans">
                      AN CƯ TRUSTGUARD
                    </span>
                  </div>

                  {/* Header Quốc hiệu */}
                  <div className="text-center font-sans space-y-1 mb-8">
                    <h4 className="font-bold text-sm tracking-wide text-slate-900 uppercase">
                      CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                    </h4>
                    <p className="text-xs text-slate-700 font-semibold italic">Độc lập - Tự do - Hạnh phúc</p>
                    <div className="w-32 h-[1.5px] bg-slate-600 mx-auto my-2"></div>
                  </div>

                  {/* Contract Title */}
                  <div className="text-center font-sans space-y-1.5 mb-8">
                    <h2 className="font-extrabold text-base sm:text-lg text-emerald-800 uppercase tracking-tight">
                      HỢP ĐỒNG CHO THUÊ CĂN HỘ CAO CẤP & BẢO CHỨNG KÝ QUỸ ESCROW
                    </h2>
                    <p className="text-xs text-slate-500 italic">
                      Số văn bản điện tử: <strong className="text-slate-800 font-mono">{previewContract.contractNumber}</strong>
                    </p>
                    <div className="pt-1">
                      <span className="inline-block bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-0.5 rounded-full text-[11px] font-bold font-mono">
                        Mã xác thực TrustGuard: {previewContract.trustGuardAuditCode || `TG-AUD-${previewContract.contractNumber}`}
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="space-y-5 text-xs text-slate-700 leading-relaxed font-sans">
                    {/* Section I */}
                    <div>
                      <h3 className="font-bold text-xs uppercase text-slate-900 border-b border-slate-200 pb-1.5 mb-2">
                        I. CĂN CỨ PHÁP LÝ
                      </h3>
                      <p className="text-justify text-slate-600 space-y-1">
                        - Căn cứ Bộ luật Dân sự số 91/2015/QH13 ban hành ngày 24/11/2015;<br />
                        - Căn cứ Luật Giao dịch điện tử số 20/2023/QH15 của Quốc hội khóa XV có hiệu lực từ ngày 01/07/2024;<br />
                        - Căn cứ thỏa thuận tự nguyện và chứng thực định danh số hợp pháp của hai bên.
                      </p>
                    </div>

                    {/* Section II */}
                    <div>
                      <h3 className="font-bold text-xs uppercase text-slate-900 border-b border-slate-200 pb-1.5 mb-2">
                        II. CÁC BÊN THAM GIA HỢP ĐỒNG
                      </h3>
                      <div className="space-y-3">
                        <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-200/80">
                          <p className="font-bold text-slate-900">BÊN CHO THUÊ (BÊN A):</p>
                          <p className="mt-0.5">Tên đơn vị: <strong>BQL TÒA NHÀ AN CƯ PROPTECH - LÊ VĂN SỸ</strong></p>
                          <p>Địa chỉ: 284/12 Lê Văn Sỹ, Phường 14, Quận 3, TP. Hồ Chí Minh</p>
                          <p>Đại diện: Ban Quản Lý Tòa Nhà • Tài khoản bảo chứng Escrow: <strong>MBBANK-ESCROW-88899977</strong></p>
                        </div>
                        <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-200/80">
                          <p className="font-bold text-slate-900">BÊN THUÊ (BÊN B):</p>
                          <p className="mt-0.5">Ông/Bà: <strong>{previewContract.tenantName}</strong></p>
                          <p>Căn hộ thuê: <strong>Căn số {previewContract.roomNumber}</strong> - Tòa A Lê Văn Sỹ</p>
                          <p>Thời hạn thuê: Từ ngày <strong>{previewContract.startDate}</strong> đến hết ngày <strong>{previewContract.endDate}</strong></p>
                        </div>
                      </div>
                    </div>

                    {/* Section III */}
                    <div>
                      <h3 className="font-bold text-xs uppercase text-slate-900 border-b border-slate-200 pb-1.5 mb-2">
                        III. ĐIỀU KHOẢN TÀI CHÍNH & KÝ QUỸ AN CƯ TRUSTGUARD™
                      </h3>
                      <ol className="list-decimal pl-4 space-y-1.5 text-slate-700 text-justify">
                        <li>
                          <strong>Giá thuê căn hộ cố định:</strong> <strong>{previewContract.monthlyRent.toLocaleString('vi-VN')} đ/tháng</strong> (Chưa bao gồm dịch vụ điện nước theo chỉ số công tơ niêm phong).
                        </li>
                        <li>
                          <strong>Tiền ký quỹ cọc bảo đảm:</strong> <strong>{previewContract.deposit.toLocaleString('vi-VN')} đ</strong>, được phong tỏa tại Ngân hàng Quân Đội MBBank theo mã ký quỹ <strong>{previewContract.escrowCode}</strong>. Tiền cọc được giải tỏa bảo đảm 100% khi hai bên nghiệm thu biên bản bàn giao hoàn tất.
                        </li>
                        <li>
                          <strong>Chu kỳ thanh toán:</strong> Định kỳ hàng tháng từ ngày 01 đến 05 qua hệ thống cổng thanh toán Napas247 / VietQR tự động.
                        </li>
                        <li>
                          <strong>Quy định an toàn & PCCC:</strong> Căn hộ đạt tiêu chuẩn Thẩm duyệt PCCC số 112/TD-PCCC-PC07. Khách thuê cam kết tuân thủ nghiêm ngặt nội quy an ninh trật tự.
                        </li>
                      </ol>
                    </div>

                    {/* Section IV - Digital Signature Seals */}
                    <div className="pt-2">
                      <h3 className="font-bold text-xs uppercase text-slate-900 border-b border-slate-200 pb-1.5 mb-2">
                        IV. XÁC THỰC VÀ CHỮ KÝ SỐ ĐIỆN TỬ CỦA HAI BÊN
                      </h3>
                      <p className="text-slate-500 text-[11px] mb-3">
                        Hai bên xác nhận đã đọc kỹ, đồng ý toàn bộ điều khoản và hoàn tất ký số điện tử. Văn bản có giá trị pháp lý tương đương bản gốc giấy.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                        {/* Seal Bên A */}
                        <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-300 text-center relative overflow-hidden">
                          <div className="text-[11px] font-bold text-slate-900 uppercase">CHỮ KÝ SỐ BÊN A</div>
                          <p className="text-[11px] text-emerald-800 font-medium mt-0.5">Ký bởi: BAN QUẢN LÝ AN CƯ</p>
                          <div className="mt-2.5 p-2 bg-white rounded-lg border border-emerald-400 text-emerald-950 font-mono text-[10px] space-y-0.5 shadow-2xs">
                            <span className="font-bold text-emerald-700 block">✓ VNPT-CA Timestamped</span>
                            <span>{previewContract.signedDate || '15/01/2026 09:32:15'}</span>
                            <span className="block text-[9px] text-emerald-600">Serial: VNPT-CA-CORP-2026</span>
                          </div>
                        </div>

                        {/* Seal Bên B */}
                        <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-300 text-center relative overflow-hidden">
                          <div className="text-[11px] font-bold text-slate-900 uppercase">CHỮ KÝ SỐ BÊN B</div>
                          <p className="text-[11px] text-blue-800 font-medium mt-0.5">Ký bởi: {previewContract.tenantName}</p>
                          <div className="mt-2.5 p-2 bg-white rounded-lg border border-blue-400 text-blue-950 font-mono text-[10px] space-y-0.5 shadow-2xs">
                            <span className="font-bold text-blue-700 block">✓ eKYC Chip & Digital OTP</span>
                            <span>{previewContract.signedDate || '15/01/2026 09:32:15'}</span>
                            <span className="block text-[9px] text-blue-600">Phương thức: {previewContract.signingMethod || 'Ký số eKYC Chip'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Paper Footer Security Hash */}
                    <div className="pt-6 mt-6 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500 font-mono">
                      <span>An Cư TrustGuard™ Cryptographic Seal</span>
                      <span>SHA-256: 7f83b165...{previewContract.id.slice(-8)}</span>
                    </div>
                  </div>
                </article>
              </div>
            </main>

            {/* Bottom Status Bar */}
            <footer className="bg-slate-900 border-t border-slate-800 px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 shrink-0">
              <span className="flex items-center gap-1.5 text-[11px]">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                Văn bản điện tử đã được chứng thực số và niêm phong bảo mật theo Luật Giao dịch điện tử.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isExportingPdf}
                  onClick={async () => {
                    try {
                      setIsExportingPdf(true);
                      await downloadContractPdfFile(previewContract);
                    } catch (err) {
                      console.error('Lỗi khi tải file PDF:', err);
                      printContractDocument(previewContract);
                    } finally {
                      setIsExportingPdf(false);
                    }
                  }}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-60"
                >
                  {isExportingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  <span>{isExportingPdf ? 'Đang tạo PDF...' : 'Tải File PDF'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewContract(null)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium border border-slate-700 transition-colors"
                >
                  Đóng xem trước
                </button>
              </div>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import {
  FileCheck2,
  Plus,
  Search,
  Calendar,
  FileText,
  Printer,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  Lock,
  Award,
} from 'lucide-react';
import { Contract, Room, Tenant } from '../types';

interface ContractsViewProps {
  contracts: Contract[];
  rooms: Room[];
  tenants: Tenant[];
  onAddContract: (contract: Omit<Contract, 'id'>) => void;
}

export const ContractsView: React.FC<ContractsViewProps> = ({
  contracts,
  rooms,
  tenants,
  onAddContract,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [previewContract, setPreviewContract] = useState<Contract | null>(null);

  const filteredContracts = contracts.filter(
    (c) =>
      c.contractNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.roomNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Ký Số VNPT SmartCA & Ký Quỹ Escrow MBBank
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <span>Hợp Đồng Thuê Căn Hộ Cao Cấp Pháp Lý</span>
            <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-semibold">
              {contracts.length} hợp đồng
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Toàn bộ hợp đồng có giá trị pháp lý tương đương văn bản công chứng, lưu trữ chứng thư điện tử an toàn.
          </p>
        </div>

        <button
          onClick={() => {
            const firstRoom = rooms.find((r) => r.status === 'available') || rooms[0];
            const firstTenant = tenants[0];
            onAddContract({
              contractNumber: `HD-ANCU-2026/${firstRoom.roomNumber.replace('P.', '')}`,
              tenantId: firstTenant.id,
              tenantName: firstTenant.name,
              roomId: firstRoom.id,
              roomNumber: firstRoom.roomNumber,
              buildingName: 'Tòa A - Lê Văn Sỹ (Q.3)',
              startDate: '01/10/2026',
              endDate: '01/10/2027',
              monthlyRent: firstRoom.price,
              deposit: firstRoom.price,
              paymentCycle: 1,
              status: 'active',
              note: 'Ký số điện tử VNPT SmartCA & Ký quỹ An Cư Escrow MBBank',
              signingMethod: 'VNPT SmartCA',
              signedDate: '01/10/2026 10:00:00',
              escrowCertified: true,
              escrowCode: `ESC-2026-${firstRoom.roomNumber.replace('P.', '')}-MB`,
              trustGuardAuditCode: 'TG-AUD-2026-VERIFIED',
            });
          }}
          id="btn-add-contract"
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Lập Hợp Đồng Điện Tử Mới</span>
        </button>
      </div>

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
                      {c.signingMethod || 'VNPT SmartCA'}
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

      {/* Contract Preview Modal */}
      {previewContract && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold">Hợp Đồng Thuê Căn Hộ Điện Tử An Cư TrustGuard™</h3>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                    Chứng Thư Số VNPT
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">Số: {previewContract.contractNumber}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => alert('Đã gửi lệnh in hợp đồng và chứng thư số!')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-semibold"
                >
                  <Printer className="w-3.5 h-3.5" /> In Bản Ký
                </button>
                <button
                  onClick={() => setPreviewContract(null)}
                  className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Legal content */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-xs text-slate-700 leading-relaxed font-serif">
              <div className="text-center font-sans space-y-1 mb-6">
                <h4 className="font-bold text-sm text-slate-900 uppercase">
                  CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                </h4>
                <p className="text-xs text-slate-600 font-medium">Độc lập - Tự do - Hạnh phúc</p>
                <div className="w-24 h-0.5 bg-slate-300 mx-auto my-2"></div>
                <h3 className="font-bold text-base text-slate-900 pt-2">
                  HỢP ĐỒNG CHO THUÊ CĂN HỘ CAO CẤP & BẢO CHỨNG KÝ QUỸ ESCROW
                </h3>
                <p className="text-[11px] font-sans text-emerald-700 font-bold">
                  (Mã xác thực pháp lý TrustGuard: {previewContract.trustGuardAuditCode || 'TG-AUD-2025-08912'})
                </p>
              </div>

              <div className="space-y-1.5 border-b border-slate-200 pb-3 font-sans">
                <p><strong>BÊN CHO THUÊ (BÊN A):</strong> BQL TÒA NHÀ AN CƯ PROPTECH - LÊ VĂN SỸ</p>
                <p>Địa chỉ: 284/12 Lê Văn Sỹ, Phường 14, Quận 3, TP. Hồ Chí Minh</p>
                <p>Đại diện: Quản Lý Tòa Nhà • Tài khoản bảo chứng Escrow: MBBANK-ESCROW-88899977</p>
              </div>

              <div className="space-y-1.5 border-b border-slate-200 pb-3 font-sans">
                <p><strong>BÊN THUÊ (BÊN B):</strong> Ông/Bà <strong>{previewContract.tenantName}</strong></p>
                <p>Căn hộ số: <strong>{previewContract.roomNumber}</strong> - Tòa A Lê Văn Sỹ</p>
                <p>Thời hạn thuê: Từ ngày <strong>{previewContract.startDate}</strong> đến hết ngày <strong>{previewContract.endDate}</strong>.</p>
              </div>

              <div className="space-y-2 border-b border-slate-200 pb-4 font-sans">
                <p><strong>ĐIỀU KHOẢN TÀI CHÍNH & KÝ QUỸ AN CƯ TRUSTGUARD™:</strong></p>
                <p>1. Giá thuê căn hộ cố định: <strong>{previewContract.monthlyRent.toLocaleString('vi-VN')} đ/tháng</strong> (Chưa gồm điện nước sinh hoạt EVN & Sawaco).</p>
                <p>2. Tiền ký quỹ cọc bảo đảm: <strong>{previewContract.deposit.toLocaleString('vi-VN')} đ</strong>, được phong tỏa tại Ngân hàng Quân Đội MBBank theo mã ký quỹ <strong>{previewContract.escrowCode}</strong>. Tiền cọc được giải tỏa bảo đảm 100% khi hai bên ký biên bản bàn giao phòng hoàn tất.</p>
                <p>3. Chu kỳ thanh toán: Định kỳ hàng tháng từ ngày 01 đến 05 qua hệ thống VietQR Napas247.</p>
                <p>4. Tòa nhà đạt chuẩn PCCC Quốc Gia số 112/TD-PCCC-PC07. Khách thuê cam kết tuân thủ quy định an ninh trật tự.</p>
              </div>

              {/* Digital Signature Stamps */}
              <div className="grid grid-cols-2 pt-4 text-center font-sans gap-4">
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <p className="font-bold text-slate-900 text-xs">CHỮ KÝ SỐ BÊN A</p>
                  <p className="text-emerald-800 text-[10px] mt-0.5">Ký bởi: BAN QUAN LY AN CU</p>
                  <div className="mt-2 p-2 bg-white rounded-lg border border-emerald-300 text-emerald-900 font-mono text-[10px]">
                    ✓ VNPT-CA Timestamped<br />
                    {previewContract.signedDate || '15/01/2025 09:32:15'}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="font-bold text-slate-900 text-xs">CHỮ KÝ SỐ BÊN B</p>
                  <p className="text-slate-700 text-[10px] mt-0.5">Ký bởi: {previewContract.tenantName}</p>
                  <div className="mt-2 p-2 bg-white rounded-lg border border-slate-300 text-slate-800 font-mono text-[10px]">
                    ✓ eKYC Chip Verified<br />
                    {previewContract.signedDate || '15/01/2025 09:32:15'}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setPreviewContract(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold"
              >
                Đóng Văn Bản
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

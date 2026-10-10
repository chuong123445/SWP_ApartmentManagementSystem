import React, { useState } from 'react';
import {
  ShieldCheck,
  FileCheck,
  AlertCircle,
  CheckCircle2,
  Lock,
  Unlock,
  Eye,
  Building2,
  UserCheck,
  Flame,
  Award,
  ExternalLink,
  Search,
  Filter,
} from 'lucide-react';
import { TrustGuardAudit, EscrowDeposit } from '../types';

interface TrustGuardViewProps {
  audits: TrustGuardAudit[];
  escrows: EscrowDeposit[];
  onApproveAudit?: (id: string) => void;
  onReleaseEscrow?: (id: string) => void;
  onCreateEscrow?: (newEscrow: Omit<EscrowDeposit, 'id'>) => void;
}

export const TrustGuardView: React.FC<TrustGuardViewProps> = ({
  audits,
  escrows,
  onApproveAudit,
  onReleaseEscrow,
  onCreateEscrow,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'audits' | 'escrow'>('audits');
  const [selectedAudit, setSelectedAudit] = useState<TrustGuardAudit>(audits[0]);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAudits = audits.filter(
    (a) =>
      a.roomNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.dossierCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.ownerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalEscrowAmount = escrows
    .filter((e) => e.status === 'locked')
    .reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner: An Cư TrustGuard™ */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white p-6 rounded-2xl border border-emerald-800/40 shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-radial from-emerald-500/10 to-transparent pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Hệ Thống Kiểm Định An Cư TrustGuard™
              </span>
              <span className="text-xs text-slate-300 font-medium">Bản Quyền Độc Quyền</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Trung Tâm Thẩm Định Pháp Lý & Ký Quỹ Escrow
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              100% căn hộ trong hệ thống được kiểm định Sổ hồng, Giấy phép PCCC, đối soát eKYC CCCD gắn chip chủ sở hữu và phong tỏa bảo chứng cọc tại Ngân hàng Quân Đội MBBank.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/15 text-right">
              <span className="text-[11px] text-emerald-300 font-medium block">Tổng Cọc Đang Ký Quỹ Escrow</span>
              <span className="text-lg font-bold text-white">
                {totalEscrowAmount.toLocaleString('vi-VN')} đ
              </span>
            </div>
            <div className="bg-emerald-600/90 text-white px-4 py-2.5 rounded-xl text-center shadow-md">
              <span className="text-[11px] font-medium block text-emerald-100">Điểm Uy Tín Toàn Tòa</span>
              <span className="text-lg font-extrabold text-white">99.4 / 100</span>
            </div>
          </div>
        </div>

        {/* Sub Navigation */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-white/10">
          <button
            onClick={() => setActiveSubTab('audits')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
              activeSubTab === 'audits'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            <span>Hồ Sơ Đối Soát Pháp Lý Căn Hộ ({audits.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('escrow')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
              activeSubTab === 'escrow'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Tài Khoản Ký Quỹ An Cư Escrow ({escrows.length})</span>
          </button>
        </div>
      </div>

      {activeSubTab === 'audits' ? (
        /* PHÂN HỆ THẨM ĐỊNH PHÁP LÝ - SPLIT VIEW ĐỐI SOÁT TÀI LIỆU */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* CỘT TRÁI: DANH SÁCH HỒ SƠ & THÔNG TIN KIỂM ĐỊNH (7 cols) */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm theo mã hồ sơ, phòng, chủ nhà..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-emerald-600"
                />
              </div>
              <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
                {filteredAudits.length} hồ sơ
              </span>
            </div>

            {/* List items */}
            <div className="space-y-3">
              {filteredAudits.map((a) => {
                const isSelected = selectedAudit.id === a.id;
                return (
                  <div
                    key={a.id}
                    onClick={() => setSelectedAudit(a)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50/50 border-emerald-600 shadow-sm ring-1 ring-emerald-600'
                        : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-900">{a.roomNumber}</span>
                          <span className="text-xs text-slate-500 font-medium">({a.buildingName})</span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Đã Xác Thực
                          </span>
                        </div>
                        <span className="font-mono text-[11px] text-slate-400 block mt-0.5">
                          {a.dossierCode}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200 block">
                          Điểm Trust: {a.trustScore}/100
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-slate-600">
                      <div>
                        <span className="text-[11px] text-slate-400 block">Giấy tờ sở hữu:</span>
                        <span className="font-semibold text-slate-800">{a.legalDocType}</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 block">Số vào sổ:</span>
                        <span className="font-mono font-semibold text-slate-800">{a.legalDocNumber}</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 block">Chủ sở hữu:</span>
                        <span className="font-semibold text-slate-800">{a.ownerName}</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 block">Kiểm định PCCC:</span>
                        <span className="font-semibold text-emerald-700">{a.pcccStatus}</span>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <span>eKYC Khớp CCCD chip: <strong className="text-emerald-700">{a.ekycChipMatchRate}%</strong></span>
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        Xem chi tiết & đối soát <Eye className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CỘT PHẢI: BẢN ĐỐI SOÁT CHI TIẾT & PREVIEW VĂN BẢN (6 cols) */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Chi Tiết Chứng Thư Kiểm Định TrustGuard™ ({selectedAudit.roomNumber})
                  </h3>
                </div>
                <span className="font-mono text-xs text-slate-400">{selectedAudit.dossierCode}</span>
              </div>

              {/* Legal Dossier Checklist */}
              <div className="mt-4 space-y-2.5 text-xs">
                <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-emerald-950 block">1. Chủ quyền & Giấy phép xây dựng hợp lệ</span>
                    <p className="text-[11px] text-emerald-800 mt-0.5">
                      {selectedAudit.legalDocType} số <strong>{selectedAudit.legalDocNumber}</strong> do {selectedAudit.issuePlace} vào ngày {selectedAudit.issueDate}. Không tranh chấp pháp lý.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-emerald-950 block">2. Đạt chuẩn an toàn Phòng Cháy Chữa Cháy (PCCC)</span>
                    <p className="text-[11px] text-emerald-800 mt-0.5">
                      Biên bản thẩm duyệt số <strong>{selectedAudit.pcccApprovalNumber}</strong> bởi Phòng Cảnh sát PCCC & CNCH (PC07). Trang bị chuông báo cháy, vòi phun tự động, lối thoát hiểm độc lập.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-emerald-950 block">3. Xác thực sinh trắc học eKYC & CCCD gắn chip chủ nhà</span>
                    <p className="text-[11px] text-emerald-800 mt-0.5">
                      Độ khớp khuôn mặt và dữ liệu chip C06 Bộ Công An đạt <strong>{selectedAudit.ekycChipMatchRate}%</strong>. Xác minh chính chủ ký hợp đồng cho thuê.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-emerald-950 block">4. Cơ chế Ký quỹ An Cư Escrow TrustGuard™</span>
                    <p className="text-[11px] text-emerald-800 mt-0.5">
                      Tiền cọc <strong>{selectedAudit.escrowDeposit.toLocaleString('vi-VN')} đ</strong> được bảo chứng tại tài khoản trung gian MBBank, bảo vệ trọn vẹn quyền lợi hai bên.
                    </p>
                  </div>
                </div>
              </div>

              {/* Document Scan Preview */}
              <div className="mt-5 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-slate-500" />
                    Bản Scan Giấy Tờ Đối Soát Thị Thực Điện Tử
                  </span>
                  <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                    Đã đóng dấu kiểm định điện tử <CheckCircle2 className="w-3.5 h-3.5" />
                  </span>
                </div>

                <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 group">
                  <img
                    src={selectedAudit.docScanUrl}
                    alt="Scan Sổ Hồng"
                    className="w-full h-56 object-cover opacity-90 group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent flex flex-col justify-end p-4 text-white">
                    <span className="text-xs font-bold">{selectedAudit.legalDocType} - {selectedAudit.roomNumber}</span>
                    <span className="text-[11px] text-slate-300">
                      Người kiểm định: {selectedAudit.auditor} ({selectedAudit.auditedAt})
                    </span>
                    <span className="text-[11px] text-emerald-300 font-mono mt-0.5">
                      Mã chứng thư: {selectedAudit.dossierCode}
                    </span>
                  </div>
                </div>

                <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 italic">
                  "{selectedAudit.notes}"
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* PHÂN HỆ TÀI KHOẢN KÝ QUỸ ESCROW MBBANK */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-medium">Tổng Tiền Cọc Đang Phong Tỏa Escrow</span>
              <div className="text-xl font-bold text-emerald-700 mt-1">
                {totalEscrowAmount.toLocaleString('vi-VN')} đ
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">Tài khoản bảo chứng MBBank Quân Đội</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-medium">Hợp Đồng Đang Áp Dụng Escrow</span>
              <div className="text-xl font-bold text-slate-900 mt-1">
                {escrows.length} / {escrows.length} HĐ
              </div>
              <span className="text-[11px] text-emerald-600 font-medium mt-1 block">Tỷ lệ bảo đảm 100% rủi ro</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-medium">Tranh Chấp Cọc Phát Sinh</span>
              <div className="text-xl font-bold text-emerald-600 mt-1">0 Vụ</div>
              <span className="text-[11px] text-slate-400 mt-1 block">Giải tỏa tự động theo biên bản bàn giao</span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Sổ Theo Dõi Ký Quỹ Tiền Cọc An Cư TrustGuard™</h3>
              </div>
              <span className="text-xs text-slate-500">Ngân hàng thụ hưởng: MBBank - Chi nhánh Nam Sài Gòn</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3">Mã Ký Quỹ Escrow</th>
                    <th className="px-4 py-3">Căn Hộ</th>
                    <th className="px-4 py-3">Khách Thuê (Bên Gửi)</th>
                    <th className="px-4 py-3">Chủ Sở Hữu</th>
                    <th className="px-4 py-3 text-right">Số Tiền Ký Quỹ</th>
                    <th className="px-4 py-3">Mã Giữ Tiền Ngân Hàng</th>
                    <th className="px-4 py-3 text-center">Trạng Thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {escrows.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">{e.code}</td>
                      <td className="px-4 py-3 font-bold text-emerald-800">{e.roomNumber}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{e.tenantName}</td>
                      <td className="px-4 py-3 text-slate-600">{e.landlordName}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900 text-sm">
                        {e.amount.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-500">{e.bankHoldReference}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                          <Lock className="w-3 h-3 text-emerald-700" />
                          Đang Phong Tỏa Bảo Chứng
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

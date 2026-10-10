import React, { useState } from 'react';
import {
  Home,
  ShieldCheck,
  QrCode,
  FileText,
  Zap,
  Droplets,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronRight,
  Copy,
  Download,
  Send,
  Plus,
  Lock,
} from 'lucide-react';
import { Room, Tenant, Contract, Invoice, MaintenanceTicket, SystemConfig } from '@/types';
import { buildVietQrUrl } from '@/utils/vietqr';

interface ResidentPortalPageProps {
  currentRoom: Room;
  currentTenant: Tenant;
  contract: Contract;
  invoice: Invoice;
  tickets: MaintenanceTicket[];
  config: SystemConfig;
  onSendTicket: (ticket: Omit<MaintenanceTicket, 'id' | 'createdAt'>) => void;
  onPayInvoice: (invoiceId: string) => void;
  onOpenApartmentMarket: () => void;
}

export const ResidentPortalPage: React.FC<ResidentPortalPageProps> = ({
  currentRoom,
  currentTenant,
  contract,
  invoice,
  tickets,
  config,
  onSendTicket,
  onPayInvoice,
  onOpenApartmentMarket,
}) => {
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [ticketTitle, setTicketTitle] = useState('');
  const [ticketCategory, setTicketCategory] = useState<'electric' | 'water' | 'aircon' | 'furniture' | 'other'>('aircon');
  const [ticketPriority, setTicketPriority] = useState<'urgent' | 'high' | 'normal'>('high');
  const [ticketDesc, setTicketDesc] = useState('');
  const [copied, setCopied] = useState(false);

  // Filter tickets for this resident's room
  const residentTickets = tickets.filter((t) => t.roomNumber === currentRoom.roomNumber);

  const qrImageUrl = buildVietQrUrl(config, invoice.totalAmount, `TT ${currentRoom.roomNumber} T0926`);

  const handleCopy = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSendTicket({
      title: ticketTitle,
      roomNumber: currentRoom.roomNumber,
      tenantName: currentTenant.name,
      category: ticketCategory,
      priority: ticketPriority,
      status: 'pending',
      description: ticketDesc,
    });
    setIsTicketModalOpen(false);
    setTicketTitle('');
    setTicketDesc('');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Resident Welcome Header */}
      <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-emerald-950 text-white p-6 rounded-2xl border border-emerald-700/30 shadow-lg relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Cư Dân Đã Xác Thực eKYC CCCD Chip & Ký Quỹ Escrow
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-white">
              Xin chào, {currentTenant.name}!
            </h1>
            <p className="text-xs text-slate-300 mt-1">
              Bạn đang cư trú tại <strong>Căn Hộ {currentRoom.roomNumber}</strong> - {currentTenant.buildingName}. Hợp đồng bảo chứng An Cư TrustGuard™.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsTicketModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md transition-colors"
            >
              <Wrench className="w-4 h-4" />
              <span>Báo Hỏng Hóc / Sự Cố</span>
            </button>
            <button
              onClick={onOpenApartmentMarket}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white border border-white/20 rounded-xl text-xs font-bold transition-colors"
            >
              <Home className="w-4 h-4 text-emerald-300" />
              <span>Khám Phá Căn Hộ Khác</span>
            </button>
          </div>
        </div>
      </div>

      {/* Top 3 Quick Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Hóa đơn phòng tháng 09/2026 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hóa Đơn Tháng 09/2026</span>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  invoice.status === 'paid'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {invoice.status === 'paid' ? '✓ Đã Thanh Toán' : 'Chưa Thanh Toán'}
              </span>
            </div>
            <div className="text-2xl font-extrabold text-slate-900 mt-2">
              {invoice.totalAmount.toLocaleString('vi-VN')} đ
            </div>
            <span className="text-xs text-slate-400 mt-1 block">
              Hạn nộp: {invoice.dueDate} • Tiền phòng, điện, nước & wifi
            </span>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            {invoice.status === 'paid' ? (
              <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-bold">
                <CheckCircle2 className="w-4 h-4" /> Đã hoàn tất thanh toán ({invoice.paidAt || '03/09/2026'})
              </div>
            ) : (
              <button
                onClick={() => setIsQrModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors"
              >
                <QrCode className="w-4 h-4" />
                <span>Quét Mã VietQR Napas247 Thanh Toán Ngay</span>
              </button>
            )}
          </div>
        </div>

        {/* Card 2: Hợp đồng & Tiền cọc Escrow */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hợp Đồng & Cọc Escrow</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                MBBank Escrow
              </span>
            </div>
            <div className="text-xl font-bold text-emerald-700 mt-2">
              {contract.deposit.toLocaleString('vi-VN')} đ
            </div>
            <span className="text-xs text-slate-500 mt-1 block">
              Mã HĐ: <strong className="text-slate-800">{contract.contractNumber}</strong>
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Ký điện tử: VNPT SmartCA • Thời hạn: {contract.startDate} - {contract.endDate}
            </span>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-emerald-700 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Bảo chứng cọc 100%
            </span>
            <span className="text-slate-400 font-mono text-[11px]">{contract.escrowCode}</span>
          </div>
        </div>

        {/* Card 3: Chỉ số tiêu thụ kỳ này */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mức Tiêu Thụ Điện / Nước</span>
              <span className="text-[10px] bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded-full">
                Minh bạch EVN
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200/60">
                <span className="text-[11px] font-semibold text-amber-800 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-600" /> Điện (kWh)
                </span>
                <span className="text-lg font-extrabold text-amber-900 block mt-1">125 kWh</span>
                <span className="text-[10px] text-amber-700">1.420 → 1.545</span>
              </div>

              <div className="p-2.5 bg-sky-50 rounded-lg border border-sky-200/60">
                <span className="text-[11px] font-semibold text-sky-800 flex items-center gap-1">
                  <Droplets className="w-3.5 h-3.5 text-sky-600" /> Nước máy (m³)
                </span>
                <span className="text-lg font-extrabold text-sky-900 block mt-1">8 m³</span>
                <span className="text-[10px] text-sky-700">154 → 162</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
            <span>Đơn giá: Điện 3.800đ | Nước 28.000đ</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Căn hộ chi tiết & Sự cố bảo trì */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Căn hộ & Pháp lý (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="relative h-52 w-full bg-slate-100">
              <img
                src={currentRoom.image}
                alt="Căn hộ"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3 bg-emerald-600/95 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-md">
                <ShieldCheck className="w-3.5 h-3.5" />
                Chứng nhận An Cư TrustGuard™ 100%
              </div>
              <div className="absolute bottom-3 right-3 bg-slate-900/80 backdrop-blur-xs text-white px-3 py-1 rounded-lg text-xs font-semibold">
                Căn hộ {currentRoom.roomNumber} • Tầng {currentRoom.floor} • {currentRoom.area} m²
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Căn Hộ Studio Cao Cấp {currentRoom.roomNumber} ({currentTenant.buildingName})
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Giá thuê niêm yết: <strong className="text-emerald-700">{currentRoom.price.toLocaleString('vi-VN')} đ/tháng</strong> (Cố định trong suốt thời hạn hợp đồng).
                </p>
              </div>

              {/* Trang thiết bị */}
              <div>
                <span className="text-xs font-bold text-slate-700 block mb-2">Trang Thiết Bị & Tiện Ích Đã Bàn Giao:</span>
                <div className="flex flex-wrap gap-2">
                  {currentRoom.amenities.map((item, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-lg flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              {/* Hồ sơ pháp lý */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  Hồ Sơ Pháp Lý Đã Được Ban Quản Trị Công Khai:
                </span>
                <div className="text-slate-600 text-[11px] grid grid-cols-2 gap-2 pt-1">
                  <div>• Giấy tờ: <strong>{currentRoom.legalDocType}</strong></div>
                  <div>• Số vào sổ: <strong>{currentRoom.legalDocNumber}</strong></div>
                  <div>• PCCC: <strong>112/TD-PCCC-PC07 Đạt chuẩn</strong></div>
                  <div>• Khóa phòng: <strong>Vân tay & Mã số bảo mật</strong></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Danh sách yêu cầu bảo trì của cư dân (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Yêu Cầu Sửa Chữa & Bảo Trì</h3>
              </div>
              <button
                onClick={() => setIsTicketModalOpen(true)}
                className="text-xs text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Gửi yêu cầu mới
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {residentTickets.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Không có sự cố nào đang chờ xử lý cho phòng của bạn.
                </div>
              ) : (
                residentTickets.map((t) => (
                  <div key={t.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold text-slate-900">{t.title}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          t.status === 'resolved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : t.status === 'in_progress'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {t.status === 'resolved'
                          ? 'Đã xử lý xong'
                          : t.status === 'in_progress'
                          ? 'Thợ đang sửa'
                          : 'Chờ phân công'}
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px]">{t.description}</p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-200">
                      <span>Thời gian gửi: {t.createdAt}</span>
                      {t.cost && (
                        <span className="text-emerald-700 font-semibold">
                          Chi phí nghiệm thu: {t.cost.toLocaleString('vi-VN')} đ (Miễn phí)
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal VietQR Napas247 */}
      {isQrModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="text-center pb-3 border-b border-slate-100">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold uppercase">
                VietQR Napas247 - Chuyển Khoản Tức Thì 24/7
              </span>
              <h3 className="text-lg font-bold text-slate-900 mt-1">
                Thanh Toán Tiền Phòng Căn Hộ {currentRoom.roomNumber}
              </h3>
              <p className="text-xs text-slate-500">Mở app ngân hàng bất kỳ để quét mã QR</p>
            </div>

            <div className="my-4 flex flex-col items-center">
              <img
                src={qrImageUrl}
                alt="VietQR Napas247"
                className="w-56 h-56 object-contain rounded-xl border border-slate-200 bg-white p-2 shadow-sm"
                referrerPolicy="no-referrer"
              />
              <div className="text-xl font-extrabold text-emerald-700 mt-3">
                {invoice.totalAmount.toLocaleString('vi-VN')} đ
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Ngân hàng thụ hưởng:</span>
                <span className="font-bold text-slate-800">{config.bankName} (Quân Đội)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Số tài khoản:</span>
                <span className="font-mono font-bold text-slate-900 flex items-center gap-1">
                  {config.bankAccount}
                  <button
                    onClick={() => handleCopy(config.bankAccount)}
                    className="p-1 hover:bg-slate-200 rounded text-slate-500"
                    title="Sao chép"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Chủ tài khoản:</span>
                <span className="font-bold text-slate-800 uppercase">{config.accountHolder}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Nội dung chuyển khoản:</span>
                <span className="font-mono font-bold text-emerald-800">
                  TT {currentRoom.roomNumber} T0926
                </span>
              </div>
            </div>

            {copied && (
              <div className="text-center text-xs text-emerald-600 font-bold mt-2">
                ✓ Đã sao chép số tài khoản vào bộ nhớ tạm!
              </div>
            )}

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setIsQrModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  onPayInvoice(invoice.id);
                  setIsQrModalOpen(false);
                }}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Tôi Đã Chuyển Khoản Xong</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Báo Hỏng Hóc */}
      {isTicketModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900 mb-3 pb-2 border-b border-slate-200">
              Gửi Yêu Cầu Sửa Chữa / Bảo Trì Cho Ban Quản Lý
            </h3>
            <form onSubmit={handleTicketSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Thiết bị / Khu vực gặp sự cố *</label>
                <input
                  type="text"
                  required
                  value={ticketTitle}
                  onChange={(e) => setTicketTitle(e.target.value)}
                  placeholder="VD: Điều hòa chảy nước, khóa cửa từ kẹt..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Loại thiết bị</label>
                  <select
                    value={ticketCategory}
                    onChange={(e) => setTicketCategory(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-slate-900"
                  >
                    <option value="aircon">Máy lạnh / Điều hòa</option>
                    <option value="water">Đường ống nước / Sen tắm</option>
                    <option value="electric">Điện / Bóng đèn / Ổ cắm</option>
                    <option value="furniture">Nội thất / Cửa / Giường</option>
                    <option value="other">Khác</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Mức độ cần xử lý</label>
                  <select
                    value={ticketPriority}
                    onChange={(e) => setTicketPriority(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-slate-900"
                  >
                    <option value="urgent">Khẩn cấp (Trong 2h)</option>
                    <option value="high">Trong ngày</option>
                    <option value="normal">Bình thường</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Mô tả cụ thể hiện trạng</label>
                <textarea
                  rows={3}
                  required
                  value={ticketDesc}
                  onChange={(e) => setTicketDesc(e.target.value)}
                  placeholder="Mô tả chi tiết tình trạng để thợ kỹ thuật chuẩn bị trước dụng cụ thay thế..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTicketModalOpen(false)}
                  className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Gửi Cho Kỹ Thuật Tòa Nhà</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

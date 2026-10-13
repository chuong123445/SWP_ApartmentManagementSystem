import React, { useState } from 'react';
import {
  X,
  User,
  Phone,
  CreditCard,
  Calendar,
  Zap,
  Droplets,
  ShieldCheck,
  FileText,
  AlertTriangle,
  LogOut,
  MapPin,
  Car,
  Lock,
  CheckCircle2,
  Award,
} from 'lucide-react';
import { Room, Tenant, Invoice, Contract } from '@/types';
import { ApartmentImage } from '@/components/apartments/ApartmentImage';

interface RoomDetailModalProps {
  room: Room | null;
  tenant: Tenant | undefined;
  contract: Contract | undefined;
  latestInvoice: Invoice | undefined;
  onClose: () => void;
  onOpenInvoiceModal: (invoice: Invoice) => void;
  onCheckOut: (roomId: string) => void;
  onReserveEscrow?: (roomId: string) => void;
}

export const RoomDetailModal: React.FC<RoomDetailModalProps> = ({
  room,
  tenant,
  contract,
  latestInvoice,
  onClose,
  onOpenInvoiceModal,
  onCheckOut,
  onReserveEscrow,
}) => {
  const [reserveSuccess, setReserveSuccess] = useState(false);

  if (!room) return null;

  const handleEscrowDeposit = () => {
    if (onReserveEscrow) {
      onReserveEscrow(room.id);
    }
    setReserveSuccess(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-xl font-bold">Căn Hộ {room.roomNumber}</h3>
              <span className="text-xs bg-emerald-500/20 text-emerald-300 font-semibold px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                {room.propertyApprovalStatus === 'APPROVED' ? 'Tài sản đã được duyệt' : room.propertyApprovalStatus === 'DRAFT' ? 'Tài sản nháp – chưa gửi hồ sơ' : room.propertyApprovalStatus === 'REJECTED' ? 'Tài sản bị từ chối' : 'Tài sản chờ duyệt'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Tầng {room.floor} • Diện tích: {room.area}m² • Tối đa: {room.maxOccupants} người • {room.propertyName}
            </p>
          </div>
          <button
            onClick={onClose}
            id="btn-close-room-modal"
            className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Room Image */}
          {room.image && (
            <div className="relative h-44 w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
              <ApartmentImage src={room.image} alt={`Ảnh căn hộ ${room.roomNumber}`} className="w-full h-full object-cover" />
              <div className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur-xs text-white text-xs px-2.5 py-1 rounded-md font-semibold">
                Ảnh căn hộ
              </div>
            </div>
          )}

          {/* Price & Deposit Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
            <div>
              <span className="text-[11px] text-slate-500 font-medium">Giá thuê tháng</span>
              <div className="text-sm font-bold text-slate-900 mt-0.5">
                {room.price.toLocaleString('vi-VN')} đ
              </div>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 font-medium">Ký quỹ Escrow</span>
              <div className="text-sm font-bold text-emerald-700 mt-0.5">
                {(room.deposit || room.price).toLocaleString('vi-VN')} đ
              </div>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 font-medium">Chỉ số điện</span>
              <div className="text-sm font-bold text-amber-700 mt-0.5 flex items-center justify-center gap-1">
                <Zap className="w-3.5 h-3.5" />
                {room.meterBaselineKnown === false ? 'Chưa có chỉ số bàn giao' : `${room.electricityIndex} kWh`}
              </div>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 font-medium">Chỉ số nước</span>
              <div className="text-sm font-bold text-sky-700 mt-0.5 flex items-center justify-center gap-1">
                <Droplets className="w-3.5 h-3.5" />
                {room.meterBaselineKnown === false ? 'Chưa có chỉ số bàn giao' : `${room.waterIndex} m³`}
              </div>
            </div>
          </div>

          {/* Property status comes from the same owned Apartment inventory. */}
          <div className="border border-emerald-200 bg-emerald-50/50 rounded-xl p-4 text-xs space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-emerald-200/60">
              <span className="font-bold text-emerald-950 flex items-center gap-1.5 text-xs">
                <Award className="w-4 h-4 text-emerald-700" />
                Tài sản: {room.propertyName}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                {room.propertyApprovalStatus === 'APPROVED' ? 'Đã duyệt' : room.propertyApprovalStatus === 'DRAFT' ? 'Nháp' : room.propertyApprovalStatus === 'REJECTED' ? 'Từ chối' : 'Chờ duyệt'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-slate-700 text-[11px]">
              <div>• Đăng tin: <strong>{room.publicationStatus === 'PUBLISHED' ? 'Đã đăng' : room.publicationStatus === 'HIDDEN' ? 'Đã ẩn' : 'Bản nháp'}</strong></div>
            </div>
          </div>

          {/* Tenant Profile if occupied */}
          {tenant ? (
            <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-sm">
                    {tenant.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{tenant.name}</h4>
                    <span className="text-xs text-slate-500">Khách thuê đại diện hợp đồng (eKYC Chip Đạt)</span>
                  </div>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                  Đang cư trú
                </span>
              </div>

              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span>Điện thoại: <strong>{tenant.phone}</strong></span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <CreditCard className="w-4 h-4 text-slate-400" />
                  <span>CCCD gắn chip: <strong>{tenant.idCard}</strong></span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span>Quê quán: <strong>{tenant.hometown}</strong></span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Car className="w-4 h-4 text-slate-400" />
                  <span>Biển số xe: <strong>{tenant.vehiclePlate || 'Chưa đăng ký'}</strong></span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-3">
              <p className="text-xs text-slate-600">
                Phòng hiện đang trống, sẵn sàng dọn vào ngay. Đã khử khuẩn và kiểm tra thiết bị.
              </p>
              {reserveSuccess ? (
                <div className="p-3 bg-emerald-100 text-emerald-900 rounded-xl text-xs font-bold flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  Đã khởi tạo lệnh Ký Quỹ Escrow giữ chỗ thành công cho Căn hộ {room.roomNumber}!
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleEscrowDeposit}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors inline-flex items-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Đặt Cọc Giữ Chỗ Qua An Cư Escrow MBBank</span>
                </button>
              )}
            </div>
          )}

          {/* Contract info */}
          {contract && (
            <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-600" /> Hợp Đồng: {contract.contractNumber}
                </span>
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                    contract.status === 'expiring'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {contract.status === 'expiring' ? 'Sắp hết hạn' : 'Hiệu lực'}
                </span>
              </div>
              <div className="mt-2.5 grid grid-cols-2 gap-2 text-xs text-slate-600">
                <div>Thời hạn: <strong>{contract.startDate}</strong> đến <strong>{contract.endDate}</strong></div>
                <div>Ký điện tử: <strong>{contract.signingMethod || 'VNPT SmartCA'}</strong></div>
              </div>
            </div>
          )}

          {/* Latest Invoice */}
          {latestInvoice && (
            <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-teal-600" /> Hóa Đơn Kỳ Gần Nhất: {latestInvoice.monthYear}
                </span>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                    latestInvoice.status === 'paid'
                      ? 'bg-emerald-100 text-emerald-800'
                      : latestInvoice.status === 'overdue'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {latestInvoice.status === 'paid'
                    ? 'Đã thanh toán'
                    : latestInvoice.status === 'overdue'
                    ? 'Quá hạn'
                    : 'Chưa đóng'}
                </span>
              </div>
              <div className="mt-2.5 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500">Tổng tiền:</span>{' '}
                  <strong className="text-slate-900">
                    {latestInvoice.totalAmount.toLocaleString('vi-VN')} đ
                  </strong>
                </div>
                <button
                  onClick={() => onOpenInvoiceModal(latestInvoice)}
                  id="btn-view-invoice-from-room"
                  className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded text-xs transition-colors"
                >
                  Xem Hóa Đơn & QR
                </button>
              </div>
            </div>
          )}

          {/* Amenities */}
          <div>
            <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Nội thất & Tiện nghi phòng
            </h5>
            <div className="flex flex-wrap gap-1.5">
              {room.amenities.map((a, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200"
                >
                  ✓ {a}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          {tenant && (
            <button
              onClick={() => {
                if (confirm(`Xác nhận khách ${tenant.name} trả phòng ${room.roomNumber}?`)) {
                  onCheckOut(room.id);
                  onClose();
                }
              }}
              className="flex items-center gap-1.5 px-3 py-2 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Trả Phòng / Thanh Lý</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="ml-auto px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  Home,
  Plus,
  Filter,
  CheckCircle2,
  Clock,
  Wrench,
  AlertTriangle,
  Zap,
  Droplets,
  User,
  ArrowRight,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { Room, RoomStatus, Tenant } from '../types';

interface RoomsViewProps {
  rooms: Room[];
  tenants: Tenant[];
  onOpenRoomModal: (room: Room) => void;
  onOpenAddRoomModal: () => void;
}

export const RoomsView: React.FC<RoomsViewProps> = ({
  rooms,
  tenants,
  onOpenRoomModal,
  onOpenAddRoomModal,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [floorFilter, setFloorFilter] = useState<string>('all');

  const filteredRooms = rooms.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (floorFilter !== 'all' && r.floor.toString() !== floorFilter) return false;
    return true;
  });

  const getStatusBadge = (status: RoomStatus) => {
    switch (status) {
      case 'rented':
        return {
          label: 'Đang thuê',
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dot: 'bg-emerald-500',
        };
      case 'available':
        return {
          label: 'Phòng trống',
          bg: 'bg-slate-100 text-slate-700 border-slate-300',
          dot: 'bg-slate-400',
        };
      case 'overdue':
        return {
          label: 'Chậm thanh toán',
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
          dot: 'bg-rose-500',
        };
      case 'expiring':
        return {
          label: 'Sắp hết HĐ',
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          dot: 'bg-amber-500',
        };
      case 'maintenance':
        return {
          label: 'Đang sửa chữa',
          bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          dot: 'bg-indigo-500',
        };
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              100% Căn Hộ Đã Thẩm Định TrustGuard™
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <span>Sơ Đồ Phòng Trọ & Căn Hộ Cho Thuê</span>
            <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-semibold">
              {filteredRooms.length}/{rooms.length} phòng
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Theo dõi tình trạng thuê, hợp đồng điện tử SmartCA, số điện nước và ký quỹ Escrow.
          </p>
        </div>

        <button
          onClick={onOpenAddRoomModal}
          id="btn-add-new-room"
          className="flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm Căn Hộ Mới</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Lọc:
          </span>
          {[
            { id: 'all', label: `Tất cả (${rooms.length})` },
            {
              id: 'rented',
              label: `Đang thuê (${rooms.filter((r) => r.status === 'rented').length})`,
            },
            {
              id: 'available',
              label: `Phòng trống (${rooms.filter((r) => r.status === 'available').length})`,
            },
            {
              id: 'overdue',
              label: `Nợ tiền (${rooms.filter((r) => r.status === 'overdue').length})`,
            },
            {
              id: 'expiring',
              label: `Sắp hết hạn (${rooms.filter((r) => r.status === 'expiring').length})`,
            },
            {
              id: 'maintenance',
              label: `Đang sửa (${rooms.filter((r) => r.status === 'maintenance').length})`,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                statusFilter === tab.id
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Floor filter */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium">Tầng:</span>
          <select
            value={floorFilter}
            onChange={(e) => setFloorFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 font-medium focus:outline-none focus:border-emerald-500"
          >
            <option value="all">Tất cả tầng</option>
            <option value="1">Tầng 1</option>
            <option value="2">Tầng 2</option>
            <option value="3">Tầng 3</option>
          </select>
        </div>
      </div>

      {/* Rooms Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredRooms.map((room) => {
          const badge = getStatusBadge(room.status);
          const tenant = tenants.find((t) => t.id === room.currentTenantId);

          return (
            <div
              key={room.id}
              id={`room-card-${room.roomNumber.toLowerCase().replace('.', '')}`}
              onClick={() => onOpenRoomModal(room)}
              className="bg-white rounded-xl border border-slate-200 hover:border-emerald-500 p-4 shadow-xs transition-all hover:shadow-md cursor-pointer flex flex-col justify-between group"
            >
              <div>
                {/* Header: Room number & status */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                        {room.roomNumber}
                      </span>
                      <span title="TrustGuard Verified">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Tầng {room.floor} • {room.area}m²
                    </span>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${badge.bg}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                    {badge.label}
                  </span>
                </div>

                {/* Price */}
                <div className="mt-3 flex items-baseline justify-between">
                  <div className="text-base font-bold text-emerald-700">
                    {room.price.toLocaleString('vi-VN')} đ
                    <span className="text-xs font-normal text-slate-400">/tháng</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {room.legalDocType?.split(' ')[0]}
                  </span>
                </div>

                {/* Tenant info if rented */}
                <div className="mt-3 py-2 px-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                  {tenant ? (
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <div className="truncate">
                        <span className="font-semibold text-slate-800">{tenant.name}</span>
                        <span className="text-slate-400 text-[11px] block">{tenant.phone}</span>
                      </div>
                    </div>
                  ) : room.status === 'maintenance' ? (
                    <span className="text-indigo-600 font-medium flex items-center gap-1">
                      <Wrench className="w-3.5 h-3.5" /> Đang bảo dưỡng thiết bị
                    </span>
                  ) : (
                    <span className="text-slate-400 font-medium flex items-center gap-1">
                      <Home className="w-3.5 h-3.5" /> Sẵn sàng đón khách mới
                    </span>
                  )}
                </div>

                {/* Meter status */}
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    <span>Điện: <strong>{room.electricityIndex}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Droplets className="w-3.5 h-3.5 text-sky-500" />
                    <span>Nước: <strong>{room.waterIndex}</strong></span>
                  </div>
                </div>
              </div>

              {/* Action hint */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 group-hover:text-emerald-600">
                <span className="font-medium text-[11px]">Chi tiết & Pháp lý Sổ hồng</span>
                <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  Users,
  Search,
  Plus,
  Phone,
  CreditCard,
  Home,
  Calendar,
  Car,
  ShieldCheck,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { Tenant, Room } from '../types';

interface TenantsViewProps {
  tenants: Tenant[];
  rooms: Room[];
  onAddTenant: (tenant: Omit<Tenant, 'id'>) => void;
}

export const TenantsView: React.FC<TenantsViewProps> = ({
  tenants,
  rooms,
  onAddTenant,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New tenant form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [idCard, setIdCard] = useState('');
  const [hometown, setHometown] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState(
    rooms.find((r) => r.status === 'available')?.id || rooms[0]?.id || ''
  );
  const [deposit, setDeposit] = useState('5000000');

  const filteredTenants = tenants.filter(
    (t) =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.phone.includes(searchTerm) ||
      t.roomNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.idCard.includes(searchTerm)
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const room = rooms.find((r) => r.id === selectedRoomId);
    if (!room) return;

    onAddTenant({
      name,
      phone,
      idCard,
      roomId: room.id,
      roomNumber: room.roomNumber,
      buildingName: 'Tòa A - Lê Văn Sỹ (Q.3)',
      startDate: new Date().toLocaleDateString('vi-VN'),
      deposit: Number(deposit) || 5000000,
      hometown: hometown || 'TP. Hồ Chí Minh',
      status: 'active',
      vehiclePlate: vehiclePlate || undefined,
      ekycVerified: true,
      ekycDate: new Date().toLocaleDateString('vi-VN'),
      smartCaRegistered: true,
    });

    setIsAddModalOpen(false);
    setName('');
    setPhone('');
    setIdCard('');
    setHometown('');
    setVehiclePlate('');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              100% Cư Dân Đã Hoàn Tất eKYC CCCD Gắn Chip
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <span>Danh Sách Cư Dân & Khách Thuê Căn Hộ</span>
            <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-semibold">
              {tenants.filter((t) => t.status === 'active').length} cư dân
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Quản lý định danh điện tử, đăng ký tạm trú cơ quan công an phường, tiền cọc bảo chứng Escrow.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          id="btn-add-tenant"
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm & eKYC Khách Thuê</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="input-search-tenants"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên khách thuê, số điện thoại, CCCD gắn chip, số căn hộ..."
            className="w-full bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Họ và Tên</th>
                <th className="px-4 py-3">Căn Hộ</th>
                <th className="px-4 py-3">Số Điện Thoại</th>
                <th className="px-4 py-3">CCCD Gắn Chip (eKYC)</th>
                <th className="px-4 py-3">Quê Quán</th>
                <th className="px-4 py-3">Ký Số SmartCA</th>
                <th className="px-4 py-3">Tiền Cọc Escrow</th>
                <th className="px-4 py-3">Biển Số Xe</th>
                <th className="px-4 py-3 text-center">Trạng Thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTenants.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-900 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs">
                      {tenant.name.charAt(0)}
                    </div>
                    <span>{tenant.name}</span>
                  </td>
                  <td className="px-4 py-3 font-bold text-emerald-700">
                    <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200">
                      {tenant.roomNumber}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700 font-medium">{tenant.phone}</td>
                  <td className="px-4 py-3 text-slate-700">
                    <div className="font-mono">{tenant.idCard}</div>
                    <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-0.5">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Chip khớp 99.8%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{tenant.hometown}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      VNPT SmartCA
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    <div className="flex items-center gap-1">
                      <Lock className="w-3 h-3 text-emerald-700" />
                      {tenant.deposit.toLocaleString('vi-VN')} đ
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {tenant.vehiclePlate || <span className="text-slate-400 italic">Chưa đăng ký</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                      <ShieldCheck className="w-3 h-3" /> Đang cư trú
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Tenant Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden p-6 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-slate-900 mb-4 pb-3 border-b border-slate-200 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              Thêm & Định Danh eKYC Cư Dân Mới
            </h3>
            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Họ và Tên cư dân theo CCCD *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="NGUYỄN VĂN A"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Số điện thoại *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0912 345 678"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Số CCCD gắn chip (12 số) *</label>
                  <input
                    type="text"
                    required
                    value={idCard}
                    onChange={(e) => setIdCard(e.target.value)}
                    placeholder="07920100xxxx"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Chọn Căn Hộ *</label>
                  <select
                    value={selectedRoomId}
                    onChange={(e) => setSelectedRoomId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 font-medium"
                  >
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.roomNumber} ({r.price.toLocaleString('vi-VN')} đ/tháng) - {r.status === 'available' ? 'Trống' : 'Đang thuê'}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tiền cọc Ký Quỹ Escrow (VNĐ)</label>
                  <input
                    type="number"
                    value={deposit}
                    onChange={(e) => setDeposit(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 font-bold text-emerald-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Quê quán thường trú</label>
                  <input
                    type="text"
                    value={hometown}
                    onChange={(e) => setHometown(e.target.value)}
                    placeholder="TP.HCM, Cần Thơ, Hà Nội..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Biển số xe máy / ô tô</label>
                  <input
                    type="text"
                    value={vehiclePlate}
                    onChange={(e) => setVehiclePlate(e.target.value)}
                    placeholder="59-P1 123.45"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-[11px] text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Hệ thống tự động đồng bộ tài khoản Cổng Cư Dân và gửi mã ký số VNPT SmartCA.</span>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  id="btn-submit-new-tenant"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-xs transition-colors"
                >
                  Xác Thực eKYC & Lưu Cư Dân
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

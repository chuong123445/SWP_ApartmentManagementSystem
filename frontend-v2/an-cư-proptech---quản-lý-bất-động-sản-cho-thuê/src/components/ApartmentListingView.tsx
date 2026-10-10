import React, { useState } from 'react';
import {
  Search,
  Filter,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  Eye,
  SlidersHorizontal,
  Home,
  FileCheck,
  Building,
  UserCheck,
  Sparkles,
  Phone,
  Calendar,
} from 'lucide-react';
import { Room, Building as BuildingType, SystemConfig } from '../types';

interface ApartmentListingViewProps {
  rooms: Room[];
  buildings: BuildingType[];
  config: SystemConfig;
  onSelectRoom: (room: Room) => void;
  onReserveRoom?: (roomId: string) => void;
}

export const ApartmentListingView: React.FC<ApartmentListingViewProps> = ({
  rooms,
  buildings,
  config,
  onSelectRoom,
}) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'available' | 'expiring'>('available');
  const [searchQuery, setSearchQuery] = useState('');
  const [maxPrice, setMaxPrice] = useState<number>(7000000);
  const [selectedFloor, setSelectedFloor] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Filter logic
  const filteredRooms = rooms.filter((r) => {
    if (filterStatus === 'available' && r.status !== 'available') return false;
    if (filterStatus === 'expiring' && r.status !== 'expiring') return false;
    if (r.price > maxPrice) return false;
    if (selectedFloor !== 'all' && r.floor.toString() !== selectedFloor) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchNumber = r.roomNumber.toLowerCase().includes(q);
      const matchAmenities = r.amenities.some((a) => a.toLowerCase().includes(q));
      if (!matchNumber && !matchAmenities) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white p-6 sm:p-8 rounded-2xl border border-emerald-800/40 shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Sàn Căn Hộ Cao Cấp Minh Bạch Pháp Lý - An Cư TrustGuard™
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
            Khám Phá Căn Hộ Đã Thẩm Định 100% Sổ Hồng & PCCC
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            Mọi căn hộ trên hệ thống đều có hồ sơ pháp lý đối soát, xác thực eKYC CCCD gắn chip chủ nhà và bảo chứng tiền cọc 100% qua tài khoản ký quỹ An Cư Escrow MBBank.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-emerald-200">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Không chênh giá, không phí môi giới
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Ký HĐ điện tử VNPT SmartCA
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Cọc Escrow phong tỏa an toàn
            </span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Status buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: 'available', label: `Đang trống dọn vào ngay (${rooms.filter((r) => r.status === 'available').length})` },
              { id: 'expiring', label: `Sắp trống trong tháng (${rooms.filter((r) => r.status === 'expiring').length})` },
              { id: 'all', label: `Toàn bộ căn hộ (${rooms.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  filterStatus === tab.id
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm số phòng, máy lạnh, ban công..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-2.5 py-1 text-xs font-bold rounded ${
                  viewMode === 'grid' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500'
                }`}
              >
                Lưới
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-2.5 py-1 text-xs font-bold rounded ${
                  viewMode === 'table' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500'
                }`}
              >
                Bảng
              </button>
            </div>
          </div>
        </div>

        {/* Secondary Filters */}
        <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-slate-100 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Giá tối đa:</span>
            <select
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 font-bold"
            >
              <option value={4500000}>Dưới 4.5 Triệu</option>
              <option value={5000000}>Dưới 5.0 Triệu</option>
              <option value={6000000}>Dưới 6.0 Triệu</option>
              <option value={7000000}>Tất cả mức giá</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Tầng:</span>
            <select
              value={selectedFloor}
              onChange={(e) => setSelectedFloor(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800"
            >
              <option value="all">Tất cả tầng</option>
              <option value="1">Tầng 1</option>
              <option value="2">Tầng 2</option>
              <option value="3">Tầng 3</option>
            </select>
          </div>

          <span className="ml-auto font-medium text-slate-400">
            Tìm thấy <strong>{filteredRooms.length}</strong> căn hộ phù hợp
          </span>
        </div>
      </div>

      {/* Grid or Table Listing */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRooms.map((room) => (
            <div
              key={room.id}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md hover:border-emerald-500/80 transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Image & Badges */}
                <div className="relative h-48 w-full bg-slate-100 overflow-hidden">
                  <img
                    src={room.image}
                    alt={room.roomNumber}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 left-3 bg-emerald-700/90 text-white px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-xs">
                    <ShieldCheck className="w-3 h-3 text-emerald-300" />
                    TrustGuard™ Verified
                  </div>
                  <div className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur-xs text-white px-2 py-0.5 rounded-md text-[11px] font-bold">
                    Tầng {room.floor}
                  </div>
                  <div className="absolute bottom-3 left-3 bg-slate-900/85 backdrop-blur-xs text-white px-2.5 py-1 rounded-lg text-xs font-bold">
                    {room.roomNumber} • {room.area} m²
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 space-y-3">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-lg font-extrabold text-emerald-700">
                        {room.price.toLocaleString('vi-VN')} đ
                      </span>
                      <span className="text-xs text-slate-400"> / tháng</span>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        room.status === 'available'
                          ? 'bg-emerald-100 text-emerald-800'
                          : room.status === 'expiring'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {room.status === 'available'
                        ? 'Đang trống'
                        : room.status === 'expiring'
                        ? 'Sắp trống (15 ngày)'
                        : 'Đang thuê'}
                    </span>
                  </div>

                  {/* Amenities */}
                  <div className="flex flex-wrap gap-1.5 text-[11px] text-slate-600">
                    {room.amenities.slice(0, 3).map((item, i) => (
                      <span key={i} className="px-2 py-0.5 bg-slate-100 rounded-md font-medium">
                        {item}
                      </span>
                    ))}
                    {room.amenities.length > 3 && (
                      <span className="px-1.5 py-0.5 text-slate-400 text-[10px]">
                        +{room.amenities.length - 3} tiện ích
                      </span>
                    )}
                  </div>

                  {/* Legal info summary */}
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80 text-[11px] text-slate-500 space-y-0.5">
                    <div>
                      Pháp lý: <strong className="text-slate-700">{room.legalDocType}</strong>
                    </div>
                    <div className="flex items-center gap-1 text-emerald-700 font-semibold">
                      <Lock className="w-3 h-3" /> Cọc Escrow: {room.deposit?.toLocaleString('vi-VN')} đ bảo chứng MBBank
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="p-4 pt-0">
                <button
                  onClick={() => onSelectRoom(room)}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  <span>Xem Chi Tiết & Đặt Cọc Escrow</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Phòng</th>
                  <th className="px-4 py-3">Tầng</th>
                  <th className="px-4 py-3">Diện Tích</th>
                  <th className="px-4 py-3">Giá Thuê (đ/tháng)</th>
                  <th className="px-4 py-3">Pháp Lý TrustGuard</th>
                  <th className="px-4 py-3">Trạng Thái</th>
                  <th className="px-4 py-3 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRooms.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-900">{r.roomNumber}</td>
                    <td className="px-4 py-3 text-slate-600">Tầng {r.floor}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{r.area} m²</td>
                    <td className="px-4 py-3 font-bold text-emerald-700">
                      {r.price.toLocaleString('vi-VN')} đ
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <span className="inline-flex items-center gap-1 text-emerald-800 font-medium">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        {r.legalDocType}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          r.status === 'available'
                            ? 'bg-emerald-100 text-emerald-800'
                            : r.status === 'expiring'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {r.status === 'available'
                          ? 'Đang trống'
                          : r.status === 'expiring'
                          ? 'Sắp trống'
                          : 'Đang thuê'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => onSelectRoom(r)}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] transition-colors"
                      >
                        Xem Chi Tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

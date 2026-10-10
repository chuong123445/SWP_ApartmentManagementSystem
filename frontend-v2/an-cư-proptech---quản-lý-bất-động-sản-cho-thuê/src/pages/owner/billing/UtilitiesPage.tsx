import React, { useState } from 'react';
import { Zap, Droplets, Save, Calculator, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { Room, Tenant, SystemConfig } from '@/types';

interface UtilitiesPageProps {
  rooms: Room[];
  tenants: Tenant[];
  config: SystemConfig;
  onUpdateIndices: (updates: { roomId: string; electric: number; water: number }[]) => void;
}

export const UtilitiesPage: React.FC<UtilitiesPageProps> = ({
  rooms,
  tenants,
  config,
  onUpdateIndices,
}) => {
  // Local state for meter readings
  const [readings, setReadings] = useState<{
    [roomId: string]: { newElectric: string; newWater: string };
  }>(() => {
    const init: { [roomId: string]: { newElectric: string; newWater: string } } = {};
    rooms.forEach((r) => {
      init[r.id] = {
        newElectric: r.meterBaselineKnown === false ? '' : r.electricityIndex.toString(),
        newWater: r.meterBaselineKnown === false ? '' : r.waterIndex.toString(),
      };
    });
    return init;
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleElectricChange = (roomId: string, val: string) => {
    setReadings((prev) => ({
      ...prev,
      [roomId]: { ...prev[roomId], newElectric: val },
    }));
  };

  const handleWaterChange = (roomId: string, val: string) => {
    setReadings((prev) => ({
      ...prev,
      [roomId]: { ...prev[roomId], newWater: val },
    }));
  };

  const handleSaveAll = () => {
    const updates = rooms.filter(r => r.meterBaselineKnown !== false).map((r) => ({
      roomId: r.id,
      electric: Number(readings[r.id]?.newElectric) || r.electricityIndex,
      water: Number(readings[r.id]?.newWater) || r.waterIndex,
    }));
    onUpdateIndices(updates);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <span>Chốt Chỉ Số Điện - Nước & Tiện Ích</span>
            <span className="text-xs bg-amber-100 text-amber-800 font-semibold px-2.5 py-0.5 rounded-full">
              Kỳ chốt: Tháng 09/2026
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Đơn giá quy định: Điện {config.electricPrice.toLocaleString('vi-VN')} đ/kWh • Nước {config.waterPrice.toLocaleString('vi-VN')} đ/m³
          </p>
        </div>

        <div className="flex items-center gap-2">
          {savedSuccess && (
            <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Đã lưu chỉ số thành công!
            </span>
          )}
          <button
            onClick={handleSaveAll}
            id="btn-save-utilities"
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Lưu & Chốt Toàn Bộ Tòa Nhà</span>
          </button>
        </div>
      </div>

      {/* Info bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-amber-50/60 border border-amber-200 p-4 rounded-xl flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-amber-900">Đơn giá điện: {config.electricPrice.toLocaleString('vi-VN')} đ / kWh</div>
            <div className="text-[11px] text-amber-700">Công tơ điện riêng từng phòng tử tế</div>
          </div>
        </div>

        <div className="bg-sky-50/60 border border-sky-200 p-4 rounded-xl flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
            <Droplets className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-sky-900">Đơn giá nước: {config.waterPrice.toLocaleString('vi-VN')} đ / m³</div>
            <div className="text-[11px] text-sky-700">Đồng hồ nước kiểm định định kỳ</div>
          </div>
        </div>
      </div>

      {/* Utilities Table matching Image 5 */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-3.5 py-3">Phòng</th>
                <th className="px-3.5 py-3">Khách Thuê</th>
                <th className="px-3.5 py-3 bg-amber-50/40 text-amber-900">Điện Cũ</th>
                <th className="px-3.5 py-3 bg-amber-50/60 text-amber-900">Điện Mới (Nhập)</th>
                <th className="px-3.5 py-3 text-right bg-amber-50/80 text-amber-900">Tiêu Thụ (kWh)</th>
                <th className="px-3.5 py-3 bg-sky-50/40 text-sky-900">Nước Cũ</th>
                <th className="px-3.5 py-3 bg-sky-50/60 text-sky-900">Nước Mới (Nhập)</th>
                <th className="px-3.5 py-3 text-right bg-sky-50/80 text-sky-900">Tiêu Thụ (m³)</th>
                <th className="px-3.5 py-3 text-right font-bold">Tổng Tiền Đ+N</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rooms.map((room) => {
                const tenant = tenants.find((t) => t.id === room.currentTenantId);
                const missingBaseline = room.meterBaselineKnown === false;
                const currentRecord = readings[room.id] || {
                  newElectric: missingBaseline ? '' : room.electricityIndex.toString(),
                  newWater: missingBaseline ? '' : room.waterIndex.toString(),
                };

                const newE = Number(currentRecord.newElectric) || room.electricityIndex;
                const newW = Number(currentRecord.newWater) || room.waterIndex;

                const eUsage = Math.max(0, newE - room.electricityIndex);
                const wUsage = Math.max(0, newW - room.waterIndex);

                const eCost = eUsage * config.electricPrice;
                const wCost = wUsage * config.waterPrice;
                const totalCost = eCost + wCost;

                return (
                  <tr key={room.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-3.5 py-2.5 font-bold text-slate-900">
                      <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                        {room.roomNumber}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 text-slate-700 font-medium">
                      {tenant ? tenant.name : <span className="text-slate-400 italic">Trống</span>}
                    </td>

                    {/* Electric Old */}
                    <td className="px-3.5 py-2.5 font-mono text-slate-600 bg-amber-50/20">
                      {missingBaseline ? 'Chưa nhập' : room.electricityIndex}
                    </td>

                    {/* Electric New Input */}
                    <td className="px-3.5 py-2.5 bg-amber-50/40">
                      <input
                        type="number"
                        value={currentRecord.newElectric}
                        disabled={missingBaseline}
                        onChange={(e) => handleElectricChange(room.id, e.target.value)}
                        className="w-24 bg-white border border-amber-300 rounded px-2 py-1 font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </td>

                    {/* Electric Usage */}
                    <td className="px-3.5 py-2.5 text-right font-bold text-amber-700 bg-amber-50/60">
                      {missingBaseline ? 'Thiếu chỉ số bàn giao' : `${eUsage} kWh`}
                      <span className="text-[10px] text-slate-400 font-normal block">
                        ({eCost.toLocaleString('vi-VN')} đ)
                      </span>
                    </td>

                    {/* Water Old */}
                    <td className="px-3.5 py-2.5 font-mono text-slate-600 bg-sky-50/20">
                      {missingBaseline ? 'Chưa nhập' : room.waterIndex}
                    </td>

                    {/* Water New Input */}
                    <td className="px-3.5 py-2.5 bg-sky-50/40">
                      <input
                        type="number"
                        value={currentRecord.newWater}
                        disabled={missingBaseline}
                        onChange={(e) => handleWaterChange(room.id, e.target.value)}
                        className="w-20 bg-white border border-sky-300 rounded px-2 py-1 font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                      />
                    </td>

                    {/* Water Usage */}
                    <td className="px-3.5 py-2.5 text-right font-bold text-sky-700 bg-sky-50/60">
                      {missingBaseline ? 'Thiếu chỉ số bàn giao' : `${wUsage} m³`}
                      <span className="text-[10px] text-slate-400 font-normal block">
                        ({wCost.toLocaleString('vi-VN')} đ)
                      </span>
                    </td>

                    {/* Total Cost */}
                    <td className="px-3.5 py-2.5 text-right font-bold text-slate-900 text-sm">
                      {totalCost.toLocaleString('vi-VN')} đ
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

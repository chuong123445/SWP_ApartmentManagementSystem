import React, { useState, useEffect } from 'react';
import { Zap, Droplets, Save, CheckCircle2, FileText, ShieldCheck } from 'lucide-react';
import { Room, Tenant, SystemConfig } from '@/types';
import type { Tenancy } from '@/types/billing';

interface UtilitiesPageProps {
  rooms: Room[];
  tenants: Tenant[];
  tenancies?: Tenancy[];
  config: SystemConfig;
  utilityReadings?: Record<string, { newElectric: string; newWater: string }>;
  onUpdateIndices: (updates: { roomId: string; electric: number; water: number }[]) => void;
  onOpenCreateInvoice?: (contractId?: string, roomId?: string) => void;
}

export const UtilitiesPage: React.FC<UtilitiesPageProps> = ({
  rooms,
  tenants,
  tenancies = [],
  config,
  utilityReadings,
  onUpdateIndices,
  onOpenCreateInvoice,
}) => {
  // Helper to get saved/initial reading for a room
  const getInitialReading = (room: Room) => {
    const saved = utilityReadings?.[room.id];
    if (saved && saved.newElectric !== '' && saved.newWater !== '') {
      return {
        newElectric: saved.newElectric,
        newWater: saved.newWater,
      };
    }
    return {
      newElectric: room.meterBaselineKnown === false ? '' : room.electricityIndex.toString(),
      newWater: room.meterBaselineKnown === false ? '' : room.waterIndex.toString(),
    };
  };

  // Draft readings: ONLY local form state while typing!
  // Will NOT be saved or synced until owner clicks "Lưu & Đồng Bộ Toàn Bộ"
  const [draftReadings, setDraftReadings] = useState<{
    [roomId: string]: { newElectric: string; newWater: string };
  }>(() => {
    const init: { [roomId: string]: { newElectric: string; newWater: string } } = {};
    rooms.forEach((r) => {
      init[r.id] = getInitialReading(r);
    });
    return init;
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  // Sync draft state with saved utilityReadings only on initial mount or when external utilityReadings/rooms change
  useEffect(() => {
    setDraftReadings(() => {
      const init: { [roomId: string]: { newElectric: string; newWater: string } } = {};
      rooms.forEach((r) => {
        init[r.id] = getInitialReading(r);
      });
      return init;
    });
  }, [utilityReadings, rooms]);

  const handleElectricChange = (roomId: string, val: string) => {
    // Only update local draft state, DO NOT auto-save!
    setDraftReadings((prev) => ({
      ...prev,
      [roomId]: { ...(prev[roomId] ?? { newElectric: '', newWater: '' }), newElectric: val },
    }));
  };

  const handleWaterChange = (roomId: string, val: string) => {
    // Only update local draft state, DO NOT auto-save!
    setDraftReadings((prev) => ({
      ...prev,
      [roomId]: { ...(prev[roomId] ?? { newElectric: '', newWater: '' }), newWater: val },
    }));
  };

  // Only perform save and synchronization when owner explicitly clicks this button!
  const handleSaveAll = () => {
    const updates = rooms.filter(r => r.meterBaselineKnown !== false).map((r) => {
      const current = draftReadings[r.id];
      return {
        roomId: r.id,
        electric: Number(current?.newElectric) || r.electricityIndex,
        water: Number(current?.newWater) || r.waterIndex,
      };
    });
    onUpdateIndices(updates);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3500);
  };

  const handleOpenInvoiceForRoom = (room: Room) => {
    if (!onOpenCreateInvoice) return;
    const tenancy = tenancies.find(t => t.apartmentId === room.id && t.status === 'ACTIVE');
    onOpenCreateInvoice(tenancy?.id, room.id);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header - Bỏ nút Lập Hóa Đơn Mới theo yêu cầu */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <span>Chốt Chỉ Số Điện - Nước & Tiện Ích</span>
            <span className="text-xs bg-amber-100 text-amber-800 font-semibold px-2.5 py-0.5 rounded-full">
              Kỳ chốt: Tháng 09/2026
            </span>
          </h1>

        </div>

        <div className="flex items-center gap-2">
          {savedSuccess && (
            <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Đã lưu & đồng bộ sang Lập Hóa Đơn!
            </span>
          )}
          <button
            onClick={handleSaveAll}
            id="btn-save-utilities"
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Lưu & Đồng Bộ Toàn Bộ</span>
          </button>
        </div>
      </div>

      {/* Info bar & Workflow Guidance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-amber-50/60 border border-amber-200 p-4 rounded-xl flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-amber-900">Đơn giá điện: {config.electricPrice.toLocaleString('vi-VN')} đ / kWh</div>
          </div>
        </div>

        <div className="bg-sky-50/60 border border-sky-200 p-4 rounded-xl flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
            <Droplets className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-sky-900">Đơn giá nước: {config.waterPrice.toLocaleString('vi-VN')} đ / m³</div>
          </div>
        </div>

        <div className="bg-emerald-50/60 border border-emerald-200 p-4 rounded-xl flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-emerald-900">Nhấn "Lưu & đồng bộ" để chuyển dữ liệu</div>
          </div>
        </div>
      </div>

      {/* Utilities Table */}
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
                <th className="px-3.5 py-3 text-center font-bold">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rooms.map((room) => {
                const tenant = tenants.find((t) => t.id === room.currentTenantId);
                const missingBaseline = room.meterBaselineKnown === false;
                const currentRecord = draftReadings[room.id] ?? {
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
                    <td className="px-3.5 py-2.5 font-mono text-slate-700 font-semibold bg-amber-50/20">
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
                    <td className="px-3.5 py-2.5 font-mono text-slate-700 font-semibold bg-sky-50/20">
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

                    {/* Action buttons: Only Lập hóa đơn */}
                    <td className="px-3.5 py-2.5 text-center">
                      {!tenant ? (
                        <span className="text-[11px] text-slate-400 italic">Chưa thuê</span>
                      ) : (
                        <div className="flex items-center justify-center">
                          {onOpenCreateInvoice && (
                            <button
                              onClick={() => handleOpenInvoiceForRoom(room)}
                              title="Chuyển dữ liệu tính sẵn sang Lập Hóa Đơn"
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold flex items-center gap-1 transition-colors shadow-2xs"
                            >
                              <FileText className="w-3 h-3" />
                              <span>Lập hóa đơn</span>
                            </button>
                          )}
                        </div>
                      )}
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

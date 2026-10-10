import React, { useState } from 'react';
import { X, Plus, Calculator, FileText } from 'lucide-react';
import { Room, Tenant, SystemConfig, Invoice } from '../types';

interface CreateInvoiceModalProps {
  rooms: Room[];
  tenants: Tenant[];
  config: SystemConfig;
  onClose: () => void;
  onCreateInvoice: (newInv: Invoice) => void;
}

export const CreateInvoiceModal: React.FC<CreateInvoiceModalProps> = ({
  rooms,
  tenants,
  config,
  onClose,
  onCreateInvoice,
}) => {
  const rentedRooms = rooms.filter((r) => r.status !== 'available');
  const [selectedRoomId, setSelectedRoomId] = useState(rentedRooms[0]?.id || rooms[0]?.id || '');
  const currentRoom = rooms.find((r) => r.id === selectedRoomId) || rooms[0];
  const currentTenant = tenants.find((t) => t.id === currentRoom?.currentTenantId);

  const [monthYear, setMonthYear] = useState('09/2026');
  const [dueDate, setDueDate] = useState('05/10/2026');
  const [oldElectric, setOldElectric] = useState(currentRoom?.electricityIndex || 1420);
  const [newElectric, setNewElectric] = useState((currentRoom?.electricityIndex || 1420) + 125);
  const [oldWater, setOldWater] = useState(currentRoom?.waterIndex || 154);
  const [newWater, setNewWater] = useState((currentRoom?.waterIndex || 154) + 8);
  const [roomRent, setRoomRent] = useState(currentRoom?.price || 4800000);
  const [internet, setInternet] = useState(config.internetPrice);
  const [garbage, setGarbage] = useState(config.garbagePrice);

  const electricUsage = Math.max(0, newElectric - oldElectric);
  const waterUsage = Math.max(0, newWater - oldWater);

  const electricAmount = electricUsage * config.electricPrice;
  const waterAmount = waterUsage * config.waterPrice;
  const totalAmount = roomRent + electricAmount + waterAmount + internet + garbage;

  const handleRoomChange = (roomId: string) => {
    setSelectedRoomId(roomId);
    const rm = rooms.find((r) => r.id === roomId);
    if (rm) {
      setOldElectric(rm.electricityIndex);
      setNewElectric(rm.electricityIndex + 120);
      setOldWater(rm.waterIndex);
      setNewWater(rm.waterIndex + 7);
      setRoomRent(rm.price);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRoom) return;

    const newInvoice: Invoice = {
      id: `inv-${Date.now()}`,
      invoiceCode: `HD-0926-${currentRoom.roomNumber.replace('P.', '')}`,
      monthYear,
      roomId: currentRoom.id,
      roomNumber: currentRoom.roomNumber,
      tenantName: currentTenant?.name || 'Khách thuê phòng',
      tenantPhone: currentTenant?.phone || '0900000000',
      createdAt: new Date().toLocaleDateString('vi-VN'),
      dueDate,
      status: 'unpaid',
      items: [
        {
          name: `Tiền thuê phòng tháng ${monthYear}`,
          unit: 'Tháng',
          quantity: 1,
          unitPrice: roomRent,
          amount: roomRent,
        },
        {
          name: 'Tiền điện sinh hoạt',
          unit: 'kWh',
          oldIndex: oldElectric,
          newIndex: newElectric,
          quantity: electricUsage,
          unitPrice: config.electricPrice,
          amount: electricAmount,
        },
        {
          name: 'Tiền nước sinh hoạt',
          unit: 'm³',
          oldIndex: oldWater,
          newIndex: newWater,
          quantity: waterUsage,
          unitPrice: config.waterPrice,
          amount: waterAmount,
        },
        {
          name: 'Internet cáp quang',
          unit: 'Phòng',
          quantity: 1,
          unitPrice: internet,
          amount: internet,
        },
        {
          name: 'Phí vệ sinh & quản lý tòa nhà',
          unit: 'Phòng',
          quantity: 1,
          unitPrice: garbage,
          amount: garbage,
        },
      ],
      totalAmount,
      paidAmount: 0,
    };

    onCreateInvoice(newInvoice);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 my-8">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-bold text-slate-900">Lập Hóa Đơn Tiền Phòng Mới</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Chọn phòng xuất hóa đơn</label>
            <select
              value={selectedRoomId}
              onChange={(e) => handleRoomChange(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
            >
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.roomNumber} ({r.price.toLocaleString('vi-VN')} đ) - {r.status === 'rented' ? 'Đang thuê' : r.status}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Kỳ hóa đơn</label>
              <input
                type="text"
                value={monthYear}
                onChange={(e) => setMonthYear(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Hạn thanh toán</label>
              <input
                type="text"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium"
              />
            </div>
          </div>

          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
            <span className="font-bold text-amber-900 block">Số Điện (kWh) - Đơn giá 3.800 đ</span>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-slate-500 text-[10px]">Chỉ số cũ</label>
                <input
                  type="number"
                  value={oldElectric}
                  onChange={(e) => setOldElectric(Number(e.target.value))}
                  className="w-full bg-white border border-amber-300 rounded px-2 py-1 font-bold"
                />
              </div>
              <div>
                <label className="text-slate-500 text-[10px]">Chỉ số mới</label>
                <input
                  type="number"
                  value={newElectric}
                  onChange={(e) => setNewElectric(Number(e.target.value))}
                  className="w-full bg-white border border-amber-300 rounded px-2 py-1 font-bold text-emerald-700"
                />
              </div>
              <div>
                <label className="text-slate-500 text-[10px]">Tiêu thụ</label>
                <div className="py-1 font-bold text-amber-800">{electricUsage} kWh</div>
              </div>
            </div>
          </div>

          <div className="p-3 bg-sky-50/70 border border-sky-200 rounded-xl space-y-2">
            <span className="font-bold text-sky-900 block">Số Nước (m³) - Đơn giá 28.000 đ</span>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-slate-500 text-[10px]">Chỉ số cũ</label>
                <input
                  type="number"
                  value={oldWater}
                  onChange={(e) => setOldWater(Number(e.target.value))}
                  className="w-full bg-white border border-sky-300 rounded px-2 py-1 font-bold"
                />
              </div>
              <div>
                <label className="text-slate-500 text-[10px]">Chỉ số mới</label>
                <input
                  type="number"
                  value={newWater}
                  onChange={(e) => setNewWater(Number(e.target.value))}
                  className="w-full bg-white border border-sky-300 rounded px-2 py-1 font-bold text-emerald-700"
                />
              </div>
              <div>
                <label className="text-slate-500 text-[10px]">Tiêu thụ</label>
                <div className="py-1 font-bold text-sky-800">{waterUsage} m³</div>
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <span className="font-bold text-slate-800">TỔNG TIỀN PHẢI THU:</span>
            <span className="text-base font-extrabold text-emerald-700">
              {totalAmount.toLocaleString('vi-VN')} đ
            </span>
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
            >
              Hủy
            </button>
            <button
              type="submit"
              id="btn-confirm-create-invoice"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold"
            >
              Phát Hành Hóa Đơn & Tạo VietQR
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

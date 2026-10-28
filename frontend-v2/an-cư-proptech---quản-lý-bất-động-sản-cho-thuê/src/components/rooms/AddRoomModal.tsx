import React, { useState } from 'react';
import { X, Home } from 'lucide-react';
import { NewRoom, Building } from '@/types';

interface AddRoomModalProps {
  initialPropertyId?: string;
  buildings: Building[];
  onClose: () => void;
  onAddRoom: (room: NewRoom) => Promise<void>;
}

export const AddRoomModal: React.FC<AddRoomModalProps> = ({ buildings, onClose, onAddRoom, initialPropertyId }) => {
  const [propertyId, setPropertyId] = useState(buildings.find(p => p.id === initialPropertyId)?.id ?? buildings[0]?.id ?? '');
  const [title, setTitle] = useState('');
  const [publish, setPublish] = useState(false);
  const selectedProperty = buildings.find(p => p.id === propertyId);
  const [roomNumber, setRoomNumber] = useState('P.303');
  const [floor, setFloor] = useState('3');
  const [area, setArea] = useState('28');
  const [price, setPrice] = useState('5000000');
  const [deposit, setDeposit] = useState('5000000');
  const [electric, setElectric] = useState('');
  const [water, setWater] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setSaveError('');
    if (!roomNumber.trim()) {
      setSaveError('Vui lòng nhập mã / số phòng.');
      return;
    }
    const newRoom: NewRoom = {
      roomNumber: roomNumber.trim(),
      title: title.trim() || `Căn hộ ${roomNumber.trim()}`,
      buildingId: propertyId,
      publicationStatus: publish ? 'PUBLISHED' : 'DRAFT',
      floor: Number(floor),
      area: Number(area),
      price: Number(price),
      status: 'available',
      deposit: Number(deposit),
      electricityIndex: electric.trim() === '' ? null : Number(electric),
      waterIndex: water.trim() === '' ? null : Number(water),
      amenities: ['Máy lạnh', 'Tủ lạnh', 'Bình nóng lạnh', 'Gác lửng cao cấp'],
      maxOccupants: 2,
    };
    setIsSaving(true);
    try {
      await onAddRoom(newRoom);
      onClose();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Không thể lưu phòng. Vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Home className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-bold text-slate-900">Thêm Phòng Cho Thuê Mới</h3>
          </div>
          <button onClick={onClose} disabled={isSaving} aria-label="Đóng" className="text-slate-400 hover:text-slate-700 disabled:opacity-50">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3 text-xs">
          {saveError && (
            <p role="alert" className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-rose-700">
              {saveError}
            </p>
          )}
          <fieldset disabled={isSaving} className="space-y-3 disabled:opacity-60">
            <div><label htmlFor="new-apartment-property" className="font-semibold text-slate-700 block mb-1">Tài sản / Tòa nhà *</label>
              <select id="new-apartment-property" required value={propertyId} onChange={e => { setPropertyId(e.target.value); setPublish(false); }} className="w-full border border-slate-300 rounded-lg px-3 py-2">
                <option value="">Chọn tài sản</option>
                {buildings.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div><label htmlFor="new-apartment-title" className="font-semibold text-slate-700 block mb-1">Tên căn hộ</label>
              <input id="new-apartment-title" maxLength={150} value={title} onChange={e => setTitle(e.target.value)} placeholder="Căn hộ có ban công..." className="w-full border border-slate-300 rounded-lg px-3 py-2" />
            </div>
            <label className="flex items-center gap-2"><input type="checkbox" checked={publish} disabled={selectedProperty?.legalStatus !== 'APPROVED'} onChange={e => setPublish(e.target.checked)} />Đăng công khai trên Home</label>
            <p className="text-slate-500">{selectedProperty?.legalStatus === 'APPROVED' ? 'Bỏ chọn để lưu bản nháp.' : 'Tài sản chưa được duyệt. Căn hộ sẽ được lưu bản nháp.'}</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Mã / Số phòng *</label>
                <input
                  type="text"
                  required
                  maxLength={20}
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  placeholder="P.303"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Tầng *</label>
                <input
                  type="number"
                  required
                  value={floor}
                  onChange={(e) => setFloor(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Diện tích (m²)</label>
                <input
                  type="number"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Giá thuê (đ/tháng) *</label>
                <input
                  type="number"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold text-emerald-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Số điện bàn giao đầu</label>
                <input
                  type="number"
                  value={electric}
                  min={0}
                  onChange={(e) => setElectric(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Số nước bàn giao đầu</label>
                <input
                  type="number"
                  value={water}
                  min={0}
                  onChange={(e) => setWater(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                />
              </div>
            </div>
          </fieldset>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-xs disabled:opacity-50"
            >
              {isSaving ? 'Đang lưu...' : 'Thêm Phòng'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

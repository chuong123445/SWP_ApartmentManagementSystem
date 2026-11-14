import {PropertyImagesField} from '@/components/property/PropertyImagesField';
import {uploadPropertyImages} from '@/services/property/propertyImageService';
import {Link} from 'react-router';
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
  const [photos,setPhotos]=useState<File[]>([]);const [electricityPrice,setElectricityPrice]=useState('');const [waterPrice,setWaterPrice]=useState('');
  const selectedProperty = buildings.find(p => p.id === propertyId);
  const [roomNumber, setRoomNumber] = useState('');
  const [floor, setFloor] = useState('3');
  const [area, setArea] = useState('28');
  const [price, setPrice] = useState('5000000');
  const [deposit, setDeposit] = useState('');
  const [electric, setElectric] = useState('');
  const [water, setWater] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setSaveError('');
    if(!selectedProperty||selectedProperty.legalStatus!=='APPROVED'){setSaveError('Chọn tài sản đã duyệt để bổ sung phòng.');return;}
    if(!photos.length){setSaveError('Cần ít nhất một ảnh riêng cho phòng.');return;}
    if (!roomNumber.trim()) {
      setSaveError('Vui lòng nhập mã / số phòng.');
      return;
    }
    const newRoom: NewRoom = {
      roomNumber: roomNumber.trim(),
      title: title.trim() || `Căn hộ ${roomNumber.trim()}`,
      buildingId: propertyId,
      publicationStatus: 'DRAFT',
      floor: Number(floor),
      area: Number(area),
      price: Number(price),
      status: 'available',
      deposit: deposit.trim()===''?undefined:Number(deposit),
      electricityIndex: electric.trim() === '' ? null : Number(electric),
      waterIndex: water.trim() === '' ? null : Number(water),
      amenities: [],
      electricityUnitPrice:electricityPrice,waterUnitPrice:waterPrice,
      maxOccupants: 2,
    };
    setIsSaving(true);
    try {
      newRoom.imageIds=await uploadPropertyImages(photos);
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
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[92dvh] overflow-y-auto p-6 shadow-2xl animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Home className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-bold text-slate-900">Thêm Phòng Cho Thuê Mới</h3>
          </div>
          <button onClick={onClose} disabled={isSaving} aria-label="Đóng" className="text-slate-400 hover:text-slate-700 disabled:opacity-50">
            <X className="w-4 h-4" />
          </button>
        </div>

        {!buildings.length&&<p className="mt-4 text-sm">Cần tài sản nhiều phòng đã duyệt để bổ sung phòng thủ công. <Link to="/account/properties" className="underline">Mở quản lý tài sản và bổ sung từ nguồn Auth0 nếu có.</Link></p>}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3 text-xs">
          {saveError && (
            <p role="alert" className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-rose-700">
              {saveError}
            </p>
          )}
          <fieldset disabled={isSaving||!buildings.length} className="space-y-3 disabled:opacity-60">
            <div><label htmlFor="new-apartment-property" className="font-semibold text-slate-700 block mb-1">Tài sản / Tòa nhà *</label>
              <select id="new-apartment-property" required value={propertyId} onChange={e => { setPropertyId(e.target.value); }} className="w-full border border-slate-300 rounded-lg px-3 py-2">
                <option value="">Chọn tài sản</option>
                {buildings.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div><label htmlFor="new-apartment-title" className="font-semibold text-slate-700 block mb-1">Tên căn hộ</label>
              <input id="new-apartment-title" maxLength={150} value={title} onChange={e => setTitle(e.target.value)} placeholder="Căn hộ có ban công..." className="w-full border border-slate-300 rounded-lg px-3 py-2" />
            </div>
            <p className="text-slate-500">Phòng mới được lưu nháp. Kiểm tra thông tin và công khai trong trang chi tiết phòng.</p>
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
            <label className="block">Đơn giá điện (đ/kWh) *<input type="number" required min="0" step="0.01" value={electricityPrice} onChange={e=>setElectricityPrice(e.target.value)} className="block w-full border rounded-lg px-3 py-2"/></label>
            <label className="block">Đơn giá nước (đ/m³) *<input type="number" required min="0" step="0.01" value={waterPrice} onChange={e=>setWaterPrice(e.target.value)} className="block w-full border rounded-lg px-3 py-2"/></label>
            <label className="block">Cọc thỏa thuận (đ)<input type="number" min="0" step="0.01" value={deposit} onChange={e=>setDeposit(e.target.value)} className="block w-full border rounded-lg px-3 py-2"/></label>
            <p>Tiền cọc do hai bên quản lý ngoài hệ thống. Để trống nếu chưa thỏa thuận.</p>
            <PropertyImagesField unit files={photos} onChange={setPhotos} disabled={isSaving}/>
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
              disabled={isSaving||!buildings.length}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-bold shadow-xs disabled:opacity-50"
            >
              {isSaving ? 'Đang lưu...' : 'Thêm Phòng'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

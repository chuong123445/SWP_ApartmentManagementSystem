import React, { useState } from 'react';
import {
  X,
  FileEdit,
  AlertTriangle,
  CheckCircle2,
  Zap,
  Droplets,
  DollarSign,
  Maximize2,
  Layers,
  Users,
  Bed,
  Bath,
  ShieldAlert,
  Clock,
  Sparkles,
} from 'lucide-react';
import type { Room } from '@/types';
import type { ApartmentBasicUpdatePayload, ApartmentSensitiveUpdatePayload } from '@/services/apartments/ownerApartmentService';

interface EditRoomModalProps {
  room: Room;
  onClose: () => void;
  onUpdateBasic: (roomId: string, payload: ApartmentBasicUpdatePayload) => Promise<Room>;
  onUpdateSensitive: (roomId: string, payload: ApartmentSensitiveUpdatePayload) => Promise<Room>;
}

const COMMON_AMENITIES = [
  'Máy lạnh',
  'Tủ lạnh',
  'Máy giặt',
  'Bếp riêng',
  'Nóng lạnh',
  'Giường nệm',
  'Tủ quần áo',
  'Ban công',
  'Smart TV',
  'Bàn làm việc',
  'Wifi tốc độ cao',
  'Khóa vân tay',
];

export const EditRoomModal: React.FC<EditRoomModalProps> = ({
  room,
  onClose,
  onUpdateBasic,
  onUpdateSensitive,
}) => {
  const [activeTab, setActiveTab] = useState<'basic' | 'sensitive'>('basic');

  // Basic fields state
  const [title, setTitle] = useState(room.title || `Căn hộ ${room.roomNumber}`);
  const [description, setDescription] = useState(room.description || '');
  const [floor, setFloor] = useState<number>(room.floor);
  const [maxOccupants, setMaxOccupants] = useState<number>(room.maxOccupants || 2);
  const [bedrooms, setBedrooms] = useState<number>(room.bedrooms ?? 1);
  const [bathrooms, setBathrooms] = useState<number>(room.bathrooms ?? 1);
  const [amenities, setAmenities] = useState<string[]>(room.amenities || []);
  const [customAmenity, setCustomAmenity] = useState('');

  // Sensitive fields state
  const [price, setPrice] = useState<string>(room.price ? String(room.price) : '');
  const [deposit, setDeposit] = useState<string>(room.deposit !== undefined ? String(room.deposit) : '');
  const [area, setArea] = useState<string>(room.area ? String(room.area) : '');
  const [electricIndex, setElectricIndex] = useState<string>(
    room.electricityIndex !== undefined ? String(room.electricityIndex) : '0'
  );
  const [waterIndex, setWaterIndex] = useState<string>(
    room.waterIndex !== undefined ? String(room.waterIndex) : '0'
  );

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const isApprovedProperty = room.propertyApprovalStatus === 'APPROVED';
  const hasPendingEdit = room.editApprovalStatus === 'PENDING' && !!room.pendingEdit;

  const toggleAmenity = (name: string) => {
    if (amenities.includes(name)) {
      setAmenities(amenities.filter((a) => a !== name));
    } else {
      setAmenities([...amenities, name]);
    }
  };

  const handleAddCustomAmenity = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customAmenity.trim();
    if (trimmed && !amenities.includes(trimmed)) {
      setAmenities([...amenities, trimmed]);
      setCustomAmenity('');
    }
  };

  const handleSaveBasic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (room.version === undefined) {
      setErrorMsg('Thiếu phiên bản dữ liệu. Vui lòng đóng modal và tải lại.');
      return;
    }
    if (!title.trim()) {
      setErrorMsg('Vui lòng nhập tiêu đề căn hộ.');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await onUpdateBasic(room.id, {
        title: title.trim(),
        description: description.trim(),
        floor: Number(floor),
        maxOccupants: Number(maxOccupants),
        bedrooms: Number(bedrooms),
        bathrooms: Number(bathrooms),
        amenities,
        version: room.version,
      });
      setSuccessMsg('Đã cập nhật thông tin cơ bản thành công!');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Lỗi khi cập nhật thông tin cơ bản.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSensitive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (room.version === undefined) {
      setErrorMsg('Thiếu phiên bản dữ liệu. Vui lòng đóng modal và tải lại.');
      return;
    }
    if (!price || Number(price) <= 0) {
      setErrorMsg('Vui lòng nhập giá thuê hợp lệ lớn hơn 0.');
      return;
    }
    if (!area || Number(area) <= 0) {
      setErrorMsg('Vui lòng nhập diện tích hợp lệ lớn hơn 0.');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await onUpdateSensitive(room.id, {
        advertisedMonthlyRent: price.trim(),
        deposit: deposit ? deposit.trim() : null,
        areaM2: area.trim(),
        electricityIndex: electricIndex !== '' ? Number(electricIndex) : null,
        waterIndex: waterIndex !== '' ? Number(waterIndex) : null,
        version: room.version,
      });

      if (isApprovedProperty) {
        setSuccessMsg(
          'Đã gửi yêu cầu chỉnh sửa thông tin nhạy cảm. Quản trị viên sẽ phê duyệt trước khi cập nhật ra thị trường.'
        );
      } else {
        setSuccessMsg('Đã cập nhật giá thuê và chỉ số thành công!');
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Lỗi khi cập nhật thông tin nhạy cảm.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <FileEdit className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">Chỉnh Sửa Căn Hộ {room.roomNumber}</h3>
                <span className="text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                  v{room.version}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {room.propertyName} • Tầng {room.floor}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 bg-slate-50/70 p-2 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveTab('basic');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'basic'
                ? 'bg-white text-emerald-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>Thông tin cơ bản</span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-1.5 py-0.2 rounded-full">
              Áp dụng ngay
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('sensitive');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'sensitive'
                ? 'bg-white text-emerald-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <DollarSign className="w-4 h-4 text-amber-600" />
            <span>Giá & Công tơ</span>
            {isApprovedProperty && (
              <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-1.5 py-0.2 rounded-full flex items-center gap-0.5">
                <ShieldAlert className="w-3 h-3" /> Duyệt lại
              </span>
            )}
          </button>
        </div>

        {/* Messages */}
        <div className="px-6 pt-4 shrink-0">
          {errorMsg && (
            <div
              role="alert"
              className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div
              role="status"
              className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {activeTab === 'basic' ? (
            /* TAB 1: BASIC INFO FORM */
            <form id="form-edit-basic" onSubmit={handleSaveBasic} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Tiêu đề căn hộ *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ví dụ: Căn hộ Studio view thoáng ban công"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Mô tả chi tiết</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Mô tả không gian, nội thất, quy định giờ giấc..."
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500 font-medium resize-none"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-slate-400" /> Tầng
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={200}
                    value={floor}
                    onChange={(e) => setFloor(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500 font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-slate-400" /> Tối đa người
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={maxOccupants}
                    onChange={(e) => setMaxOccupants(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500 font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Bed className="w-3.5 h-3.5 text-slate-400" /> Phòng ngủ
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={bedrooms}
                    onChange={(e) => setBedrooms(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500 font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Bath className="w-3.5 h-3.5 text-slate-400" /> Phòng tắm
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={bathrooms}
                    onChange={(e) => setBathrooms(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500 font-medium"
                  />
                </div>
              </div>

              {/* Amenities list */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-700">Tiện ích căn hộ</label>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_AMENITIES.map((name) => {
                    const checked = amenities.includes(name);
                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() => toggleAmenity(name)}
                        className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all ${
                          checked
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {checked ? '✓ ' : '+ '}
                        {name}
                      </button>
                    );
                  })}
                </div>

                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    value={customAmenity}
                    onChange={(e) => setCustomAmenity(e.target.value)}
                    placeholder="Thêm tiện ích khác..."
                    className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomAmenity}
                    className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-700"
                  >
                    Thêm
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* TAB 2: SENSITIVE INFO FORM */
            <form id="form-edit-sensitive" onSubmit={handleSaveSensitive} className="space-y-4">
              {isApprovedProperty && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-amber-950">
                    <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>Lưu ý xét duyệt thông tin nhạy cảm:</span>
                  </div>
                  <p className="text-amber-800 leading-relaxed">
                    Tài sản này đã được cấp phép đăng bài (`APPROVED`). Để bảo đảm tính minh bạch về giá cả, việc thay
                    đổi <strong>giá thuê, tiền cọc, chỉ số điện nước cơ sở hoặc diện tích</strong> sẽ cần Admin phê duyệt
                    lại trước khi cập nhật ra thị trường.
                  </p>
                </div>
              )}

              {hasPendingEdit && room.pendingEdit && (
                <div className="p-3.5 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-950 space-y-2">
                  <div className="font-bold flex items-center gap-1.5 text-sky-900">
                    <Clock className="w-4 h-4 text-sky-700 shrink-0" />
                    <span>Bản nháp đang chờ Admin xét duyệt:</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] bg-white p-2.5 rounded-lg border border-sky-100">
                    <div>
                      Giá đề xuất:{' '}
                      <strong className="text-emerald-700">
                        {Number(room.pendingEdit.advertisedMonthlyRent).toLocaleString('vi-VN')} đ
                      </strong>
                    </div>
                    <div>
                      Cọc:{' '}
                      <strong>
                        {room.pendingEdit.deposit
                          ? `${Number(room.pendingEdit.deposit).toLocaleString('vi-VN')} đ`
                          : 'Không'}
                      </strong>
                    </div>
                    <div>
                      Diện tích: <strong>{room.pendingEdit.areaM2} m²</strong>
                    </div>
                    <div>
                      Chỉ số điện: <strong>{room.pendingEdit.electricityIndex ?? 'Chưa có'} kWh</strong>
                    </div>
                    <div>
                      Chỉ số nước: <strong>{room.pendingEdit.waterIndex ?? 'Chưa có'} m³</strong>
                    </div>
                    <div>
                      Gửi lúc: <strong>{new Date(room.pendingEdit.requestedAt).toLocaleTimeString('vi-VN')}</strong>
                    </div>
                  </div>
                  <p className="text-[11px] text-sky-700">
                    * Bạn có thể lưu đè thông tin mới nếu muốn thay đổi bản nháp đang chờ duyệt.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Giá thuê tháng (VNĐ) *
                  </label>
                  <input
                    type="number"
                    required
                    min={100000}
                    step={50000}
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="Ví dụ: 4500000"
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500 font-bold text-emerald-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-slate-400" /> Tiền đặt cọc (VNĐ)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={50000}
                    value={deposit}
                    onChange={(e) => setDeposit(e.target.value)}
                    placeholder="Mặc định bằng 1 tháng tiền thuê"
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500 font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Maximize2 className="w-3.5 h-3.5 text-slate-400" /> Diện tích (m²) *
                </label>
                <input
                  type="number"
                  required
                  min={5}
                  max={500}
                  step={0.5}
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="Ví dụ: 30"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-amber-500" /> Chỉ số điện ban đầu (kWh)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={electricIndex}
                    onChange={(e) => setElectricIndex(e.target.value)}
                    placeholder="0"
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500 font-medium"
                  />
                  <p className="text-[10px] text-slate-400">Dùng làm mốc cơ sở tính tiền điện cho kỳ đầu tiên.</p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Droplets className="w-3.5 h-3.5 text-sky-500" /> Chỉ số nước ban đầu (m³)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={waterIndex}
                    onChange={(e) => setWaterIndex(e.target.value)}
                    placeholder="0"
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500 font-medium"
                  />
                  <p className="text-[10px] text-slate-400">Dùng làm mốc cơ sở tính tiền nước cho kỳ đầu tiên.</p>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
          >
            Đóng
          </button>

          {activeTab === 'basic' ? (
            <button
              type="submit"
              form="form-edit-basic"
              disabled={saving}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {saving ? 'Đang lưu...' : 'Lưu thông tin cơ bản'}
            </button>
          ) : (
            <button
              type="submit"
              form="form-edit-sensitive"
              disabled={saving}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {saving ? 'Đang gửi...' : isApprovedProperty ? 'Gửi yêu cầu xét duyệt' : 'Lưu thông tin tài chính'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

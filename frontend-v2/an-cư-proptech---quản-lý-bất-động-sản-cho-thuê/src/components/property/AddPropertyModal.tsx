import { useEffect, useRef, useState, type FormEvent } from 'react';
import { X, Plus, Trash2, Home, Building2 } from 'lucide-react';
import type { PropertyCreateInput, RentalMode } from '@/types/property';

const fieldClass = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors';
const blankUnit = (defaultFloor = '1') => ({
  key: crypto.randomUUID(),
  roomNumber: '',
  title: '',
  floor: defaultFloor,
  area: '',
  rent: '',
  deposit: '',
  bedrooms: '',
  bathrooms: '',
  maxOccupants: '',
  electric: '',
  water: '',
  description: '',
});
type Unit = ReturnType<typeof blankUnit>;

export function AddPropertyModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (input: PropertyCreateInput) => Promise<void>;
}) {
  const [mode, setMode] = useState<RentalMode>('SINGLE_UNIT');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [ward, setWard] = useState('');
  const [units, setUnits] = useState<Unit[]>(() => [blankUnit('1')]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.querySelector<HTMLInputElement>('input')?.focus();
    return () => {
      previous?.focus();
    };
  }, []);

  const shownUnits = mode === 'SINGLE_UNIT' ? units.slice(0, 1) : units;
  const update = (key: string, field: keyof Unit, value: string) =>
    setUnits((prev) => prev.map((u) => (u.key === key ? { ...u, [field]: value } : u)));
  const optionalNumber = (text: string) => (text.trim() === '' ? null : Number(text));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setError('');

    const effectiveUnits = shownUnits.map((u) => {
      const roomNum = u.roomNumber.trim() || (mode === 'SINGLE_UNIT' ? 'Nguyên căn' : '');
      const unitTitle =
        u.title.trim() || (mode === 'SINGLE_UNIT' ? name.trim() : `${name.trim()} - ${roomNum}`);
      return {
        roomNumber: roomNum,
        title: unitTitle,
        description: u.description.trim(),
        floor: Number(u.floor) || (mode === 'SINGLE_UNIT' ? 1 : 0),
        areaM2: u.area,
        advertisedMonthlyRent: u.rent,
        deposit: u.deposit || null,
        bedrooms: optionalNumber(u.bedrooms),
        bathrooms: optionalNumber(u.bathrooms),
        maxOccupants: optionalNumber(u.maxOccupants),
        electricityIndex: optionalNumber(u.electric),
        waterIndex: optionalNumber(u.water),
        amenities: [],
      };
    });

    const numbers = effectiveUnits.map((u) => u.roomNumber.trim().toLocaleLowerCase());
    if (new Set(numbers).size !== numbers.length) {
      setError('Mã căn/phòng bị trùng trong tài sản.');
      return;
    }

    setSaving(true);
    try {
      await onCreate({
        name: name.trim(),
        address: address.trim(),
        city: city.trim(),
        district: '', // Đã bỏ cấp quận/huyện
        ward: ward.trim() || null,
        rentalMode: mode,
        apartments: effectiveUnits,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể lưu tài sản. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-3 md:p-6 backdrop-blur-xs">
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-property-title"
        className="bg-white rounded-2xl w-full max-w-3xl max-h-[92dvh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        onKeyDown={(event) => {
          if (event.key === 'Escape' && !saving) onClose();
          if (event.key === 'Tab') {
            const focusable = dialog.current?.querySelectorAll<HTMLElement>(
              'button:not(:disabled),input:not(:disabled),textarea:not(:disabled)'
            );
            if (!focusable?.length) return;
            const first = focusable[0],
              last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last.focus();
            }
            if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first.focus();
            }
          }
        }}
      >
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 id="add-property-title" className="text-lg font-bold text-slate-900">
              Thêm tài sản cho thuê
            </h2>
            <p className="text-xs text-slate-500">
              Khởi tạo hồ sơ tài sản và căn/nhà cho thuê để gửi kiểm duyệt
            </p>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            aria-label="Đóng form tài sản"
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-5">
          <fieldset disabled={saving} className="space-y-5 disabled:opacity-60">
            {/* Cách cho thuê */}
            <fieldset className="space-y-2">
              <legend className="text-sm font-bold text-slate-900">Hình thức cho thuê *</legend>
              <div className="grid sm:grid-cols-2 gap-3">
                <label
                  className={`flex items-start gap-3 border rounded-xl p-3.5 text-sm cursor-pointer transition-all ${
                    mode === 'SINGLE_UNIT'
                      ? 'border-emerald-600 bg-emerald-50/70 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="rental-mode"
                    value="SINGLE_UNIT"
                    checked={mode === 'SINGLE_UNIT'}
                    onChange={() => {
                      setMode('SINGLE_UNIT');
                      setError('');
                    }}
                    className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                      <Home className="w-4 h-4 text-emerald-600" />
                      Một căn / Nhà cho thuê nguyên căn
                    </span>
                    <p className="text-xs text-slate-500 mt-1">
                      Cho thuê độc lập toàn bộ căn nhà hoặc một căn hộ riêng biệt. Không cần quản lý cả tòa nhà.
                    </p>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-3 border rounded-xl p-3.5 text-sm cursor-pointer transition-all ${
                    mode === 'MULTI_UNIT'
                      ? 'border-emerald-600 bg-emerald-50/70 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="rental-mode"
                    value="MULTI_UNIT"
                    checked={mode === 'MULTI_UNIT'}
                    onChange={() => {
                      setMode('MULTI_UNIT');
                      setError('');
                    }}
                    className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-emerald-600" />
                      Tài sản gồm nhiều căn / phòng
                    </span>
                    <p className="text-xs text-slate-500 mt-1">
                      Tòa nhà căn hộ dịch vụ, chung cư mini, dãy nhà trọ gồm nhiều phòng cho thuê riêng rẽ.
                    </p>
                  </div>
                </label>
              </div>
            </fieldset>

            {/* Thông tin địa chỉ */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Địa chỉ & Định danh tài sản</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="sm:col-span-2 text-xs font-semibold text-slate-700">
                  {mode === 'SINGLE_UNIT'
                    ? 'Tên căn nhà / Tên tài sản *'
                    : 'Tên tài sản (Tòa nhà / Khu trọ) *'}
                  <input
                    required
                    maxLength={150}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={fieldClass}
                    placeholder={
                      mode === 'SINGLE_UNIT'
                        ? 'Ví dụ: Nhà riêng 3 tầng ngõ 45 Hoàng Quốc Việt'
                        : 'Ví dụ: Tòa nhà An Cư Xô Viết Nghệ Tĩnh / Chung cư mini A'
                    }
                  />
                </label>

                <label className="text-xs font-semibold text-slate-700">
                  Tỉnh / Thành phố *
                  <input
                    required
                    maxLength={80}
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className={fieldClass}
                    placeholder="Ví dụ: TP. Hồ Chí Minh, Hà Nội, Đà Nẵng..."
                  />
                </label>

                <label className="text-xs font-semibold text-slate-700">
                  Phường / Xã / Thị trấn *
                  <input
                    required
                    maxLength={80}
                    value={ward}
                    onChange={(e) => setWard(e.target.value)}
                    className={fieldClass}
                    placeholder="Ví dụ: Phường Bến Nghé, Xã An Khánh..."
                  />
                </label>

                <label className="sm:col-span-2 text-xs font-semibold text-slate-700">
                  Địa chỉ cụ thể (Số nhà, ngõ/ngách, tên đường...) *
                  <input
                    required
                    maxLength={300}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className={fieldClass}
                    placeholder="Ví dụ: Số 12 ngõ 45 đường Hoàng Quốc Việt"
                  />
                </label>
              </div>
            </div>

            {/* Thông tin căn / nhà cho thuê */}
            {shownUnits.map((u, index) => (
              <fieldset
                key={u.key}
                data-testid="property-unit-form"
                className="border border-slate-200 rounded-xl p-4.5 space-y-3.5 bg-slate-50/30 min-w-0"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <legend className="font-bold text-sm text-slate-900 px-1">
                    {mode === 'SINGLE_UNIT'
                      ? 'Thông tin nhà cho thuê nguyên căn'
                      : `Thông tin Căn / Phòng ${index + 1}`}
                  </legend>
                  {mode === 'SINGLE_UNIT' && (
                    <span className="text-xs bg-emerald-100 text-emerald-800 font-medium px-2 py-0.5 rounded-full">
                      Cho thuê trọn gói nguyên căn
                    </span>
                  )}
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  {/* Tiêu đề tin đăng */}
                  <label className="sm:col-span-2 text-xs font-semibold text-slate-700">
                    Tiêu đề tin cho thuê (tùy chọn)
                    <input
                      maxLength={150}
                      value={u.title}
                      onChange={(e) => update(u.key, 'title', e.target.value)}
                      className={fieldClass}
                      placeholder={
                        mode === 'SINGLE_UNIT'
                          ? `Ví dụ: Cho thuê nhà nguyên căn 3 tầng ngõ ô tô, đầy đủ tiện nghi (để trống sẽ lấy tên nhà)`
                          : `Ví dụ: Phòng Studio có ban công thoáng mát (để trống sẽ tự sinh)`
                      }
                    />
                  </label>

                  {/* Mã phòng / Mã quản lý */}
                  {mode === 'MULTI_UNIT' ? (
                    <label className="text-xs font-semibold text-slate-700">
                      Mã căn/phòng *
                      <input
                        required
                        maxLength={20}
                        value={u.roomNumber}
                        onChange={(e) => update(u.key, 'roomNumber', e.target.value)}
                        className={fieldClass}
                        placeholder="Ví dụ: P.101 / A.1205"
                      />
                    </label>
                  ) : (
                    <label className="text-xs font-semibold text-slate-700">
                      Mã quản lý nội bộ (tùy chọn)
                      <input
                        maxLength={20}
                        value={u.roomNumber}
                        onChange={(e) => update(u.key, 'roomNumber', e.target.value)}
                        className={fieldClass}
                        placeholder="Mặc định: Nguyên căn"
                      />
                    </label>
                  )}

                  {/* Số tầng / Vị trí tầng */}
                  <label className="text-xs font-semibold text-slate-700">
                    {mode === 'SINGLE_UNIT' ? 'Số tầng của căn nhà *' : 'Tầng (vị trí phòng) *'}
                    <input
                      required
                      type="number"
                      min={mode === 'SINGLE_UNIT' ? 1 : 0}
                      max={200}
                      step={1}
                      value={u.floor}
                      onChange={(e) => update(u.key, 'floor', e.target.value)}
                      className={fieldClass}
                      placeholder={
                        mode === 'SINGLE_UNIT'
                          ? 'Ví dụ: 1 (nhà cấp 4/trệt), 2, 3 tầng...'
                          : '0: Tầng trệt, 1: Tầng 1...'
                      }
                    />
                  </label>

                  {/* Diện tích */}
                  <label className="text-xs font-semibold text-slate-700">
                    {mode === 'SINGLE_UNIT'
                      ? 'Diện tích sử dụng (m²) *'
                      : 'Diện tích phòng (m²) *'}
                    <input
                      required
                      type="number"
                      min="0.01"
                      max="9999999999.99"
                      step="0.01"
                      value={u.area}
                      onChange={(e) => update(u.key, 'area', e.target.value)}
                      className={fieldClass}
                      placeholder="Ví dụ: 120"
                    />
                  </label>

                  {/* Giá thuê */}
                  <label className="text-xs font-semibold text-slate-700">
                    {mode === 'SINGLE_UNIT'
                      ? 'Giá thuê nguyên căn / tháng (đ) *'
                      : 'Giá thuê / tháng (đ) *'}
                    <input
                      required
                      type="number"
                      min="0.01"
                      max="9999999999999.99"
                      step="0.01"
                      value={u.rent}
                      onChange={(e) => update(u.key, 'rent', e.target.value)}
                      className={fieldClass}
                      placeholder="Ví dụ: 15000000"
                    />
                  </label>

                  {/* Tiền cọc */}
                  <label className="text-xs font-semibold text-slate-700">
                    Tiền đặt cọc (đ)
                    <input
                      type="number"
                      min={0}
                      max="9999999999999.99"
                      step="0.01"
                      value={u.deposit}
                      onChange={(e) => update(u.key, 'deposit', e.target.value)}
                      className={fieldClass}
                      placeholder="Để trống nếu bằng 1 tháng tiền thuê"
                    />
                  </label>

                  {/* Số người tối đa */}
                  <label className="text-xs font-semibold text-slate-700">
                    Số người ở tối đa
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={u.maxOccupants}
                      onChange={(e) => update(u.key, 'maxOccupants', e.target.value)}
                      className={fieldClass}
                      placeholder="Ví dụ: 6"
                    />
                  </label>

                  {/* Phòng ngủ & Phòng tắm */}
                  <label className="text-xs font-semibold text-slate-700">
                    Số phòng ngủ
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={u.bedrooms}
                      onChange={(e) => update(u.key, 'bedrooms', e.target.value)}
                      className={fieldClass}
                      placeholder="Ví dụ: 3"
                    />
                  </label>
                  <label className="text-xs font-semibold text-slate-700">
                    Số phòng tắm / WC
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={u.bathrooms}
                      onChange={(e) => update(u.key, 'bathrooms', e.target.value)}
                      className={fieldClass}
                      placeholder="Ví dụ: 2"
                    />
                  </label>

                  {/* Điện nước ban đầu */}
                  <label className="text-xs font-semibold text-slate-700">
                    Chỉ số điện bàn giao (kWh)
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={u.electric}
                      onChange={(e) => update(u.key, 'electric', e.target.value)}
                      className={fieldClass}
                      placeholder="Chỉ số công tơ ban đầu"
                    />
                  </label>
                  <label className="text-xs font-semibold text-slate-700">
                    Chỉ số nước bàn giao (m³)
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={u.water}
                      onChange={(e) => update(u.key, 'water', e.target.value)}
                      className={fieldClass}
                      placeholder="Chỉ số đồng hồ ban đầu"
                    />
                  </label>

                  {/* Mô tả */}
                  <label className="sm:col-span-2 text-xs font-semibold text-slate-700">
                    {mode === 'SINGLE_UNIT'
                      ? 'Mô tả chi tiết căn nhà'
                      : 'Mô tả chi tiết căn/phòng'}
                    <textarea
                      maxLength={3000}
                      value={u.description}
                      onChange={(e) => update(u.key, 'description', e.target.value)}
                      className={fieldClass}
                      rows={mode === 'SINGLE_UNIT' ? 3 : 2}
                      placeholder={
                        mode === 'SINGLE_UNIT'
                          ? 'Mô tả đặc điểm ngôi nhà: mặt tiền, ngõ ngách ô tô vào được không, sân để xe, nội thất sẵn có, ban công phơi đồ, khu vực dân trí...'
                          : 'Mô tả các trang thiết bị, tiện ích đi kèm...'
                      }
                    />
                  </label>
                </div>

                {mode === 'MULTI_UNIT' && units.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setUnits((prev) => prev.filter((item) => item.key !== u.key))}
                    className="text-xs text-rose-600 hover:text-rose-700 font-semibold inline-flex items-center gap-1 pt-1"
                  >
                    <Trash2 className="w-4 h-4" />
                    Xóa căn/phòng {index + 1}
                  </button>
                )}
              </fieldset>
            ))}

            {mode === 'MULTI_UNIT' && (
              <button
                type="button"
                disabled={units.length >= 50}
                onClick={() => setUnits((prev) => [...prev, blankUnit('0')])}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                Thêm căn/phòng tiếp theo
              </button>
            )}
          </fieldset>

          <p className="text-xs bg-amber-50/80 border border-amber-200/80 text-amber-900 rounded-xl p-3.5 leading-relaxed">
            Tài sản và căn/nhà sẽ được lưu ở trạng thái <strong>Bản nháp</strong>. Sau khi lưu, bạn
            vào mục <strong>Tài sản cho thuê</strong> để tải hồ sơ pháp lý (Sổ đỏ / Sổ hồng / Hợp đồng)
            lên để Ban quản trị Admin phê duyệt trước khi công khai tìm khách thuê.
          </p>

          {error && (
            <p role="alert" className="text-xs text-rose-700 bg-rose-50 border border-rose-200 p-3 rounded-xl font-medium">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg px-4 py-2 text-xs font-semibold transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-5 py-2 font-semibold text-xs shadow-xs disabled:opacity-50 transition-colors"
            >
              {saving ? 'Đang lưu tài sản...' : 'Lưu tài sản nháp'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

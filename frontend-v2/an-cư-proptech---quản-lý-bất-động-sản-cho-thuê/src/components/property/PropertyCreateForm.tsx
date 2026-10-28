import { useState, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { PropertyImagesField } from '@/components/property/PropertyImagesField';
import { uploadPropertyImages } from '@/services/property/propertyImageService';
import type { PropertyCreateInput, RentalMode } from '@/types/property';

const fieldClass = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white';
const blankUnit = () => ({ key: crypto.randomUUID(), roomNumber: '', title: '', floor: '0', area: '', rent: '', deposit: '',
  bedrooms: '', bathrooms: '', maxOccupants: '', electric: '', water: '', electricityPrice: '', waterPrice: '', description: '' });
type Unit = ReturnType<typeof blankUnit>;

export function PropertyCreateForm({ onClose, onCreate }: {
  onClose: () => void; onCreate: (input: PropertyCreateInput) => Promise<void>;
}) {
  const [mode, setMode] = useState<RentalMode>('SINGLE_UNIT');
  const [name, setName] = useState('');const [address, setAddress] = useState('');
  const [city, setCity] = useState('');const [district, setDistrict] = useState('');const [ward, setWard] = useState('');
  const [units, setUnits] = useState<Unit[]>(() => [blankUnit()]);
  const [saving, setSaving] = useState(false);const [error, setError] = useState('');
  const [photos,setPhotos]=useState<File[]>([]);
  const shownUnits = mode === 'SINGLE_UNIT' ? units.slice(0, 1) : units;
  const update = (key: string, field: keyof Unit, value: string) => setUnits(prev => prev.map(u => u.key === key ? { ...u, [field]: value } : u));
  const optionalNumber = (text: string) => text.trim() === '' ? null : Number(text);
  const submit = async (event: FormEvent) => {
    event.preventDefault();if (saving) return;setError('');if(photos.length<1||photos.length>4){setError('Chọn từ 1 đến 4 ảnh tài sản.');return;}
    const numbers = shownUnits.map(u => u.roomNumber.trim().toLocaleLowerCase());
    if (new Set(numbers).size !== numbers.length) { setError('Mã căn/phòng bị trùng trong tài sản.');return; }
    setSaving(true);
    try {
      const imageIds=await uploadPropertyImages(photos);
      await onCreate({ imageIds, name: name.trim(), address: address.trim(), city: city.trim(), district: district.trim(), ward: ward.trim() || null,
        rentalMode: mode, apartments: shownUnits.map(u => ({ roomNumber: u.roomNumber.trim(), title: u.title.trim() || (mode === 'SINGLE_UNIT' ? name.trim() : `${name.trim()} - ${u.roomNumber.trim()}`),
          description: u.description.trim(), floor: Number(u.floor), areaM2: u.area, advertisedMonthlyRent: u.rent,
          electricityUnitPrice: u.electricityPrice || null, waterUnitPrice: u.waterPrice || null, deposit: u.deposit || null, bedrooms: optionalNumber(u.bedrooms), bathrooms: optionalNumber(u.bathrooms),
          maxOccupants: optionalNumber(u.maxOccupants), electricityIndex: optionalNumber(u.electric), waterIndex: optionalNumber(u.water), amenities: [] })) });
    } catch (err) { setError(err instanceof Error ? err.message : 'Không thể lưu tài sản. Vui lòng thử lại.'); }
    finally { setSaving(false); }
  };
  return <section className="bg-white border rounded-2xl w-full min-w-0">
      <div className="flex justify-between items-center px-5 py-4 border-b">
        <h2 id="add-property-title" className="text-lg font-bold">Thêm tài sản cho thuê</h2>
        <button type="button" disabled={saving} onClick={onClose} aria-label="Đóng form tài sản" className="p-2 rounded-lg hover:bg-slate-100">Quay lại chọn vai trò</button>
      </div>
      <form onSubmit={submit} className="p-5 space-y-5">
        <PropertyImagesField files={photos} onChange={setPhotos} disabled={saving}/>
        <fieldset disabled={saving} className="space-y-5 disabled:opacity-60">
          <fieldset className="grid sm:grid-cols-2 gap-3">
            <legend className="font-semibold mb-2">Cách cho thuê</legend>
            {([['SINGLE_UNIT', 'Một căn/nhà cho thuê nguyên căn'], ['MULTI_UNIT', 'Tài sản gồm nhiều căn/phòng']] as const).map(([value, label]) => <label key={value} className={`flex gap-2 border rounded-xl p-3 text-sm cursor-pointer ${mode === value ? 'border-emerald-600 bg-emerald-50' : 'border-slate-200'}`}>
              <input type="radio" name="rental-mode" value={value} checked={mode === value} onChange={() => { setMode(value);setError(''); }} />{label}
            </label>)}
          </fieldset>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="sm:col-span-2 text-sm font-medium">Tên tài sản *<input required maxLength={150} value={name} onChange={e => setName(e.target.value)} className={fieldClass} placeholder={mode === 'SINGLE_UNIT' ? 'Căn A.1205 / Nhà số 12' : 'Nhà trọ An Cư / Tòa A'} /></label>
            <label className="sm:col-span-2 text-sm font-medium">Địa chỉ tài sản *<input required maxLength={300} value={address} onChange={e => setAddress(e.target.value)} className={fieldClass} /></label>
            <label className="text-sm font-medium">Tỉnh/Thành phố *<input required maxLength={80} value={city} onChange={e => setCity(e.target.value)} className={fieldClass} /></label>
            <label className="text-sm font-medium">Quận/Huyện/Khu vực *<input required maxLength={80} value={district} onChange={e => setDistrict(e.target.value)} className={fieldClass} /></label>
            <label className="sm:col-span-2 text-sm font-medium">Phường/Xã<input maxLength={80} value={ward} onChange={e => setWard(e.target.value)} className={fieldClass} /></label>
          </div>
          <p className="text-sm text-slate-500">{mode === 'SINGLE_UNIT' ? 'Thông tin dưới đây dùng cho căn/nhà cho thuê nguyên căn. Bạn không cần sở hữu cả tòa nhà.' : 'Mỗi căn/phòng có giá, trạng thái thuê và công tơ riêng. Bạn có thể bổ sung căn/phòng sau.'}</p>
          {shownUnits.map((u, index) => <fieldset key={u.key} data-testid="property-unit-form" className="border border-slate-200 rounded-xl p-4 space-y-3 min-w-0">
            <legend className="font-semibold px-1">{mode === 'SINGLE_UNIT' ? 'Thông tin căn/nhà cho thuê' : `Căn/Phòng ${index + 1}`}</legend>
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="text-sm">Mã căn/phòng *<input required maxLength={20} value={u.roomNumber} onChange={e => update(u.key, 'roomNumber', e.target.value)} className={fieldClass} placeholder="A.1205 / P.101 / NHA.01" /></label>
              <label className="text-sm">Tầng *<input required type="number" min={0} max={200} step={1} value={u.floor} onChange={e => update(u.key, 'floor', e.target.value)} className={fieldClass} /></label>
              <label className="text-sm">Diện tích (m²) *<input required type="number" min="0.01" max="9999999999.99" step="0.01" value={u.area} onChange={e => update(u.key, 'area', e.target.value)} className={fieldClass} /></label>
              <label className="text-sm">Giá thuê/tháng (đ) *<input required type="number" min="0.01" max="9999999999999.99" step="0.01" value={u.rent} onChange={e => update(u.key, 'rent', e.target.value)} className={fieldClass} /></label>
              <label className="text-sm">Tiền cọc (đ)<input type="number" min={0} max="9999999999999.99" step="0.01" value={u.deposit} onChange={e => update(u.key, 'deposit', e.target.value)} className={fieldClass} /></label>
              <label className="text-sm">Số người tối đa<input type="number" min={1} step={1} value={u.maxOccupants} onChange={e => update(u.key, 'maxOccupants', e.target.value)} className={fieldClass} /></label>
              <label className="text-sm">Số phòng ngủ<input type="number" min={0} step={1} value={u.bedrooms} onChange={e => update(u.key, 'bedrooms', e.target.value)} className={fieldClass} /></label>
              <label className="text-sm">Số phòng tắm<input type="number" min={0} step={1} value={u.bathrooms} onChange={e => update(u.key, 'bathrooms', e.target.value)} className={fieldClass} /></label>
              <label className="text-sm">Đơn giá điện (đ/kWh) *<input required type="number" min="0" max="9999999999999.99" step="0.01" value={u.electricityPrice} onChange={e=>update(u.key,'electricityPrice',e.target.value)} className={fieldClass}/></label>
              <label className="text-sm">Đơn giá nước (đ/m³) *<input required type="number" min="0" max="9999999999999.99" step="0.01" value={u.waterPrice} onChange={e=>update(u.key,'waterPrice',e.target.value)} className={fieldClass}/></label>
              <label className="text-sm">Chỉ số điện hiện tại (kWh)<input type="number" min={0} step={1} value={u.electric} onChange={e => update(u.key, 'electric', e.target.value)} className={fieldClass} /></label>
              <label className="text-sm">Chỉ số nước hiện tại (m³)<input type="number" min={0} step={1} value={u.water} onChange={e => update(u.key, 'water', e.target.value)} className={fieldClass} /></label>
              <label className="sm:col-span-2 text-sm">Mô tả<textarea maxLength={3000} value={u.description} onChange={e => update(u.key, 'description', e.target.value)} className={fieldClass} rows={2} /></label>
            </div>
            {mode === 'MULTI_UNIT' && units.length > 1 && <button type="button" onClick={() => setUnits(prev => prev.filter(item => item.key !== u.key))} className="text-sm text-rose-700 inline-flex items-center gap-1"><Trash2 className="w-4 h-4" />Xóa căn/phòng {index + 1}</button>}
          </fieldset>)}
          {mode === 'MULTI_UNIT' && <button type="button" disabled={units.length >= 50} onClick={() => setUnits(prev => [...prev, blankUnit()])} className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 disabled:opacity-50"><Plus className="w-4 h-4" />Thêm căn/phòng</button>}
        </fieldset>
        <p className="text-sm bg-amber-50 text-amber-900 rounded-lg p-3">Tài sản và các căn được lưu nháp, chưa xuất hiện trên Trang chủ. Sau khi lưu, chọn Chuẩn bị hồ sơ kiểm duyệt trong Tài sản cho thuê. Cần Admin duyệt tài sản trước khi công khai từng căn.</p>
        {error && <p role="alert" className="text-sm text-rose-700 bg-rose-50 p-3 rounded-lg">{error}</p>}
        <div className="flex justify-end gap-2"><button type="button" disabled={saving} onClick={onClose} className="border rounded-lg px-4 py-2 text-sm">Hủy</button><button type="submit" disabled={saving} className="bg-emerald-600 text-white rounded-lg px-4 py-2 font-semibold text-sm disabled:opacity-50">{saving ? 'Đang lưu...' : 'Lưu tài sản nháp'}</button></div>
      </form>
  </section>;
}

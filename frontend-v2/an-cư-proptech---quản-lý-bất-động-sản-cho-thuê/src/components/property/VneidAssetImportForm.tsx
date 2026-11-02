import { PropertyImagesField } from '@/components/property/PropertyImagesField';
import { uploadPropertyImages } from '@/services/property/propertyImageService';
import { useEffect, useState } from 'react';
import { getVneidAssets, importVneidProperty, type VneidAssetCandidate } from '@/services/property/vneidPropertyService';
import { ApiError } from '@/services/http/client';

type Fields = { monthlyRent: string; deposit: string; electricityUnitPrice: string; waterUnitPrice: string; electricityIndex: string; waterIndex: string; floor: string; maxOccupants: string; description: string };
const blank = (): Fields => ({ monthlyRent: '', deposit: '', electricityUnitPrice: '', waterUnitPrice: '', electricityIndex: '', waterIndex: '', floor: '', maxOccupants: '', description: '' });
const inputClass = 'mt-1 w-full min-w-0 border border-slate-300 rounded-lg px-3 py-2 bg-white';
export function VneidAssetImportForm({ onClose, onBack, onImported }: { onClose: () => void; onBack: () => void; onImported: (id: string) => void | Promise<void> }) {
  const [items, setItems] = useState<VneidAssetCandidate[]>([]);const [selected, setSelected] = useState<VneidAssetCandidate | null>(null);
  const [terms, setTerms] = useState<Record<string, Fields>>({});const [city, setCity] = useState('');const [district, setDistrict] = useState('');const [ward, setWard] = useState('');
  const [loading, setLoading] = useState(true);const [saving, setSaving] = useState(false);const [error, setError] = useState('');const [stale, setStale] = useState(false);const [revision, setRevision] = useState(0);
  const [photos,setPhotos]=useState<File[]>([]);
  useEffect(() => {
    const controller = new AbortController();setLoading(true);setItems([]);setError('');setSelected(null);setTerms({});setStale(false);
    getVneidAssets(controller.signal).then(data => { if (!controller.signal.aborted) setItems(data); })
      .catch(e => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Chưa tải được tài sản VNeID.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [revision]);
  const select = (item: VneidAssetCandidate) => {
    setSelected(item);setTerms(Object.fromEntries(item.asset.units.map(unit => [unit.externalUnitId, blank()])));setError('');setStale(false);
  };
  const change = (id: string, key: keyof Fields, value: string) => setTerms(previous => ({ ...previous, [id]: { ...previous[id], [key]: value } }));
  return <section className="bg-white border rounded-2xl p-5 sm:p-6 space-y-5 min-w-0">
      <div className="flex justify-between items-start gap-3"><h2 id="vneid-assets-title" className="text-xl font-bold">Chọn tài sản từ VNeID</h2><button type="button" disabled={saving} onClick={onClose} className="underline">Đóng</button></div>
      <p className="text-sm text-slate-600">Thông tin sở hữu được lấy từ VNeID mô phỏng. Điền đủ điều kiện cho thuê để đăng căn hộ, không cần Admin duyệt.</p>
      {loading && <p role="status">Đang tải tài sản VNeID...</p>}
      {!loading && !items.length && !error && <p role="status">Chưa có tài sản phù hợp trong VNeID để thêm vào hệ thống.</p>}
      {!loading && <div className="space-y-3" role="group" aria-label="Danh sách tài sản VNeID">{items.map(item => <label key={item.asset.externalAssetId} className={`flex gap-3 border rounded-xl p-4 ${item.imported ? 'opacity-60 bg-slate-50' : 'cursor-pointer'}`}>
        <input type="radio" name="vneid-asset" disabled={item.imported || saving} checked={selected?.asset.externalAssetId === item.asset.externalAssetId} onChange={() => select(item)} className="mt-1 shrink-0" />
        <span className="min-w-0 break-words"><span className="block font-semibold">{item.asset.name}</span><span className="block text-sm text-slate-600">{item.asset.address}</span><span className="block text-sm mt-1">{item.asset.units.length} căn/phòng · {item.imported ? 'Đã thêm vào hệ thống' : 'Có thể chọn'}</span></span>
      </label>)}</div>}
      {selected && <form className="space-y-5" onSubmit={async e => {
        e.preventDefault();if (saving || stale) return;setError('');if(photos.length<1||photos.length>4){setError('Chọn từ 1 đến 4 ảnh tài sản.');return;}setSaving(true);
        try {
          const imageIds=await uploadPropertyImages(photos);
          const result = await importVneidProperty({ imageIds, externalAssetId: selected.asset.externalAssetId, sourceVersion: selected.sourceVersion,
            city: city.trim(), district: district.trim(), ward: ward.trim() || null,
            units: selected.asset.units.map(unit => { const t=terms[unit.externalUnitId];return { ...t, externalUnitId: unit.externalUnitId,
              floor: Number(t.floor), maxOccupants: Number(t.maxOccupants), electricityIndex: Number(t.electricityIndex), waterIndex: Number(t.waterIndex) }; }),
          });await onImported(result.property.id);
        } catch (e) {setError(e instanceof Error ? e.message : 'Chưa thêm được tài sản.');if(e instanceof ApiError && ['ASSET_SOURCE_CHANGED','ASSET_ALREADY_IMPORTED','ASSET_NOT_AVAILABLE','VNEID_LINK_CHANGED'].includes(e.code))setStale(true);}
        finally {setSaving(false);}
      }}>
        <PropertyImagesField files={photos} onChange={setPhotos} disabled={saving||stale}/>
        <fieldset disabled={saving || stale} className="space-y-5 min-w-0">
          <div className="bg-emerald-50 p-3 rounded-lg text-sm break-words">Địa chỉ theo VNeID: <strong>{selected.asset.address}</strong></div>
          <p className="text-sm text-slate-600">Bổ sung địa phương để căn hộ xuất hiện đúng bộ lọc tìm kiếm.</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-sm">Tỉnh/Thành phố *<input required maxLength={80} value={city} onChange={e => setCity(e.target.value)} className={inputClass} /></label>
            <label className="text-sm">Quận/Huyện/Khu vực *<input required maxLength={80} value={district} onChange={e => setDistrict(e.target.value)} className={inputClass} /></label>
            <label className="text-sm">Phường/Xã<input maxLength={80} value={ward} onChange={e => setWard(e.target.value)} className={inputClass} /></label>
          </div>
          {selected.asset.units.map(unit => <fieldset key={unit.externalUnitId} className="border rounded-xl p-4 min-w-0" data-testid="vneid-unit-terms"><legend className="font-semibold px-1">{unit.code} · {unit.areaM2} m²</legend>
            <div className="grid sm:grid-cols-2 gap-3">{([
              ['monthlyRent','Giá thuê/tháng (đ)', '0.01', '0.01'],['deposit','Tiền cọc (đ)', '0', '0.01'],['electricityUnitPrice','Đơn giá điện (đ/kWh)', '0', '0.01'],['waterUnitPrice','Đơn giá nước (đ/m³)', '0', '0.01'],
              ['electricityIndex','Chỉ số điện ban đầu (kWh)', '0', '1'],['waterIndex','Chỉ số nước ban đầu (m³)', '0', '1'],['floor','Tầng', '0', '1'],['maxOccupants','Số người tối đa', '1', '1'],
            ] as const).map(([key,label,min,step]) => <label key={key} className="text-sm">{label} *<input required type="number" min={min} step={step} max={key==='floor'?200:key==='maxOccupants'?1000:key.endsWith('Index')?2147483647:'9999999999999.99'} value={terms[unit.externalUnitId]?.[key] ?? ''} onChange={e => change(unit.externalUnitId,key,e.target.value)} className={inputClass} /></label>)}</div>
            <label className="block text-sm mt-3">Mô tả cho thuê<textarea maxLength={3000} value={terms[unit.externalUnitId]?.description ?? ''} onChange={e => change(unit.externalUnitId,'description',e.target.value)} className={inputClass} /></label>
          </fieldset>)}
          <p className="text-sm text-emerald-900 bg-emerald-50 p-3 rounded-lg">Xác nhận sẽ thêm tài sản và công khai các căn cho thuê ngay. Thông tin sở hữu, mã căn và diện tích sẽ được Backend kiểm tra lại từ VNeID.</p>
          <button type="submit" disabled={saving || stale} className="bg-emerald-600 text-white rounded-lg px-4 py-2 disabled:opacity-50">{saving ? 'Đang thêm tài sản...' : 'Thêm và cho thuê'}</button>
        </fieldset>
      </form>}
      {error && <p role="alert" className="text-rose-700 break-words">{error}</p>}
      <div className="flex flex-wrap gap-4"><button type="button" disabled={saving || loading} onClick={() => setRevision(v => v+1)} className="text-emerald-700 underline">Tải lại danh sách</button><button type="button" disabled={saving} onClick={onBack} className="underline">Quay lại chọn vai trò</button></div>
  </section>;
}

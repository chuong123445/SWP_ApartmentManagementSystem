import { DescriptionSuggestion } from '@/components/property/DescriptionSuggestion';
import { PropertyImagesField } from '@/components/property/PropertyImagesField';
import { uploadPropertyImages } from '@/services/property/propertyImageService';
import { useEffect, useState } from 'react';
import { getVneidAssets, importVneidProperty, appendVneidUnits, availableSourceUnits, sourceAppendMessage, type VneidAssetCandidate } from '@/services/property/vneidPropertyService';
import { ApiError } from '@/services/http/client';

type Fields = { monthlyRent: string; deposit: string; electricityUnitPrice: string; waterUnitPrice: string; electricityIndex: string; waterIndex: string; floor: string; maxOccupants: string; description: string };
const blank = (): Fields => ({ monthlyRent: '', deposit: '', electricityUnitPrice: '', waterUnitPrice: '', electricityIndex: '', waterIndex: '', floor: '', maxOccupants: '', description: '' });
const inputClass = 'mt-1 w-full min-w-0 border border-slate-300 rounded-lg px-3 py-2 bg-white';
export function VneidAssetImportForm({ onClose, onBack, onImported, propertyId }: { onClose: () => void; onBack: () => void; onImported: (id: string) => void | Promise<void>; propertyId?:string }) {
  const [items, setItems] = useState<VneidAssetCandidate[]>([]);const [selected, setSelected] = useState<VneidAssetCandidate | null>(null);
  const [terms, setTerms] = useState<Record<string, Fields>>({});const [city, setCity] = useState('');const [district, setDistrict] = useState('');const [ward, setWard] = useState('');
  const [loading, setLoading] = useState(true);const [saving, setSaving] = useState(false);const [error, setError] = useState('');const [stale, setStale] = useState(false);const [revision, setRevision] = useState(0);
  const [unitPhotos,setUnitPhotos]=useState<Record<string,File[]>>({});
  const [photos,setPhotos]=useState<File[]>([]);
  const [selectedIds,setSelectedIds]=useState<string[]>([]);
  const select = (item: VneidAssetCandidate) => {
    setSelected(item);setTerms(Object.fromEntries(item.asset.units.map(unit => [unit.externalUnitId, blank()])));setSelectedIds([]);setPhotos([]);setUnitPhotos({});setCity('');setDistrict('');setWard('');setError('');setStale(false);
  };
  useEffect(() => {
    const controller = new AbortController();setLoading(true);setItems([]);setError('');setSelected(null);setTerms({});setSelectedIds([]);setStale(false);
    getVneidAssets(controller.signal).then(data => { if (!controller.signal.aborted) {
      const visible=propertyId?data.filter(item=>item.propertyId===propertyId):data;setItems(visible);
      if(propertyId){if(visible.length===1)select(visible[0]);else setError('Không tìm thấy tài sản nguồn thuộc tài khoản hiện tại. Hãy quay lại quản lý tài sản và tải lại.');}
    } })
      .catch(e => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Chưa tải được tài sản VNeID.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [revision,propertyId]);
  const available=selected?availableSourceUnits(selected):[];
  const selectedUnits=available.filter(unit=>selectedIds.includes(unit.externalUnitId));
  const appending=!!selected?.propertyId;
  const change = (id: string, key: keyof Fields, value: string) => setTerms(previous => ({ ...previous, [id]: { ...previous[id], [key]: value } }));
  return <section className="bg-white border rounded-2xl p-5 sm:p-6 space-y-5 min-w-0">
      <div className="flex justify-between items-start gap-3"><h2 id="vneid-assets-title" className="text-xl font-bold">{propertyId?'Bổ sung phòng từ Auth0':'Chọn tài sản từ VNeID'}</h2><button type="button" disabled={saving} onClick={onClose} className="underline">Đóng</button></div>
      <p className="text-sm text-slate-600">Chọn những phòng muốn đưa lên cho thuê từ nguồn VNeID mô phỏng. Các phòng chưa chọn chưa cần nhập điều kiện thuê và có thể bổ sung sau.</p>
      {loading && <p role="status">Đang tải tài sản VNeID...</p>}
      {!loading && !items.length && !error && <p role="status">Chưa có tài sản phù hợp trong VNeID để thêm vào hệ thống.</p>}
      {!loading && <div className="space-y-3" role="group" aria-label="Danh sách tài sản VNeID">{items.map(item => <label key={item.asset.externalAssetId} className={`flex gap-3 border rounded-xl p-4 ${!availableSourceUnits(item).length ? 'bg-slate-50' : 'cursor-pointer'}`}>
        <input type="radio" name="vneid-asset" disabled={!availableSourceUnits(item).length || saving || !!propertyId} checked={selected?.asset.externalAssetId === item.asset.externalAssetId} onChange={() => select(item)} className="mt-1 shrink-0" />
        <span className="min-w-0 break-words"><span className="block font-semibold">{item.asset.name}</span><span className="block text-sm text-slate-600">{item.asset.address}</span><span className="block text-sm mt-1">{item.asset.units.length} căn/phòng · {item.imported?`${item.unitStates?.length ?? 0} phòng đã thêm vào hệ thống`:'Có thể chọn'}{item.imported&&!sourceAppendMessage(item)&&availableSourceUnits(item).length>0?' · Có thể bổ sung phòng':''}</span>{sourceAppendMessage(item)&&<span className="block text-sm text-amber-800 mt-2">{sourceAppendMessage(item)}</span>}</span>
      </label>)}</div>}
      {selected && <form className="space-y-5" onInvalidCapture={event=>{(event.target as HTMLElement).closest("details")?.setAttribute("open","");}} onSubmit={async e => {
        e.preventDefault();if (saving || stale) return;setError('');if(!selectedUnits.length){setError('Chọn ít nhất một phòng muốn cho thuê.');return;}if(!appending&&(photos.length<1||photos.length>4)){setError('Chọn từ 1 đến 4 ảnh tài sản.');return;}if(selectedUnits.some(u=>!unitPhotos[u.externalUnitId]?.length)){setError('Chọn ảnh riêng cho từng phòng muốn cho thuê.');return;}setSaving(true);
        try {
          const units=await Promise.all(selectedUnits.map(async unit => { const t=terms[unit.externalUnitId];return { ...t, imageIds:await uploadPropertyImages(unitPhotos[unit.externalUnitId]), externalUnitId: unit.externalUnitId,
            floor: Number(t.floor), maxOccupants: Number(t.maxOccupants), electricityIndex: t.electricityIndex?Number(t.electricityIndex):null, waterIndex: t.waterIndex?Number(t.waterIndex):null }; }));
          const result = appending?await appendVneidUnits(selected.propertyId!,{version:selected.propertyVersion!,sourceVersion:selected.sourceVersion,units}):await importVneidProperty({ imageIds:await uploadPropertyImages(photos), externalAssetId: selected.asset.externalAssetId, sourceVersion: selected.sourceVersion,
            city: city.trim(), district: district.trim(), ward: ward.trim() || null,
            units,
          });await onImported(result.property.id);
        } catch (e) {setError(e instanceof Error ? e.message : 'Chưa thêm được tài sản.');if(e instanceof ApiError && ['ASSET_SOURCE_CHANGED','ASSET_ALREADY_IMPORTED','ASSET_NOT_AVAILABLE','VNEID_LINK_CHANGED','SOURCE_UNIT_ALREADY_IMPORTED','SOURCE_UNIT_RECONCILIATION_REQUIRED','SOURCE_ROOM_CODE_CONFLICT','ASSET_LEGAL_SOURCE_CHANGED','STALE_VERSION','SOURCE_PROPERTY_NOT_ELIGIBLE'].includes(e.code))setStale(true);}
        finally {setSaving(false);}
      }}>
        <fieldset disabled={saving || stale} className="space-y-5 min-w-0">
          <div className="space-y-3" role="group" aria-label="Chọn phòng muốn cho thuê">
            <h3 className="font-semibold">Chọn phòng muốn cho thuê</h3>
            {sourceAppendMessage(selected)&&<p role="alert" className="text-amber-800 text-sm">{sourceAppendMessage(selected)}</p>}
            <div className="flex flex-wrap gap-4 text-sm"><button type="button" disabled={!available.length} onClick={()=>setSelectedIds(available.map(unit=>unit.externalUnitId))} className="underline">Chọn tất cả phòng chưa thêm</button><button type="button" onClick={()=>setSelectedIds([])} className="underline">Bỏ chọn tất cả</button></div>
            {selected.asset.units.map(unit=>{const imported=selected.unitStates?.find(state=>state.externalUnitId===unit.externalUnitId);return <label key={unit.externalUnitId} className="flex items-start gap-3 border rounded-lg p-3 break-words"><input type="checkbox" disabled={!!imported||!available.some(u=>u.externalUnitId===unit.externalUnitId)} checked={selectedIds.includes(unit.externalUnitId)} onChange={e=>setSelectedIds(ids=>e.target.checked?[...ids,unit.externalUnitId]:ids.filter(id=>id!==unit.externalUnitId))} className="mt-1 shrink-0"/><span>{unit.code} · {unit.areaM2} m²<span className="block text-sm text-slate-500">{imported?`Đã thêm — ${imported.publicationStatus==='PUBLISHED'?'đang công khai':imported.publicationStatus==='HIDDEN'?'đang ẩn':'bản nháp'}`:'Chưa đưa vào cho thuê'}</span></span></label>;})}
            <p role="status" className="text-sm text-brand-800">Đã chọn {selectedUnits.length}/{available.length} phòng chưa thêm.</p>
            {!available.length&&!sourceAppendMessage(selected)&&<p className="text-sm">Tất cả phòng nguồn đã có trong hệ thống. Bạn có thể quản lý hoặc công khai phòng đã ẩn tại trang tài sản.</p>}
          </div>
          {!appending&&selectedUnits.length>0&&<><PropertyImagesField files={photos} onChange={setPhotos} disabled={saving||stale}/>
          <div className="bg-brand-50 p-3 rounded-lg text-sm break-words">Địa chỉ theo VNeID: <strong>{selected.asset.address}</strong></div>
          <p className="text-sm text-slate-600">Bổ sung địa phương để căn hộ xuất hiện đúng bộ lọc tìm kiếm.</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-sm">Tỉnh/Thành phố *<input required maxLength={80} value={city} onChange={e => setCity(e.target.value)} className={inputClass} /></label>
            <label className="text-sm">Quận/Huyện/Khu vực *<input required maxLength={80} value={district} onChange={e => setDistrict(e.target.value)} className={inputClass} /></label>
            <label className="text-sm">Phường/Xã<input maxLength={80} value={ward} onChange={e => setWard(e.target.value)} className={inputClass} /></label>
          </div></>}
          {appending&&<p className="text-sm text-slate-600">Các phòng mới sẽ được thêm vào tài sản hiện có, dùng ảnh chung và địa phương đã lưu, kèm ảnh riêng từng phòng mới. Phòng đã thêm giữ nguyên thông tin.</p>}
          {selectedUnits.map((unit,index) => <fieldset key={unit.externalUnitId} className="border rounded-xl p-4 min-w-0" data-testid="vneid-unit-terms"><legend className="font-semibold px-1">{unit.code} · {unit.areaM2} m²</legend>
            <details open={index===0}><summary className="cursor-pointer text-sm text-brand-800">Điều kiện thuê và ảnh riêng phòng {unit.code}</summary><div className="grid sm:grid-cols-2 gap-3">{([
              ['monthlyRent','Giá thuê/tháng (đ)', '0.01', '0.01'],['deposit','Tiền cọc (đ)', '0', '0.01'],['electricityUnitPrice','Đơn giá điện (đ/kWh)', '0', '0.01'],['waterUnitPrice','Đơn giá nước (đ/m³)', '0', '0.01'],
              ['floor','Tầng', '0', '1'],['maxOccupants','Số người tối đa', '1', '1'],
            ] as const).map(([key,label,min,step]) => <label key={key} className="text-sm">{label} *<input required type="number" min={min} step={step} max={key==='floor'?200:key==='maxOccupants'?1000:key.endsWith('Index')?2147483647:'9999999999999.99'} value={terms[unit.externalUnitId]?.[key] ?? ''} onChange={e => change(unit.externalUnitId,key,e.target.value)} className={inputClass} /></label>)}</div>
            <div className="mt-3"><h4 className="font-semibold text-sm">Ảnh riêng phòng {unit.code}</h4><PropertyImagesField files={unitPhotos[unit.externalUnitId]??[]} onChange={files=>setUnitPhotos(prev=>({...prev,[unit.externalUnitId]:files}))} disabled={saving||stale}/></div>
            <label className="block text-sm mt-3">Mô tả cho thuê<textarea maxLength={3000} value={terms[unit.externalUnitId]?.description ?? ''} onChange={e => change(unit.externalUnitId,'description',e.target.value)} className={inputClass} /></label>
            <DescriptionSuggestion facts={{
              areaM2: unit.areaM2,
              monthlyRent: terms[unit.externalUnitId]?.monthlyRent ?? '',
              bedrooms: unit.bedrooms,
              bathrooms: unit.bathrooms,
              floor: terms[unit.externalUnitId]?.floor ? Number(terms[unit.externalUnitId].floor) : undefined,
              maxOccupants: terms[unit.externalUnitId]?.maxOccupants ? Number(terms[unit.externalUnitId].maxOccupants) : undefined,
            }} onApply={description => change(unit.externalUnitId, 'description', description)} />
            </details>
          </fieldset>)}
          <p className="text-sm text-brand-900 bg-brand-50 p-3 rounded-lg">Xác nhận sẽ thêm và công khai {selectedUnits.length} phòng đã chọn. Thông tin sở hữu, mã phòng và diện tích được kiểm tra lại từ nguồn VNeID mô phỏng.</p>
          <button type="submit" disabled={saving || stale || !selectedUnits.length} className="bg-brand-600 text-white rounded-lg px-4 py-2 disabled:opacity-50">{saving ? 'Đang thêm phòng...' : `${appending?'Bổ sung':'Thêm'} và cho thuê ${selectedUnits.length} phòng`}</button>
        </fieldset>
      </form>}
      {error && <p role="alert" className="text-rose-700 break-words">{error}</p>}
      <div className="flex flex-wrap gap-4"><button type="button" disabled={saving || loading} onClick={() => setRevision(v => v+1)} className="text-brand-700 underline">Tải lại danh sách</button><button type="button" disabled={saving} onClick={onBack} className="underline">{propertyId?'Quay lại quản lý tài sản':'Quay lại chọn hình thức'}</button></div>
  </section>;
}

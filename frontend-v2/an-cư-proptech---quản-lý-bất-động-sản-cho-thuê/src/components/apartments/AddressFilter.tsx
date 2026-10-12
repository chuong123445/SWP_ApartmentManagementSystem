import { useEffect, useState } from 'react';
import { getAddressOptions } from '@/services/apartments/apartmentService';
import type { AddressOption } from '@/types/apartment';
export function AddressFilter({ city, district, ward, onChange }: {
  city: string; district: string; ward: string; onChange: (value: { city: string; district: string; ward: string }) => void;
}) {
  const [options, setOptions] = useState<AddressOption[]>([]); const [error, setError] = useState('');
  useEffect(() => { const controller = new AbortController();getAddressOptions(controller.signal).then(data => { if (!controller.signal.aborted) setOptions(data); }).catch(e => { if (!controller.signal.aborted) setError(e.message); });return () => controller.abort(); }, []);
  const unique = (items: (string | null)[]) => [...new Set(items.filter((x): x is string => !!x))].sort((a,b) => a.localeCompare(b,'vi'));
  const cities = unique(options.map(p => p.city));
  const districts = unique(options.filter(p => p.city === city).map(p => p.district));
  const wards = unique(options.filter(p => p.city === city && p.district === district).map(p => p.ward));
  const cls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white disabled:bg-slate-100';
  return <><div><label htmlFor="address-city" className="text-xs font-semibold text-slate-500 block mb-1">Tỉnh / Thành phố</label><select id="address-city" value={city} onChange={e => onChange({ city: e.target.value, district: '', ward: '' })} className={cls}><option value="">Tất cả tỉnh / thành phố</option>{cities.map(v => <option key={v}>{v}</option>)}</select></div>
    <div><label htmlFor="address-district" className="text-xs font-semibold text-slate-500 block mb-1">Quận / Huyện / Khu vực</label><select id="address-district" value={district} disabled={!city} onChange={e => onChange({ city, district: e.target.value, ward: '' })} className={cls}><option value="">Tất cả khu vực</option>{districts.map(v => <option key={v}>{v}</option>)}</select></div>
    <div><label htmlFor="address-ward" className="text-xs font-semibold text-slate-500 block mb-1">Phường / Xã</label><select id="address-ward" value={ward} disabled={!district} onChange={e => onChange({ city, district, ward: e.target.value })} className={cls}><option value="">Tất cả phường / xã</option>{wards.map(v => <option key={v}>{v}</option>)}</select></div>
    {error && <p role="alert" className="col-span-full text-rose-700 text-sm">Không tải được bộ lọc địa chỉ: {error}</p>}</>;
}

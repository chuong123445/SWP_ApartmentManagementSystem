import { HomeIcon } from '@/components/apartments/HomeIcon';
import type { AddressOption } from '@/types/apartment';
export function AddressFilter({ city, district, ward, onChange, options, error }: {
  options: AddressOption[]; error: string; city: string; district: string; ward: string; onChange: (value: { city: string; district: string; ward: string }) => void;
}) {
  const unique = (items: (string | null)[]) => [...new Set(items.filter((x): x is string => !!x))].sort((a,b) => a.localeCompare(b,'vi'));
  const cities = unique([...options.map(p => p.city), city]);
  const districts = unique(options.filter(p => p.city === city).map(p => p.district));
  const wards = unique(options.filter(p => p.city === city && p.district === district).map(p => p.ward));
  const cls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white disabled:bg-slate-100';
  return <><div><label htmlFor="address-city" className="home-filter-label"><HomeIcon name="location" />Tỉnh / Thành phố</label><select id="address-city" value={city} onChange={e => onChange({ city: e.target.value, district: '', ward: '' })} className={cls}><option value="">Tất cả tỉnh / thành phố</option>{cities.map(v => <option key={v}>{v}</option>)}</select></div>
    <div><label htmlFor="address-district" className="home-filter-label">Quận / Huyện / Khu vực</label><select id="address-district" value={district} disabled={!city} onChange={e => onChange({ city, district: e.target.value, ward: '' })} className={cls}><option value="">Tất cả khu vực</option>{districts.map(v => <option key={v}>{v}</option>)}</select></div>
    <div><label htmlFor="address-ward" className="home-filter-label">Phường / Xã</label><select id="address-ward" value={ward} disabled={!district} onChange={e => onChange({ city, district, ward: e.target.value })} className={cls}><option value="">Tất cả phường / xã</option>{wards.map(v => <option key={v}>{v}</option>)}</select></div>
    {error && <p role="alert" className="col-span-full text-rose-700 text-sm">Không tải được bộ lọc địa chỉ: {error}</p>}</>;
}

import { useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { CustomerLayout } from '@/layouts/CustomerLayout';
import { ApartmentCard } from '@/components/apartments/ApartmentCard';
import { Pagination } from '@/components/common/Pagination';
import { useApartments } from '@/hooks/useApartments';
import { useAddressOptions } from '@/hooks/useAddressOptions';
import type { ApartmentFilters } from '@/types/apartment';
import { AddressFilter } from '@/components/apartments/AddressFilter';
import { HomeIcon } from '@/components/apartments/HomeIcon';
import { TenantHomePanel } from '@/components/billing/TenantHomePanel';
import { catalogCity, homeCities } from '@/data/homeCities';

export function HomePage() {
  const [q, setQ] = useState('');
  const [address, setAddress] = useState({ city: '', district: '', ward: '' });
  const [minRent, setMinRent] = useState('');
  const [maxRent, setMaxRent] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [validation, setValidation] = useState('');
  const [filters, setFilters] = useState<ApartmentFilters>({ page: 0, size: 6 });
  const { data, loading, error, reload } = useApartments(filters);
  const addresses = useAddressOptions();
  const results = useRef<HTMLElement>(null);
  const validRent = () => {
    if (minRent && maxRent && Number(minRent) > Number(maxRent)) {
      setValidation('Giá tối thiểu phải nhỏ hơn hoặc bằng giá tối đa.'); return false;
    }
    setValidation(''); return true;
  };
  const search = (location = address) => {
    if (!validRent()) return;
    setFilters({ q, ...location, minRent, maxRent, bedrooms, page: 0, size: 6 });
    results.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const clear = () => {
    setQ(''); setAddress({ city: '', district: '', ward: '' }); setMinRent(''); setMaxRent(''); setBedrooms(''); setValidation('');
    setFilters({ page: 0, size: 6 });
  };
  return <CustomerLayout>
    <main className="home-wrap">
      <TenantHomePanel />
      <section className="home-section" aria-labelledby="home-cities-title">
        <div className="home-heading"><div><h2 id="home-cities-title">Tìm căn hộ theo khu vực</h2><p>Một nơi ở mới, bắt đầu từ khu vực bạn yêu thích.</p></div><span className="home-badge">Ảnh minh họa khu vực</span></div>
        <div className="home-cities">{homeCities.map(city => {
          const value = catalogCity(city, addresses.options.map(option => option.city));
          return <button key={city.label} type="button" disabled={addresses.loading} className="home-city" aria-label={`Tìm căn hộ tại ${city.label}`} aria-pressed={filters.city === value}
            onClick={() => { const next = { city: value, district: '', ward: '' }; setAddress(next); search(next); }}>
            <img src={`https://images.unsplash.com/${city.photo}?auto=format&fit=crop&w=650&q=85`} alt={`Ảnh minh họa khu vực ${city.label}`} onError={event => { event.currentTarget.style.visibility = 'hidden'; }} />
            <strong>{city.label}</strong><span>Tìm căn hộ cho thuê</span><span className="home-city-arrow" aria-hidden="true">↗</span>
          </button>;
        })}</div>
      </section>
      <section className="home-hero">
        <div className="home-eyebrow">Căn hộ cho thuê · An Cư PropTech</div>
        <h1>Tìm căn hộ cho thuê{filters.city ? ` tại ${filters.city}` : ' phù hợp với bạn'}</h1>
        <p>Chọn khu vực, ngân sách và không gian sống bạn cần.</p>
        <form className="home-filters" aria-label="Bộ lọc căn hộ" onSubmit={event => { event.preventDefault(); search(); }}>
          <div><label htmlFor="apartment-search" className="home-filter-label"><Search aria-hidden="true" size={18} />Tên hoặc địa chỉ</label><input id="apartment-search" value={q} onChange={e => setQ(e.target.value)} maxLength={120} placeholder="Tìm căn hộ, khu vực..." /></div>
          <AddressFilter {...address} onChange={setAddress} {...addresses} />
          <div><label htmlFor="apartment-min-rent" className="home-filter-label"><HomeIcon name="money" />Giá tối thiểu / tháng</label><input id="apartment-min-rent" type="number" min="0" step="1" value={minRent} onChange={e => setMinRent(e.target.value)} placeholder="Không giới hạn" /></div>
          <div><label htmlFor="apartment-max-rent" className="home-filter-label"><HomeIcon name="money" />Giá tối đa / tháng</label><input id="apartment-max-rent" type="number" min="0" step="1" value={maxRent} onChange={e => setMaxRent(e.target.value)} placeholder="Không giới hạn" /></div>
          <div><label htmlFor="apartment-bedrooms" className="home-filter-label"><HomeIcon name="bed" />Số phòng ngủ</label><select id="apartment-bedrooms" value={bedrooms} onChange={e => setBedrooms(e.target.value)}><option value="">Không giới hạn</option><option value="0">Studio (0 phòng ngủ)</option>{[1,2,3,4,5].map(n => <option key={n} value={n}>{n} phòng ngủ</option>)}</select></div>
          <button type="submit" className="home-primary home-search"><Search aria-hidden="true" size={18} />Tìm kiếm</button>
          {validation && <p role="alert" className="home-filter-error">{validation}</p>}
        </form>
      </section>
      <section ref={results} className="home-section home-results" aria-labelledby="home-results-title" aria-busy={loading}>
        <div className="home-heading"><div><h2 id="home-results-title">Căn hộ cho thuê</h2><p role="status">{loading ? 'Đang tải căn hộ...' : `${data?.totalElements ?? 0} căn hộ phù hợp`}</p></div><button type="button" className="home-text-link" onClick={clear}>Xóa bộ lọc</button></div>
        {error && <div role="alert" className="home-error">{error}<button type="button" onClick={reload}>Thử lại</button></div>}
        {!loading && !error && <>
          {data?.items.length ? <div className="home-listings">{data.items.map(a => <ApartmentCard key={a.id} apartment={a} />)}</div>
            : <div className="home-empty"><HomeIcon name="apartment" /><h3>Chưa có căn hộ phù hợp</h3><p>Chưa có căn hộ phù hợp với bộ lọc này. Hãy thử đổi khu vực, ngân sách hoặc số phòng ngủ.</p><button type="button" className="home-pill" onClick={clear}>Xóa bộ lọc</button></div>}
          {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={page => setFilters(value => ({ ...value, page }))} />}
        </>}
      </section>
    </main>
  </CustomerLayout>;
}

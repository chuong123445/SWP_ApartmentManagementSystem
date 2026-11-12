import { Link, useSearchParams } from 'react-router';
import { AdminLayout } from '@/layouts/AdminLayout';
import { SettlementPanel } from '@/pages/account/SettlementPage';
import { PropertyDossiersPage } from './PropertyDossiersPage';
import { AccountsPage } from './AccountsPage';

const tabs = [
  { key: 'dossiers', label: 'Kiểm duyệt tài sản', search: '' },
  { key: 'withdrawals', label: 'Yêu cầu rút tiền', search: '?tab=withdrawals' },
  { key: 'accounts', label: 'Tài khoản người dùng', search: '?tab=accounts' },
] as const;

export function AdminPage() {
  const [params] = useSearchParams();
  const active = tabs.find(tab => tab.key === params.get('tab'))?.key ?? 'dossiers';

  return <AdminLayout>
      <nav aria-label="Quản trị" className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {tabs.map(tab => <Link key={tab.key} to={{ pathname: '/admin/property-dossiers', search: tab.search }}
          aria-current={active === tab.key ? 'page' : undefined}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${active === tab.key
            ? 'bg-brand-700 text-white' : 'bg-white border border-slate-200 hover:bg-brand-50'}`}>
          {tab.label}
        </Link>)}
      </nav>
      {active === 'accounts' ? <AccountsPage /> : active === 'withdrawals' ? <SettlementPanel admin /> : <PropertyDossiersPage />}
  </AdminLayout>;
}

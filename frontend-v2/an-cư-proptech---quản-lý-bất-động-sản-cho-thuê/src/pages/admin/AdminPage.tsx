import { Link, useSearchParams } from 'react-router';
import { AccountMenu } from '@/components/navigation/AccountMenu';
import { useAuth } from '@/hooks/useAuth';
import { SettlementPanel } from '@/pages/account/SettlementPage';
import { PropertyDossiersPage } from './PropertyDossiersPage';
import { AccountsPage } from './AccountsPage';

const tabs = [
  { key: 'dossiers', label: 'Kiểm duyệt tài sản', search: '' },
  { key: 'withdrawals', label: 'Yêu cầu rút tiền', search: '?tab=withdrawals' },
  { key: 'accounts', label: 'Tài khoản người dùng', search: '?tab=accounts' },
] as const;

export function AdminPage() {
  const { user, logout, isLoggingOut, error } = useAuth();
  const [params] = useSearchParams();
  const active = tabs.find(tab => tab.key === params.get('tab'))?.key ?? 'dossiers';

  return <div className="min-h-screen bg-slate-50 text-slate-800">
    <header className="bg-white border-b px-4 md:px-8 py-4 flex items-center justify-between gap-3">
      <Link to="/" className="font-bold text-emerald-700">An Cư PropTech</Link>
      {user && <AccountMenu account={user} onLogout={logout} isLoggingOut={isLoggingOut}
        authError={error} showAccountLinks={false} />}
    </header>
    <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-5">
      <nav aria-label="Quản trị" className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {tabs.map(tab => <Link key={tab.key} to={{ pathname: '/admin/property-dossiers', search: tab.search }}
          aria-current={active === tab.key ? 'page' : undefined}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${active === tab.key
            ? 'bg-emerald-700 text-white' : 'bg-white border border-slate-200 hover:bg-emerald-50'}`}>
          {tab.label}
        </Link>)}
      </nav>
      {active === 'accounts' ? <AccountsPage /> : active === 'withdrawals' ? <SettlementPanel admin /> : <PropertyDossiersPage />}
    </main>
  </div>;
}

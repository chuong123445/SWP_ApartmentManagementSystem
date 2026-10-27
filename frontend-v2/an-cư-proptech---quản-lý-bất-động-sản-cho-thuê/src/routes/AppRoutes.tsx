import type { ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router';
import { useAuth } from '@/hooks/useAuth';
import { hasManagementRole } from '@/utils/auth';
import { loginDestination } from '@/utils/navigation';
import { SessionLoading } from '@/components/feedback/SessionLoading';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { AccountVerificationPage } from '@/pages/auth/AccountVerificationPage';
import { VneidCallbackPage } from '@/pages/auth/VneidCallbackPage';
import { WorkspacePage } from '@/pages/WorkspacePage';
import { HomePage } from '@/pages/customer/HomePage';
import { ApartmentDetailPage } from '@/pages/customer/ApartmentDetailPage';
import { MyRentalRequestsPage } from '@/pages/customer/MyRentalRequestsPage';
import { MyInvoicesPage } from '@/pages/customer/MyInvoicesPage';
import { InvoiceDetailPage } from '@/pages/customer/InvoiceDetailPage';
import { ProfilePage } from '@/pages/account/ProfilePage';
import { AccountActionPage } from '@/pages/account/AccountActionPage';
import { AccountSettingsPage } from '@/pages/account/AccountSettingsPage';
import { IdentityPage } from '@/pages/account/IdentityPage';
import { OwnerUpgradePage } from '@/pages/account/OwnerUpgradePage';
import { PropertyDossiersPage } from '@/pages/admin/PropertyDossiersPage';
import { MyContractsPage } from '@/pages/customer/MyContractsPage';
import { ContractDetailPage } from '@/pages/customer/ContractDetailPage';

function RequireAccount({ children, role, verified = true }: { children: ReactNode; role?: 'MANAGER' | 'CUSTOMER' | 'ADMIN'; verified?: boolean }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <SessionLoading />;
  if (!user) return <Navigate to="/login" state={{ returnTo: location.pathname }} replace />;
  if (role === 'ADMIN' && !user.roles.includes('ADMIN')) return <Navigate to="/" replace />;
  if (role === 'MANAGER' && user.roles.includes('ADMIN')) return <Navigate to="/admin/property-dossiers" replace />;
  if (role === 'MANAGER' && !hasManagementRole(user)) return <Navigate to="/" replace />;
  if (role === 'CUSTOMER' && !user.roles.some(role => role === 'CUSTOMER' || role === 'OWNER')) return <Navigate to="/app" replace />;
  if (verified && (user.accountStatus !== 'ACTIVE' || user.contactVerificationStatus !== 'VERIFIED')) return <AccountVerificationPage />;
  return <div key={user.id} className="contents">{children}</div>;
}
function LoginRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <SessionLoading />;
  return user ? <Navigate to={loginDestination(user, location.state?.returnTo)} replace /> : <LoginPage />;
}
export function AppRoutes() {
  return <Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/apartments/:id" element={<ApartmentDetailPage />} />
    <Route path="/login" element={<LoginRoute />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route path="/auth/vneid/callback" element={<VneidCallbackPage />} />
    <Route path="/app" element={<RequireAccount role="MANAGER"><WorkspacePage /></RequireAccount>} />
    <Route path="/admin/property-dossiers" element={<RequireAccount role="ADMIN" verified={false}><PropertyDossiersPage /></RequireAccount>} />
    <Route path="/my/rental-requests" element={<RequireAccount role="CUSTOMER"><MyRentalRequestsPage /></RequireAccount>} />
    <Route path="/my/invoices" element={<RequireAccount role="CUSTOMER"><MyInvoicesPage /></RequireAccount>} />
    <Route path="/my/contracts" element={<RequireAccount role="CUSTOMER"><MyContractsPage /></RequireAccount>} />
    <Route path="/my/contracts/:id" element={<RequireAccount role="CUSTOMER"><ContractDetailPage /></RequireAccount>} />
    <Route path="/my/invoices/:id" element={<RequireAccount role="CUSTOMER"><InvoiceDetailPage /></RequireAccount>} />
    <Route path="/account/verification" element={<RequireAccount verified={false}><AccountVerificationPage /></RequireAccount>} />
    <Route path="/account/profile" element={<RequireAccount verified={false}><ProfilePage /></RequireAccount>} />
    <Route path="/account/settings" element={<RequireAccount verified={false}><AccountSettingsPage /></RequireAccount>} />
    <Route path="/account/owner-upgrade" element={<RequireAccount verified={false}><OwnerUpgradePage /></RequireAccount>} />
    <Route path="/account/settings/identity" element={<RequireAccount verified={false}><IdentityPage /></RequireAccount>} />
    <Route path="/account/settings/password" element={<RequireAccount verified={false}><AccountActionPage key="password" action="password" /></RequireAccount>} />
    <Route path="/account/settings/email" element={<RequireAccount verified={false}><AccountActionPage key="email" action="email" /></RequireAccount>} />
    <Route path="/account/settings/phone" element={<RequireAccount verified={false}><AccountActionPage key="phone" action="phone" /></RequireAccount>} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}

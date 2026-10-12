import type { ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router';
import { useAuth } from '@/hooks/useAuth';
import { hasManagementRole } from '@/utils/auth';
import { loginDestination } from '@/utils/navigation';
import { SessionLoading } from '@/components/feedback/SessionLoading';
import { LoginPage } from '@/pages/auth/LoginPage';
import { AccountVerificationPage } from '@/pages/auth/AccountVerificationPage';
import { WorkspacePage } from '@/pages/WorkspacePage';
import { HomePage } from '@/pages/customer/HomePage';
import { ApartmentDetailPage } from '@/pages/customer/ApartmentDetailPage';
import { MyRentalRequestsPage } from '@/pages/customer/MyRentalRequestsPage';
import { MyInvoicesPage } from '@/pages/customer/MyInvoicesPage';
import { InvoiceDetailPage } from '@/pages/customer/InvoiceDetailPage';
import { ProfilePage } from '@/pages/account/ProfilePage';
import { AccountSettingsPage } from '@/pages/account/AccountSettingsPage';

function RequireAccount({ children, role, verified = true }: { children: ReactNode; role?: 'MANAGER' | 'CUSTOMER'; verified?: boolean }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <SessionLoading />;
  if (!user) return <Navigate to="/login" state={{ returnTo: location.pathname }} replace />;
  if (role === 'MANAGER' && !hasManagementRole(user)) return <Navigate to="/" replace />;
  if (role === 'CUSTOMER' && !user.roles.includes('CUSTOMER')) return <Navigate to="/app" replace />;
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
    <Route path="/app" element={<RequireAccount role="MANAGER"><WorkspacePage /></RequireAccount>} />
    <Route path="/my/rental-requests" element={<RequireAccount role="CUSTOMER"><MyRentalRequestsPage /></RequireAccount>} />
    <Route path="/my/invoices" element={<RequireAccount role="CUSTOMER"><MyInvoicesPage /></RequireAccount>} />
    <Route path="/my/invoices/:id" element={<RequireAccount role="CUSTOMER"><InvoiceDetailPage /></RequireAccount>} />
    <Route path="/account/verification" element={<RequireAccount verified={false}><AccountVerificationPage /></RequireAccount>} />
    <Route path="/account/profile" element={<RequireAccount verified={false}><ProfilePage /></RequireAccount>} />
    <Route path="/account/settings" element={<RequireAccount verified={false}><AccountSettingsPage /></RequireAccount>} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}

import { useAuth } from '@/hooks/useAuth';
import { SessionLoading } from '@/components/feedback/SessionLoading';
import { LoginPage } from '@/pages/auth/LoginPage';
import { AccountVerificationPage } from '@/pages/auth/AccountVerificationPage';
import { WorkspacePage } from '@/pages/WorkspacePage';

export function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <SessionLoading />;
  if (!user) return <LoginPage />;
  if (user.accountStatus !== 'ACTIVE' || user.contactVerificationStatus !== 'VERIFIED') {
    return <AccountVerificationPage />;
  }
  return <WorkspacePage key={user.id} />;
}

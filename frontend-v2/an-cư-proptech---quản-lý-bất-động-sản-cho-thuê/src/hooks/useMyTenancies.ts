import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { myTenancies } from '@/services/billing/billingService';
import type { Tenancy } from '@/types/billing';
export function useMyTenancies() {
  const { user } = useAuth();
  const [tenancies, setTenancies] = useState<Tenancy[]>([]);
  const [accountId, setAccountId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const eligible = user?.roles.some(role => role === 'CUSTOMER' || role === 'OWNER') && user.accountStatus === 'ACTIVE' && user.contactVerificationStatus === 'VERIFIED';
  useEffect(() => {
    let active = true; setTenancies([]); setError('');
    if (!eligible) { setLoading(false); return; }
    setLoading(true);
    myTenancies().then(data => { if (active) { setTenancies(data); setAccountId(user!.id); } }).catch(e => { if (active) setError(e.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user?.id, eligible]);
  return { tenancies: eligible && accountId === user?.id ? tenancies : [], loading, error };
}

import { useEffect, useState } from 'react';
import { getProfile } from '@/services/auth/accountService';
import type { AccountProfile } from '@/types/account';
export function useAccountProfile() {
  const [profile, setProfile] = useState<AccountProfile | null>(null);const [error, setError] = useState('');const [loading, setLoading] = useState(true);const [revision, setRevision] = useState(0);
  useEffect(() => { let active = true;setLoading(true);setError('');getProfile().then(p => { if (active) setProfile(p); }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });return () => { active = false; }; }, [revision]);
  return { profile, setProfile, error, loading, reload: () => setRevision(v => v + 1) };
}

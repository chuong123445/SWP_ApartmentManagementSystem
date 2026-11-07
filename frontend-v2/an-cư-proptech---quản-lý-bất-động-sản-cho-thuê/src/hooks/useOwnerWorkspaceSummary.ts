import { useCallback, useEffect, useState } from 'react';
import { getOwnerWorkspaceSummary } from '@/services/owner/workspaceService';
import type { OwnerWorkspaceSummary } from '@/types/owner';

export function useOwnerWorkspaceSummary(enabled: boolean, propertyId: string, externalRevision: string) {
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision(value => value + 1), []);
  const key = JSON.stringify([propertyId, externalRevision, revision]);
  const [snapshot, setSnapshot] = useState<{ key: string; data: OwnerWorkspaceSummary | null; error: string } | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let active = true;let inFlight = false;
    const load = async () => {
      if (!active || inFlight) return;
      inFlight = true;
      try { const data = await getOwnerWorkspaceSummary(propertyId);if (active) setSnapshot({ key, data, error: '' }); }
      catch (e) { if (active) setSnapshot({ key, data: null, error: e instanceof Error ? e.message : 'Không tải được số đếm.' }); }
      finally { inFlight = false; }
    };
    const refresh = () => { if (document.visibilityState === 'visible') void load(); };
    void load();const timer = window.setInterval(refresh, 10000);
    window.addEventListener('focus', refresh);window.addEventListener('ancu:tenancy-changed', refresh);document.addEventListener('visibilitychange', refresh);
    return () => { active = false;window.clearInterval(timer);window.removeEventListener('focus', refresh);window.removeEventListener('ancu:tenancy-changed', refresh);document.removeEventListener('visibilitychange', refresh); };
  }, [enabled, propertyId, key]);
  const current = enabled && snapshot?.key === key ? snapshot : null;
  return { data: current?.data ?? null, error: current?.error ?? '', loading: enabled && !current, reload };
}

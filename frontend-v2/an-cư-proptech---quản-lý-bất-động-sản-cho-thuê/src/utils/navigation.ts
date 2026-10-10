import type { AuthUser } from '@/types/auth';
import { hasManagementRole } from '@/utils/auth';

export function loginDestination(user: AuthUser, returnTo: unknown) {
  if (typeof returnTo === 'string' && (/^\/apartments\/[0-9a-f-]{36}$/i.test(returnTo) || ['/', '/app', '/my/rental-requests', '/account/verification'].includes(returnTo))) return returnTo;
  return hasManagementRole(user) ? '/app' : '/';
}

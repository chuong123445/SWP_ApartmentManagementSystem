import type { AuthUser } from '@/types/auth';
import { hasManagementRole } from '@/utils/auth';

export function loginDestination(user: AuthUser, returnTo: unknown) {
  if (returnTo === '/admin/property-dossiers' && user.roles.includes('ADMIN')) return returnTo;
  if (user.roles.includes('ADMIN') && (!returnTo || returnTo === '/app')) return '/admin/property-dossiers';
  if (typeof returnTo === 'string' && (/^\/(?:apartments|my\/invoices)\/[0-9a-f-]{36}$/i.test(returnTo) || ['/', '/app', '/my/rental-requests', '/my/invoices', '/account/verification', '/account/profile', '/account/settings', '/account/settings/password', '/account/settings/email', '/account/settings/phone'].includes(returnTo))) return returnTo;
  return hasManagementRole(user) ? '/app' : '/';
}

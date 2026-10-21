import type { AuthUser } from '@/types/auth';
import { hasManagementRole } from '@/utils/auth';

export function loginDestination(user: AuthUser, returnTo: unknown) {
  if (typeof returnTo === 'string' && returnTo.startsWith('/admin') && user.roles.includes('ADMIN')) return returnTo;
  if (user.roles.includes('ADMIN') && (!returnTo || returnTo === '/app')) return '/admin';
  if (typeof returnTo === 'string' && (/^\/(?:apartments|my\/invoices|my\/contracts)\/[0-9a-f-]{36}$/i.test(returnTo) || ['/', '/app', '/admin', '/admin/dashboard', '/admin/property-dossiers', '/admin/apartment-edits', '/my/rental-requests', '/my/invoices', '/my/contracts', '/account/verification', '/account/profile', '/account/settings', '/account/settings/password', '/account/settings/email', '/account/settings/phone'].includes(returnTo))) return returnTo;
  return hasManagementRole(user) ? '/app' : '/';
}

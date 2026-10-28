import type { AuthUser } from '@/types/auth';
import { hasManagementRole } from '@/utils/auth';

// Chỉ quay lại route có thật trong ứng dụng; ID BIGINT giữ dạng chuỗi để không mất độ chính xác.
const returnPages = new Set([
  '/', '/app', '/my/rental-requests', '/my/invoices', '/my/contracts',
  '/account/verification', '/account/profile', '/account/settings',
  '/account/settings/password', '/account/settings/email', '/account/settings/phone', '/account/settings/identity',
  '/account/owner-upgrade', '/account/rental-properties', '/account/property-notices',
  '/account/properties/new', '/account/properties/new/ownership', '/account/properties/new/authorization', '/account/properties/new/sublease',
]);
export function loginDestination(user: AuthUser, returnTo: unknown) {
  if (returnTo === '/admin/property-dossiers' && user.roles.includes('ADMIN')) return returnTo;
  if (user.roles.includes('ADMIN') && (!returnTo || returnTo === '/app')) return '/admin/property-dossiers';
  if (typeof returnTo === 'string' && (/^\/(?:apartments|my\/invoices|my\/contracts)\/[1-9][0-9]*$/.test(returnTo) || returnPages.has(returnTo))) return returnTo;
  return hasManagementRole(user) ? '/app' : '/';
}

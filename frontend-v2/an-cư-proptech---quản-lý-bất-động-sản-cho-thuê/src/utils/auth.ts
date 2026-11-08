import type { AuthUser } from '@/types/auth';

// Controls UI visibility only. Backend still enforces real authorities.
export function hasManagementRole(user: AuthUser) {
  return user.roles.some(role => role === 'OWNER' || role === 'ADMIN');
}


export function hasRentalRole(user: AuthUser) {
  return user.roles.includes('CUSTOMER');
}

export function managementRole(user: AuthUser): 'ADMIN' | 'OWNER' | undefined {
  return user.roles.includes('ADMIN') ? 'ADMIN' : user.roles.includes('OWNER') ? 'OWNER' : undefined;
}

export function accountWorkspaces(user: AuthUser) {
  const links: { to: string; label: string }[] = [];
  if (hasRentalRole(user)) links.push({ to: '/', label: 'Tìm thuê căn hộ' });
  if (user.roles.includes('OWNER')) links.push({ to: '/app', label: 'Quản lý cho thuê' });
  if (user.roles.includes('ADMIN')) links.push({ to: '/admin/property-dossiers', label: 'Quản trị hệ thống' });
  return links;
}

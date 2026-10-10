import type { AuthUser } from '@/types/auth';

// Controls UI visibility only. Backend still enforces real authorities.
export function hasManagementRole(user: AuthUser) {
  return user.roles.some(role => role === 'OWNER' || role === 'ADMIN');
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { accountRoleLabel, accountWorkspaces, hasRentalRole, managementRole } from '../src/utils/auth';
import type { AuthUser } from '../src/types/auth';
const account = (roles: AuthUser['roles']): AuthUser => ({ id: '7', email: 'roles@example.invalid', fullName: 'Test', roles, accountStatus: 'ACTIVE', contactVerificationStatus: 'VERIFIED', version: 0 });
test('dual capability navigation is independent of role array order', () => {
  for (const roles of [['CUSTOMER','OWNER'],['OWNER','CUSTOMER']] as AuthUser['roles'][]) {
    const user=account(roles);
    assert.equal(managementRole(user),'OWNER');assert.equal(hasRentalRole(user),true);
    assert.deepEqual(accountWorkspaces(user).map(x=>x.to),['/','/app']);
    assert.match(accountRoleLabel(user,true),/Owner.*Tenant/);
    assert.doesNotMatch(accountRoleLabel(user,false),/Tenant/);
  }
});
test('Customer cannot select management and Admin does not acquire rental capability', () => {
  assert.deepEqual(accountWorkspaces(account(['CUSTOMER'])).map(x=>x.to),['/']);
  assert.equal(managementRole(account(['CUSTOMER'])),undefined);
  assert.deepEqual(accountWorkspaces(account(['ADMIN'])).map(x=>x.to),['/admin/property-dossiers']);
  assert.equal(hasRentalRole(account(['ADMIN'])),false);
  assert.equal(hasRentalRole(account(['OWNER'])),false);
});

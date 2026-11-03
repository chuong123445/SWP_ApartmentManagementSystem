# Account memberships and contract-derived Tenant

Approved 03 November 2026. One account may manage its own rental property and rent another person's apartment. Public registration remains CUSTOMER only; OWNER is added by the existing successful property source import / Admin-approved onboarding flow. ADMIN stays separately provisioned. No TENANT account role, self-service grant endpoint or authority from browser/provider role claims.

## Storage and compatibility

V50 adds `auth_account_roles(account_id BIGINT, role VARCHAR(20))`, composite primary key, FK to `auth_accounts`, and CHECK for ADMIN/OWNER/CUSTOMER. Initial migration copies each existing role and adds CUSTOMER to existing OWNER accounts; status, verification, password/session history, account versions, fixtures and contracts are unchanged. Membership is canonical. The old `auth_accounts.role` remains a compatibility projection during transition; no permission/query reads that column. The deprecated upgrade context retains its singular role field plus the authoritative roles array.

Replay never grants membership from the legacy column again. An account with no canonical membership causes startup migration to fail closed, identifying an old-writer or incomplete migration problem. Stop old backend writers before migration/new backend deployment. V50 is independent of pending diagram-readiness V46–49; this PR does not deploy the pending payment-table rename or restore/delete archives. Do not apply this migration alone beneath an old running backend.

JPA uses an eager Set so detached authenticated accounts retain their memberships and duplicate roles are not created. Internal creation initializes roles; authorized Owner acquisition adds membership without replacing CUSTOMER. No public controller binds AuthAccount entities or accepts role arrays. Existing guarded fixture cleanup removes membership rows before the account; no cascade delete is added.

## Authentication and authorization

Login/refresh JWT and AuthUserResponse/profile return all roles in stable order; order has no authorization meaning. Access JWT remains memory-only, refresh opaque HttpOnly cookie, rotation/revocation/CSRF unchanged. The resource-server converter reads the current server account memberships on every authenticated request; JWT roles are descriptive and cannot retain a revoked role or escalate a Customer/Owner to Admin. Pending/unverified accounts receive only ONBOARDING authority. Existing account-lock and per-command verification policies still apply; Owner's rental actions use the rental verification policy, not Owner's phone-only gate.

Owner capability never replaces object ownership. Query predicates, access services and account checks use membership; Apartment→Property→Owner and exact Contract.customer remain enforced. A dual-role account signs the customer slot when renting from another owner and cannot manage that other owner's draft/billing. Rental request submission to one's own apartment stays forbidden. Ending one tenancy does not mutate account roles; other active contracts/history remain independently scoped.

## UI and API

Existing roles arrays remain arrays: CUSTOMER; OWNER+CUSTOMER; or ADMIN. `GET /api/v1/me/owner-upgrade` adds roles while retaining role for compatibility. Profile OpenAPI describes memberships; no role mutation API is added. Registration rejects role/roles/requestedRole as before.

Account menu exposes actual permitted workspace links: Tìm thuê căn hộ, Quản lý cho thuê, or Quản trị hệ thống. Switching is navigation, with no role/session mutation. Manager role is selected explicitly, never roles[0]. Tenant labels depend on ACTIVE contract data. Contract back navigation follows the actual party, including the private legacy tenancy fallback. Existing Owner shell/common tab state stays in its current structure.

## Validation

SQL migration upgrade/replay/no-regrant/PK/FK/CHECK/account-contract preservation and old-writer guard are exercised by tools/verify-account-roles.ps1 on a fresh isolated SQL Server database. Targeted SQL integration covers auth/JWT/refresh/stale role claims, registration, discovery, property approval/import, contracts and billing/security. UI unit/type/build and desktop/mobile Playwright fixture checks cover role order, dual workspace navigation, contract-party navigation, single-role Customer/Admin and revoked Owner links. See the implementation report for actual outcomes and limitations.

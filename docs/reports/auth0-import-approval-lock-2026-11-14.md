# Auth0 asset import: false REVIEW_BUSY — 14 November 2026

User screenshot showed “Đang xử lý hồ sơ khác. Hãy thử lại.” at final Auth0 asset
import. This is PropertyDuplicatePolicy/REVIEW_BUSY, not an Auth0 login error.
Read-only inspection found no persistent application lock in the app database.

Reproduced before fix with a fresh TransactionTemplate and no outer test
transaction: @@TRANCOUNT=0, lockApproval returned false without a competing
request. SQL Server EXEC alone does not start an implicit transaction, while
sp_getapplock with LockOwner=Transaction needs an active SQL transaction. Old
@Transactional tests had already executed fixture SQL and masked this path.
See [SQL Server implicit transactions](https://learn.microsoft.com/en-us/sql/t-sql/statements/set-implicit-transactions-transact-sql)
and [transaction-owned application locks](https://learn.microsoft.com/en-us/sql/relational-databases/system-stored-procedures/sp-getapplock-transact-sql).

PropertyDuplicateRepository now reads an empty indexed property range on the
same Spring/JDBC-bound connection before acquiring the existing global lock.
No explicit nested BEGIN/COMMIT, session lock, timeout increase, bypass or
weakening of certificate/evidence duplicate checks. Mandatory transaction,
10-second timeout, exclusive resource and commit/rollback release are retained.
No migration, data reset or live Auth0 call while holding the SQL lock added.
Context7 Spring Framework7.0.5 connection/transaction docs consulted for shared
JpaTransactionManager/JdbcTemplate participation (project Boot4.1.1).

Validation evidence — final run **47 backend PASS, zero failures/skips**:

- Red: fresh-transaction test failed before change with expected true/actual
  false (target/approval-lock-red.log).
- New3 lock tests PASS: fresh transaction, exactly one SQL transaction (no nesting
  leak), commit/rollback release, real concurrent requester waits then succeeds.
- Existing18 dossier tests PASS after correcting an outer-test-transaction
  fixture flush: real upload commits binary content before a separate submit.
- Auth0 import fixture certificates now unique per asset because an existing
  non-transactional concurrency test commits data; fixed static CERT-TEST
  collisions across methods/reruns without altering production duplicate policy.
- Auth0 import26 regression tests PASS after fixture isolation; dossier18 and
  new lock3 PASS in the same final run (target/approval-lock-green.log).
- TypeScript PASS. Eight Playwright MCP checks at1440/390 PASS: initial single/
  all-room import, Customer→Owner management link appears immediately after
  reloadUser, same-property append, blocked reconciliation, stale409/reload,
  current per-room photo UI. No unexpected console/request errors or page overflow.
  Existing browser fixtures updated for collapsed multi-room details, separate
  room/parent images and removed optional meter inputs; no production UI change.

Follow-up account question: read-only DB confirms Trần Thị Thu Hà/account31 is
ACTIVE, roles OWNER+CUSTOMER, owns approved property26 with one room and has
VERIFIED Auth0 evidence. No role/data change needed. Browser test confirms the
existing reloadUser callback updates management navigation on successful import;
an old tab should reload or sign in again if it still holds pre-promotion state.

Tests use isolated SQL database ancu_auto_rent_20261114 and mocked provider/API
fixtures; not a claim of live Auth0 success in the user's browser. No application
DB writes, credential/role reset, provider modifications or push. Own Vite3196 stopped after verification. Three unrelated
VNeID diagnostic files preserved. Restart backend to load the fix.

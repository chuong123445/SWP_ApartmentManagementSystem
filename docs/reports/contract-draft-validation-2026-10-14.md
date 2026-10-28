# Contract draft authoring and review — 14 October 2026

Delivered the authorized T15/T25 slice. Owner creates/reopens a contract from the exact ACCEPTED request through six steps derived from all nine images in `Sample_Contract_progress`. Saved parties/property information is review-only; Owner supplies commercial conditions and can edit/add/delete/reorder/restore or entirely replace the seven original sample clauses. Customer account menu includes **Hợp đồng của tôi**, with private access to the exact assigned contract. User explicitly chose **Hoàn thiện tạo và rà soát bản nháp trước**; signing remains outside this task.

Implementation commits: **2a745fe** backend/API/migration/ADR, **e7bf4da** UI/clients/navigation/unit tests, **fd736ed** isolated browser fixtures/concurrency/regression. No push.

## Validation actually run

| Check | Result and evidence |
|---|---|
| Maven compile | PASS, Java21/Boot4.1.1 |
| SQL Server integration | PASS **44/44**, failures/errors/skips0: ContractDraftIntegrationTests13, DiscoveryRentalIntegrationTests22, BillingIntegrationTests9. `ancu-proptech-backend/target/contract-draft-tests.log`; finished14/10 09:48:27 UTC+7. |
| TypeScript / frontend unit / production build | PASS on final UI: **36/36**, including4 new contract command/validation/DRAFT mapping tests; Vite8.3.4. Existing native-config/large-chunk warnings remain. |
| Isolated contract Playwright | PASS final **11.2s** using Edge, actual API/SQL: saved phone/address/date of birth, read-only parties, asset/amenities, required commercial conditions, state preserved on back/next, seven clauses/custom edit/add/reorder/delete/complete replacement, save/reload/reopen/update, exact Customer review, no-store, Apartment still CONTRACT_IN_PROGRESS, no page errors, desktop1440/mobile390 and no overflow. Earlier green workflow11.8s preceded positive profile metadata coverage. |
| SQL concurrency in Playwright | PASS: fresh accepted selection, two create commands → **201/409** and exactly one draft; two edits with same version → **200/409**. No activation or payment mutation. |
| Rental decisions regression | PASS **45.7s** (combined run's contract metadata test failed as described below, rental workflow passed): actual isolated accept/reject, persisted reasons, Owner inventory refresh, Customer foreground update, enabled contract action and mobile. |
| Visual QA | Viewed final Owner wizard and Customer review mobile PNGs in `frontend-v2/.../test-results/visual/contract-*.png`; readable, no horizontal clipping. |
| OpenAPI | JSON parse PASS, **49** schema refs, **0** invalid; six implemented routes. |
| Git diff/staging | Checked each unit, excluded credentials/logs/screenshots/build artifacts and concurrent identity edits. |
| Cleanup / dedicated servers | All isolated fixtures cleaned; zero manifest files. Confirmed test8082PID9208 and Vite3002PID4112 by command line, stopped; **0** listeners. SQL Server/user application retained. |

Initial frontend tests/build were sandbox-blocked (Node spawnEPERM/native dependency loading); authorized elevated rerun passed. Initial browser attempt exposed a textarea accessible label including its value; fixed with explicit htmlFor/id. Positive profile metadata rerun exposed UTF8-without-BOM PowerShell5 fixture address corruption; helper now UTF8-with-BOM and final same Vietnamese address check passed. Failures are recorded, not labeled PASS.

Read-only final SQL audit: **0 authored drafts**, **0 E2E accounts**, **0 E2E properties**, **2 existing contracts**, **3 invoices**, **13 apartments**, **3 unique indexes** on contract_drafts. Canonical customer@ancu.local remains PENDING_VERIFICATION/version1/emailVerified=false/phoneVerified=false/contactVerified=false. Previous handoff said12 apartments; that was not a fresh pre-task DB count. Do not remove an existing apartment to match an old report. This task's persisted browser fixtures are fully scoped and removed; tests otherwise use rollback.

## Module index and boundaries

- Backend controller/service/repository/model/dto/config under **contract**: ContractDraftController, ContractDraftService, ContractTemplates, ContractDraftRepository, ContractDraft, ContractSnapshot/terms/create/update/context/response, PrivateContractCacheConfig. Idempotent additive V10 and explicit security routes.
- Create locks request then apartment, checks exact ownership/ACCEPTED/current source versions/eligible Customer/no current contract. Unique request FK protects duplicates. Updates lock owned request then contract; independent contentVersion increments for terms-only edits without changing billingVersion. Snapshot remains immutable.
- Frontend `components/contract`, `services/contract`, `types/contract`, `utils/contract`; Owner RequestList/RentalRequestsPage/ContractsPage, shared AppRoutes/WorkspaceRoutes/AccountMenu, Customer MyContractsPage/ContractDetailPage. Existing shell/common state preserved. DRAFT no longer maps to terminated and never creates an ACTIVE Tenant relationship.
- Fixture helper optional AllowContractDrafts checks exact fresh account UUID/email/name/role/property/selected request/customer/DRAFT/no baseline/no invoices before cleanup. Default helper still rejects contracts. No canonical-account password/history reset.
- Docs: contract-drafts-v1 ADR + contract-drafts OpenAPI in tracked docs and root copies. Root API_DOCUMENT/PROJECT_DESCRIPTION/CODING_PLAN/AGENTS/WORK_PROGRESS reflect this slice; RDS/diagrams untouched.

## Sources and remaining work

Seven editable original suggestions: delivery/use, purpose/building rules, rent/services, deposit reconciliation, repairs, renewal/termination and written amendment. See [research/source mapping](../decisions/contract-drafts-v1.md); not five websites. No mandatory fixed deposit, forfeiture, notice period or lifecycle enforcement was invented.

Structured CCCD/certificate metadata was absent from the tested baseline; unavailable fields are displayed honestly. No OCR/private evidence disclosure, legal identity claim, signature canvas, signed download, signing email/SMS link, provider/callback, activation, release, stepped price/VAT/additional automatic charge or payment integration. Live Gmail/SMS/signing are NOT_RUN. Full T16/T17 and related lifecycle gates remain open. Customer draft review is not signing or approval.

Legacy RDS/diagrams have not been rewritten. Their identity-review/account-role, contract-signing/provider, contract-specification and invoice/lifecycle sections require reconciliation in a separately authorized RDS task. The existing legacy ACTIVE-contract preview retains earlier provider/certificate placeholders; the new DRAFT preview does not use that prototype preview and makes no provider/certificate claims. Legacy UI cleanup remains a separate concern.

Concurrent **ACCOUNT-IDENTITY / DISCOVERY-AUDIT** work appeared after authoring checks/commits: modified AuthAccountRepository/SecurityConfig and new identity domain/V11 are unrelated and preserved, excluded from this task's commits/test claims. Its future structured identity contract should be integrated after that work's validation and privacy boundary are confirmed. A plan/untracked source file is not proof of a completed identity integration.

Resume: restart the user's backend through IDE Run to load V10/new APIs, reload frontend, Owner → **Yêu cầu thuê** → ACCEPTED → **Tạo hợp đồng**. Owner **Hợp đồng** tab opens saved drafts; Customer account menu → **Hợp đồng của tôi**. No dedicated test servers remain. Preserve concurrent identity work.

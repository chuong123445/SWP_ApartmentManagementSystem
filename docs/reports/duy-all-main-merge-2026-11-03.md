# Merge main into Duy/all — 03 November 2026

User authorized updating the existing GitHub `Duy/all` PR branch with main, resolving conflicts and pushing back to that branch. Prepared in an isolated worktree from `Duy/all` 09a090b and merged main 3cafe58. No force push, rebase, main push or PR merge.

The only textual conflict was `ancu-proptech-backend/src/main/resources/application.properties`. Resolved to one `spring.sql.init.schema-locations` declaration containing all 45 distinct existing script paths from both parents; kept `spring.sql.init.mode=always` and the configured GO separator. Retained both V42 scripts (renewal/expiry notices and billing meter readings) and both V45 scripts (citizen details and source unit selection). No SQL files were renamed or modified. This project uses Spring's explicit SQL initialization list, not Flyway migration version discovery.

Reviewed automatically merged billing controller/service/workspace/routes/client changes: Duy's saved meter reading and tariff flow remains, alongside main's paginated Owner paid invoice/received receipt history. No manual functional code edits were needed beyond the SQL initialization list.

Validation of the combined tree:

- **95 backend tests passed**, zero failures/errors/skips: VneidIntegrationTests 18, BillingIntegrationTests 16, SepayIntegrationTests 20, PropertyDossierIntegrationTests 15, VneidPropertyImportIntegrationTests 26. Executed offline against an isolated existing SQL verification clone with mail, seeds, AI and lifecycle scheduler disabled; startup loaded the combined schema list. No application database migration, payment mutation or live provider operation was performed.
- **101 frontend unit tests passed**; TypeScript and native Vite production build passed. Existing >500 kB chunk warning remains.
- **14 Playwright MCP scenarios passed**: Duy's persisted meter/tariff → invoice creation at desktop/mobile (2) and main's paid Owner history/filter/pagination/error/focus/property flow at 1440/390 px (12). Browser APIs mocked; no real invoice/payment writes. Inspected the mobile creation screenshot. Meter test additionally checked horizontal overflow. The first harness attempt retained a mobile viewport for the desktop case; reset viewport between cases and the full final run passed.
- All configured SQL paths exist and are unique. Git has no unmerged entries or remaining conflict markers; staged whitespace check passed.

Temporary test server is stopped after validation; existing user servers and the main checkout are preserved. Review this branch's existing PR before merging to main. This merge does not incorporate the separate pending tenancy/read-view PR31.

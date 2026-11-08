# Home AI chat — 09 November 2026

Implementation and local commits are complete. Live Gemini conversation and the application database flow still require verification.

## Completed backend checkpoint

Commit `6bc5798` — `feat(ai): thêm hội thoại có ngữ cảnh và bộ lọc đã kiểm tra`.

New POST `/api/v1/apartments/ai-chat` accepts current text, explicit consent and at most eight user/assistant history messages. Returns conversational reply plus validated search capability. Reuses rate limits, Gemini adapter, address/filter validation, audit hashes and existing capability apply endpoint; no new database migration. Backend files: AiSearchDtos, AiSearchController, AiSearchService, SecurityConfig, resources/ai/apartment-chat-v1.txt and apartment-chat.schema.json. AI assistance OpenAPI/customer AI search ADR updated. Existing extraction route remains compatible.

## Frontend checkpoint f91b9c7

Under `frontend-v2/an-cư-proptech---quản-lý-bất-động-sản-cho-thuê/`:

- `src/components/apartments/AiSearchPanel.tsx`: replaces embedded form with portal-based floating chat; closed initially, persistent collapsed history, plain-text bubbles, consent, send/loading/error states, keyboard behavior, auto apply.
- `src/services/apartments/aiSearchService.ts`: chat DTO/API and abort signal for apply.
- `src/styles/ai-chat.css`: new desktop/mobile bottom-right panel and launcher.
- `e2e/ai-search.spec.js`: updated browser regression scenario for conversational chat and automatic filters.

HomePage existing onApply callback synchronizes normal filters and queries catalog; no separate preview form or manual AI apply button. General replies/all-null filters do not apply. Provider/apply failures preserve current filters. Latest mobile CSS accounts for scrollbar width; focus uses preventScroll.

## Actual validation

- PASS 11 backend tests: 7 AiSearchIntegrationTests (4 new chat cases) +4 GeminiAssistanceClientTests; Maven exit0. Separate SQL Server test DB `ancu_settlement_test_20261103`, mocked provider. Evidence `ancu-proptech-backend/target/chat-tests-final.log`.
- PASS143 frontend unit tests. Evidence `F:/2026/Fa26/DTD/tmp/chat-fe-tests.log`.
- PASS TypeScript noEmit and final Vite build. Existing chunk-size warning. Evidence `F:/2026/Fa26/DTD/tmp/chat-build-final.log`.
- PASS Playwright MCP at1440x900 and390x900 using API fixtures: default closed/old CTA absent, consent, normal conversation without filter application, subsequent history, automatic combined query/main filter sync, close/reopen retained messages, Escape, provider503 and apply503 preserving filters, no horizontal overflow or unexpected scenario console/network/page errors.
- Viewed desktop/mobile PNGs; latest screenshots `F:/2026/Fa26/DTD/tmp/ai-chat-{1440,390}.png`; executed MCP script `F:/2026/Fa26/DTD/tmp/chat-browser.js`. The main browser tab initially loaded the real local app and logged auth/network errors; fixture scenarios use independent contexts and report their own clean error arrays. Do not describe this as live appDB testing.
- Earlier new-test attempt was interrupted because apply held a lock before another separately committed audit operation in the same transactional test. Split cases. Subsequent matcher compared DTO records to maps incorrectly; corrected serialized-content assertion. Final11PASS above supersedes these failed/interrupted attempts.

No live Gemini conversation/delivery or application database flow verified. No push, PR, production/provider action or catalog reset. Backend must restart to load new endpoint; frontend must reload.

## Resume and preservation

Observed current branch is `fix/property-dossier-without-bank`, changed during the session. Inspect status/diff first. Concurrent unrelated property DTO/model/services/right-resolution changes and V61__property_dossier_payment_optional.sql appeared during work; preserve and exclude from chat commit. Also preserve three pre-existing VNeID diagnostic files. Do not stage all files.

Resume completed with UI commit f91b9c7. Parent API_DOCUMENT and CODING_PLAN include the new chat behavior. Restart backend and reload frontend for live Gemini verification.

## Resumed completion

UI commit `f91b9c7` contains the four frontend chat files. Reviewed working tree against the checkpoint and formatted the new CSS for review.

143 frontend unit tests, TypeScript noEmit and Vite build passed again. Evidence is tmp/chat-fe-tests-resume.log and tmp/chat-build-resume.log under the DTD workspace. Existing chunk-size warning persists. Backend is unchanged from the earlier 11-test successful run.

Playwright MCP repeated the desktop1440/mobile390 API-fixture scenarios successfully. Chat history, automatic filtering and normal control synchronization passed. Provider/apply failures retained current filters. Scenario console/network/page error arrays were empty and there was no horizontal overflow. Initial resumed browser navigation timed out while Vite was sandboxed. Running the authorized test server outside the sandbox resolved access, after which both scenarios passed. Temporary Vite3197 was stopped after validation.

Live Gemini conversation and application database integration remain unverified. Current code needs a backend restart and frontend reload. The current branch is fix/property-dossier-without-bank. Concurrent property/bank changes, V61 migration and three diagnostic files remain outside the chat commits.
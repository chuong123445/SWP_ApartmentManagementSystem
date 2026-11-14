# Automatic evidence extraction, 09/11/2026

Branch `fix/property-auto-extraction`, based on `b262268`.

## Implemented

- Manual listing wizard automatically submits uploaded evidence to the configured Gemini extraction service and populates readable property/legal fields. Removed scan and per-field apply buttons from this wizard. Final precheck also runs automatically. Explicit user authorization is recorded in the task, existing API consent parameter is true.
- Preserve manual corrections, provenance and partial upload successes. Save evidence before AI. Resume scans files without a successful extraction. AI failure keeps ordinary completion available.
- Extract city/district/ward explicitly. Literal address fallback recognizes Vietnamese administrative prefixes, including Thành phố Thủ Đức. Missing levels remain blank.
- Fixed dd/MM/yyyy text inputs in wizard and dossier forms, date display in details/review. API remains ISO. Backend normalizes DMY/ISO and removes false same-date mismatch. Prompt/schema distinguish applicant from principal and exempt nonapplicable ownership/authorization fields.
- Full PDF set regenerated as OWNERSHIP for Nguyễn Văn Chương. Former full certificate and authorization PDFs moved byte-identically to mismatch case. Three folders, script, input guides, PNGs and ZIP v4 updated outside Git.

## Verification

- 22 backend unit tests passed, compile/testCompile passed. Includes strict DMY parsing, equivalent date finding removal and correct finding relevance by right type.
- 151 frontend tests passed. TypeScript and Vite build passed, existing chunk-size warning remains.
- Playwright MCP ran current compiled UI through mocked APIs at 1440 and 390. Automatic upload/fill, address fields, fixed dates, save/reload, selected rooms and AI failure recovery passed. Final automatic precheck checked with two fixture files. No unexpected console/network errors. Durable browser cases updated. This is mocked API evidence, not live provider/SQL validation.
- Four proof PDFs each one page, full identity/date text checks, former full PDFs byte comparison and ZIP integrity passed. Full certificate and guide contact sheet visually reviewed. PDF source includes cached identity provenance separately from proof documents.

## Limits and resume

Direct scoped read-only SQL query was blocked by socket permissions. Identity values use screenshot plus existing local account-profile export dated 04/11/2026. Current live DB identity has not been verified. No live Gemini extraction was observed. Existing SQL migration/concurrency/rollback acceptance gates from L01–L07 remain. Existing stored AI results require re-scan for new comparison rules. Legacy dossier editor retains its independent precheck controls, this automatic extraction flow starts at `/account/properties/new`.

No bank added, no L08 implementation, no live data mutations. Three preexisting VNeID diagnostic files excluded. No push.

# Contract drafts v1 — 14 October 2026

## Override 3 November 2026 — direct PDF completion

The final wizard step is now **Bản PDF**. **Tạo và xem PDF** on the clause step saves the draft (or its pending edits), then immediately loads the existing private server PDF endpoint. It does not repeat the HTML party/asset/terms table. Save failures permit an explicit retry; conflicts require reloading current context, and PDF-only failures retry the read without creating another contract. Signing remains a separate explicit action; ordinary and renewal authoring share this behavior.

User's subsequent correction requires the paper form's structure and typography: serif national heading and title; **Hôm nay, ngày … tháng … năm …**, address, **Chúng tôi gồm**; numbered **1. BÊN CHO THUÊ … (Bên A)** / **2. BÊN THUÊ … (Bên B)**; name/birth and CCCD/issue-date paired rows, permanent address, issuer labelled **Tại**, account phone. Missing permanent address stays a dotted blank and is never replaced with a contact address. Latest explicit override: print only one Bên B, the exact contract customer/invoice recipient. Omit the photo's extra blank occupant block. The single employment line remains blank; no employment value, additional party or signing authority is invented.

Then print **Sau khi bàn bạc…**, the room/unit and full address sentence, **Giá thuê là** with stored rent in digits and Vietnamese words, monthly payment day and separate **Tiền điện / Tiền nước** lines. Preserve actual metered/per-person mode and nonzero Internet/waste fees; never copy photo amounts, invent a payment interval/end-of-month deadline or hardcode a CCCD issuer. **ĐIỀU KHOẢN HỢP ĐỒNG** follows these opening sections and contains term, deposit, payment method, purpose, relevant occupant count, all saved clauses and signatures. All bank name/holder/account-number fields are excluded even when present in the snapshot. Catalog bedroom/bathroom/floor/area/amenities/certificate/right/email fields stay excluded. Noto Serif static fonts are bundled under SIL OFL; footer retains number/signing state/hash without adding those blocks above the form. Stored snapshots and signature/content-hash rules are unchanged; regenerated PDFs use this presentation.

User authorization: Owner chooses **Tạo hợp đồng** after an ACCEPTED rental request; follow the nine images in `Sample_Contract_progress/SWTi_AHC [14-10-2026 09_33]`. Six steps: apartment template, Owner review, Customer review, asset review/commercial conditions, editable clauses, complete preview. User corrected “5 pages” to **at least five clauses**. User subsequently confirmed “Hoàn thiện tạo và rà soát bản nháp trước” in the async question. No new account roles, signing provider, payment integration or release rules were authorized.

## Stored data and privacy

The request determines Apartment → Property → Owner and the exact Customer. Client cannot submit party IDs, asset data, approval, status or signature fields. Initial commercial rent/deposit suggestions come from the Apartment; Owner explicitly supplies contract dates, rent, deposit, electricity/water prices, monthly payment day, payment method and purpose. Currency is VND as the existing billing contract. Monthly payment day is 1–28 so every month has that day; no VAT, stepped prices, fixed utility fees or other automatic invoice charges are introduced.

The server snapshots saved names, email, phone, profile address/date of birth, apartment characteristics/address/amenities and latest APPROVED dossier exploitation right/receiving account. This snapshot remains unchanged when profiles/property records or draft terms change. No private document images, token/hash, account bio or raw dossier attachments are exposed. Contract reads and lists require exact party ownership; Owner alone may edit DRAFT. Responses use no-store. Customer may review their assigned draft before any ACTIVE tenancy; this does not confer a Tenant role or invoice eligibility.

The current model has no structured CCCD number/issue date/issuer for either party, and no structured certificate number/date/issuer for the Property. The reference's fields are rendered “Chưa có dữ liệu”; images are not OCR-extracted and email OTP is not presented as legal identity verification. Legacy approved properties without a real approved dossier have no receiving-account/right snapshot. The feature reuses available data rather than inventing missing values or requiring a duplicate identity form.

## Persistence and locking

Additive idempotent V10 creates `contract_drafts` with unique contract/request foreign keys, NVARCHAR(MAX) structured snapshot and clauses, DECIMAL(15,2) deposit and independent integer contentVersion. Existing ACTIVE local fixtures, baseline/history and account records are untouched.

Create locks the owned request then the apartment, checks requestVersion, ACCEPTED, CONTRACT_IN_PROGRESS, eligible Customer and absence of any non-ENDED contract for that apartment. A SHA-256 sourceVersion includes the server snapshot and source row versions; changed data between review and save returns SOURCE_CHANGED. Unique rental_request_id also prevents duplicate authoring. POST retries get CONTRACT_ALREADY_EXISTS; reopening context returns existingDraft rather than generating another contract. No general Idempotency-Key support is claimed.

Update locks the same owned request then the contract and compares independent contentVersion before applying a full terms replacement. All changes increment contentVersion; billingVersion is untouched. Snapshot/selection remain fixed. Date ordering, decimal bounds, 1–30 nonblank clauses (titles ≤150, bodies ≤4000), integer version/day and unknown-field rejection are validated. The template has seven clauses, but Owner may replace it with their own content; custom content is not forced to keep five items.

Creation remains DRAFT, Apartment remains CONTRACT_IN_PROGRESS, baselines remain null, and no signing/ACTIVE/OCCUPIED transition exists. No email/SMS signing links, signature canvas, signing callback, provider or money-transfer execution are implied by reference images 8–9. These are T16/T17 gates. Text about deposit return, notice or repair is editable contractual content, not backend lifecycle enforcement.

## Clause research and original template

Read 14 October 2026:

- [Homedy — 6 lưu ý khi lập hợp đồng thuê căn hộ](https://homedy.com/news/6-luu-y-khi-lap-hop-dong-thue-can-ho-ne4363): rent/timing, deposit/return, service charges, early termination and furniture condition.
- [Thuecanho123 — Hợp đồng cho thuê căn hộ chung cư](https://thuecanho123.com/hop-dong-cho-thue-can-ho-chung-cu-day-du-don-gian-post6.html): property/purpose/term, delivery, party obligations, repairs and written agreement.
- [Homedy — hợp đồng thuê nhà chung cư](https://homedy.com/news/hop-dong-thue-nha-chung-cu-chuan-theo-mau-moi-nhat-ne5138): review parties, price, term and payment conditions. Page has inconsistent notarization claims; no legal/notarization rule was derived.

Original short suggestions: (1) delivery/use, (2) purpose/building rules, (3) rent/service costs, (4) deposit reconciliation, (5) repairs/damage, (6) renewal/termination, (7) written review/amendment. No copied complete contract, automatic forfeiture, forced deposit amount, fixed notice period, legal certification, or provider claim. Template supports edit/add/delete/reorder/restore and complete replacement.

## Contracts and checks

Exact implemented routes/schema: `docs/api/contract-drafts.openapi.json`. T15/T25 authoring slice only. Appropriate checks and commits recorded in root WORK_PROGRESS and the validation report; do not mark full signing lifecycle DONE. RDS/diagrams remain reference artifacts; legacy contract/provider and identity sections need a separately authorized update.

## F07 correction — 28 October 2026

New contexts/drafts now use ContractPropertyEvidenceResolver: source-imported properties use immutable PropertyExternalImport source data; manual properties use their approved dossier (exact approvedRightsDossierId when present). Both return the same ContractSnapshot asset/receiving-account structure plus nullable provenance source/reference/hash/time. Auth0 imports retain rightDescription from new source reads; old snapshots without it remain missing/readable. No fake Admin review, external request on contract creation, legal claim or modification of existing saved contract snapshots.

Source receiving-account fields are private owner declarations, name-matched against the exact linked verified citizen; not bank verification. New wizard step4 can save bank/account/holder with source row version, reload context/sourceVersion without clearing terms, and then snapshot it in a new draft. Source changes after context require re-review; bank changes after saved draft do not rewrite it. Missing data stays explicit, not hardcoded. See f07-f08-f09-fixes-2026-10-28 report and updated OpenAPI.


## Override 14 November 2026 — earliest contract start

Create, edit unsigned drafts and renewal authoring require startDate >= today in Asia/Ho_Chi_Minh, with endDate > startDate. Server rejects past starts with HTTP 400 CONTRACT_START_DATE_IN_PAST. The wizard applies the same rule and approved rights bounds; overdue renewal suggestions start no earlier than today. Existing contracts, historical dates, PDFs and signing flows are not rewritten or revalidated by this authoring rule.


## Override 21 November 2026 — RA01 signing date recheck

Both signature-OTP issuance and the locked signing transaction reject startDate before Asia/Ho_Chi_Minh today with HTTP400 CONTRACT_START_DATE_IN_PAST. An OTP issued before midnight does not bypass the check after midnight. No OTP is consumed or signature saved when the date check fails. Owner/Customer slots, version/hash/consent and existing saved signatures are preserved. Unsigned drafts can revise dates through the existing update route; a partly signed obsolete draft uses the existing bilateral cancellation/re-authoring flow, not an implicit edit. History and already ACTIVE contracts are not revalidated or rewritten.

Validation:56ContractDraftIntegration cases PASS,4new date-boundary cases rerun PASS after scoping OTP assertions to fixture parties;4Playwright desktop/mobile Owner+Customer server-error scenarios PASS. MockitoSpyBean docs7.0.5 compared with project Framework7.0.9, no exact patch in catalog. Concise history lives in CHANGELOG_NGHIEP_VU.md.


## Override 21 November 2026 — RA02 waiting for first lease effectiveness

User explicitly selected automatic effectiveness at the agreed start date, with the apartment reserved beforehand. A first lease signed by both parties before startDate remains technical DRAFT plus signing.state=SIGNED and apartment CONTRACT_IN_PROGRESS; UI labels it Đã ký — chờ hiệu lực. No new enum/migration or public activation endpoint. These are not editable unsigned drafts and do not grant current tenancy/billing. Existing ACTIVE history is not rewritten.

ContractInitialActivationService runs on/after startDate, no later than endDate, only after both signatures, accepted selection, no pending cancellation, exact apartment reservation/no other open contract, current eligible parties and approved rights covering the term. It uses request→contract→apartment locks and is idempotent. Baselines are only copied from available apartment meters at activation, never invented. Signing on the start day invokes it immediately; future agreements are retried by ContractLifecycleScheduler.activateInitialLeases after1minute at startup/every1minute by default (app.contract-lifecycle.activation-delay-ms). Renewal scheduler remains unchanged. Restart downtime catches up only still-valid signed terms, never auto-releases an expired contract.

Both signed but not yet activated first leases may use the existing selection cancellation proposal/accept/reject/withdraw flow; never direct one-party cancellation after a signature. A pending proposal blocks activation, including across start day. Parent lock and sourceVersion decide races; if activation already won the parties use the active-contract exit process. Cancellation retains both signatures/hash/history, changes request/contract to CANCELLED and releases only the reserved apartment after other-claim checks. No payments/refunds implied.

Validation:60ContractDraft+2TenancySummary PASS,11SelectionCancellation PASS after correcting its old tomorrow-start fixture to today for the existing immediate-activation test;165frontend/TypeScript/build/4Playwright Owner-proposal+Customer-accept at1440/390 PASS. Tests cover early/no-op vs due/idempotent activation, retained signatures/hash, current-account recheck, unavailable billing while waiting and cancellation blocking activation. SQLtestDB/API fixtures only.

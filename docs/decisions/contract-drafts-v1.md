# Contract drafts v1 — 14 October 2026

User authorization: Owner chooses **Tạo hợp đồng** after an ACCEPTED rental request; follow the nine images in `Sample_Contract_progress/SWTi_AHC [14-10-2026 09_33]`. Six steps: apartment template, Owner review, Customer review, asset review/commercial conditions, editable clauses, complete preview. User corrected “5 pages” to **at least five clauses**. No new account roles, signing provider, payment integration or release rules were authorized.

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

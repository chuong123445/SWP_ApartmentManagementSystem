# Local contract demo refresh — 14 November 2026

User requested removing T.101/A.101 contracts between Hữu Hà (customer 2)
and Nguyễn Văn Chương (owner 3), retaining one expired sample and replacing
the old accepted-renewal sample with one near expiry and a new request.

## Applied local data operation

- Removed T.101 contracts 15 (cancelled) and 18 (active), including their drafts.
  Kept apartment 13, publication, conversations and cancellation history.
  Request 57 was cancelled; apartment 13 is now VACANT/PUBLISHED.
- Replaced old local contract 5 and its accepted renewal 3 / two expiry notices.
  Old rental request 40 is retained as CANCELLED.
- New local sample: contract **21**, rental request **60**, apartment 17
  `HH205.D10`, ACTIVE, 2026-08-21 through **2026-11-21** (D-7 on operation date).
  Renewal **5** is **PENDING** for Owner to review.
  Existing local sample artwork was reused with explicit sample wording and
  NULL signed-content hash; this does not attest a new real agreement.
- Contract 4 / HH205.TEST remains ENDED, end date 2026-10-31, with all original
  exit history and draft bytes unchanged.

## A.101 awaiting separate user choice

Contract 14 has SENT invoices 8 and 9. Invoice 9 has payment row 6 with non-null
paid_at and a MATCHED SePay event 3 (19,000 VND). Invoice 8 has unpaid payment
row 5. A.101 and all invoice/payment/provider rows remain unchanged pending
explicit confirmation to remove the financial history. No partial A.101
deletion was attempted.

## Verification and recovery

- Helper: backend `tools/refresh-contract-demo-20261114.{ps1,sql}`. Local database,
  date, party, room, source fixture, request and dependency guards; serializable
  transaction; no reseeding, provider calls, credential changes or migration.
- Backup before Apply: `F:/2026/Fa26/DTD/tmp/contract-cleanup-before-20261114-110718-673.xml`.
  Private XML/schema outside Git, re-opened and compared successfully.
- `-Validate`: mutations ran then rolled back successfully. Two earlier validation
  attempts rolled back on wrapper key ordering / active-apartment unique constraint;
  corrected before successful validation. SQL identities consumed by rollback were
  not reseeded; applied contract ID is 21.
- `-Apply`: committed after exact count-delta checks and all-column comparison of
  rows outside the mutation scope across 23 tables, including payments, SePay,
  settlement, cash, account and existing exit/cancellation/conversation history.
- Independent post-commit SQL read confirms contracts 5/15/18 absent, no orphan
  contract drafts, contract 21 D-7 / renewal 5 PENDING, contract 4 unchanged,
  T.101 VACANT and A.101 still OCCUPIED with paid invoice intact.
- Database-only work: no browser/UI or live provider verification claimed.
  No push. Three pre-existing VNeID diagnostic files remain untracked and untouched.

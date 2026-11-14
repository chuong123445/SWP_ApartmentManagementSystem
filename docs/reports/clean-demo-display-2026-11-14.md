# Contract/invoice display cleanup — 14 November 2026

User requested removing explicit sample/local wording from the recently prepared
contract and invoices. Local contract29/apartment16 display title now
“Căn hộ HH205.TEST”, purpose “Thuê căn hộ để ở.”, matching snapshot asset title.
Six invoice event reasons for invoices16–18 now use ordinary create/paid wording;
the original reasons remain in internal JSON metadata for traceability.
Payment codes/bank fixture markers, collection/source audit, paid timestamps,
amounts and existing financial history are preserved. No bank/provider events.

InvoicePaymentPanel now shows generic “Đã thanh toán” without attributing every
paid record to SePay. Already-paid invoices hide transfer instructions (bank,
account, holder, payment code); unpaid invoices retain those details.

DB helper `tools/clean-demo-display-20261114.{ps1,sql}`: private verified backup
`F:/2026/Fa26/DTD/tmp/clean-demo-display-before-20261114-123319-746.xml`, rollback
validation and Apply PASS; exact counts and all-column unaffected-row comparison
across25 tables PASS. Independent readback confirms three PAID invoices,
119M total/14months/cycle6, unchanged dates, no handover/exit/provider/settlement.

TypeScript PASS; four Playwright MCP checks at1440/390 PASS: paid hides internal
metadata/provider assertion, unpaid retains bank/account instructions. Console,
requests/HTTP errors and overflow checks passed (intentional StrictMode abort
excluded). API fixtures only; no live browser/appDB/provider integration claim.
No backend production code/schema changes or backend test rerun. OwnVite3196
stopped after checking. Three diagnostic files untouched; no push.

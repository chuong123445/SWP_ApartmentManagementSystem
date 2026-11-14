# Verify local Admin account — 14 November 2026

User explicitly requested changing the displayed Admin An Cư account to verified.
Exact account9 is ACTIVE/ADMIN. AccountMenu uses contactVerificationStatus from
AuthService/EmailAccountVerificationPolicy; emailVerified satisfies that policy.

One-off local change: email_verified/contact_verified=true, account version+1.
Password/email/name/roles/status and every other account column unchanged.
Phone/identity remain unverified; no fabricated legal identity/provider evidence,
OTP delivery assertion, new role, session reset or production policy change.

Helper `tools/verify-admin-account-20261114.{ps1,sql}` guards local DB/date and
exact account/name/role/status/previous flags. Private account-table backup:
`F:/2026/Fa26/DTD/tmp/verify-admin-before-20261114-132517-687.xml`.
Backup XML/schema re-open comparison, rollback validation, Apply, all-column
preservation of other accounts and allowed-field comparison on Admin PASS.
Independent SQL readback confirms ACTIVE/ADMIN and both verification flags true.
No browser/provider verification claimed; database-only task, no frontend code.
Three unrelated diagnostic files untouched; no push. Reload or sign in again to
refresh the AuthUser state and show “Đã xác thực tài khoản”.

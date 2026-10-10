# Quick Loan pilot: reference comparison and launch controls

Reviewed 10 October 2026. This is a feature comparison, not an affiliation or an assurance that Quick Loan matches regulated providers.

| Reference          | Verified feature                                                                                     | Quick Loan implementation                                                                                                                                                                  |
| ------------------ | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| CashNow UAE        | Identity eligibility, transparent key facts, fixed repayment schedule, pricing and fees              | Private account, explicit pilot status and separate illustrative repayment planner. Production identity verification, pricing and signed loan offers remain blocked.                       |
| Botim / CashNow    | Wallet disbursement and repayment; account security and identity validation                          | Borrower and lender routes separated. No simulated wallet, debit mandate or successful payment claim. A provider agreement and verified payment integration are still needed.              |
| Airtel/JUMO Wewole | Uganda mobile-money distribution, USSD access and short loan periods backed by operator partnerships | Uganda phone normalization, lightweight PWA, affordability intake and financial education. No access to Airtel's customer history, credit models, USSD or automatic deductions is claimed. |

Sources:

- https://www.cashnow.ai/key-facts-statement
- https://www.cashnow.ai/terms-of-use
- https://www.cashnow.ai/personal-loans
- https://botim.me/faq/easy-cash.html
- https://jumo.world/from-west-to-east-africas-fintech-future/ (25 May 2026)
- https://umra.go.ug/wp-content/uploads/2024/03/DIGITAL-LENDING-GUIDE-LINES-FOR-UMRA-2024.pdf (January 2024)

## What this release actually does

The customer PWA opens at `/`, with account access at `/account`, review intake at `/apply`, private records at `/status`, cost illustrations at `/calculator`, privacy/deletion requests at `/privacy`, and help at `/help`. Existing lender access moves to `/admin` and `/admin/login`; `/login` redirects there.

Accounts use salted scrypt password hashes and hashed opaque server-side sessions in secure HttpOnly, SameSite cookies. Requests are scoped to immutable borrower account IDs, never claimed through phone entry. New reference/budget data is encrypted with AES-256-GCM using a context-specific key derived from APP_SECRET. Preserve APP_SECRET securely: rotating it without re-encrypting records makes encrypted payloads unreadable. Old records are not automatically assigned to new accounts or converted to encrypted records.

Intake validates three different reference names and normalized Uganda mobile numbers, excludes the borrower's number, records versioned privacy/age/reference-permission confirmations and uses a long random server-generated reference. It collects self-reported income, essential expenses and other debt repayments for human review. Reference consent is the borrower's attestation, not independently verified proof. References are not guarantors.

The repayment calculator is an accessible illustration with no ad gate; assumptions are user supplied, not approved product pricing. It does not create a debt or actual due dates. Approvals are disabled on the server and UI. Approved application value in historical records is labeled accurately, not reported as money lent out.

Login and intake limits are in-process for this single-instance free pilot; use a durable shared limiter before scaling. Account ownership protects records but does not prove SIM/identity ownership. SMS OTP, secure recovery, duplicate identity checks and verified KYC remain launch requirements. A manually submitted photo must not be represented as successful liveness verification.

## Repayment protection and launch requirements

No platform guarantees repayment. Affordability review, genuine borrower identity, conservative verified limits, a documented credit agreement, clear costs/due dates, provider-confirmed disbursement/receipts, a reconciled repayment ledger, reminders with consent and humane hardship handling reduce risk. Start with small exposure only after the actual credit policy is approved; do not infer creditworthiness from this pilot's calculator.

Before real lending: complete licensing/operator details; approve a Uganda-specific credit and pricing policy; verify SMS and identity integrations; review data retention, cross-border processing and complaint handling; connect payment collection/disbursement with verified callbacks and idempotency; implement a funding/repayment ledger, receipts, audit trail and backup/restore tests; replace the lender PIN with stronger owner authentication/MFA; obtain an independent security and legal review. Existing default loan terms from the APK are not adopted.

Do not scrape contacts, harass relatives, present references as automatic guarantors or promise guaranteed returns. A repayment mandate needs provider support and the customer's separate authorization; it cannot be implemented by requesting a mobile-money PIN.

Deployment adds borrower account/session/privacy-request tables and nullable ownership/encrypted payload/consent columns. Existing applications remain accessible only through lender authorization; their original rows are retained. The startup migration is additive and idempotent. No transactions, real loan decisions or production test accounts are created by the verification process.

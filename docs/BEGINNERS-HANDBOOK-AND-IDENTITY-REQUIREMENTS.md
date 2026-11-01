# Beginner's Handbook and Identity / Withdrawal Requirements

Status: product and engineering requirements for review. Not a legal conclusion and not production-ready implementation.

## Beginner's Handbook

A public `/handbook` page is linked from the homepage and demo workspace. It covers:
- what ShieldChain is and its current prototype status;
- how a future buy/sell/swap flow should work and what quote disclosures are required;
- wallets, balances, market and custody risks;
- how gains and losses are calculated using symmetric illustrative examples;
- the distinction between scenario examples and forecasts;
- fee transparency and how the platform may earn revenue;
- the proposed challenge simulator, clearly not finalized terms;
- intended customer benefits without unsupported competitor or safety claims;
- email verification, identity checks, withdrawal holds, support and complaints.

Do not publish a target return, expected yield, likely profit percentage, or example performance as a customer expectation unless reviewed and substantiated for the exact product and jurisdiction. Examples must clearly show assumptions, fees, taxes excluded/included, timeframe and loss scenarios. No guaranteed returns or millionaire claims.

## Account and email verification

1. Use an established identity/authentication provider with secure account recovery, rate limiting, session revocation, optional/required MFA policy and security event logging.
2. Send a single-use, short-lived email verification link or code through a configured provider. Store only verification state and timestamps; do not log tokens. Rate-limit resend and attempt endpoints.
3. Require verified email before enabling withdrawals or sensitive account changes. For high-risk changes, require step-up authentication and notify the customer through a trusted channel.
4. Never store raw passwords in the application database. Use secure, HttpOnly, Secure, SameSite cookies for web sessions as appropriate.

## KYC and withdrawal policy

1. Select an appropriately regulated/contracted KYC provider after legal and privacy review. Use the provider-hosted or provider-SDK flow where possible. Do not store raw identity documents, selfie/biometric payloads or unnecessary sensitive data in ShieldChain systems.
2. Store minimum verification metadata only: provider case reference, status, jurisdiction, verification level, timestamps, expiry and specific match flags returned by the provider where lawful and necessary.
3. Verify legal name and other required identity attributes against the account profile. Apply risk-based checks for date of birth, address, document validity, sanctions/PEP screening where required, fraud signals and duplicate identities. Define a controlled remediation flow for legitimate name changes and data-entry mistakes.
4. Before a withdrawal can be approved, enforce server-side checks: account active and not restricted; email verified; required KYC approved and unexpired; customer and beneficiary/wallet ownership match where required; sanctions/fraud/AML review clear; limits and cooling-off policies passed; MFA/step-up checks passed; available ledger balance confirmed.
5. Any mismatch, expired verification, suspicious destination, account takeover signal or provider uncertainty must prevent automatic release and route to trained human review. Tell customers what action is needed without revealing sensitive anti-fraud rules. Do not use AI alone to decide complex disputes or override controls.
6. Record each state transition in an append-only audit trail with actor, timestamp, reason code, provider reference and correlation ID. Use idempotency keys for provider callbacks and payout initiation. Reconcile internal ledger entries with provider/bank/blockchain outcomes.
7. Notify the customer of receipt, additional information needed, approval/rejection and completion. Publish realistic processing windows and explain that legal/security checks can delay or prevent a payout. Provide an appeal/support route.
8. Apply least-privilege staff access, encryption in transit/at rest, retention/deletion schedules, incident response and privacy impact assessment. Never put full identity numbers, documents, passwords, private keys or full destination details in general logs.

## Proposed withdrawal state machine

`REQUESTED -> IDENTITY_CHECK -> RISK_REVIEW -> APPROVED -> PROCESSING -> PAID`

Terminal or exception states: `REJECTED`, `CANCELLED`. A case can return for `NEEDS_INFORMATION` in the workflow service, but transitions must be explicit, authorized, audited and idempotent. The schema's status enum is a data foundation, not the policy engine.

## Acceptance criteria before any live use

- Email verification is tested for expiry, replay, brute force, resend abuse, account enumeration and account recovery.
- KYC provider sandbox and production contracts, jurisdictions, callbacks and failure modes are validated.
- Name/beneficiary mismatch tests reliably block withdrawal release; authorized review and documented remediation work.
- Email-unverified, KYC-pending, KYC-rejected, KYC-expired, restricted account, sanctions alert, MFA failure, limit breach and provider outage all block automatic payout.
- Provider webhooks are signed/verified, idempotent and replay-resistant; payout requests are idempotent.
- Ledger balances cannot be changed by the client or AI. Every payout is reconciled and audited.
- Security penetration testing, privacy review, AML/CTF and sanctions policy, complaints process, incident response and legal approvals are completed for each launch jurisdiction.
- Legal counsel confirms applicable Australian and other target-market requirements; requirements can change before launch.

## Current status

The handbook page is a working educational page in the prototype. Account UI is still a non-functional preview. The KYC and withdrawal Prisma models describe a future metadata foundation only; no provider, email delivery, verification or payout flow is connected. Do not imply that KYC is operational until integration and tests are complete.

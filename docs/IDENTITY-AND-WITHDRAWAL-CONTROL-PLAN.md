# Identity, account activation and withdrawal control plan

**Status: design specification only — not implemented, legally approved, or enabled.**

This document defines the minimum safe workflow before ShieldChain Financial accepts real customers or permits any real-money movement. The current `/account` screen is a visual preview. Database models are groundwork, not enforcement. No control in this document should be represented as active until implemented and tested server-side.

## 1. Non-negotiable control principles

- **Deny by default.** An account, staff member, API request or withdrawal receives no privilege unless the server verifies it.
- **Provider-verified identity.** Use an approved identity provider for authentication and an appropriately contracted KYC provider for identity checks. Do not build custom password storage or retain identity-document images/biometrics in the application database unless a documented legal and security review specifically approves it.
- **No client authority.** Never trust browser-supplied `userId`, role, KYC status, email verification state, beneficiary match, amount limits or approval flags.
- **Fail closed.** Provider timeout, unavailable verification result, expired evidence, signature failure, inconsistent status or missing required data means no activation or withdrawal progression.
- **Explain holds without leaking detection logic.** Give customers a clear, neutral status and support path. Keep detailed fraud signals and rules restricted to authorized reviewers.
- **Separation of duties.** Where operationally practical, a person requesting or initiating a sensitive change must not be the sole approver of that same action.
- **Auditable decisions.** Record actor, action, target, timestamp, request/correlation ID, policy version and reason code. Do not log passwords, session tokens, recovery codes, identity documents or unnecessary sensitive data.
- **No promises of perfect protection.** Controls reduce risk; they do not eliminate fraud, mistakes, provider outages or security incidents.

## 2. Account activation state model

Suggested states: `PENDING_EMAIL` → `EMAIL_VERIFIED` → `IDENTITY_PENDING` → `IDENTITY_REVIEW` → `ACTIVE`; exception states include `RESTRICTED`, `REJECTED` and `CLOSED`.

1. Customer begins registration through the selected identity provider. The app creates no privileged session based only on a submitted email address.
2. Provider verifies the email. Verification links/tokens must be high entropy, short-lived, single-use, stored as digests where application-managed, and rate-limited. Responses should not reveal whether an address already has an account.
3. Where required by the approved product/jurisdiction, start KYC through a hosted provider flow. Collect only the minimum data needed and direct document/biometric handling to the contracted provider.
4. Accept provider results only through authenticated server-to-server callbacks or verified server-side API retrieval. Validate signatures, timestamps, event identifiers, expected account/case association and replay protection. Do not trust a browser redirect as proof of approval.
5. Resolve mismatched names, date of birth, address, duplicate identities, expired evidence or ambiguous provider outcomes into a restricted review queue. No automatic activation while a required check is unresolved.
6. Activate only when every applicable policy condition is satisfied. Store the provider case reference, status, verification level, timestamps and policy version—not copies of identity documents by default.
7. Provide a controlled path for correction, appeal, account recovery and privacy requests, with access limited to trained staff.

## 3. Withdrawal control sequence

A future withdrawal request should move through an explicit server-controlled state machine, for example:

`REQUESTED` → `IDENTITY_CHECK` → `RISK_REVIEW` (when required) → `APPROVED` → `PROCESSING` → `PAID`

Terminal or exception outcomes include `REJECTED`, `CANCELLED`, and a separately modelled `FAILED`/`RETURNED` outcome if provider settlement can fail. A status transition must have a named policy rule; arbitrary transitions must be rejected.

Before approval, the server must verify all applicable checks:

- authenticated, non-expired session and account not closed/restricted;
- email verified and account recovery/security state not under a protective hold;
- required KYC approved, current and linked to the same internal user;
- beneficiary name and destination checks completed under documented policy;
- destination allowlist / cooling-off rules where appropriate, especially after destination or security-setting changes;
- amount, asset, available balance, daily/rolling limits, fees and network constraints validated using decimal-safe arithmetic;
- risk screening and any required sanctions/transaction-monitoring review completed by the appropriate provider and trained staff;
- idempotency key and request uniqueness prevent duplicate processing;
- a final pre-send recheck confirms that no hold or restriction was added after approval.

**Mismatch handling:** any required identity/beneficiary mismatch, stale KYC result, unresolved risk flag or provider uncertainty places the request on hold. Do not auto-correct the customer name, silently substitute a destination, or allow support staff to bypass a hold without an authorized, recorded exception path.

**Execution boundary:** the prototype must not send funds or call payment/custody APIs. Real execution remains feature-flagged off until legal, provider, security, reconciliation, incident-response and business approvals are recorded explicitly.

## 4. Suggested database and service boundaries

- Treat `User.status` and `KycCase.status` as inputs to a server-side policy service, not as authorization by themselves.
- Enforce unique provider identity mapping and validate that provider case IDs belong to the expected user.
- Store only a digest of opaque session tokens; use secure, HttpOnly, appropriately SameSite cookies, rotation, expiry and revocation. Prefer a mature identity provider's supported session integration.
- Store a provider-issued destination token/reference rather than raw bank or wallet data where possible. If raw data is genuinely required, document encryption, access, retention and deletion controls first.
- Use a durable, idempotent event/outbox design for provider callbacks and any future settlement operation. Persist the provider event ID and reject replays.
- Apply database least privilege. Runtime application roles should not have permission to rewrite or delete audit history. Sensitive admin actions need a separately authorized service path.
- Use explicit enumerated reason codes for holds and rejections. Avoid placing raw KYC results, full addresses, wallet secrets or free-form sensitive notes into audit metadata.
- Define retention/deletion and legal-hold rules before collecting personal data; deletion may require preserving a narrowly scoped record where law requires it, subject to legal review.

## 5. Required tests before a private beta

### Identity and sessions
- Unverified, expired, revoked and malformed sessions cannot access protected resources.
- Users cannot read or modify another user's profile, KYC case, support ticket or withdrawal by changing IDs.
- A normal user cannot access staff/admin endpoints; changing client-side UI or request fields never grants a role.
- Email verification tokens are single-use, expire, are rate-limited and do not disclose account existence.
- Provider callbacks reject invalid signatures, wrong-user mappings, stale timestamps, duplicate event IDs and invalid state transitions.
- Account restriction takes effect on existing sessions and pending operations according to documented policy.

### Withdrawals
- Any required missing, failed, expired or mismatched check blocks approval and execution.
- Duplicate submissions, retries and concurrent requests cannot create duplicate withdrawals.
- Amounts, fees and limits use decimal-safe calculations and are checked again before execution.
- Changing a beneficiary or security setting activates the required hold/cooling-off policy.
- Provider timeout, partial failure, returned payment and reconciliation discrepancy are recoverable and visible to operations.
- Approval, rejection, override and status changes create auditable records; unauthorized users cannot modify them.

### Privacy and operations
- Logs, error traces, analytics and support tooling redact secrets and unnecessary personal information.
- Retention, export, correction and deletion flows are tested with a documented legal-hold exception process.
- Rate limits, alerting, escalation contacts, incident playbooks, backups and restore tests exist and have named owners.

## 6. Release gates and accountable sign-off

Before real account creation: select and configure the identity provider, complete privacy/legal review, implement server-side authorization, run automated tests, and review logs/session handling.

Before collecting identity evidence: confirm KYC provider contract, data residency/subprocessors, privacy notice, retention schedule, access model, and applicable Australian and other target-market obligations with qualified advisers.

Before any withdrawal execution: confirm custody/payment partner arrangements, transaction monitoring, sanctions and fraud controls as applicable, reconciliation, limits, customer disclosures, support coverage, incident response, independent security testing, and written business/legal/security approval.

A checklist or demo screen is not proof that a control is operational. Keep all financial execution disabled until every relevant gate is documented and the project owner explicitly approves activation.

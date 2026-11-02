# Support and feedback foundation

## Current implementation
- `/support` provides responsive FAQ content, support-category selection, a security warning path, and a local-only feedback form preview.
- The form explicitly tells users that entries are not sent or stored. It must not be presented as a live support channel.
- Prisma models define support tickets, messages, and feedback records for later implementation. They are not connected to an API or database yet.

## Production requirements before accepting customer data
1. Add authenticated, server-side ticket creation with strict Zod schemas, request size limits, CSRF/origin protections where applicable, rate limits, abuse controls, and spam detection.
2. Generate unguessable public references; do not expose sequential IDs. Enforce user ownership on every customer ticket read/write.
3. Staff tools require role-based access control, least privilege, MFA, audit events, and restricted access to security/payment cases. Internal messages must never be returned to customer APIs.
4. Define ticket status transitions, service-level targets, escalation owners, out-of-hours incident handling, customer notification templates, and evidence retention/deletion policies.
5. Minimize personal data. Warn customers not to submit passwords, one-time codes, seed phrases, private keys, or full payment credentials. Scrub sensitive data from logs and analytics.
6. Establish privacy notice, consent/collection purpose, retention schedules, data-subject request workflow, and jurisdictional handling before accepting data.
7. Use idempotency and transaction/audit records for any later payment or payout dispute workflow. Support staff and AI must never edit financial ledgers or override payout rules directly.
8. Test access control, IDOR, injection, stored XSS, abuse/rate limiting, escalation and deletion/retention behavior before beta.

## Routing policy proposal
- Security compromise / suspected fraud: urgent, restricted-access human incident queue.
- Account access / identity / restriction: trained account-support queue.
- Deposits, withdrawals, swaps, payout or ledger disputes: restricted financial-operations queue; no AI-only resolution.
- Product questions and education: standard support queue.
- Feedback: product triage queue with a reviewed status and owner.

Do not advertise response times until the staffing model and coverage are funded and tested. The database models are a starting point; application-level authorization, validation and database policy remain mandatory.

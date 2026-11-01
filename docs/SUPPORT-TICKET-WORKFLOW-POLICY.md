# Support ticket workflow policy

## Included policy foundation
- Explicit status transitions; closed tickets cannot be reopened by the transition table.
- Customer actions require server-loaded ownership and are restricted to customer-safe transitions.
- Security, payment and withdrawal queues deny ordinary support-agent transitions; use the relevant restricted operational role and explicit queue authorization.
- Intake checks category, subject/description bounds and common credential/seed-phrase disclosure patterns, then suggests a queue.
- Internal messages require a non-customer role and explicit restricted-queue access; public messages require ticket ownership when read by a customer.

## Required integration work
These pure helpers are not authorization, persistence, or a production support service. Authenticate on the server; load ticket ownership/category/status from the database; check permission on every read/write; validate with a server schema; enforce rate limits, CSRF/origin and size limits; use transactions and append-only audit events; keep internal notes out of customer response DTOs; test IDOR and stored XSS; define escalation, SLA coverage, privacy retention and deletion. Intake phrase checks are intentionally only a warning layer and are not a substitute for secure handling. Never let AI or support agents modify financial ledgers or override withdrawal controls.

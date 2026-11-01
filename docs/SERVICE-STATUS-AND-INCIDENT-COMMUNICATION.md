# Service Status and Incident Communication

## Scope

`/status` is a customer-facing static preview of the future service-status experience. It is not a live monitor, status API, uptime claim, alert channel, or evidence that any production service is operating.

## Implementation principles

- State whether information is static, monitored, or provider-reported; never blur these states.
- Every future incident update must include an exact timestamp and timezone, affected capability, customer impact, confirmed facts, safe customer actions, and a realistic next-update time.
- Separate confirmed facts from investigation hypotheses. Avoid unsupported root-cause or recovery-time claims.
- Never publish customer identifiers, private security details, secrets, or sensitive operational telemetry.
- Preserve an internal incident timeline and evidence trail under restricted access.
- For suspected compromise or financial-operation integrity issues, suspend affected capabilities first and require authorized review before restoration.
- Do not call a service operational without observable monitoring evidence and a defined freshness threshold.

## Suggested public update template

- **Updated:** `YYYY-MM-DD HH:MM UTC` (also show the customer-relevant timezone when useful)
- **Status:** investigating / identified / monitoring / resolved
- **Affected service:** name the capability
- **Customer impact:** confirmed scope only
- **What customers should do:** specific, safe steps; do not request passwords, one-time codes, private keys, or recovery phrases
- **Next update:** exact expected update time, or explicitly state that timing is not yet known

## Production prerequisites

Before presenting live status, integrate monitored service checks, provider health signals, alert routing, on-call ownership, access control, incident logging, and a publication workflow with human review. Test stale data, monitoring outages, partial incidents, and rollback. A monitoring dashboard is not itself a security audit or launch approval.

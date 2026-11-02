# Security event logging foundation

This is a pure policy helper, not a log sink or audit system. It creates a bounded event envelope from an allowlisted event type, safe correlation ID, optional internal actor ID, and deliberately limited metadata. Sensitive-key names are omitted from event metadata; a separate defensive redactor replaces likely secrets/PII and omits nested objects.

## Production integration requirements
- Call only on the server after the relevant decision; never trust client-submitted event facts.
- Persist security/audit records to access-controlled, append-only storage with retention, integrity monitoring and restricted staff access.
- Use a generated correlation ID, not a raw request, email, wallet, IP, or session token.
- Never log credentials, raw tokens, cookies, private keys, seed phrases, full payment details, identity documents, or full support message bodies.
- Define retention/deletion policy and privacy notice; redact provider errors before logging.
- Alert on repeated denials and configuration failures, while avoiding user enumeration.
- Add storage outage handling, durable delivery, access audit and integration tests before production.

The helper does not persist, transmit, encrypt, or guarantee redaction of arbitrary data embedded under a deceptively named safe key. Treat it as one defense layer only.

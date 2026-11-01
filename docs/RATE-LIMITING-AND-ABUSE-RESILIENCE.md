# Rate limiting and abuse resilience foundation

## Status

This is a tested, pure policy foundation only. It does not implement request middleware, counters, a shared store, bot detection, or an operational alert. Do not represent it as active rate limiting.

## Initial budget proposals

| Profile | Budget | Window | Store outage |
| --- | ---: | ---: | --- |
| Public read | 120 requests | 60 seconds | May degrade; monitor and apply edge protection |
| Account write | 20 requests | 60 seconds | Deny new requests |
| Authentication | 8 attempts | 300 seconds | Deny new attempts |
| Support submission | 5 submissions | 3600 seconds | Deny new submissions |
| Financial operation | 5 requests | 60 seconds | Deny new requests |

These are conservative starting values for review, not tuned production limits. Tune by endpoint, authenticated account, network reputation, abuse telemetry, accessibility needs, and legitimate traffic patterns. Return `429` with a bounded `Retry-After` for exceeded limits, without leaking account existence or sensitive risk signals.

## Required production adapter

1. Use an atomic shared store or edge provider that works across all app instances. A process-local map is insufficient for multi-instance deployments.
2. Derive subject identifiers on the server. Prefer account ID plus a keyed hash of a normalized client IP as layered dimensions. Do not trust a user-supplied identity or arbitrary `X-Forwarded-For`; configure trusted proxy hops explicitly.
3. Apply multiple dimensions: IP/network, account, route group, device/session where lawful, and global provider quotas. Add stricter controls for login, password reset, verification-code resend, support submission, and financial endpoints.
4. Make increment/check atomic to prevent concurrent requests from racing through the budget. Document expiry semantics and clock behavior.
5. Fail closed for authentication, account mutations, and financial operations when the limiter cannot make a reliable decision. Public-read degradation must still be protected by edge/WAF controls and alerting.
6. Do not log raw credentials, verification codes, access tokens, or full sensitive payloads. Log decision code, route template, pseudonymous subject, count/window metadata, and correlation ID with restricted access and retention.
7. Alert on store errors, sudden 429 spikes, credential stuffing, distributed source patterns, and unusual financial-operation attempts. Provide a tested incident override with an audit trail.
8. Test concurrent increments, distributed instances, IPv4/IPv6 normalization, proxy spoofing, key rotation, outage behavior, `Retry-After`, and false positives before enabling in production.

## Acceptance gates

- Provider/store selected, contract and availability targets reviewed.
- Atomic operation demonstrated under concurrency and multi-instance load.
- Per-route budgets reviewed by security and product owners.
- Metrics, dashboards, alerts, runbooks, and privacy retention approved.
- Staging abuse simulations and rollback completed.
- Production auth and financial capabilities remain disabled until their separate release gates are approved.

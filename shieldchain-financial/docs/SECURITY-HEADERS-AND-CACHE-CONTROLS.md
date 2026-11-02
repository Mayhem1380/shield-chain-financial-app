# Security headers and cache-control baseline

## Current repository configuration

`next.config.ts` applies a baseline of browser security headers to all routes and adds HSTS only when `NODE_ENV` is `production`. It also sets `Cache-Control: no-store, max-age=0` for `/account/:path*`, `/admin/:path*`, and `/api/:path*` to reduce the risk of private account or API responses being retained by browser/intermediary caches.

Additional headers include `X-Permitted-Cross-Domain-Policies: none` and `Origin-Agent-Cluster: ?1`. The existing configuration also sets `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, a restrictive referrer policy, a permissions policy, and same-origin opener/resource policies.

## Important boundaries

- This is a baseline, not a complete Content Security Policy. CSP must be designed and tested against actual scripts, styles, payment/identity provider frames, analytics and deployment architecture before enforcement.
- HSTS with `includeSubDomains` must only be retained after confirming every relevant subdomain supports HTTPS and the domain owner approves the scope. Do not enable preload casually.
- Cache headers do not replace authorization, private data minimization, CDN configuration, or correct cache-key design. Verify actual response headers in the deployed environment.
- Some routes may need carefully reviewed exceptions for static assets or public API caching; keep private responses `no-store` unless a reviewed design establishes otherwise.
- Next.js routing/proxy layers and hosting/CDN settings may override or duplicate headers. Test the final response at the public edge.

## Verification before release

1. Run `npm run security:preflight` and `npm run preflight`.
2. After dependencies are installed, run the full application build.
3. Check deployed responses for `/`, `/account`, `/admin`, and `/api/health` using browser devtools or an approved HTTP inspection tool.
4. Confirm production HTTPS, HSTS scope, cache behavior, and provider compatibility with a security reviewer.

This configuration does not mean the application is production-ready. Authentication, live financial capabilities and provider integrations remain unconnected/disabled until their separate release gates pass.

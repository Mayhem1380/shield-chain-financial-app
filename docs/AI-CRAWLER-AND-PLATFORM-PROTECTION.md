# AI crawler preferences and platform protection

## Public-facing brand line
**Invest with SF. Protect what matters.**

Supporting copy: “It’s not only about investing. It’s about understanding the risks, knowing the costs and making informed decisions.” Avoid wording that implies an investment, wallet, account, or asset is guaranteed safe or protected from loss.

## AI crawler preferences implemented
`app/robots.ts` publishes a robots.txt policy asking a list of known AI-related crawlers not to crawl the site. It includes GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Google-Extended, CCBot, Bytespider, PerplexityBot and other known crawler identifiers.

This is a voluntary request, not a security barrier. A crawler can ignore it, identifiers can change, and it cannot prevent a person from copying public pages manually or prevent all AI systems from learning from publicly available material. Robots.txt is public and advertises the policy; it is not a place for secrets.

## Required protection before private beta
- Keep the application source, repository, environment variables, database, API keys, internal docs and admin functions out of public web paths and client bundles.
- Protect beta/admin routes with server-side authentication and authorization; do not rely on hiding links or client-side checks.
- Use MFA for staff/admins, least privilege, secure sessions, rate limits, bot-abuse controls and audit logs.
- Keep secrets in deployment environment secret storage; rotate any key that has been exposed.
- Add appropriate security headers and a restrictive Content Security Policy after checking all required assets/providers.
- Apply WAF/rate limiting and monitoring where available; block abusive scraping based on behavior, not only User-Agent strings.
- Do not expose personal, customer, KYC, support or financial data in page HTML, source maps, logs, error pages or public files.
- Use noindex for private pages as an additional discovery hint, but remember noindex and robots.txt are not access control.
- Test direct URLs, API endpoints, server actions, IDOR/access-control cases and production build artifacts before launch.

## Trade-offs
Blocking AI-related crawlers may reduce some AI search discovery, but it does not guarantee exclusivity or prevent copying. Search engines and AI services use different crawler identifiers and policies; maintain this list deliberately and review it periodically. Do not block ordinary search engines unless a deliberate SEO decision is made.

## Release gate
This policy is not proof of anti-scraping protection or a security audit. Before public launch, a qualified engineer must review deployed headers, route access, API authorization, secrets, rate limits and logs. No public deployment or live financial activity is authorized by this document.

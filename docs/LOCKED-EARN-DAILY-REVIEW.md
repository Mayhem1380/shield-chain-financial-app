# SF Locked Earn daily current-value observation architecture

This stage implements persistent, account-isolated daily engineering observations. It does not open a financial product, accept crypto, accrue a customer liability or create a withdrawable balance. Every record is NON_PAYABLE_REVIEW. All deposits, payable accrual and payout gates are constant false. No rate is approved by this source code.

## Calculation and evidence

For each full UTC day, use principal units × that day's closing principal AUD price × assumed annual rate / 100 / 365. Convert the AUD reward to indicative reward-asset units using that day's closing reward-asset AUD price. No compounding; principal units remain unchanged. ACT/365 applies even during leap years. Exact BigInt fixed-point mathematics avoids binary floating-point errors. Outputs round down at 18 decimals. These assumptions require product approval before any future payable calculation; actual asset precision, dust, fees, partial-day treatment and loss handling are not settled.

The worker-only observeDay interface requires a server-injected reviewed closing-price adapter. It has no customer-facing write endpoint, no default quote loader and no automatic scheduling. Customer APIs cannot submit prices, rates, evidence, plans or provider names. Missing adapter/evidence fails closed. The adapter is an integration contract, not a verified real-provider integration. Actual pricing provider implementation, independent source review and historical evidence collection remain outstanding.

Each plan pins two distinct reviewed source identifiers, maximum deviation (0–1,000 basis points) and a review reference. Source identifiers alone do not prove economic independence; the operator must review that. Each closing quote must be for the requested asset in AUD, have an evidence digest and an observation time no later than the closing boundary and no more than 15 minutes earlier. Evidence digests provide traceability only; they do not prove authenticity without the trusted adapter/provider evidence store. Never mark customer-supplied assertions as corroborated quotes.

For reproducibility, the engine chooses the lower of the two prices if within the configured tolerance. This is a defined observation convention, not a safety guarantee or an executable price. In particular, lowering the reward asset price increases calculated reward units. The convention and tolerance require review before live product design. Price sets/evidence are persisted with the observation. Never backfill missing days using a present-time price; supply verified historical closing observations or leave the day unrecorded.

## Integrity and isolation

The unique (planId, day) database key and advisory transaction lock serialize daily retries. A configuration fingerprint pins the interval, units, rate, assets, sources and review reference. Changed plan configuration conflicts with an already recorded day; concurrent changes are checked again under the lock. A retry returns an existing observation without fetching another price or creating another audit/reward record. Creation and audit writes commit or roll back together. These are append-only application operations; production database roles still need separate append-only enforcement and an approved correction/reversal process. No update/delete observation API exists.

Review plans have explicit full-day start/end boundaries and REVIEW_ONLY state. Live or out-of-interval requests are rejected. Plans must be provisioned by a separately reviewed operator process; no provisioning UI/API is supplied. There is no claim these plans represent funded positions. /locked-earn and GET /api/customer/locked-earn list only the authenticated user's review plans; plan history is ownership-checked and capped at 366 latest observations. The dashboard never interprets missing days as zero prices, rewards or account balances. More than 100 plans/366 observations require future pagination.

## Validation

13 new fixture tests pass: calendar/future boundaries, oracle source/deviation/freshness checks, daily current-value arithmetic, independently priced reward units, retry idempotency, configuration mutation/conflicts, audit rollback, absent provider handling, customer isolation and disabled gates. A real PostgreSQL concurrency/idempotency case is included in the disposable integration suite but has not run while dependencies/infrastructure are blocked. Prisma schema changes have not been generated, migrated or compiled; browser behavior remains unverified.

Next: install pinned/reviewed dependencies, validate schema and initial migration in disposable PostgreSQL, run concurrent integration tests, implement an approved pricing adapter with historical evidence retention, and review product terms/regulatory/security requirements. No live deposits or rewards may be enabled as part of those checks.

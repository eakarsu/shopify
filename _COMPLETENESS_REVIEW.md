# Completeness Review: shopify

**Review date:** 2026-07-18

## Assessment basis

Static inspection of project-owned source and configuration only; no dependency installation, build, database migration, external-service call, or runtime launch was performed. The scan considered 242 project files (233 source files), 1 manifest(s), 2 test-like file(s), and 0 CI workflow(s), excluding dependency/generated directories.

## Classification

**Functional but incomplete**

This is a substantive but unfinished commerce/order operations application, not just an empty scaffold. Inspection found 233 source files across `src/`, `__tests__/`, `prisma/`, `scripts/` using Next.js, React, Express, Prisma; however, the checked-in workflow and delivery controls do not yet demonstrate a complete, production-operable product.

## Why it is not complete

- Generated gap/visualization routes describe missing capabilities or simulate recommendations; they do not implement the underlying domain operation.
- Generic LLM calls are used as product behavior without enough typed tools, grounded evidence, deterministic rules, or output evaluation.
- Mock, demo, sample, fixture, or placeholder behavior remains in executable/product paths.
- Only 2 test-like file(s) were found, too little evidence for the breadth of the implemented workflow.
- No checked-in CI workflow proves builds, tests, migrations, and security checks on every change.

## Needed features

1. Implement an idempotent order state machine covering reservation, payment, cancellation, refund, fulfillment, and exception recovery.
2. Connect real inventory, tax, payment, shipping/delivery, and partner-webhook providers behind retry-safe adapters.
3. Add role-scoped customer, operator, and merchant workflows with immutable order and refund audit history.
4. Test duplicate webhooks, partial fulfillment, payment failure, overselling, and reconciliation end to end.
5. Add risk-based unit, integration, and end-to-end tests in CI, including migration and failure-path coverage.

## Risks or launch blockers

- Weak/fallback secret patterns can permit forged sessions or accidental insecure deployments.
- Automation contains destructive process, filesystem, or database operations; do not run it on a shared machine without review.
- Startup appears coupled to seed/migration behavior, risking data mutation or non-repeatable launches.
- AI-provider availability, cost, privacy, prompt injection, and unvalidated output are launch risks until bounded and evaluated.

## Evidence inspected

- `src/lib/auth.ts:109`
- `src/components/GapFeaturePage.tsx:7`
- `src/app/layout.tsx`
- `src/lib/api-auth.ts`
- `__tests__/ai-rate-limit.test.ts`
- `package.json`

## Recommended next action

Choose one real commerce/order operations journey, define acceptance criteria and external contracts, then close its persistence, permission, integration, failure, and test gaps before expanding features.

## Implementation progress (2026-07-20)

The recommended bounded journey is implemented as persisted order operations. It covers provider quote, row-locked inventory reservation, Stripe payment, cancellation, partial or complete carrier fulfillment, signed delivery updates, refunds, exception recovery, reconciliation, and retryable partner notification. It is production-shaped but remains launch-gated by the external work below.

### Needed-feature status

1. **Order state machine — implemented.** `src/lib/order/service.ts` and `src/lib/order/domain.ts` enforce explicit transitions, optimistic workflow versions, command idempotency, provider-event deduplication, expiring reservations, payment failure/late-payment exceptions, cancellation, refund, fulfillment, delivery, and recovery. Invalid transitions fail closed.
2. **Provider adapters — implemented behind real contracts.** `src/lib/order/providers.ts` supplies Stripe payment plus authenticated HTTP tax and carrier adapters with integer-cent amounts, bounded retry rules, stable idempotency keys, timeouts, and no production fallback. `src/lib/order/partner-outbox.ts` persists signed partner deliveries, retry schedules, stable delivery IDs, and dead-letter state.
3. **Permissions and audit — implemented.** Customer ownership, `STAFF` operator, `ADMIN` merchant, API-key, scheduler, and signed-provider paths have distinct permissions. Every workflow mutation appends a SHA-256-linked `OrderAudit` entry; PostgreSQL triggers reject audit update or deletion.
4. **Failure-path coverage — implemented for the bounded journey.** Database-backed tests cover duplicate checkout and payment events, payment failure and recovery, concurrent oversell prevention, partial/full fulfillment, over-fulfillment rejection, refund idempotency, audit immutability, reconciliation, and stable partner-webhook retries.
5. **CI and migration coverage — implemented.** `.github/workflows/order-operations.yml` provisions blank PostgreSQL, installs from the lockfile, generates Prisma, validates and deploys the migration, checks schema drift, type-checks, runs all tests, builds, and runs the tracked-secret scan.

### Safety corrections

- Production auth no longer accepts a fallback `NEXTAUTH_SECRET`; inactive admins are rejected, API credentials require active, unexpired Basic key/secret authentication, and secret comparison is timing-safe.
- `start.sh` no longer kills unrelated processes or mutates the database. It refuses an occupied port and starts only this checkout.
- Legacy direct payment-intent, shipping-rate, order-write, and inventory-write paths return explicit safe errors instead of bypassing the workflow.
- Nine generated `gap-*` APIs now return `410 NOT_IMPLEMENTED`; their pages are visibly planning-only and cannot perform simulated writes. AI surfaces are outside the order authorization boundary.
- `.env.example` contains names/placeholders only. The repository scan checks for live Stripe/webhook/database credentials without printing values.

### Verification evidence

- Clean `npm ci`: passed.
- Prisma client generation and schema validation: passed.
- Blank PostgreSQL migration deploy: passed; one checked-in migration applied.
- Migration-to-schema drift check: passed with `No difference detected`.
- TypeScript: passed with zero errors.
- Jest: **5 suites, 35 tests passed**, including **8 database-backed order-operation scenarios**.
- Next.js 15.5.20 / React 19.2 optimized production build: passed; 97 pages generated and the dynamic route manifest completed. All affected cookie, search-parameter, and route-parameter consumers use the asynchronous Next 15 contract. Existing image-optimization and two hook-dependency warnings remain non-blocking.
- `git diff --check`, the tracked-secret scan, current-tree Gitleaks, and full-history Gitleaks: passed. One exact historical fingerprint is baselined for a removed synthetic seed string; generated `.next` and dependency artifacts are excluded from directory scans.
- Production dependency audit at `--audit-level=low`: passed with **zero vulnerabilities**. NextAuth uses patched PostCSS and UUID overrides; the application SMTP client and NextAuth's optional mail peer both resolve to Nodemailer 9.0.3 without an invalid dependency tree.

### External launch gates

- Provision managed PostgreSQL/connection pooling, back up production data, and rehearse the migration and rollback procedure.
- Supply production NextAuth, Stripe, tax, carrier, delivery-HMAC, scheduler/API-key, and partner-webhook secrets through the deployment secret manager.
- Complete Stripe, tax-provider, and carrier sandbox/live onboarding; register signed webhooks; validate tax nexus and refund obligations; and certify provider idempotency/retry behavior.
- Obtain partner endpoint acceptance, delivery acknowledgement/replay procedures, production observability and alerting, on-call ownership, and customer/operator acceptance sign-off.

Operational contracts and deployment procedures are in `ORDER_OPERATIONS.md`.

## Runtime verification (2026-07-20)

- The non-mutating launcher now honors caller-assigned host/port values and, only under `NODE_ENV=test`, the validator-provided original source root so Next.js does not omit App Router routes exposed through directory symlinks.
- Disposable PostgreSQL startup, named-provider NextAuth login/session, invalid-login rejection, and protected order-operation access define this campaign's runtime acceptance boundary.
- The disposable seed's first administrator now honors `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` (with deployment-owned `ADMIN_*` values as a secondary source), while preserving the documented local defaults when neither is supplied.
- Runtime acceptance passed on loopback PostgreSQL `55547` and application port `5914`: the launcher started without error, the `admin-login` credentials provider accepted the caller-supplied administrator, and `/api/auth/session` returned the persisted authenticated user. The ports were released after the run.

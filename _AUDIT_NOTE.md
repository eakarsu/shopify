# Audit Note: shopify

The historical detector note was superseded by the production-completeness work recorded in `_COMPLETENESS_REVIEW.md` on 2026-07-20.

## Current boundary

- The supported product journey is a persisted order workflow: provider quote, inventory reservation, Stripe payment, cancellation, partial or complete fulfillment, delivery, refund, recovery, reconciliation, and partner notification.
- Generated `gap-*` endpoints are explicit `410 NOT_IMPLEMENTED` boundaries. They no longer simulate carrier, loyalty, subscription, multi-payment, multi-store, review, fraud, translation, or personalized-feed operations.
- Tax, shipping, payment, delivery, and partner callbacks fail closed when their required configuration is absent. There are no local production fallbacks.
- AI surfaces remain outside the supported order boundary and must not authorize pricing, inventory, payment, fulfillment, refund, or customer-access decisions.

## Remaining launch gates

Production still requires live provider credentials and onboarding, webhook registration, a managed PostgreSQL deployment and migration rehearsal, scheduler/API credentials, sandbox certification, legal/tax validation, partner endpoint acceptance, observability, and customer/operator acceptance sign-off. The framework, authentication, and SMTP stack was upgraded and the production dependency audit is clean.

See `ORDER_OPERATIONS.md` for the provider contracts and operating procedure.

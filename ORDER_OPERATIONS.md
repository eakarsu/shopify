# Order operations runbook

The production order boundary covers one workflow: provider quote, row-locked inventory reservation, Stripe payment, partial/full carrier fulfillment, delivery, cancellation/refund, reconciliation, and partner notification.

## Roles

- Customer: quote and place checkout, read owned orders, cancel an owned unpaid order.
- Operator (`STAFF`): fulfill and reconcile; cannot cancel or refund.
- Merchant (`ADMIN`): all operator commands plus cancellation, refunds, archive, webhook configuration, and scheduler execution.
- Viewer (`VIEWER`): no order mutation permission.
- Provider/system: signed inbound events and authenticated scheduled jobs only.

Every mutation needs an `Idempotency-Key`. Provider events are unique by provider and event ID. Order audit entries form an append-only SHA-256 chain and are protected against update/delete by a database trigger.

## Provider contracts

Tax and shipping calls are authenticated JSON `POST` requests. Retries reuse the same `Idempotency-Key`, occur only for network errors, 408/409/429, or 5xx responses, and are bounded to three attempts.

- `POST {TAX_PROVIDER_BASE_URL}/v1/tax/quotes` accepts currency, destination, shipping cents, and typed line items. It returns `{ id, taxAmount, currency, expiresAt }`, with amounts in integer cents.
- `POST {SHIPPING_PROVIDER_BASE_URL}/v1/shipping/quotes` accepts origin, destination, currency, line items, and optional service. It returns `{ id, service, amount, currency, expiresAt }`.
- `POST {SHIPPING_PROVIDER_BASE_URL}/v1/shipments` accepts the provider quote ID, order ID, and item quantities. It returns `{ id, trackingNumber, trackingUrl?, carrier, status }`.
- `POST /api/order-operations/webhooks/delivery` requires `X-Provider-Signature: sha256=<hex HMAC>` over the raw body using `SHIPPING_WEBHOOK_SECRET`.
- `POST /api/stripe/webhook` requires Stripe's signed webhook and handles payment success/failure/cancellation plus refund events.

There are no local tax, shipping, or payment fallbacks. Missing credentials fail closed with `503 PROVIDER_NOT_CONFIGURED`; test doubles live only under `__tests__`.

## Operational endpoints

- `POST /api/order-operations/quote`
- `POST /api/order-operations/checkout`
- `GET /api/order-operations/orders/:id`
- `POST /api/order-operations/orders/:id/commands` with `cancel`, `recover`, `fulfill`, `refund`, or `reconcile`
- `POST /api/order-operations/reservations/expire`
- `POST /api/order-operations/partner-deliveries`

The two scheduled endpoints accept a merchant session or Basic API credentials with `process:orders` or `process:webhooks`. Run reservation expiry at least once per minute and partner delivery processing continuously or at least once per minute. Each partner-delivery invocation performs at most one network attempt per due delivery; subsequent attempts are persisted with exponential backoff and a stable delivery ID.

## Deployment

Run `npm run db:migrate:deploy` before starting the application. Startup never pushes schema or seeds data. Use a PostgreSQL connection pool and set an explicit `connection_limit`. Configure Stripe and carrier webhooks, then execute provider sandbox certification before accepting live orders.

CI provisions a blank PostgreSQL database, deploys the checked-in migration, verifies schema drift, type-checks, runs all unit/integration tests, builds the application, and scans tracked files for credential patterns.

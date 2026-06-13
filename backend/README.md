# FYM Backend

Microservice backend workspace for **Find Your Medicines** using Express, PostgreSQL, Redis, and Kafka.

The workspace is organized so each service can evolve independently while sharing common infrastructure packages. The current implemented services cover OTP auth, users/customers, pharmacy onboarding, admin operations, order/vendor workflows, cart, catalog, prescriptions, matching, payments, delivery, notifications, support, penalties, audit/compliance, analytics, and gateway routing.

## Layout

```text
backend/
  services/
    api-gateway/
    auth-service/
    user-service/
    pharmacy-service/
    catalog-service/
    prescription-service/
    order-service/
    matching-service/
    inventory-service/
    payment-service/
    delivery-service/
    notification-service/
    support-service/
    penalty-service/
    admin-service/
    audit-compliance-service/
    analytics-service/
  packages/
    config/
    database/
    cache/
    messaging/
    logger/
    validation/
    shared-types/
    errors/
    security/
  infra/
    docker/
    postgres/
    redis/
    kafka/
    nginx/
    kubernetes/
    terraform/
  docs/
    architecture/
    api/
    compliance/
    database/
    events/
  tests/
    contract/
    integration/
    e2e/
  scripts/
```

## Service Boundaries

- `api-gateway`: request routing, auth middleware, rate limiting, API aggregation.
- `auth-service`: login, sessions, roles, JWT lifecycle.
- `user-service`: customers, profiles, addresses, family members.
- `pharmacy-service`: onboarding, licenses, pharmacists, trust score.
- `catalog-service`: medicines, search, safety rules, substitutions.
- `prescription-service`: uploads, OCR pipeline, pharmacist review, fraud checks.
- `order-service`: cart/order lifecycle, state machine, cancellations.
- `matching-service`: nearby pharmacy selection, dispatch waves, atomic acceptance locks.
- `inventory-service`: intentionally left as a placeholder for now; stock/inventory APIs are not implemented yet.
- `payment-service`: authorization, capture, refunds, settlements, ledgers.
- `delivery-service`: rider assignment, tracking, proof of delivery.
- `notification-service`: push, SMS, email, WebSocket events.
- `support-service`: customer support tickets and ticket messages.
- `penalty-service`: pharmacy penalties, waivers, and appeals.
- `admin-service`: dashboards, operational controls, review panels.
- `audit-compliance-service`: audit logs, prescription access logs, regulatory reports.
- `analytics-service`: business, operations, and compliance metrics.

## Installed Foundation Packages

- Express HTTP layer: `express`, `cors`, `helmet`, `compression`, `cookie-parser`, `express-rate-limit`
- PostgreSQL: `pg`, `knex`
- Redis: `ioredis`, `bullmq`
- Kafka: `kafkajs`
- Realtime/events: `socket.io`
- Auth/security: `jsonwebtoken`, `bcryptjs`
- Validation/errors: `zod`, `http-errors`
- Files/object storage: `multer`, `@aws-sdk/client-s3`
- Observability/docs: `pino`, `pino-http`, `prom-client`, `swagger-ui-express`, `yamljs`
- Tooling: `jest`, `supertest`, `eslint`, `prettier`, `nodemon`, `cross-env`

## Verification

```bash
npm run verify
```

This runs JavaScript syntax checks, Prettier format checks, and the Jest smoke/unit test suite without starting any backend server.

## Operations

```bash
npm run db:migrate
npm run db:status
npm run start:service -- api-gateway
```

The service launcher accepts the service key, for example `auth`, `user`, `order`, `payment`, `delivery`, `admin`, or `api-gateway`.

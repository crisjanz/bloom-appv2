# Bloom System Reference

**Last audited:** 2025-10-28  
**Maintained by:** Cristian Janz  
**Stack:** React 19 + Vite 6 (admin), Express + Prisma + PostgreSQL (backend)

---

## Business Snapshot
- Full-service flower shop platform covering POS, phone orders, FTD wire imports, events, and gift cards.
- Single-location production deployment; system time is pinned to `America/Vancouver` (`TZ` env var) to avoid scheduling drift.
- Primary user roles: counter staff (POS), phone order team, back-office admin, event designers.

## Architecture Overview
- `admin/` — TailAdmin-based React SPA for POS, operations, and settings. Domain-driven folders under `src/domains` and `src/app`.
- `back/` — Express API (`app.use('/api/...')`) with Prisma ORM (`back/prisma/schema.prisma`). Runs on Node 18+.
- `www/` — TailGrids prototype for future e-commerce storefront (not yet wired to live APIs).
- Shared assets (`docs/`, `tailgrids/`, `Screenshot.png`, etc.) live at repo root.

### Key Backend Modules (`back/src`)
- `routes/auth.ts` — Employee auth with JWT access + refresh tokens, password strength validation, and lockout counters.
- `routes/customers.ts` & `routes/customersAuth.ts` — Customer CRUD, address/recipient management, and portal authentication.
- `routes/orders/*` — Order list/detail, creation, draft saving, delivery board, and status management.
- `routes/payment-transactions.ts` — Central PT ledger (captures, refunds, reporting).
- `routes/discounts.ts` — Unified discount engine with validation + auto-apply.
- `routes/gift-cards` — Endpoints for batch creation, activation, balance check, and redemption.
- `routes/notifications`, `routes/email`, `routes/sms` — Notification endpoints; email/SMS services backed by SendGrid/Twilio helpers (see TODOs in notification domain for remaining wiring).
- `routes/ftd/*` — Wire order ingestion, monitoring, and settings management.
- `services/ftdMonitor.ts` — 4-minute polling loop with Puppeteer token refresh, syncs FTD → Bloom orders.
- `services/paymentSettingsService.ts` — Encrypts provider credentials with `CONFIG_ENCRYPTION_KEY` and masks values in API responses.
- `utils/taxCalculator.ts`, `utils/notificationTriggers.ts` — Centralized tax computation and status notification triggers for reuse across order flows.

### Key Frontend Areas (`admin/src`)
- `app/components/pos` — POS layout, payment controller, and order overlay (bridges to TakeOrder).
- `app/pages/orders/TakeOrderPage.tsx` — Multi-order phone order experience with draft save, recipient selection, and payment integration.
- `app/pages/orders/OrdersListPage.tsx` — Filterable order list using new domain hooks.
- `app/pages/settings/payments.tsx` — Payment settings admin (Stripe/Square/PayPal toggles, offline tenders).
- `domains/customers/*` — Hooks and services for phone/POS customer search, creation, and recipient management.
- `domains/payments/hooks/usePaymentCalculations.ts` — Centralized totals, tax, discount calculations.
- `domains/orders/hooks/useOrderPayments.ts` — Handles POS transfer, customer creation, and recipient address linkage before hitting `/api/orders/create`.
- `app/pages/ftd/*` — FTD imports dashboard, approvals, and live feed.

## Data & Schema Highlights
- `Order` model stores `recipientCustomerId` + `deliveryAddressId` (customer-based recipients) and tracks tax breakdown per order (`back/prisma/schema.prisma:328-383`).
- `Employee` includes `failedLoginAttempts` + `accountLockedUntil` for lockout enforcement (`schema.prisma:599-618`).
- `PaymentSettings`, `OfflinePaymentMethod`, and `PaymentProviderMode` models support encrypted provider credentials and dynamic offline tenders (`schema.prisma:625-704`).
- `GiftCard` and `GiftCardBatch` models back the full gift card lifecycle, including activation history (`schema.prisma:704-778`).
- Prisma migrations are managed via `npx prisma migrate dev` during development; production deploys use `npm run deploy` (schema push + generate). See `back/package.json`.

## Integrations & External Services
- **Stripe** (`back/src/routes/stripe.ts`, `back/src/services/stripeService.ts`): Payment intents, saved cards, refunds, webhook ingestion. Requires `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, optional terminal config.
- **Square** (`back/src/routes/square.ts`, `back/src/services/squareService.ts`): Card payments, terminal flows, customer storage. Needs Square sandbox/live credentials.
- **Twilio** (`back/src/services/smsService.ts`, `back/src/services/ftdNotification.ts`): SMS notifications; requires `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`.
- **SendGrid** (`back/src/services/emailService.ts`, `back/src/services/ftdNotification.ts`): Email delivery; requires `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`, `SENDGRID_FROM_NAME`.
- **Cloudflare R2** (`back/src/utils/r2Client.ts`): Product & order image storage; expects R2 account, key, secret, bucket, and public URL env vars.
- **FTD Mercury** (`back/src/services/ftdAuthService.ts`): Browser automation for token refresh; requires `FTD_MERCURY_USERNAME`, `FTD_MERCURY_PASSWORD`. Set `DISABLE_FTD_AUTO_REFRESH=true` to run backend without automation (dev mode).

## Security & Compliance
- Secrets enforced at runtime: `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CONFIG_ENCRYPTION_KEY`. Missing values crash the server.
- Passwords hashed with bcrypt (`BCRYPT_ROUNDS` default 12). Customer + employee login share common guard rails.
- Account lockout after five failed attempts, resets on success. Lockout duration 30 minutes (`back/src/routes/auth.ts`).
- Payment credentials encrypted at rest, masked in responses. Database column types are `String?` storing encrypted payloads.
- Admin frontend currently stores JWT tokens in memory/local storage; plan to migrate to httpOnly cookies when portal is hardened.
- Rate limiting not yet implemented; rely on lockouts and infrastructure-level controls for now.

## Development Workflow
- **Backend**  
  - Install deps: `cd back && npm install`  
  - Dev server: `npm run dev:back` (nodemon on port 4000)  
  - Prisma studio: `npx prisma studio` (optional)  
  - Generate types after schema changes: `npm run build` or `npx prisma generate`
- **Admin frontend**  
  - Install deps: `cd admin && npm install`  
  - Dev server: `npm run dev` (Vite on port 5173/5174)  
  - Type checking: `npm run typecheck`  
  - Build: `npm run build`
- Recommended env setup: keep `.env` per package (backend vs admin). Backend requires DB URL (`DATABASE_URL`), Stripe/Square/Twilio/SendGrid credentials, R2 configuration, timezone `TZ=America/Vancouver`.

## Testing & Observability
- Automated tests are minimal; rely on manual QA and PT transaction reconciliation. Add unit tests around discount rules and order creation when time permits.
- Logging uses `console.log` instrumentation with emoji prefixes to aid log scanning.
- No centralized error tracking; consider integrating Sentry once notification domain is hardened.
- FTD monitor logs include sync stats; watchdog errors surface in console (plan to add alerting).

## Deployment Notes
- Intended deployment: Node 18+ server with PostgreSQL, Cloudflare R2 bucket, Stripe/Square credentials, Twilio + SendGrid accounts.
- Use `npm run build` in `back/` to compile TypeScript → `dist/`, then run `npm run start`.
- Run `npm run deploy` (Prisma push) only when schema changes are backwards compatible; otherwise generate migrations.
- Ensure background workers (FTD monitor, token refresh) execute from main server process (they are started in `back/src/index.ts`).
- Set `PORT` env var if 4000 conflicts in production.

## Known Constraints & Risks
- Timezone-specific logic assumes `America/Vancouver`; multi-timezone support remains on roadmap.
- Notification service uses placeholder repositories; SMS/email endpoints rely on direct service calls without queueing or delivery receipts.
- Coupon router (`back/src/routes/coupons`) exists but is not mounted; discount system supersedes it.
- Split payments UI exists without full backend settlement; audit logging for manual adjustments is partially stubbed.
- Customer portal endpoints exist but frontend experience is pending.

## Related Documentation
- `docs/API_Endpoints.md` — up-to-date endpoint catalog.
- `docs/Auth_Security_Critical_Fixes.md` — security posture & test checklist.
- `docs/Progress_Tracker.markdown` — snapshot of shipped vs upcoming work.
- `docs/Future_Roadmap.md` — strategic priorities and idea backlog.

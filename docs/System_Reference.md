# Bloom System Reference

**Last audited:** 2026-01-17
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
- `services/paymentProviders/PaymentProviderFactory.ts` — Lazy-loads Stripe client from encrypted DB settings with cache + invalidation.
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
- **60 Prisma models** (1,545 lines total in `back/prisma/schema.prisma`)
- `Order` model stores `recipientCustomerId` + `deliveryAddressId` (customer-based recipients), tracks tax breakdown per order, and supports `WIREOUT` order type with `wireoutServiceFee` and `wireoutServiceName` fields for outgoing wire orders (`schema.prisma:328-383`).
- `Employee` includes `failedLoginAttempts` + `accountLockedUntil` for lockout enforcement (`schema.prisma:599-618`).
- `PaymentSettings`, `OfflinePaymentMethod`, and `PaymentProviderMode` models support encrypted provider credentials and dynamic offline tenders (`schema.prisma:625-704`).
- `GiftCard` and `GiftCardBatch` models back the full gift card lifecycle, including activation history (`schema.prisma:704-778`).
- `PrintJob` model tracks print queue with status lifecycle (PENDING → PRINTING → COMPLETED) for WebSocket-based print agent integration (`schema.prisma:1474-1492`).
- `Route` and `RouteStop` models enable delivery route planning with sequencing, driver assignment, and proof-of-delivery signatures (`schema.prisma:448-494`).
- `WireProductLibrary` stores wire products fetched from providers like Petals.ca with R2-hosted images (`schema.prisma:1516-1530`).
- `OperationsSettings` model stores wire-out configuration (default wire service name and fee) with single-row singleton pattern (`schema.prisma:997-1005`).
- `ProviderCustomer` links multiple Stripe customer IDs to a single local customer for deduplication support (`schema.prisma:1176-1181`).
- Prisma migrations are managed via `npx prisma migrate dev` during development; production deploys use `npm run deploy` (schema push + generate). See `back/package.json`.

## Currency Handling
- All monetary values are stored as cents (integers) across DB, backend, and admin frontend state.
- Use `admin/src/shared/utils/currency.ts` for display and input parsing:
  - `formatCurrency(cents)` for UI display
  - `parseUserCurrency(input)` or `dollarsToCents(value)` for user-entered amounts
- Event pricing fields (`quotedAmount`, `finalAmount`, `event_items.unitPrice/totalPrice`, `event_payments.amount`) are cents end-to-end.
- Avoid manual `/ 100` or `* 100` conversions in components; keep conversions centralized.

## Integrations & External Services
- **Stripe** (`back/src/routes/stripe.ts`, `back/src/services/paymentProviders/PaymentProviderFactory.ts`): Payment intents, saved cards, refunds, webhook ingestion. Credentials are stored in `PaymentSettings` (encrypted via `CONFIG_ENCRYPTION_KEY`) and loaded lazily; `STRIPE_WEBHOOK_SECRET` is only needed for webhook verification.
- **Square** (`back/src/routes/square.ts`, `back/src/services/squareService.ts`): Card payments, terminal flows, customer storage. Needs Square sandbox/live credentials.
- **Twilio** (`back/src/services/smsService.ts`, `back/src/services/ftdNotification.ts`): SMS notifications; credentials stored in `EmailSettings` (encrypted auth token) and managed via Settings → Email & SMS with `CONFIG_ENCRYPTION_KEY` set.
- **SendGrid** (`back/src/services/emailService.ts`, `back/src/services/ftdNotification.ts`): Email delivery; requires `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`, `SENDGRID_FROM_NAME`.
- **Cloudflare R2** (`back/src/utils/r2Client.ts`): Product & order image storage; expects R2 account, key, secret, bucket, and public URL env vars.
- **Petals.ca** (`back/src/routes/wire-products.ts`): Wire product image fetching with automated R2 upload for FTD/Teleflora product library management.
- **FTD Mercury** (`back/src/services/ftdAuthService.ts`): Browser automation for token refresh; requires `FTD_MERCURY_USERNAME`, `FTD_MERCURY_PASSWORD`. Set `DISABLE_FTD_AUTO_REFRESH=true` to run backend without automation (dev mode).

## Print System Architecture
- **Electron Print Agent** (`bloom-print-agent/`): Windows desktop application for auto-printing order tickets, delivery slips, and receipts to thermal and standard printers.
  - WebSocket client connects to backend on `/print-agent` endpoint for real-time print job updates
  - Subscribes to print job queue (PrintJob model) with auto-polling for new jobs
  - Renders HTML templates for order tickets with fold lines, recipient/sender info, delivery instructions
  - Signature canvas integration for driver proof-of-delivery on route tickets
  - Runs as background service with system tray integration
- **Print Service** (`back/src/services/printService.ts`): Queue management with WebSocket broadcast to connected agents
- **Print Jobs API** (`back/src/routes/print-jobs/*`): CRUD endpoints for job creation, status updates, and history
- **Order Integration**: Order creation auto-triggers ticket printing via print job creation (`back/src/routes/orders/create.ts`)
- **PrintJob Model** status lifecycle: PENDING → PRINTING → COMPLETED/FAILED
- **PrintJobType** enum: RECEIPT, ORDER_TICKET, DELIVERY_SLIP, ROUTE_TICKET, REPORT

## QR Delivery Routes System
- **Route Management** (`back/src/routes/routes/*`): Create delivery routes from order IDs with automatic distance-based sequencing
  - Resequence stops via drag-and-drop in admin UI
  - Assign drivers (Employee with DRIVER role)
  - Status tracking: PLANNED → IN_PROGRESS → COMPLETED
- **Admin Route Builder** (`admin/src/app/pages/delivery/RouteBuilderPage.tsx`): Drag-and-drop interface for building and managing routes
- **Driver Interface** (www/src/pages/DriverRoute.jsx`): Public driver view with HMAC-signed token-based access (30-day expiry)
  - No authentication required - uses time-limited signed tokens
  - Displays all route stops with suggested shortest-distance sequence
  - Driver has freedom to choose delivery order (suggestions not enforced)
  - Signature capture for proof of delivery
  - Mark stops delivered via `/api/driver/route/stop/:stopId/deliver`
- **QR Code Generation** (`back/src/routes/driver/qr-code.ts`): Per-order QR codes with signed tokens
  - QR codes print on order tickets (link to individual order, not route)
  - When scanned, backend checks if order is in a route and redirects accordingly
- **Route/RouteStop Models**: Route tracks driver, date, status; RouteStop tracks sequence, delivery status, signature URLs
- **Integration**: Order ticket printing includes "Scan for Route" QR code on driver delivery slip

## Customer Deduplication System
- **Duplicate Detection** (`back/src/routes/customerDuplicates.ts`): Groups customers by name, email, phone similarity using fuzzy matching
- **Merge Tool UI** (`admin/src/app/components/settings/misc/ImportJsonCard.tsx`): Manual merge review interface in admin settings
  - Consolidates addresses, order history, and recipient relationships
  - Preserves all Stripe customer IDs via ProviderCustomer model (one-to-many relationship)
  - Prevents self-referential relationships during merge (sender ≠ recipient validation)
  - Shows confidence scores for duplicate matches
- **ProviderCustomer Model**: Links multiple Stripe customer IDs to single local customer for payment provider consolidation
- **Stripe ID Migration Strategy**: Single Stripe account strategy with on-demand customer creation
  - POS creates customers without stripeID initially
  - Creates Stripe customer on first payment transaction
  - Matches existing Stripe customers by email/phone when possible
- **JSON Import Tool** (`back/src/routes/import-json.ts`): Bulk customer import with auto-duplicate detection and Stripe ID linking

## Wire Product Library
- **Wire Product Fetching** (`back/src/routes/wire-products.ts`): Automated image fetching from Petals.ca wire product database
  - Extracts product codes from FTD order descriptions and customName fields
  - Auto-uploads fetched images to Cloudflare R2 for persistence
  - Manual "Save to Library" button always available (even without auto-detected product code)
- **Library Management UI**: Modal for entering product code, name, description when saving to library
  - Product code field optional but recommended for future reference
  - Image width standardized to 8 inches (768px) for print consistency
- **WireProductLibrary Model**: Stores wire products with metadata (productCode, productName, imageUrl, provider)
- **FTD Integration**: Wire product images automatically associated with FTD orders during import
- **Image Persistence**: Order.images array stores fetched/uploaded images across sessions

## Wire-Out Order System
- **Order Type**: Orders can be marked as `WIREOUT` (outgoing wire orders sent through relay services like FTD/Teleflora)
- **Automatic Detection** (`admin/src/app/components/orders/RecipientCard.tsx`): When address entered is outside delivery zones, modal popup prompts:
  - "Wire Order" → Sets orderType to WIREOUT
  - "Direct Delivery" → Keeps as DELIVERY for out-of-zone direct deliveries
- **Zone Detection**: Enhanced `calculateDeliveryFee()` function returns zone status (`admin/src/shared/utils/deliveryCalculations.ts`)
  - Checks if destination address falls within configured delivery zones
  - Triggers wireout detection modal when address is out of zone
- **Wire Service Configuration** (`/settings/external-providers` - unified page):
  - **Wire-Out Settings**: Default wire service name (e.g., "FTD") and default service fee in cents
  - **External Providers**: Manage incoming wire order providers (FTD, DoorDash, etc.) with active/inactive toggles
- **Tax Rules for Wire-Out Orders**: Province-aware tax calculation based on destination
  - **BC destination**: GST (5%) + PST (7%) = 12% total
  - **Other Canadian provinces**: GST only (5%)
  - **International**: No tax (0%)
- **Order Fields**: Wire-out orders store `wireoutServiceFee` (Int, cents) and `wireoutServiceName` (String) per order
- **Settings API** (`back/src/routes/settings/operations.ts`):
  - GET `/api/settings/operations` — fetch wire-out default settings
  - PUT `/api/settings/operations` — update wire service name and default fee
- **UI Components**:
  - `WireoutSettingsCard` — Configure default wire service settings
  - `WireoutDetectionModal` — Auto-popup when out-of-zone address detected
  - Order type dropdown includes "Wire Order" option alongside Delivery and Pickup
- **Multi-Order Support**: Each order tab can independently be DELIVERY, PICKUP, or WIREOUT with appropriate tax/fee calculations

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
- Recommended env setup: keep `.env` per package (backend vs admin). Backend requires DB URL (`DATABASE_URL`), Square/Twilio/SendGrid credentials, R2 configuration, timezone `TZ=America/Vancouver`. Stripe credentials are managed in Settings → Payments (keep `CONFIG_ENCRYPTION_KEY` set; `STRIPE_WEBHOOK_SECRET` only if webhooks are enabled).

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
- **Electron Print Agent**: Deploy to Windows workstation with printer access. Requires Node 18+ and npm. Run `npm install && npm run build && npm start` in `bloom-print-agent/` directory. Agent auto-connects to backend WebSocket endpoint at `ws://localhost:4000/print-agent` (or production URL).

## Known Constraints & Risks
- Timezone-specific logic assumes `America/Vancouver`; multi-timezone support remains on roadmap.
- Notification service uses placeholder repositories; SMS/email endpoints rely on direct service calls without queueing or delivery receipts.
- Coupon router (`back/src/routes/coupons`) exists but is not mounted; discount system supersedes it.
- Split payments UI exists without full backend settlement; audit logging for manual adjustments is partially stubbed.
- Customer portal endpoints exist but frontend experience is pending.
- **Print agent requires Windows**; macOS and Linux support not yet implemented. Electron app is Windows-specific for thermal printer drivers.
- **Route optimization uses simple distance calculation**; advanced routing algorithms (time windows, traffic, driver preferences) pending. Google Maps route optimization is Phase 2.

## Related Documentation
- `docs/API_Endpoints.md` — up-to-date endpoint catalog.
- `docs/Auth_Security_Critical_Fixes.md` — security posture & test checklist.
- `docs/Progress_Tracker.markdown` — snapshot of shipped vs upcoming work.
- `docs/Future_Roadmap.md` — strategic priorities and idea backlog.

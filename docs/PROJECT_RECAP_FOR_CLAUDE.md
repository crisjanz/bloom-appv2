# PROJECT_RECAP_FOR_CLAUDE.md — Bloom Compressed Overview

**Last compiled:** 2025-12-30  
**Maintainer:** Cristian Janz  
**Purpose:** Summarize Bloom’s live architecture, capabilities, progress, and roadmap for Claude’s reasoning context.

---

## 🪴 Overview
Bloom is a full-service **florist POS + e-commerce system** for single-location operations in Vancouver.  
It unifies in-store POS, phone orders, FTD wire imports, payments, gift cards, and future website checkout.

---

## 🧱 Architecture Snapshot
- **Frontend:** React 19 + Vite 6, TailAdmin UI, TypeScript.
- **Backend:** Node 18 +, Express, Prisma, PostgreSQL.
- **Prototype website:** TailGrids storefront (`www/`).
- **Storage & integrations:** Cloudflare R2 (images) · Stripe + Square (payments) · Twilio (SMS) · SendGrid (email) · FTD Mercury (wire ingestion).
- **Timezone:** pinned to `America/Vancouver`.
- **Security:** enforced JWT secrets, bcrypt hashing, encrypted provider credentials, 5-strike lockout.

Key modules:
`routes/orders/*`, `routes/payment-transactions.ts`, `routes/discounts.ts`, `routes/gift-cards/`, `routes/routes/*`, `routes/customerDuplicates.ts`, `routes/wire-products.ts`, `services/ftdMonitor.ts`, `services/printService.ts`, `services/paymentSettingsService.ts`.

---

## 👩‍💻 Primary Roles
- **Counter Staff (POS)** — create & settle walk-in orders.  
- **Phone Order Team** — manage multi-recipient phone orders.  
- **Back-Office Admin** — configure payments, discounts, employees.  
- **Event Designers** — handle weddings / events / custom quotes.

---

## ✅ Recent Delivery Highlights
(From Progress Tracker and Roadmap)
- POS ↔ Take Order bridge — unified multi-order workflow.
- Unified payment settings with encrypted credentials.
- Gift card lifecycle (purchase → activation → redemption).
- Customer & recipient overhaul using shared `Customer` records.
- Continuous FTD wire ingestion service.
- Refreshed discount engine (`/api/discounts` + auto-apply).
- **Electron print agent** — Windows desktop app with WebSocket queue, thermal printer support, auto-printing order tickets.
- **QR delivery routes** — Route builder, driver interface with HMAC tokens, signature capture, proof-of-delivery.
- **Customer deduplication** — Duplicate detection with merge UI, Stripe ID consolidation via ProviderCustomer model.
- **Wire product library** — Petals.ca image fetching with Cloudflare R2 auto-upload, FTD order integration.

---

## 🛠️ Active Work (0–3 months)
1. Split-payments end-to-end (UI ✅, backend 🛠️).  
2. Order-lifecycle polish with real status history.  
3. TakeOrderPage UX refinements.  
4. Draft auto-cleanup on paid orders.  
5. Customer portal MVP (history + profile).  
6. Notification domain wiring with Twilio/SendGrid adapters.

---

## ⏳ Mid-Term (3–6 months)
- Delivery-board with driver assignment & live updates.  
- Automated discount campaigns (schedule + basket logic).  
- Reporting dashboards & exports.  
- Inventory / recipe controls.  
- Website checkout alignment with API auth endpoints.

---

## 🔮 Long-Term (6 + months)
- Multi-timezone / multi-location expansion.  
- Subscription orders & loyalty program.  
- Mobile driver app (offline-first).  
- Open API integrations (QB, Mailchimp, etc.).  
- Analytics & AI-assisted recommendations.

---

## 🔐 Security Overview
See `docs/Auth_Security_Critical_Fixes.md` for detail.
Highlights:  
- Enforced JWT + refresh secrets.  
- Bcrypt passwords (`BCRYPT_ROUNDS=12`).  
- Employee + customer login parity and enumeration guards.  
- Account lockout after 5 fails (30 min).  
- Config-key-based encryption for payment credentials.  
- Upcoming: refresh-token rotation, rate-limits, cookie-based sessions.

---

## 📡 API Surface (abridged)
Backend exposes 100 + REST routes under `/api/*` — see `API_Endpoints.md`.  
Main groups:
- Auth & Employees (`auth.ts`, `employees.ts`)  
- Customers & Recipients (`customers.ts`, `customersAuth.ts`)  
- Orders & Fulfillment (`orders/*`)  
- Payments & Gift Cards (`payment-transactions.ts`, `gift-cards/*`)  
- Discounts (`discounts.ts`)  
- Notifications (`notifications/*`, `email/*`, `sms/*`)  
- Settings & Config (`settings/*`)  
- Events & Reporting (`events.ts`, `reports.ts`)

---

## 🧩 Data Highlights
- `Order` links sender → recipient → deliveryAddress; tracks taxes.  
- `Employee` records lockout fields (`failedLoginAttempts`, `accountLockedUntil`).  
- `PaymentSettings` encrypts provider creds.  
- `GiftCard` + `GiftCardBatch` cover purchase → activation → redemption.  
- Prisma migrations via `npx prisma migrate dev`; deploy with `npm run deploy`.

---

## 🧪 Dev & Deploy
- **Backend:** `cd back && npm run dev:back` (port 4000).  
- **Admin:** `cd admin && npm run dev` (port 5173).  
- **Website:** `cd www && npm run dev` (port 5175).  
- Requires `.env` with DB URL, Stripe/Square/Twilio/SendGrid keys, `TZ=America/Vancouver`.  
- Build & deploy: `npm run build` → `npm run start`.  
- Workers (FTD monitor + token refresh) start in `back/src/index.ts`.

---

## 🚨 Known Constraints
- Single-timezone assumption; multi-TZ pending.  
- Notifications lack queueing / delivery receipts.  
- Split-payments backend settlement incomplete.  
- Customer portal UI pending.  
- Rate-limiting & error tracking (TODO → Sentry).

---

## 🧭 Related Docs
| File | Purpose |
|------|----------|
| `docs/System_Reference.md` | Deep technical reference |
| `docs/API_Endpoints.md` | Endpoint catalog |
| `docs/Auth_Security_Critical_Fixes.md` | Security hardening |
| `docs/Progress_Tracker.markdown` | Sprint + feature tracking |
| `docs/Future_Roadmap.md` | Strategic direction |

---

**End of Recap**
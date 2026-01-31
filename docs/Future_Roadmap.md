# Future Roadmap

**Last audited:** 2025-12-30  
**Maintainer:** Cristian Janz  
**Status Legend:** ✅ delivered · 🛠️ in progress · 🔜 planned · 💡 idea

## ✅ Recently Delivered Highlights
- ✅ **POS ↔ Take Order bridge** — true multi-order handoff with card message, delivery fee, and customer-based recipient handling (`admin/src/app/components/pos`, `back/src/routes/orders/create.ts`).
- ✅ **Unified payment settings** — encrypted provider credentials + custom offline tenders (`admin/src/app/pages/settings/payments.tsx`, `back/src/services/paymentSettingsService.ts`).
- ✅ **Gift card lifecycle** — purchase, activation, redemption, and handoff modals for both POS and phone orders (`admin/src/app/components/orders/payment/GiftCardActivationModal.tsx`, `back/src/routes/gift-cards`).
- ✅ **Customer & recipient overhaul** — sender/recipient both use `Customer` records with shared addresses; duplicate walk-in customers eliminated (`admin/src/domains/customers/services/CustomerService.ts`, `back/prisma/schema.prisma:328-380`).
- ✅ **FTD wire ingestion** — polling, auto-sync, and monitoring pipeline running continuously (`back/src/services/ftdMonitor.ts`, `back/src/routes/ftd`).
- ✅ **Discount engine refresh** — new `/api/discounts` module with validation + auto-apply endpoints feeding POS calculations (`back/src/routes/discounts.ts`, `admin/src/domains/payments/hooks/usePaymentCalculations.ts`).
- ✅ **Print system (backend + Electron agent)** — Windows desktop application with WebSocket integration for auto-printing order tickets, delivery slips, and receipts to thermal and standard printers. Signature capture for driver proof-of-delivery. Order creation auto-triggers ticket printing (`bloom-print-agent/`, `back/src/services/printService.ts`, `back/src/routes/print-jobs`).
- ✅ **QR delivery routes** — Route and stop management with admin drag-and-drop route builder, public driver interface with HMAC token-based access, signature capture for proof of delivery. QR codes print on order tickets linking to driver route view (`back/src/routes/routes/*`, `admin/src/app/pages/delivery/RouteBuilderPage.tsx`, `admin/src/app/pages/driver/DriverRoutePage.tsx`).
- ✅ **Customer deduplication & merge** — Duplicate detection by name/email/phone similarity with manual merge review UI. ProviderCustomer model preserves multiple Stripe IDs per customer. JSON import tool with auto-duplicate detection (`back/src/routes/customerDuplicates.ts`, `admin/src/app/components/settings/misc/ImportJsonCard.tsx`).
- ✅ **Wire product library** — Automated Petals.ca image fetching with Cloudflare R2 upload. Manual "Save to Library" workflow. Wire product images auto-associated with FTD orders (`back/src/routes/wire-products.ts`, `admin/src/app/pages/FulfillmentPage.tsx`).

## 🛠️ Near-Term Focus (0‑3 months)
1. 🛠️ **Split payments end-to-end** — UI is live; needs backend settlement + PT line allocation (`admin/src/app/components/pos/payment/SplitPaymentView.tsx`, `back/src/routes/payment-transactions.ts`).
2. 🛠️ **Order lifecycle polish** — persist real status history + operator notes (current `/api/orders/:id/history` is stub).
3. 🔜 **TakeOrderPage polish** — keep the full-page workflow and streamline sections (employee capture, recipient search, payment summary) without introducing stepper UI.
4. 🔜 **Draft auto-cleanup** — remove saved drafts once orders are paid to avoid clutter (`back/src/routes/orders/create.ts` & PT settlement flow).
5. 🔜 **Customer portal basics** — surface order history + profile management via existing `/api/customers/me/*` endpoints.
6. 🔜 **Notification domain wiring** — replace placeholder repositories so `/api/notifications/*` uses Twilio/SendGrid adapters end-to-end.
7. 🔜 **Print agent UI refinements** — admin interface for print job history, manual reprint queue, printer status monitoring, and print template customization (`bloom-print-agent/`, admin print settings page).
8. 🔜 **Route optimization algorithms** — advanced routing with shortest path, time windows, traffic data integration, and driver preferences. Google Maps route optimization API integration for auto-sequencing (`back/src/routes/routes/*`, route optimization service).

## ⏳ Mid-Term Objectives (3‑6 months)
- 🔜 **Delivery operations board** — driver assignment, bundle routing, and live status updates building on `orders/delivery` endpoints.
- 🔜 **Automated discount campaigns** — schedule-based and basket-logic discounts (buy X get Y) noted as TODOs in `back/src/routes/discounts.ts`.
- 🔜 **Reporting dashboards** — surface `/api/reports/*` metrics inside admin with export presets.
- 🔜 **Inventory & recipe controls** — consolidate product recipes, costing, and low-stock alerts using existing variant data.
- 🔜 **Website checkout** — align `www/` prototype with customer auth endpoints and shared catalog services.

## 🔮 Long-Term Vision (6+ months)
- 💡 Multi-timezone + multi-location support (currently locked to `America/Vancouver`).
- 💡 Subscription orders & loyalty program layered on customer domain.
- 💡 Mobile driver companion app with offline-first routing.
- 💡 Open API / partner integrations (QuickBooks, Mailchimp, etc.).
- 💡 Analytics package: sales forecasting, customer segmentation, and AI-assisted recommendations.

## 💡 Idea Parking Lot
- Remember employee identity per workstation (session storage helper already drafted in `TakeOrderPage`).
- Reusable recipient search widget across modules (leveraging `/api/customers/quick-search`).
- Rush order escalation with SMS notifications for designers and drivers.
- In-app notification center tied to order/event changes.
- Customer self-service portal with gift card balance + address book management.

## 🌐 Customer Website Plan (TailGrids Prototype)
- **MVP Core Pages (Priority 1–2)** — Home, Shop (✅ grid, filters, quick-add, availability), Product Detail (✅ Supabase carousel, pricing, related items; checkout handles date/recipient/message), Cart (✅ totals, coupons; gift card redemption pending), Checkout (✅ 3-step flow; add gift card + confirmation polish).
- **Support Pages** — Contact (✅ store details, map, form), About (structure outlined; content pending), FAQs & Policies (templates needed for delivery/refund/terms/privacy).
- **Account Experience (Priority 3)** — Login/register (phone-first + email), dashboard with orders, addresses, recipients, saved payments, gift card balance (API ready via `/api/customers/me/*`; UI not started).
- **Enhancements (Priority 4+)** — Gift card storefront, order tracking page (use `/api/orders/:id`), weddings/events marketing, quote request funnel, subscriptions, reviews.
- **Implementation Phases**  
  1. *Foundation* — Home, Shop, Product, Contact, About.  
  2. *E-commerce Core* — Cart, Checkout, Confirmation, Stripe payment hook-up.  
  3. *Customer Features* — Authentication, Tracking, Account dashboard, Gift cards.  
  4. *Advanced* — Weddings/events, quote intake, subscriptions, reviews.
- **Backend touchpoints** — `/api/products`, `/api/customers?phone=`, `/api/orders/create`, `/api/payment-transactions`, `/api/settings/delivery-charges`, `/api/gift-cards`, `/api/orders/:id`.

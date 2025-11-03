# Bloom Flower Shop – Progress Tracker

**Last audited:** 2025-11-02
Status markers: ✅ done · 🛠️ in progress · 🔜 planned · ⚠️ attention

## ✅ Production-Ready
- ✅ **POS ↔ Take Order transfer** — multi-order draft creation, PT number generation, and real-time POS cart sync (`admin/src/app/components/pos/TakeOrderOverlay.tsx`, `back/src/routes/orders/create.ts`).
- ✅ **Payment capture suite** — Cash, Stripe, Square, gift card, and offline tender flows organized under `PaymentController` (`admin/src/app/components/pos/payment/PaymentController.tsx`).
- ✅ **Customer & recipient migration** — single-source customer records with shared addresses and recipient links (`back/prisma/schema.prisma:328-386`, `admin/src/app/components/orders/RecipientCard.tsx`).
- ✅ **Gift card lifecycle** — batch generation, activation, redemption, and digital handoff (`back/src/routes/gift-cards`, `admin/src/app/components/orders/payment/GiftCardActivationModal.tsx`).
- ✅ **Unified discounts module** — `/api/discounts` powering POS auto-apply + manual overrides (`back/src/routes/discounts.ts`, `admin/src/domains/payments/hooks/usePaymentCalculations.ts`).
- ✅ **FTD monitor + dashboard** — token refresh, polling, order linking, and admin review pages (`back/src/services/ftdMonitor.ts`, `admin/src/app/pages/ftd`).
- ✅ **Payment settings admin** — encrypted provider credentials, offline tenders, and UI warnings when `CONFIG_ENCRYPTION_KEY` is absent (`admin/src/app/pages/settings/payments.tsx`, `back/src/routes/settings/payments.ts`).
- ✅ **Order list + filters** — new `OrdersListPage` with status/date filters and pagination (`admin/src/app/pages/orders/OrdersListPage.tsx`, `back/src/routes/orders/list.ts`).
- ✅ **Homepage content management** — full CMS for announcement banner, hero banners (3), frequently sold products, seasonal collections (2), featured categories (4), and FAQ system with drag-reorder. Admin at Settings → Website (`admin/src/app/components/settings/website/*`, `back/src/routes/settings/homepage.ts`, `back/src/routes/settings/faqs.ts`, `www/src/components/*`). Database models: `HomepageBanner`, `HomepageSettings`, `FAQ`.
- ✅ **Add-on products** — add-on groups managed under Settings → Orders with product assignments, product form selection, and order add-on picker (`back/src/routes/addon-groups.ts`, `admin/src/app/components/settings/orders/AddOnGroupsCard.tsx`, `admin/src/app/components/products/ProductForm.tsx`, `admin/src/app/components/orders/ProductsCard.tsx`).
- ✅ **Floranext recipient import** — Settings → Misc CSV uploader builds recipient customer records, addresses, sender links, and detailed summaries with optional auto-customer creation (`back/src/routes/import.ts`, `admin/src/app/components/settings/misc/ImportCard.tsx`).

## 🛠️ In Progress / Needs QA
- 🛠️ **Split payments settlement** — UI is wired; needs backend distribution of PT lines and change logging (`admin/src/app/components/pos/payment/SplitPaymentView.tsx`, `back/src/routes/payment-transactions.ts`).
- 🛠️ **Notification domain wiring** — `/api/notifications/*` endpoints still rely on placeholder repositories (`admin/src/domains/notifications/services/NotificationService.ts`).
- 🛠️ **Order status history** — status transitions work, but `/api/orders/:id/history` remains a stub (`back/src/routes/orders/status.ts:101-162`).
- 🛠️ **Event payments UX** — rich event payment flows exist, but modal polish + PDF outputs pending (`admin/src/app/pages/events/` components).
- ⚠️ **Admin context in requests** — multiple TODOs note missing authenticated employee IDs when logging actions (e.g., `admin/src/domains/orders/services/OrderService.ts:148`).

## 🔜 Backlog & Sequenced Work
- 🔜 **TakeOrderPage UX polish** — iterate on existing full-page experience (section collapse, faster recipient search, clearer payment summary).
- 🔜 **Draft cleanup after checkout** — auto-delete draft orders once PT transaction posts (`back/src/routes/orders/create.ts`, `back/src/routes/orders.ts`).
- 🔜 **Customer portal launch** — build UI on top of `/api/customers/me/*` endpoints for order history & profile edits.
- 🔜 **Delivery operations board** — driver assignment, routing, and live updates on top of `/api/orders/delivery`.
- 🔜 **Rate limiting & audit logs** — complement existing auth lockouts and capture changes to sensitive settings.
- 🔜 **Website (TailGrids) go-live** — reuse admin domains for storefront catalogue + checkout (`www/`).

## 📌 Notes & Follow-ups
- TODOs across notification services highlight missing integrations; prioritize once Twilio/SendGrid credentials are stable.
- Coupon router under `back/src/routes/coupons` is legacy and not mounted — safe to ignore or remove after confirming no references.
- Order edit screen still carries placeholder mapping for payment adjustments (`admin/src/app/pages/orders/OrderEditPage.tsx`). Capture real data once transaction audit log is implemented.
- Keep an eye on `CustomerService.hashPassword` TODO for future consumer portal rollout (`admin/src/domains/customers/services/CustomerService.ts:209`).

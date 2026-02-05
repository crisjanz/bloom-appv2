# Bloom API Surface

**Last audited:** 2026-02-01
**Source:** `back/src`

## Diagnostics
- ✅ GET `/api/health` — backend heartbeat with environment + timezone info (`back/src/index.ts`)

## Dashboard
- ✅ GET `/api/dashboard/metrics` — real-time KPI metrics for dashboard cards (`back/src/routes/dashboard.ts`)
  - Returns: today's revenue (amount in cents, percent change), pending orders (count, overdue), deliveries today (total, by status), new customers (this week, percent change)
  - Response example:
    ```json
    {
      "todayRevenue": {"amount": 0, "percentChange": 0},
      "ordersPending": {"count": 25, "overdue": 25},
      "deliveriesToday": {"total": 0, "byStatus": {"DELIVERED": 0, "OUT_FOR_DELIVERY": 0, "PREPARING": 0}},
      "newCustomers": {"thisWeek": 507, "percentChange": 4970}
    }
    ```
- ✅ GET `/api/dashboard/revenue-trend?days=7` — daily revenue totals for trend chart
  - Query param: `days` (default 7, max 365)
  - Returns: array of `{date: string, revenue: number}` in cents
  - Response example: `[{"date":"2025-10-28","revenue":0},{"date":"2025-10-29","revenue":0},{"date":"2025-10-30","revenue":189157}]`

## Staff Authentication & Directory
- ✅ POST `/api/auth/login` — employee login with lockout and password verification (`back/src/routes/auth.ts`)
- ✅ POST `/api/auth/refresh` — issue new access token from a refresh token.
- ✅ GET `/api/auth/me` — return authenticated employee profile.
- ✅ POST `/api/auth/logout` — stateless acknowledgement endpoint.
- ✅ POST `/api/auth/setup-admin` — bootstrap administrator with password strength checks.
- ✅ POST `/api/auth/change-password` — change password after verifying the current hash.
- ✅ GET `/api/employees` — list employees sorted alphabetically (`back/src/routes/employees.ts`)
- ✅ POST `/api/employees` — create employee with role/contact metadata.
- ✅ PUT `/api/employees/:id` — update employee name, email, type, or phone.
- ✅ DELETE `/api/employees/:id` — remove/deactivate employee.
- ✅ POST `/api/employees/:id/set-password` — admin sets employee login password.
- ✅ POST `/api/employees/:id/reset-password` — admin resets employee password.

## Customer Accounts & Directory
- ✅ POST `/api/customers/register` — customer self-registration with hashed password (`back/src/routes/customersAuth.ts`)
- ✅ POST `/api/customers/login` — customer JWT login.
- ✅ GET `/api/customers/me` — fetch authenticated customer profile.
- ✅ PUT `/api/customers/me` — update profile details.
- ✅ PUT `/api/customers/me/password` — change password after verification.
- ✅ GET `/api/customers/me/orders` — customer order history.
- ✅ POST `/api/customers/logout` — end active session.

- ✅ GET `/api/customers/quick-search` — fuzzy lookup for POS/phone orders (`back/src/routes/customers.ts`)
- ✅ GET `/api/customers` — paged customer list with optional query.
- ✅ POST `/api/customers` — create customer record.
- ✅ GET `/api/customers/:id` — load customer with addresses, recipients, and order stats.
- ✅ PUT `/api/customers/:id` — update customer core fields.
- ✅ DELETE `/api/customers/:id` — delete customer after unlinking orders/addresses.
- ✅ GET `/api/customers/:id/recipients` — saved recipients for a sender.
- ✅ POST `/api/customers/:id/save-recipient` — link existing customer as recipient.
- ✅ POST `/api/customers/:id/recipients` — create recipient with address payload.
- ✅ PUT `/api/customers/:customerId/recipients/:recipientId` — update recipient link metadata.
- ✅ DELETE `/api/customers/:customerId/recipients/:recipientId` — remove recipient link.
- ✅ POST `/api/customers/:id/addresses` — add address tied to customer.
- ✅ PUT `/api/customers/addresses/:id` — update saved address.
- ✅ DELETE `/api/customers/addresses/:id` — delete address.

## Address Shortcuts & Card Messages
- ✅ GET `/api/shortcuts` — list reusable address shortcuts (`back/src/routes/addressShortcuts.ts`)
- ✅ POST `/api/shortcuts` — create shortcut entry.
- ✅ DELETE `/api/shortcuts/:id` — delete shortcut.
- ✅ GET `/api/messages` — fetch card message templates (`back/src/routes/messages.ts`)
- ✅ POST `/api/messages` — create template.
- ✅ DELETE `/api/messages/:id` — remove template.

## Orders & Fulfillment
- ✅ GET `/api/orders/list` — filterable order listing (`back/src/routes/orders/list.ts`)
- ✅ GET `/api/orders/:id` — order detail with related entities (`back/src/routes/orders/single.ts`)
- ✅ POST `/api/orders/create` — finalize paid orders and trigger notifications (`back/src/routes/orders/create.ts`)
- ✅ POST `/api/orders/save-draft` — persist multi-order drafts (`back/src/routes/orders/create.ts`)
  - Optional: `paymentIntentId`, `paymentStatus` to finalize as PAID and update Stripe description.
- ✅ PUT `/api/orders/:id/update` — update order metadata, recipient links, totals (`back/src/routes/orders/update.ts`)
- ✅ POST `/api/orders/upload-images` — attach order images (`back/src/routes/orders/upload.ts`)
- ✅ GET `/api/orders/delivery` — delivery board filtered by date/range (`back/src/routes/orders/delivery.ts`)
- ✅ GET `/api/orders/delivery/count/future` — forward-looking delivery counts.
- ✅ PATCH `/api/orders/:orderId/status` — status transitions with validation (`back/src/routes/orders/status.ts`)
- ✅ GET `/api/orders/:orderId/next-statuses` — allowed next status list.
- ⚠️ GET `/api/orders/:orderId/history` — placeholder returning current status only.

## Delivery Routes
- ✅ GET `/api/routes` — list routes with optional `date`, `driverId`, `status` filters; includes stops (`back/src/routes/routes/index.ts`)
- ✅ POST `/api/routes` — create route from order IDs with auto sequencing (`back/src/routes/routes/index.ts`)
- ✅ PUT `/api/routes/:id/resequence` — reorder stops within a planned route (`back/src/routes/routes/index.ts`)
- ✅ PATCH `/api/routes/:id/status` — update route status (`back/src/routes/routes/index.ts`)
- ✅ PATCH `/api/routes/:id` — update name/driver/notes (`back/src/routes/routes/index.ts`)
- ✅ DELETE `/api/routes/:id` — delete planned route with cascade stops (`back/src/routes/routes/index.ts`)
- ✅ GET `/api/driver/qr/:orderId` — generate QR code + signed token for driver link (`back/src/routes/driver/qr-code.ts`)
- ✅ GET `/api/driver/route?token=...` — public driver/standalone order view (no auth) (`back/src/routes/driver/route-view.ts`)
- ✅ POST `/api/driver/route/stop/:stopId/deliver` — public mark-delivered with signature upload (`back/src/routes/driver/route-view.ts`)

## Order Communications
- ✅ GET `/api/orders/:orderId/communications` — fetch SMS/email log (`back/src/routes/communications.ts`)
- ✅ POST `/api/orders/:orderId/communications` — record manual communication.
- ✅ POST `/api/orders/:orderId/sms` — send ad-hoc SMS via Twilio adapter.
- ✅ PATCH `/api/orders/:orderId/communications/mark-read` — mark inbound SMS as read (returns order + total unread counts).
- ✅ PATCH `/api/orders/:orderId/delivery-time` — adjust delivery window with audit note.
- ✅ GET `/api/communications/unread-count` — total unread inbound SMS count.

## Catalog & Products
- ✅ GET `/api/categories` — list categories with hierarchy/counters (`back/src/routes/categories.ts`)
- ✅ GET `/api/categories/:id/products` — products for category.
- ✅ POST `/api/categories` — create category with hierarchy validation.
- ✅ PUT `/api/categories/:id` — rename/move category.
- ✅ DELETE `/api/categories/:id` — delete after dependency check.
- ✅ GET `/api/reportingcategories` — list reporting categories (`back/src/routes/reportingCategories.ts`)
- ✅ POST `/api/reportingcategories` — create reporting category.
- ✅ DELETE `/api/reportingcategories/:id` — remove unused category.
- ✅ GET `/api/products/ping` — connectivity check (`back/src/routes/products.ts`)
- ✅ GET `/api/products/search` — POS search with enriched variant pricing.
- ✅ GET `/api/products` — full catalog with variants.
- ✅ POST `/api/products` — create product with image upload + variants.
- ✅ GET `/api/products/:id` — fetch product for editing.
- ✅ PUT `/api/products/:id` — update product + variants.
- ✅ PATCH `/api/products/:id/images` — reorder or prune images.
- ✅ POST `/api/products/images/upload` — upload single image to R2.
- ✅ DELETE `/api/products/images` — delete image from R2.

**Product Categories (multi-assignments):**
- `categoryId` remains the primary category.
- `categoryIds` (array) can be provided on POST/PUT to assign additional categories.
- GET `/api/products` and `/api/products/:id` now include `categoryIds` in responses.

### Product Variants - Featured Images
Each variant can optionally reference one of the product's images via `featuredImageUrl`. This keeps all images in `Product.images` but lets pricing tiers highlight a specific image.

**Request body (POST/PUT `/api/products`):**
```json
{
  "variants": [
    {
      "name": "Small",
      "priceDifference": -500,
      "featuredImageUrl": "https://cdn.hellobloom.ca/products/rose-small.jpg"
    }
  ]
}
```

**Response sample:**
```json
{
  "variants": [
    {
      "id": "variant-uuid",
      "name": "Small",
      "featuredImageUrl": "https://cdn.hellobloom.ca/products/rose-small.jpg"
    }
  ]
}
```

## Inventory Management
- ✅ GET `/api/inventory` — paged inventory listing with filters (`search`, `categoryId`, `lowStockOnly`, `page`, `pageSize`, `sortBy`, `sortOrder`) (`back/src/routes/inventory.ts`)
- ✅ GET `/api/inventory/lookup?sku=...` — lookup a single variant by SKU or QR payload (`BLOOM:SKU:...`) (`back/src/routes/inventory.ts`)
- ✅ PATCH `/api/inventory/:variantId` — quick stock adjustment (`stockLevel` absolute or `delta` increment/decrement) (`back/src/routes/inventory.ts`)
- ✅ POST `/api/inventory/bulk-adjust` — bulk stock adjustments for multiple variants (`back/src/routes/inventory.ts`)
- ✅ GET `/api/inventory/qr/:variantId` — generate QR data URL for inventory labels (`back/src/routes/inventory.ts`)
- ✅ GET `/api/inventory/report` — generate inventory count sheet PDF and return `pdfUrl` (`back/src/routes/inventory.ts`, `back/src/templates/inventory-sheet-pdf.ts`)
- ✅ GET `/api/inventory/label/:variantId` — generate single price label PDF (`quantity` query optional) and return `pdfUrl` (`back/src/routes/inventory.ts`, `back/src/templates/price-label-pdf.ts`)
- ✅ POST `/api/inventory/labels` — generate batch price labels PDF from variant IDs/quantities and return `pdfUrl` (`back/src/routes/inventory.ts`, `back/src/templates/price-label-pdf.ts`)

## Add-On Groups
- ✅ GET `/api/addon-groups` — list add-on groups with counts (`back/src/routes/addon-groups.ts`)
- ✅ GET `/api/addon-groups/options` — fetch main/add-on product catalogs for assignment.
- ✅ GET `/api/addon-groups/:id` — load group detail (products + add-ons).
- ✅ GET `/api/addon-groups/by-product/:productId` — resolve groups assigned to a product with add-on product details.
- ✅ POST `/api/addon-groups` — create add-on group with optional product/add-on assignments.
- ✅ PUT `/api/addon-groups/:id` — rename group or toggle default availability.
- ✅ DELETE `/api/addon-groups/:id` — delete group (fails when products still assigned).
- ✅ POST `/api/addon-groups/:id/products` — assign main products to a group.
- ✅ DELETE `/api/addon-groups/:id/products/:productId` — remove main-product assignment.
- ✅ POST `/api/addon-groups/:id/addons` — attach add-on products to a group.
- ✅ DELETE `/api/addon-groups/:id/addons/:addonProductId` — remove add-on product from a group.

## Discounts & Pricing
- ✅ GET `/api/discounts` — list unified discount rules (`back/src/routes/discounts.ts`)
- ✅ GET `/api/discounts/:id` — discount detail.
- ✅ GET `/api/discounts/qr` — list gift QR coupon discounts (latest first).
- ✅ POST `/api/discounts` — create discount scenario.
- ✅ PUT `/api/discounts/:id` — replace discount configuration.
- ✅ PATCH `/api/discounts/:id` — partial update (toggles, scheduling).
- ✅ DELETE `/api/discounts/:id` — remove discount.
- ✅ POST `/api/discounts/validate` — simulate discount application.
- ✅ POST `/api/discounts/auto-apply` — evaluate automatic discounts for cart context.

## Gift Cards & Payments
- ✅ POST `/api/gift-cards/batch` — generate inactive card batch (`back/src/routes/gift-cards/index.ts`)
- ✅ GET `/api/gift-cards` — list cards.
- ✅ GET `/api/gift-cards/:id` — card detail (includes transactions).
- ✅ PATCH `/api/gift-cards/:id/deactivate` — deactivate an active card.
- ✅ POST `/api/gift-cards/:id/adjust` — admin balance adjustment (amount in cents).
- ✅ POST `/api/gift-cards/purchase` — purchase/activate cards (physical & digital).
  - Optional: `paymentIntentId`; creates a PAID `Order` when `orderId` not provided and updates Stripe description.
- ✅ POST `/api/gift-cards/activate` — legacy activation support.
- ✅ POST `/api/gift-cards/check` — balance lookup.
- ✅ POST `/api/gift-cards/redeem` — redeem balance toward payment.
- ✅ POST `/api/gifts/birthday/create` — create birthday recipient gift token + coupon for an order.
- ✅ GET `/api/gifts/birthday/:token` — public landing payload for birthday gift token.
- ✅ POST `/api/gifts/birthday/:token/save` — public save-for-later flow (collect birthday/contact with consent).

- ✅ POST `/api/payment-transactions` — record payment transaction (`back/src/routes/payment-transactions.ts`)
- ✅ GET `/api/payment-transactions` — list transactions with filters.
- ✅ GET `/api/payment-transactions/export` — CSV export.
- ✅ POST `/api/payment-transactions/:transactionId/refunds` — create refund.
- ✅ GET `/api/payment-transactions/customer/:customerId` — transactions by customer.
- ✅ GET `/api/payment-transactions/reports/daily/:date` — daily reconciliation snapshot.
- ✅ POST `/api/payment-transactions/generate-number` — allocate PT-XXXX numbers.
- ✅ GET `/api/payment-transactions/:transactionNumber` — lookup by transaction number.

### Refunds & External Providers
- ✅ POST `/api/refunds` — process a refund with order allocations.
  - Stripe card refunds require `refundMethods[].providerTransactionId` (Stripe paymentIntentId).
- ✅ GET `/api/refunds/:refundNumber` — refund detail with methods + order breakdown.
- ✅ GET `/api/external-providers` — list active external providers.
- ✅ POST `/api/external-providers` — create external provider.
- ✅ PUT `/api/external-providers/:id` — update external provider.
- ✅ DELETE `/api/external-providers/:id` — delete external provider.

## Communications & Notifications
- ✅ POST `/api/notifications/send` — trigger multi-channel notification (`back/src/routes/notifications/index.ts`)
- ✅ POST `/api/notifications/receipt` — queue receipt notification.
- ✅ POST `/api/notifications/order-confirmation` — order confirmation dispatch.
- ✅ POST `/api/notifications/status-update` — status update messaging.
- ✅ GET `/api/notifications/templates` — list message templates.
- ✅ POST `/api/notifications/test` — dry-run notification.

- ✅ POST `/api/email/test` — send test email (`back/src/routes/email/index.ts`)
- ✅ POST `/api/email/gift-card` — deliver digital gift card email.
- ✅ POST `/api/email/receipt` — send email receipt/SMS combo.
- ✅ POST `/api/email/receipt/:orderId` — email receipt (HTML, no PDF attachment).
- ✅ POST `/api/email/invoice/:orderId` — email invoice with PDF attachment.

- ✅ POST `/api/sms/test` — send test SMS (`back/src/routes/sms/index.ts`)
- ✅ POST `/api/sms/receipt` — SMS receipt delivery.
- ✅ POST `/api/sms/order-confirmation` — SMS order confirmation.
- ✅ POST `/api/sms/webhook` — Twilio inbound SMS webhook (public).
- ✅ GET `/api/sms/status` — SMS service diagnostics.
- ✅ WebSocket `/communications` — admin realtime channel (events: `sms:received`).

## Print Jobs
- ✅ GET `/api/print-jobs/pending` — Print agent polling endpoint (`agentId` query required, optional `limit`, returns pending jobs ordered by priority/createdAt).
- ✅ PATCH `/api/print-jobs/:id/status` — Agents report status updates (`PRINTING`, `COMPLETED`, `FAILED`; accepts optional `agentId`, `errorMessage`, `printedAt`).
- ✅ GET `/api/print-jobs/history` — Paged history (optional `status`, `limit`, `offset`).
- ✅ POST `/api/print-jobs/:id/retry` — Reset failed job to `PENDING`.
- ✅ POST `/api/print-jobs` — Manual job creation (validate order id, template, optional priority).
- ✅ WebSocket `/print-agent` — Agent channel (messages: `HEARTBEAT` → `HEARTBEAT_ACK`, `JOB_STATUS` → `ACK`; future push deliveries).
- ✅ WebSocket job payloads may include `data.pdfBase64` for PDF-backed prints (order tickets, receipts, reports).
- ✅ POST `/api/print/receipt/:orderId` — generate receipt print (PDF or thermal).
- ✅ POST `/api/print/invoice/:orderId` — generate invoice PDF print.
- ✅ POST `/api/print/order-ticket/:orderId` — generate order ticket print.
- ✅ GET `/api/print/preview/ticket` — generate a preview order ticket PDF from the most recent completed order.
- ✅ GET `/api/print/pdf/:fileName` — fetch locally stored PDF for browser printing.

## Wire Products
- ✅ GET `/api/wire-products` — Search wire product library by code or name (`back/src/routes/wire-products.ts`; optional `query`, `provider` filters).
- ✅ POST `/api/wire-products` — Save wire product to library (requires `productCode`, `productName`, `imageUrl`, `provider`; optional `description`).
- ✅ POST `/api/wire-products/fetch` — Fetch product image from Petals.ca and auto-upload to Cloudflare R2 (requires `productCode` or `imageUrl`; returns R2 URL).
- ✅ GET `/api/wire-products/:id` — Get single wire product by ID.
- ✅ DELETE `/api/wire-products/:id` — Remove wire product from library.

## Customer Deduplication
- ✅ GET `/api/customer-duplicates` — Detect duplicate customers using name, email, phone similarity (`back/src/routes/customerDuplicates.ts`; returns grouped potential duplicates with confidence scores).
- ✅ POST `/api/customer-duplicates/merge` — Merge selected duplicate customers (requires `masterCustomerId`, `duplicateCustomerIds` array; consolidates addresses, orders, recipients, and Stripe IDs via ProviderCustomer model; prevents self-referential relationships).
- ✅ POST `/api/import-json` — Bulk customer import with auto-duplicate detection and Stripe ID linking (`back/src/routes/import-json.ts`; accepts JSON array of customer records).

## Integrations
- ✅ POST `/api/stripe/payment-intent` — create Stripe intent (`back/src/routes/stripe.ts`)
- ✅ POST `/api/stripe/payment-intent/:id/confirm` — confirm intent.
- ✅ POST `/api/stripe/customer` — create or fetch Stripe customer.
- ✅ POST `/api/stripe/refund` — issue refund.
- ✅ POST `/api/stripe/customer/payment-methods` — list saved payment methods.
- ✅ POST `/api/stripe/setup-intent` — create SetupIntent for saving a card.
- ✅ POST `/api/stripe/customer/payment-methods/detach` — detach saved payment method.
- ✅ GET `/api/stripe/health` — Stripe connectivity check.
- ✅ POST `/api/stripe/webhook` — Stripe webhook ingestion with signature validation.

- ✅ POST `/api/square/payment` — charge via Square (`back/src/routes/square.ts`)
- ✅ GET `/api/square/payment/:id` — retrieve payment.
- ✅ POST `/api/square/customer` — create Square customer profile.
- ✅ POST `/api/square/refund` — issue refund.
- ✅ POST `/api/square/terminal/checkout` — start terminal checkout.
- ✅ GET `/api/square/terminal/checkout/:id` — poll terminal checkout.
- ✅ POST `/api/square/terminal/checkout/:id/cancel` — cancel checkout.
- ✅ POST `/api/square/customer/payment-methods` — list saved cards.
- ✅ POST `/api/square/payment/saved-card` — charge saved card.
- ✅ GET `/api/square/health` — Square diagnostics.
- ✅ POST `/api/customer-payment-methods/match` — find possible customers by card fingerprint (Stripe).

## Settings & Configuration
- ✅ GET `/api/settings/store-info` — fetch business info (`back/src/routes/settings/store-info.ts`)
- ✅ POST `/api/settings/store-info` — update store info.
- ✅ GET `/api/settings/notifications/order-status` — status notification preferences.
- ✅ POST `/api/settings/notifications/order-status` — save notification settings.
- ✅ GET `/api/settings/business-hours` — business hours schedule.
- ✅ POST `/api/settings/business-hours` — persist hours.
- ✅ GET `/api/settings/delivery-exceptions` — delivery exceptions list.
- ✅ POST `/api/settings/delivery-exceptions` — update exceptions.
- ✅ GET `/api/settings/holidays` — holiday list.
- ✅ POST `/api/settings/holidays` — create holiday.
- ✅ PUT `/api/settings/holidays/:id` — update holiday.
- ✅ DELETE `/api/settings/holidays/:id` — delete holiday.
- ✅ GET `/api/settings/holidays/upcoming` — upcoming holidays.
- ✅ GET `/api/settings/holidays/active/:date` — check active holiday.
- ✅ GET `/api/settings/delivery-charges` — delivery charge zones (`back/src/routes/settings/delivery-charges.ts`)
- ✅ POST `/api/settings/delivery-charges` — save delivery charges.
- ✅ GET `/api/settings/pos-tabs` — POS tile layout.
- ✅ POST `/api/settings/pos-tabs` — save POS layout.
- ✅ GET `/api/settings/tax-rates` — tax rate list (`back/src/routes/settings/tax-rates.ts`)
- ✅ POST `/api/settings/tax-rates` — create tax rate.
- ✅ PUT `/api/settings/tax-rates/:id` — update tax rate.
- ✅ DELETE `/api/settings/tax-rates/:id` — delete tax rate.
- ✅ GET `/api/settings/tax-rates/active` — active tax configuration.
- ✅ GET `/api/settings/payments` — payment provider configuration (`back/src/routes/settings/payments.ts`)
- ✅ PUT `/api/settings/payments` — update provider credentials with encryption.
- ✅ GET `/api/settings/operations` — wire-out operations settings (`back/src/routes/settings/operations.ts`)
- ✅ PUT `/api/settings/operations` — update wire service name and default fee.
- ✅ GET `/api/print-settings` — fetch print routing settings (auto-creates defaults).
- ✅ PUT `/api/print-settings` — update print routing settings.
- ✅ GET `/api/email-settings` — fetch email + SMS configuration (auto-creates defaults).
- ✅ PUT `/api/email-settings` — update email + SMS configuration.
- ✅ POST `/api/email-settings/test` — send test email with current settings.

## Data Imports
- ✅ POST `/api/import/floranext-recipients` — upload Floranext CSV to create recipient customer records, addresses, and sender links (auto-creates sender when `customerId` omitted) (`back/src/routes/import.ts`)
- ✅ GET `/api/customers/:id/recipients` — optional pagination via `?paginated=true&page=0&pageSize=25` (`back/src/routes/customers.ts`)

## Events & Reporting
- ✅ GET `/api/events/list` — list events/weddings (`back/src/routes/events.ts`)
- ✅ GET `/api/events/:id` — event detail with items/payments.
- ✅ POST `/api/events` — create event.
- ✅ PUT `/api/events/:id` — update event.
- ✅ DELETE `/api/events/:id` — delete event.
- ✅ PATCH `/api/events/:id/status` — update event status.
- ✅ GET `/api/events/:id/payments` — list event payments.
- ✅ POST `/api/events/:id/payments` — add event payment.
- ✅ PUT `/api/events/:id/payments/:paymentId` — update event payment.
- ✅ DELETE `/api/events/:id/payments/:paymentId` — delete event payment.

- ✅ GET `/api/reports/sales/summary` — sales KPI summary (`back/src/routes/reports.ts`)
- ✅ GET `/api/reports/sales/orders` — detailed sales export.
- ✅ GET `/api/reports/tax/export` — tax export CSV.

## Media & Assets
- ✅ POST `/api/images/upload` — upload to Cloudflare R2 (`back/src/routes/images.ts`)
- ✅ DELETE `/api/images/delete` — delete R2 object.

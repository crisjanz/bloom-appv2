# FloraNext Order History Import

## Overview
Import historical delivery orders from FloraNext as read-only records. Goal: let staff look up "what did this customer send last year?" without recreating full Bloom orders.

## Scope
- **Only delivery orders** (status = "taken" in FloraNext means delivered/completed)
- **No in-store sales** — skip pickup/walk-in orders
- **Read-only** — these are historical records, not editable Bloom orders
- **Linked to customers** — match sender to existing Bloom customer by phone/email

---

## Data Model

### New table: `FloranextOrder`
Lightweight historical record — NOT a full Bloom `Order`.

```prisma
model FloranextOrder {
  id                String   @id @default(uuid())
  floranextOrderId  String   @unique  // e.g. "10234" or "10234-web"
  orderDate         DateTime
  grandTotal        Int      // cents

  // Sender
  senderName        String
  senderPhone       String?
  senderEmail       String?
  customerId        String?  // FK to Bloom Customer (matched after import)
  customer          Customer? @relation(fields: [customerId], references: [id])

  // Recipient
  recipientName     String
  recipientPhone    String?
  recipientAddress  String?  // Full address as single string
  recipientCity     String?

  // Order summary
  itemDescription   String?  // Scraped product names, comma-separated
  deliveryDate      DateTime?
  notes             String?  // Card message or special instructions

  // Metadata
  rawData           Json?    // Original scraped data for reference
  createdAt         DateTime @default(now())
}
```

**Why not use Bloom's `Order` model?**
- Bloom orders have items, transactions, delivery records, payment info — none of which maps cleanly from FloraNext
- A separate lightweight table avoids polluting real order data
- Simple to query: "show me all FloranextOrders for this customer"

---

## Implementation Tasks

### Task 1: Export Script — `export_floranext_orders.py`
**File**: New `scripts/export_floranext_orders.py`
**Based on**: `scripts/export_web_orders.py` (reuse session auth, pagination, rate limiting)

- Reuse `fetch_orders_page()` — already paginates the `sales_order_grid` namespace
- **Filter**: Only process orders where status field = "taken" (delivery orders)
- **Remove** the `is_web_order()` filter — we want ALL delivery orders, not just web
- For each order, extract from the list API:
  - `increment_id` (order number)
  - `created_at` (order date)
  - `grand_total` (total amount)
  - `billing_name` (sender)
  - `shipping_name` (recipient)
  - `shipping_address` (delivery address)
  - `customer_email`
  - `status` (verify it's "taken")
- For each order, fetch detail page to get:
  - Sender phone, recipient phone (reuse `fetch_order_detail_phones()`)
  - Item/product names (scrape from order detail HTML — look for product description lines)
  - Card message / special instructions (if visible on detail page)
- **Output**: `floranext_orders_export.json`
- **Resume capability**: Save progress after each page (same pattern as web orders export)
- **Rate limiting**: Same delays as existing scripts

**Note**: The order list API likely returns a `status` field — need to verify the exact field name and value for delivered orders. It may be `status`, `order_status`, or similar. The value "taken" is FloraNext's term for delivered. Run a test page fetch and log all fields to confirm.

### Task 2: Database Migration
**File**: `back/prisma/schema.prisma`

- Add `FloranextOrder` model (see schema above)
- Add relation field on `Customer` model: `floranextOrders FloranextOrder[]`
- Run: `npx prisma migrate dev --name add_floranext_order_history`

### Task 3: Backend — Import Endpoint
**File**: New `back/src/routes/import-json.ts` (add to existing import routes)

- `POST /api/import-json/floranext-orders` — accepts JSON upload
- For each order:
  - Create `FloranextOrder` record
  - Attempt to match sender to existing Bloom `Customer` by phone (normalized) or email
  - If matched, set `customerId`
  - Store `grandTotal` in cents
- Return: count of imported orders, matched vs unmatched customers
- Skip duplicates (check `floranextOrderId` unique constraint)

### Task 4: Admin — Order History in Customer Detail
**File**: Modify customer detail page/component

- Add "FloraNext History" tab or section to customer detail view
- Query: `GET /api/customers/:id/floranext-orders`
- Display as simple table:
  - Date | Order # | Recipient | Address | Items | Total
- Sorted by date descending (most recent first)
- This is where staff looks up "what did they send last year?"

### Task 5: Backend — Customer FloraNext Orders Endpoint
**File**: Add to customer routes

- `GET /api/customers/:id/floranext-orders` — returns all `FloranextOrder` where `customerId` matches
- Include basic pagination (probably not needed for most customers, but just in case)

---

## Implementation Order
1. **Task 1** (Export script) — run this first, inspect the data
2. **Task 2** (DB migration)
3. **Task 3** (Import endpoint)
4. **Task 5** (API endpoint)
5. **Task 4** (Admin UI)

## Key Risks
- **FloraNext session expiry** — scraping requires valid session cookie, may need refresh mid-export
- **Order detail scraping** — product names and card messages may not be in a consistent HTML structure; may need trial and error
- **Status field name** — need to verify the exact field name for "taken" orders from the API response
- **Volume** — if you have thousands of orders, the detail-page scraping will be slow (rate limited). Estimate ~2 seconds per order.

## Notes
- The export script is a one-time operation (or run periodically if still using FloraNext in parallel)
- `rawData` JSON field preserves the original scraped data in case we need to re-parse later
- Customer matching uses same phone normalization as existing merge scripts

## Ready for Implementation: ✅

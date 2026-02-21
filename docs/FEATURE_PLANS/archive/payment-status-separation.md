# Payment Status Separation

**Status:** 🔜 Ready for Implementation
**Created:** 2026-02-18
**Priority:** High (blocking launch — Pay Later / House Account orders lose payment info after fulfillment)

---

## Overview

Order `status` currently tracks both fulfillment progress AND payment state in a single field. This causes unpaid orders (Pay Later, House Account) to lose their "unpaid" status when fulfilled. This refactor adds a dedicated `paymentStatus` field to separate the two concerns.

Also includes renaming COD → Pay Later throughout the codebase.

---

## 🤖 Implementation Constraints for AI

**CRITICAL - Read Before Implementing:**

> **⚠️ FOR AI ASSISTANTS: You MUST read the required documentation before writing code. Follow existing patterns exactly.**

### Required Reading (IN ORDER)
1. `/docs/AI_IMPLEMENTATION_GUIDE.md` ← **READ THIS FIRST** (all patterns: API routes, hooks, WebSocket, R2, batch ops)
2. `/docs/System_Reference.md` (architecture context)
3. `/docs/API_Endpoints.md` (existing endpoints)
4. `/CLAUDE.md` (project conventions)
5. `/docs/POS_FLOWS.md` — **Section 8** (context for this refactor)

### Pattern Reference Files
- **Order model:** `/back/prisma/schema.prisma` (line ~324)
- **Status helpers:** `/admin/src/shared/utils/orderStatusHelpers.ts`
- **Status colors:** `/admin/src/shared/utils/statusColors.ts`
- **Order types:** `/admin/src/app/components/orders/types.ts`
- **Refund service:** `/back/src/services/refundService.ts`

### Pre-Implementation Contract (Required — Answer Before Coding)
- **Goals → Changes mapping**: Map each Goal to the specific code changes/files.
- **Files to touch (exact paths)**: Listed below in "Files to Modify" section.
- **Backend surface area**: No new endpoints — modifications to existing order creation, update, and query endpoints.
- **DB/migrations**: Add `paymentStatus` field + `PaymentStatus` enum + rename COD → PAY_LATER.
- **UI standards confirmation**: Follow shared UI patterns. Use `getOrderStatusColor()` / `getPaymentStatusColor()` pattern.
- **Unknowns / questions**: If anything is ambiguous, ask now — do not start coding.

### Critical Don'ts
❌ Use `fetch()` directly → Use `useApiClient` hook
❌ Store prices as floats → Use integers in cents
❌ Skip migrations → Run `npx prisma migrate dev --name payment_status_separation`
❌ Remove PAID/REFUNDED from OrderStatus immediately → Deprecate gradually (see Phase 1)

### Frontend/UI Critical Don'ts
❌ Build custom tables / table HTML → Use `StandardTable`
❌ Use emojis in user-facing UI → Use Heroicons / existing icon library
❌ Allow null/undefined input values → Always use `value={x || ''}`

---

## Goals

1. **Separate payment status from fulfillment status** — orders track WHERE they are (fulfillment) and WHETHER they're paid (payment) independently
2. **Pay Later / House Account orders keep "unpaid" visibility** throughout the entire fulfillment lifecycle
3. **Rename COD → Pay Later** across all UI, API, and database references
4. **Add payment status filtering** to orders list, delivery page, and reports

---

## Architecture

### Database Schema Changes

**New enum:**
```prisma
enum PaymentStatus {
  UNPAID
  PAID
  PARTIALLY_PAID
  REFUNDED
  PARTIALLY_REFUNDED
}
```

**Modified Order model:**
```prisma
model Order {
  // ... existing fields ...
  status          OrderStatus    @default(DRAFT)
  paymentStatus   PaymentStatus  @default(UNPAID)  // NEW
  // ...
}
```

**Modified OrderStatus enum — remove payment-related values:**
```prisma
enum OrderStatus {
  DRAFT
  PAID           // KEEP — means "order confirmed/accepted", rename later if confusing
  IN_DESIGN
  READY
  OUT_FOR_DELIVERY
  COMPLETED
  REJECTED
  CANCELLED
  // REMOVED: REFUNDED, PARTIALLY_REFUNDED → moved to PaymentStatus
}
```

**Rename COD:**
- Any enum/type referencing `COD` → `PAY_LATER`
- Payment method type in PaymentTransaction: `COD` → `PAY_LATER`

**Migration:**
```bash
npx prisma migrate dev --name payment_status_separation
```

### Migration Data Strategy

**CRITICAL — existing orders need paymentStatus backfilled:**

```sql
-- All existing orders with status PAID, IN_DESIGN, READY, OUT_FOR_DELIVERY, COMPLETED
-- that have a linked PaymentTransaction with amount > 0 → paymentStatus = PAID
UPDATE "Order" SET "paymentStatus" = 'PAID'
WHERE status IN ('PAID', 'IN_DESIGN', 'READY', 'OUT_FOR_DELIVERY', 'COMPLETED')
  AND id IN (SELECT DISTINCT "orderId" FROM "_OrderPaymentTransactions");

-- Orders with status REFUNDED → paymentStatus = REFUNDED, status = COMPLETED
UPDATE "Order" SET "paymentStatus" = 'REFUNDED', status = 'COMPLETED'
WHERE status = 'REFUNDED';

-- Orders with status PARTIALLY_REFUNDED → paymentStatus = PARTIALLY_REFUNDED, status = COMPLETED
UPDATE "Order" SET "paymentStatus" = 'PARTIALLY_REFUNDED', status = 'COMPLETED'
WHERE status = 'PARTIALLY_REFUNDED';

-- DRAFT orders without payments → paymentStatus = UNPAID (default)
-- No action needed, UNPAID is the default
```

### Core Rules

**`paymentStatus` is ALWAYS automatic — never manually editable.**

It can only change through these actions:
| Action | paymentStatus Change | Requires |
|--------|---------------------|----------|
| Payment processed (card, cash, check) | UNPAID → PAID | PT transaction created |
| Pay Later / House Account order created | stays UNPAID | — |
| Customer pays later | UNPAID → PAID | New PT transaction created |
| Cancel + full refund | PAID → REFUNDED | Stripe refund (card) or gift card (cash/check) + PT transaction |
| Cancel + gift card refund | PAID → REFUNDED | Gift card created with full amount + PT transaction |
| Non-cancel partial refund | PAID → PARTIALLY_REFUNDED | Enter amount, card portion first, remainder as gift card |
| Non-cancel full refund | PAID → REFUNDED | Same as cancel refund but order status stays |
| Fulfillment status changes | **NO CHANGE** | — (paymentStatus is independent) |

**There is no manual "Mark as Paid" button.** Every payment status change must be backed by an actual PT transaction. This keeps the books accurate.

### Cancel Flow

Cancelling an order depends on current `paymentStatus`:

**Cancel an UNPAID order (Pay Later, House Account, Draft):**
- Just cancel — no payment to deal with
- `status: CANCELLED`, `paymentStatus: UNPAID`

**Cancel a PAID order (single payment method):**
- Full refund to original method (Stripe refund for card, gift card for cash/check)
- `status: CANCELLED`, `paymentStatus: REFUNDED`
- Or: "Issue gift card instead" option
- Or: "Cancel without refund" (rare)

**Cancel a PAID order (split payment):**
- Full refund — automatic: card portions refund via Stripe, cash/check portions issued as gift card
- `status: CANCELLED`, `paymentStatus: REFUNDED`
- No choosing which method to refund from — system handles it

**Cancel UI flow:**
1. User clicks "Cancel Order"
2. If `paymentStatus: UNPAID` → confirm and cancel immediately
3. If `paymentStatus: PAID` → show dialog:
   - Shows breakdown of how refund will be processed (e.g., "$50 back to Visa •••• 1234, $30 as gift card")
   - Option: "Issue everything as gift card instead"
   - Option: "Cancel without refund"
4. Confirm → refund processes → order cancelled

**Non-cancel refunds (order stays fulfilled):**
- Customer complaint → enter dollar amount to refund
- Refunds from card portion first, remainder as gift card
- `status` stays as-is (COMPLETED, etc.), `paymentStatus: PARTIALLY_REFUNDED`

---

## Files to Modify

### Backend (back/src/)

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `PaymentStatus` enum, add `paymentStatus` field to Order, rename COD → PAY_LATER |
| `routes/orders/create.ts` | Set `paymentStatus` based on payment method (PAID for card/cash/check, UNPAID for pay_later/house_account) |
| `routes/orders/create-from-scan.ts` | Set `paymentStatus` on mobile-created orders |
| `routes/orders/status.ts` | Don't change `paymentStatus` when fulfillment status changes (decouple) |
| `routes/orders/list.ts` | Support `paymentStatus` filter parameter |
| `routes/orders/delivery.ts` | Include `paymentStatus` in response, support filtering |
| `routes/stripe.ts` | Set `paymentStatus: PAID` on successful Stripe payment |
| `routes/square.ts` | Set `paymentStatus: PAID` on successful Square payment |
| `routes/dashboard.ts` | Update revenue queries to use `paymentStatus` instead of `status` for PAID check |
| `routes/reports.ts` | Update report queries to use `paymentStatus` |
| `routes/print/index.ts` | Include `paymentStatus` on printed documents |
| `services/refundService.ts` | Update `paymentStatus` to REFUNDED/PARTIALLY_REFUNDED instead of `status` |
| `services/transactionService.ts` | Set `paymentStatus` when processing payments |
| `routes/subscriptions.ts` | Set `paymentStatus` on subscription orders |
| `cron/subscriptionCron.ts` | Set `paymentStatus` on auto-generated subscription orders |
| `routes/gift-cards/purchase.ts` | Check `paymentStatus` if relevant |
| `routes/products.ts` | Check if PAID reference is payment-related |
| `routes/settings/order-status-notifications.ts` | Remove REFUNDED/PARTIALLY_REFUNDED from status notification list |

### Admin Frontend (admin/src/)

| File | Change |
|------|--------|
| `app/components/orders/types.ts` | Add `PaymentStatus` type, remove REFUNDED/PARTIALLY_REFUNDED from `OrderStatus`, add payment status colors/labels |
| `shared/utils/statusColors.ts` | Add `getPaymentStatusColor()` helper |
| `shared/utils/orderStatusHelpers.ts` | Add payment status display helpers |
| `shared/ui/forms/StatusSelect.tsx` | Add `PaymentStatusSelect` or update to support both status types |
| `app/pages/orders/OrdersListPage.tsx` | Add payment status filter, show payment badge on each order |
| `app/pages/delivery/DeliveryPage.tsx` | Show payment status badge (critical — driver needs to know if COD/Pay Later) |
| `app/pages/mobile/mobileFulfillmentHelpers.ts` | Update status references |
| `app/pages/FulfillmentPage.tsx` | Show payment status on fulfillment cards |
| `app/pages/mobile/MobileFulfillmentPhotosPage.tsx` | Show payment status if relevant |
| `app/components/orders/edit/OrderHeader.tsx` | Show payment status badge (read-only — paymentStatus is always automatic, driven by PT transactions) |
| `app/components/customers/cards/OrderHistoryCard.tsx` | Show payment status in customer order history |
| `app/components/pos/payment/PaymentController.tsx` | Rename COD → Pay Later, handle paymentStatus |
| `app/components/orders/payment/PaymentSection.tsx` | Rename COD → Pay Later, handle paymentStatus |
| `app/components/pos/payment/ManualPaymentModal.tsx` | Update COD references |
| `app/components/reports/paymentUtils.ts` | Update to use `paymentStatus` |
| `app/pages/reports/SalesReportPage.tsx` | Filter by `paymentStatus` for revenue |
| `app/pages/reports/TransactionsReportPage.tsx` | Show payment status |
| `app/pages/events/EventPaymentsPage.tsx` | Update status references |
| `app/pages/orders/ExternalOrdersPage.tsx` | Show payment status |
| `app/components/settings/notifications/OrderStatusNotificationsCard.tsx` | Remove REFUNDED from notification triggers |
| `domains/orders/entities/Order.ts` | Add `paymentStatus` field |
| `domains/orders/hooks/useOrderPayments.ts` | Update to set `paymentStatus` |
| `domains/orders/repositories/OrderRepository.ts` | Include `paymentStatus` in queries |
| `domains/orders/services/OrderService.ts` | Handle `paymentStatus` |
| `domains/payments/hooks/useTransactionSubmission.ts` | Set `paymentStatus` after payment |
| `domains/notifications/integration/OrderNotifications.ts` | Update status references |
| `app/components/subscriptions/*.tsx` (5 files) | Update PAID/REFUNDED references |
| `shared/hooks/useSubscriptions.ts` | Update status references |

### Customer Website (www/src/)

| File | Change |
|------|--------|
| `pages/Subscriptions.jsx` | Update PAID reference if payment-related |

---

## UI Requirements

### Payment Status Badge
Show alongside existing fulfillment status on all order displays:

```
Order #1234  [IN_DESIGN] [UNPAID]    ← two badges
Order #1235  [READY]     [PAID]      ← two badges
```

**Badge colors:**
- `UNPAID` → red/warning (needs attention)
- `PAID` → green
- `PARTIALLY_PAID` → yellow/warning
- `REFUNDED` → gray
- `PARTIALLY_REFUNDED` → yellow

### Orders List Page
- Add "Payment Status" filter dropdown (All, Unpaid, Paid, Refunded)
- Show payment status column in table

### Delivery Page
- Show payment status badge on each order card
- **Critical for drivers**: if `paymentStatus: UNPAID`, driver knows NOT to leave flowers without collecting (even though it's usually Pay Later, not COD)

### Order Detail / Edit Page
- Show payment status badge in header alongside fulfillment status (read-only)
- No manual "Mark as Paid" — payment status only changes through actual payment/refund actions
- If order is UNPAID, show "Collect Payment" button that opens payment flow → creates PT → updates paymentStatus

---

## Implementation Checklist

### Phase 1: Database + Backend
- [ ] Add `PaymentStatus` enum to Prisma schema
- [ ] Add `paymentStatus` field to Order model (default: UNPAID)
- [ ] Rename COD → PAY_LATER in all enums/types
- [ ] Create migration with data backfill SQL
- [ ] Run migration: `npx prisma migrate dev --name payment_status_separation`
- [ ] Update `orders/create.ts` to set `paymentStatus` based on payment method
- [ ] Update `orders/status.ts` to NOT change `paymentStatus` on fulfillment status change
- [ ] Update `refundService.ts` to update `paymentStatus` instead of `status`
- [ ] Update `orders/list.ts` to support `paymentStatus` filter
- [ ] Update `orders/delivery.ts` to include `paymentStatus`
- [ ] Update `dashboard.ts` and `reports.ts` revenue queries
- [ ] Update `stripe.ts` and `square.ts` payment handlers

### Phase 2: Frontend Status Helpers
- [ ] Add `PaymentStatus` type to `orders/types.ts`
- [ ] Add `getPaymentStatusColor()` to `statusColors.ts`
- [ ] Add payment status display helpers to `orderStatusHelpers.ts`
- [ ] Remove REFUNDED/PARTIALLY_REFUNDED from fulfillment status lists

### Phase 3: UI Updates
- [ ] Orders list page — add payment status filter + column
- [ ] Delivery page — show payment status badge on order cards
- [ ] Order detail/edit page — show payment status in header
- [ ] Customer order history — show payment status
- [ ] Fulfillment page — show payment status
- [ ] Reports pages — use `paymentStatus` for revenue filtering
- [ ] Rename all "COD" labels to "Pay Later" in UI

### Phase 4: Payment Flow Updates
- [ ] `PaymentController.tsx` — rename COD → Pay Later, set paymentStatus
- [ ] `PaymentSection.tsx` — rename COD → Pay Later, set paymentStatus
- [ ] `useTransactionSubmission.ts` — set paymentStatus after successful payment
- [ ] `useOrderPayments.ts` — set paymentStatus

### Phase 5: Testing & Cleanup
- [ ] Test: Card payment → paymentStatus = PAID
- [ ] Test: Cash payment → paymentStatus = PAID
- [ ] Test: Pay Later → paymentStatus = UNPAID, can still fulfill
- [ ] Test: House Account → paymentStatus = UNPAID, can still fulfill
- [ ] Test: Refund → paymentStatus = REFUNDED, fulfillment status unchanged
- [ ] Test: Orders list filter by payment status
- [ ] Test: Delivery page shows payment badge
- [ ] Test: Existing orders backfilled correctly
- [ ] Test: Cancel UNPAID order → CANCELLED + UNPAID
- [ ] Test: Cancel PAID (card) → full Stripe refund → CANCELLED + REFUNDED
- [ ] Test: Cancel PAID (split card+cash) → card refunded via Stripe, cash as gift card → CANCELLED + REFUNDED
- [ ] Test: Cancel PAID with "issue gift card" → gift card created → CANCELLED + REFUNDED
- [ ] Test: Non-cancel partial refund → status unchanged + PARTIALLY_REFUNDED
- [ ] Test: Collect payment on UNPAID order → creates PT → paymentStatus = PAID
- [ ] Update `/docs/API_Endpoints.md`
- [ ] Update `/docs/Progress_Tracker.markdown`

---

## Edge Cases

### Existing Orders
- Migration backfills `paymentStatus` based on existing `status` and linked PaymentTransactions
- Orders with `status: REFUNDED` → `status: COMPLETED` + `paymentStatus: REFUNDED`
- DRAFT orders without payments → `paymentStatus: UNPAID`

### Split Payments
- If split payment is partially completed (e.g., $50 of $100 paid) → `paymentStatus: PARTIALLY_PAID`
- When remaining balance paid → `paymentStatus: PAID`

### House Account Monthly Billing
- House Account orders stay `paymentStatus: UNPAID` until monthly billing is processed
- Monthly billing process should batch-update to `paymentStatus: PAID`

### Website Orders
- Website checkout with payment → `paymentStatus: PAID`
- Website orders pending payment (if ever) → `paymentStatus: UNPAID`

### Cancel + Refund Scenarios
- Cancel UNPAID → just cancel, no refund
- Cancel PAID (single method) → full refund to original method or gift card
- Cancel PAID (split) → card portions auto-refund, cash/check portions → gift card
- Non-cancel refund → enter amount, card portion first, remainder as gift card
- **No partial refunds on cancel** — cancel is always full refund or no refund
- **No store credit system** — gift cards serve as store credit when needed

---

## Success Criteria

- [ ] Pay Later orders show as UNPAID throughout entire fulfillment lifecycle
- [ ] Fulfilled orders retain correct payment status
- [ ] Orders list can filter by payment status
- [ ] Delivery page shows payment badge (driver knows if collecting)
- [ ] Refunds update `paymentStatus` without affecting fulfillment `status`
- [ ] All COD references renamed to Pay Later
- [ ] Existing orders correctly backfilled
- [ ] Reports use `paymentStatus` for revenue calculations
- [ ] No console errors, dark mode supported

---

## Implementation Notes

**Dependencies:** None — this is a foundational fix

**Deployment Notes:**
- Migration runs automatically on Render deploy
- Backfill SQL runs as part of migration
- No environment variable changes needed
- **IMPORTANT**: Backfill must run before frontend deploys (backend first)

---

## Post-Implementation

After completing implementation:

### Plan-to-Diff Verification (Required)
- **Success Criteria → Evidence mapping**: For each criterion, point to exact file/line.
- **Tests run**: List commands and results.
- **Git push**: Do **NOT** run `git push` automatically — ask Cris for confirmation.

1. Mark feature as ✅ Completed in Progress_Tracker
2. Move this file to `/docs/FEATURE_PLANS/archive/`

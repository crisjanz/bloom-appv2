# Stripe Refund Integration

**Status:** 🔜 Ready for Implementation
**Created:** 2026-01-31
**Priority:** High

---

## Overview

The RefundModal currently only creates DB records (refund, refundMethod, orderRefund) and updates statuses. When the original payment was a Stripe card payment, no actual Stripe refund is issued — money never returns to the customer's card. The backend already has `POST /api/stripe/refund` that calls `stripe.refunds.create()`, but the refund flow never uses it.

---

## 🤖 Implementation Constraints for AI

**CRITICAL - Read Before Implementing:**

> **⚠️ FOR AI ASSISTANTS: You MUST read the required documentation before writing code. Follow existing patterns exactly.**

### Required Reading (IN ORDER)
1. `/docs/AI_IMPLEMENTATION_GUIDE.md` ← **READ THIS FIRST**
2. `/docs/System_Reference.md`
3. `/docs/API_Endpoints.md`
4. `/CLAUDE.md`

### Pattern Reference Files
- **Stripe route pattern:** `/back/src/routes/stripe.ts` (existing `POST /refund` at line 800)
- **Refund service:** `/back/src/services/refundService.ts`
- **Refund modal:** `/admin/src/app/components/refunds/RefundModal.tsx`

### Pre-Implementation Contract

- **Goals → Changes mapping**: See below
- **Files to touch**: `back/src/services/refundService.ts`, `admin/src/app/components/refunds/RefundModal.tsx`
- **Backend surface area**: No new endpoints. Modify `refundService.processRefund` to call existing `POST /api/stripe/refund` logic internally (or call Stripe SDK directly from the service).
- **DB/migrations**: None — `RefundMethod.providerRefundId` already exists in schema.
- **UI standards confirmation**: Minimal UI change — only the `status` field on refundMethods payload changes from `"manual"` to the Stripe result.
- **Unknowns**: None.

---

## Goals

1. When refund method is CARD + STRIPE, issue a real Stripe refund via `stripe.refunds.create()` before recording in DB
2. Store the Stripe refund ID in `RefundMethod.providerRefundId`
3. If Stripe refund fails, abort the entire refund (don't create DB records for a refund that didn't happen)
4. Non-Stripe refund methods (CASH, STORE_CREDIT, EXTERNAL) continue working as-is (DB-only)

---

## Architecture

### Current Flow (broken)
```
RefundModal → POST /api/refunds → refundService.processRefund()
  → Creates Refund record
  → Creates RefundMethod (status: "manual", no Stripe call)
  → Creates OrderRefund
  → Updates order/transaction statuses
  → ❌ No money returned to customer
```

### New Flow
```
RefundModal → POST /api/refunds → refundService.processRefund()
  → FOR EACH refundMethod where provider === "STRIPE":
      → Call stripe.refunds.create({ payment_intent, amount })
      → Get back refund.id and refund.status
      → Set providerRefundId = refund.id
      → Set status = refund.status (e.g. "succeeded")
  → If Stripe call fails → throw (aborts transaction, no DB records created)
  → Creates Refund record (inside $transaction)
  → Creates RefundMethod with providerRefundId
  → Creates OrderRefund
  → Updates statuses
```

### Key Data Points
- `PaymentMethod.providerTransactionId` = Stripe `paymentIntentId` (set during payment)
- `RefundMethod.providerRefundId` = Stripe `refundId` (to be set during refund)
- The transaction's `paymentMethods` array is already fetched by RefundModal when loading the transaction

### Where to Get the paymentIntentId

The frontend already has the transaction data including `paymentMethods`. Each Stripe payment method has `providerTransactionId` = the Stripe paymentIntentId.

**Option A (recommended):** Pass `providerTransactionId` from frontend in the refund request, so the backend service can use it directly.

**Option B:** Have the backend look up the transaction's payment methods to find the Stripe paymentIntentId. More defensive but adds a DB query.

→ Go with **Option A** — frontend already has the data, pass it through.

---

## Implementation Checklist

### Phase 1: Backend — refundService.ts (~20 lines changed)

- [ ] Import Stripe client (`paymentProviderFactory` from stripe route, or import directly)
- [ ] Before the `$transaction`, for each refundMethod with `provider === "STRIPE"`:
  - Call `stripe.refunds.create({ payment_intent: method.providerTransactionId, amount: method.amount })`
  - Store result `refundId` and `status` on the method object
- [ ] Inside `$transaction`, use the Stripe-returned `providerRefundId` and `status` when creating RefundMethod records
- [ ] If Stripe call fails, throw error (no DB records created)

### Phase 2: Frontend — RefundModal.tsx (~5 lines changed)

- [ ] When building `refundMethods` payload, include `providerTransactionId` from the matching transaction payment method
- [ ] Change `status` from hardcoded `"manual"` to `"pending"` for STRIPE methods (backend will set final status)

### Phase 3: Testing

- [ ] Stripe card payment → full refund → verify money returns to card
- [ ] Stripe card payment → partial refund → verify correct amount refunded
- [ ] Cash payment → refund → verify no Stripe call, works as before
- [ ] Stripe refund with insufficient funds / already refunded → verify error displayed

---

## Files to Modify

```
back/src/services/refundService.ts     (add Stripe refund call before DB transaction)
admin/src/app/components/refunds/RefundModal.tsx  (pass providerTransactionId in payload)
```

No new files. No migrations. No new endpoints.

---

## Edge Cases

- **Already fully refunded in Stripe**: Stripe returns error → we surface it, no DB records created
- **Partial refund exceeding remaining**: Stripe returns error → same handling
- **Network failure to Stripe**: Error thrown before `$transaction` → clean failure
- **Mixed payment (Stripe + Cash)**: Each method handled independently — Stripe portion refunded via API, cash portion is DB-only

---

## Success Criteria

- [ ] Stripe card refunds actually return money to customer's card
- [ ] `RefundMethod.providerRefundId` populated with Stripe refund ID
- [ ] Non-Stripe refunds unchanged
- [ ] Failed Stripe refund prevents DB records from being created
- [ ] No console errors

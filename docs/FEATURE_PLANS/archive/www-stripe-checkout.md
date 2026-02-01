# WWW Stripe Checkout + Gift Card Orders

**Status:** 🔜 Ready for Implementation
**Created:** 2026-02-01
**Priority:** High

---

## Overview
Wire up Stripe CC payment directly in the www cart checkout (replacing the current draft-only flow), and create order records for gift card purchases so all transactions have order numbers visible in Stripe.

---

## 🤖 Implementation Constraints for AI

**CRITICAL - Read Before Implementing:**

> **⚠️ FOR AI ASSISTANTS: You MUST read the required documentation before writing code. Follow existing patterns exactly.**

### Required Reading (IN ORDER)
1. `/docs/AI_IMPLEMENTATION_GUIDE.md` ← **READ THIS FIRST** (all patterns: API routes, hooks, WebSocket, R2, batch ops)
2. `/docs/System_Reference.md` (architecture context)
3. `/docs/API_Endpoints.md` (existing endpoints)
4. `/CLAUDE.md` (project conventions)

### Pattern Reference Files
**Study these files for implementation patterns:**
- **Stripe CardElement pattern:** `/www/src/pages/GiftCard.jsx` (lines 245-314 — working Stripe payment flow)
- **Payment intent endpoint:** `/back/src/routes/stripe.ts` (POST `/stripe/payment-intent`)
- **Draft order creation:** `/back/src/routes/orders/create.ts` (POST `/orders/save-draft`)
- **Gift card purchase:** `/back/src/routes/gift-cards/purchase.ts`
- **Stripe description update pattern:** `/back/src/routes/payment-transactions.ts` (fire-and-forget PI update)

**DO NOT write from scratch. COPY patterns from these files.**

### Pre-Implementation Contract (Required — Answer Before Coding)

- **Goals → Changes mapping**: See Goals section below
- **Files to touch (exact paths)**: See Files to Create/Modify section
- **Backend surface area**: Modify `POST /orders/save-draft` to accept payment fields + confirm order. New logic in gift card purchase to create Order record.
- **DB/migrations**: Add `GIFT_CARD` to `OrderType` enum. Migration: `npx prisma migrate dev --name add_gift_card_order_type`
- **UI standards confirmation**: www uses plain React (not admin shared components). Will follow existing www patterns.
- **Unknowns / questions**: None — all flows traced.

### Critical Don'ts
❌ Use `fetch()` directly in admin → Use `useApiClient` hook (www uses fetch — that's fine for www)
❌ Store prices as floats → Use integers in cents
❌ Skip migrations → Run `npx prisma migrate dev --name feature_name`

---

## Goals

1. **www cart checkout collects CC payment** — customers pay with Stripe CardElement before order is created. No more draft-only flow.
2. **Orders created as PAID** — after successful Stripe payment, order is saved with `status: PAID` and `paymentAmount` set.
3. **Gift card purchases create Order records** — each gift card purchase gets an orderNumber for tracking.
4. **Stripe descriptions include order numbers** — "Web Order - 1042" for cart, "Gift Card Order - 1043" for gift cards.

---

## Architecture & Endpoints

### Part 1: WWW Cart Checkout with Stripe

**Flow change:**
```
CURRENT:  Form submit → createOrderDraft() → DRAFT order (no payment)
NEW:      Form submit → createPaymentIntent → confirmCardPayment → createPaidOrder() → PAID order
```

**Backend: Modify `POST /api/orders/save-draft`**
- Add optional fields: `paymentIntentId`, `paymentStatus`
- When `paymentIntentId` is provided and payment confirmed:
  - Create order with `status: PAID` instead of `DRAFT`
  - Set `paymentAmount` to actual total (subtotal + tax + delivery fee)
  - Set `orderSource: WEBSITE`
- After order creation, update Stripe PaymentIntent description: `"Web Order - {orderNumber}"`

**Frontend: Modify checkout flow in `www/src/pages/Checkout.jsx`**
- Remove phone/in-store payment options — CC only
- Add Stripe Elements (`CardElement`) to payment step
- Flow: validate form → create PaymentIntent → confirm card → call save-draft with paymentIntentId → show success

### Part 2: Gift Card Order Records

**Backend: Modify `POST /api/gift-cards/purchase`**
- After gift card creation, also create an Order record:
  - `type: GIFT_CARD` (new enum value)
  - `status: PAID`
  - `orderSource: WEBSITE`
  - `paymentAmount: giftCardAmount` (in cents)
  - `customerId: purchaser's bloomCustomerId`
  - Single order item: "Digital Gift Card - $XX.00"
- Link `GiftCardTransaction.orderId` to the new Order
- Update Stripe PaymentIntent description: `"Gift Card Order - {orderNumber}"`

**Schema change:**
```prisma
enum OrderType {
  DELIVERY
  PICKUP
  WIREOUT
  GIFT_CARD  // NEW
}
```

---

## User Flow

### Cart Checkout
1. Customer fills recipient, customer info, delivery details (unchanged)
2. Payment step shows Stripe CardElement (replaces 3 payment options)
3. Customer enters card → clicks "Place Order"
4. Frontend creates PaymentIntent via `/api/stripe/payment-intent`
5. Frontend confirms card via `stripe.confirmCardPayment()`
6. On success, calls modified `/api/orders/save-draft` with `paymentIntentId`
7. Backend creates PAID order, updates Stripe description with order number
8. Success screen shown (unchanged)

### Gift Card Purchase
1. Flow unchanged from customer perspective
2. Backend now also creates an Order record after gift card activation
3. Stripe description updated to include order number

---

## Implementation Checklist

### Phase 1: Schema + Migration
- [ ] Add `GIFT_CARD` to `OrderType` enum in `schema.prisma`
- [ ] Run migration: `npx prisma migrate dev --name add_gift_card_order_type`

### Phase 2: Backend — Gift Card Orders
- [ ] Modify `/back/src/routes/gift-cards/purchase.ts`:
  - Create Order record with type `GIFT_CARD`, status `PAID`
  - Link GiftCardTransaction.orderId
  - Accept `paymentIntentId` in request body
  - Update Stripe PI description: `"Gift Card Order - {orderNumber}"`

### Phase 3: Backend — Checkout Payment Support
- [ ] Modify `POST /api/orders/save-draft` in `/back/src/routes/orders/create.ts`:
  - Accept `paymentIntentId` field
  - When present: set `status: PAID`, calculate and set `paymentAmount`
  - After creation: update Stripe PI description: `"Web Order - {orderNumber}"`

### Phase 4: Frontend — Checkout Stripe Integration
- [ ] Add Stripe Elements to `www/src/pages/Checkout.jsx`:
  - Wrap checkout in `<Elements stripe={stripePromise}>` (copy from GiftCard.jsx)
  - Replace payment options with CardElement
  - Add `createCheckoutPaymentIntent()` to `www/src/services/checkoutService.js`
- [ ] Update `handlePlaceOrder()`:
  - Create PI → confirm card → call save-draft with paymentIntentId
  - Handle payment errors (show in UI)

### Phase 5: Frontend — Gift Card PaymentIntentId
- [ ] Pass `paymentIntentId` to `purchaseDigitalGiftCard()` in `www/src/services/giftCardService.js`
- [ ] Pass it through from `GiftCard.jsx` handleSubmit

### Phase 6: Documentation
- [ ] Update `/docs/API_Endpoints.md`
- [ ] Update `/docs/Progress_Tracker.markdown`
- [ ] Archive this feature plan

---

## Files to Create/Modify

### Modified Files
```
back/prisma/schema.prisma                        (add GIFT_CARD to OrderType)
back/src/routes/orders/create.ts                 (save-draft accepts paymentIntentId, creates PAID orders)
back/src/routes/gift-cards/purchase.ts           (create Order record for gift card purchases)
www/src/pages/Checkout.jsx                       (add Stripe CardElement, remove alt payment options)
www/src/services/checkoutService.js              (add createCheckoutPaymentIntent)
www/src/pages/GiftCard.jsx                       (pass paymentIntentId to purchase call)
www/src/services/giftCardService.js              (accept/forward paymentIntentId)
docs/API_Endpoints.md                            (document changes)
docs/Progress_Tracker.markdown                   (mark complete)
```

### No New Files
All changes fit within existing files.

---

## Edge Cases & Validation

- **Payment fails after intent created** — CardElement shows Stripe error, order is NOT created. No orphaned drafts.
- **Network error after payment confirmed but before order created** — PaymentIntent exists in Stripe but no order. User can retry; save-draft is idempotent if we check for duplicate PI.
- **Gift card with no bloomCustomerId** — Order created with null customerId (walk-in gift card purchase). Already handled in current flow.

---

## Success Criteria

- [ ] www cart checkout collects CC payment via Stripe before creating order
- [ ] Orders from www checkout have `status: PAID` and correct `paymentAmount`
- [ ] Gift card purchases create Order records with `type: GIFT_CARD`
- [ ] Stripe dashboard shows "Web Order - 1042" for cart orders
- [ ] Stripe dashboard shows "Gift Card Order - 1043" for gift card orders
- [ ] No phone/in-store payment options in www checkout
- [ ] Error states shown properly for failed card payments
- [ ] No console errors

---

## Implementation Notes

**Dependencies:**
- Stripe already wired up in www (GiftCard.jsx) — reuse same `stripePromise`
- `/api/stripe/payment-intent` endpoint already works
- PaymentIntent description update pattern already proven in payment-transactions.ts

**Deployment Notes:**
- Migration adds new enum value — runs automatically on Render deploy
- No environment variable changes needed
- Backwards compatible — existing draft orders unaffected

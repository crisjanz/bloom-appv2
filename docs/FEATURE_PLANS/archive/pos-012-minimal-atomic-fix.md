# POS-012 Minimal Atomicity Fix

**Status:** ✅ Archived (Implemented, scope-adjusted)
**Priority:** High (P0)
**Scope:** ~5 files, 1 small DB migration (idempotency key), no new routes
**Relation:** Replaces the full POS-012 workflow engine plan for now. The larger `pos-012-atomic-payment-flow.md` can be revisited post-launch.

**Archive Notes:**
- Implemented: atomic order + PT creation path, idempotency keys, replay-safe PT creation, and removal of silent "continue anyway" behavior.
- Implemented: `PaymentTransaction.idempotencyKey` schema/migration and frontend idempotency key propagation.
- Deferred: strict gift-card-before-charge sequencing is not fully unified across all flows and remains follow-up work.

---

## Problems Being Fixed

### Problem 1 — Silent partial success (data corruption)
Order creation and PT creation are two separate DB writes. If PT creation fails, the code currently logs a warning and continues — leaving an order in PAID state with no payment record. This happens in two paths:
- `orders/create.ts` (website flow) — explicit swallowed catch block
- `PaymentSection.tsx` — comment literally says "continue anyway"
- `useTransactionSubmission.ts` — draft order update loop silently skips failures

### Problem 2 — No atomicity between order and PT
Even with error surfacing, order creation and PT creation are still two sequential DB calls. If the server crashes between them, or PT fails after order commits, there's no rollback. The fix is wrapping both in a single `prisma.$transaction()`.

### Problem 3 — Gift card activated after charge
Currently: charge card → create PT → activate/redeem gift card. If gift card activation fails, the customer has been charged but the card isn't active. Fixing the sequence to activate gift card first means the only thing to undo on failure is an internal DB record — much easier than reversing a card charge.

### Problem 4 — Double-submit / network timeout (idempotency)
On a tablet at POS, tapping "Pay" twice is common. If the backend commits successfully but the network drops before the response arrives, the operator sees an error and retries — potentially creating a duplicate order and charging the customer twice. An idempotency key lets the server detect and safely replay the response instead of reprocessing.

---

## Fixes

### Fix 1 — Wrap order + PT creation in one `prisma.$transaction()`
**File:** `/back/src/routes/orders/create.ts`

Move PT creation inside the same transaction as order creation. Both succeed or both roll back. Remove the swallowed catch block.

```ts
// After: one atomic block
await prisma.$transaction(async (tx) => {
  // create/update orders
  // call transactionService with tx passed in (or inline PT creation)
});
// if anything above throws, prisma rolls back everything
```

> `transactionService.ts` already uses `prisma.$transaction` internally. The task is to either merge them into one outer transaction or refactor `transactionService` to accept an existing `tx` client.

### Fix 2 — Remove "continue anyway" in `PaymentSection.tsx`
**File:** `/admin/src/app/components/orders/payment/PaymentSection.tsx`

```ts
// Before:
} catch (ptError) {
  console.error('PT creation failed, continuing anyway');
  // falls through to success UI
}

// After:
} catch (ptError) {
  setError('Payment failed. Please try again.');
  return; // stop — do not show success
}
```

### Fix 3 — Fix draft order update loop in `useTransactionSubmission.ts`
**File:** `/admin/src/domains/payments/hooks/useTransactionSubmission.ts`

```ts
// Before: swallows per-order failure, continues loop
} catch (err) {
  console.error('Failed to update draft order:', err);
}

// After: stop the whole submission
} catch (err) {
  throw new Error(`Failed to settle draft order: ${err.message}`);
}
```

### Fix 4 — Move gift card activation before charge
**Files:** `PaymentSection.tsx`, `useTransactionSubmission.ts`

Reorder the sequence:
1. Activate/redeem gift card (internal DB — easy to roll back)
2. Charge card / create PT (atomic, see Fix 1)
3. If step 2 fails → deactivate/un-redeem gift card and surface error

Since gift cards are internal to your DB, the rollback in step 3 is a simple DB update — no external API call needed.

### Fix 5 — Add idempotency key
**Backend:** `/back/src/routes/orders/create.ts` and/or `/back/src/routes/payment-transactions.ts`
**Frontend:** `PaymentSection.tsx`, `useTransactionSubmission.ts`
**DB:** Add `idempotencyKey String? @unique` to `PaymentTransaction` model

Flow:
1. Frontend generates a UUID when the operator hits "Pay" (`crypto.randomUUID()`)
2. UUID is sent with the submission request
3. Backend checks if a PT with that key already exists — if yes, return the existing result instead of reprocessing
4. If network drops after commit, retry with the same UUID → server returns the committed result, no duplicate

```ts
// Frontend — generate once per payment attempt, not per retry
const idempotencyKey = useRef(crypto.randomUUID());

// Backend — check before processing
const existing = await prisma.paymentTransaction.findUnique({
  where: { idempotencyKey }
});
if (existing) return res.json({ transactionId: existing.id, ...existing }); // replay
```

**Migration:**
```bash
npx prisma migrate dev --name add_idempotency_key_to_payment_transaction
```

---

## What This Still Does NOT Fix

- Print/email failure tracking — non-critical, operator can retry manually
- Durable failure log / ops visibility — post-launch when needed
- The full `PaymentWorkflow` engine from `pos-012-atomic-payment-flow.md` — post-launch

---

## Files to Modify

```
/back/prisma/schema.prisma                                        ← add idempotencyKey field
/back/src/routes/orders/create.ts                                 ← atomic order+PT transaction, idempotency check
/back/src/services/transactionService.ts                          ← accept tx client or merge into outer transaction
/admin/src/app/components/orders/payment/PaymentSection.tsx       ← remove "continue anyway", reorder gift card, send idempotency key
/admin/src/domains/payments/hooks/useTransactionSubmission.ts     ← fix draft loop, reorder gift card, send idempotency key
/admin/src/app/components/orders/payment/CollectPaymentModal.tsx  ← send idempotency key when calling /api/payment-transactions
```

One small migration, no new routes, no new models beyond one field.

---

## Sequence After Fix

```
1. Frontend generates idempotencyKey (UUID)
2. Activate/redeem gift card (if applicable)
3. POST /api/orders/create  ┐
4. Create PT                ┘ single prisma.$transaction — both or neither
5. Backend checks idempotencyKey before step 3 — if exists, return existing result
6. On success → show completion UI
7. On any failure → show error, nothing persisted (or gift card deactivated)
```

---

## Verification

1. Submit payment → force PT creation to fail → neither order nor PT should exist in DB
2. Submit payment → drop network after backend commits → retry with same idempotency key → no duplicate order or charge
3. Submit with gift card → force PT to fail → gift card should be deactivated/un-redeemed
4. Double-tap "Pay" fast → only one order and one PT created
5. Happy path: all three channels (POS, TakeOrder, Website) complete without regression

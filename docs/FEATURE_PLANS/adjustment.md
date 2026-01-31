# Order Edit Payment Adjustment - Bug Fix + Real Stripe Integration

## Overview
Fix bugs preventing payment adjustments from triggering, then wire up real Stripe integration for automatic charges/refunds.

---

## Bug 1: Frontend - Stale State Comparison

**File**: `admin/src/app/pages/orders/OrderEditPage.tsx`

**Problem** (around line 431):
```typescript
const oldTotal = order?.paymentAmount;           // Captured correctly
result = await updateOrderDirect(updateData);    // Backend updates
const newTotal = order?.paymentAmount;           // BUG: Still old value!
```

**Fix**: Use returned result instead of stale state:
```typescript
const newTotal = result?.paymentAmount ?? order?.paymentAmount;
```

---

## Bug 2: Backend - Total Not Recalculated

**File**: `back/src/routes/orders.ts`

**Problem**: `paymentAmount` only recalculates when `orderItems` change (around line 375-381). Delivery fee and discount changes don't trigger recalculation.

**Fix**: After storing `deliveryFee` or `discount`, recalculate `paymentAmount`:
```typescript
// If delivery fee or discount changed (without item changes), recalculate total
if (!updateData.orderItems && (deliveryData.deliveryFee !== undefined || deliveryData.discount !== undefined)) {
  const existingItems = await prisma.orderItem.findMany({
    where: { orderId: id }
  });
  const subtotal = existingItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const fee = orderUpdateData.deliveryFee ?? existingOrder.deliveryFee ?? 0;
  const disc = orderUpdateData.discount ?? existingOrder.discount ?? 0;
  // Use existing tax values or recalculate based on your tax logic
  const gst = existingOrder.gst ?? 0;
  const pst = existingOrder.pst ?? 0;
  orderUpdateData.paymentAmount = subtotal + fee - disc + gst + pst;
}
```

---

## Feature: Real Stripe Integration

### Step 1: Backend - Add adjustment charge endpoint

**File**: `back/src/routes/stripe.ts`

Add new endpoint to charge additional amount to saved payment method:

```typescript
/**
 * Charge additional amount to saved payment method
 * POST /api/stripe/charge-saved
 */
router.post('/charge-saved', async (req, res) => {
  const { customerId, amount, orderId, description } = req.body;

  // 1. Get Stripe customer ID from our customer record
  // 2. Get their default payment method
  // 3. Create PaymentIntent with off_session: true
  // 4. Confirm immediately
  // Return success/failure
});
```

### Step 2: Backend - Add helper to get Stripe payment info from order

**File**: `back/src/services/paymentService.ts` (new or existing)

Create helper function:
```typescript
async function getStripePaymentInfoForOrder(orderId: string) {
  // Query: Order → OrderPayment → PaymentTransaction → PaymentMethod
  // Return: { providerTransactionId, stripeCustomerId, paymentMethodId }
}
```

**Query path**:
```sql
PaymentMethod.providerTransactionId = Stripe paymentIntentId
PaymentMethod.providerMetadata = { stripeCustomerId, paymentMethodId }
```

### Step 3: Frontend - Wire modal to real endpoints

**File**: `admin/src/app/components/orders/edit/modals/PaymentAdjustmentModal.tsx`

**Current** (line 64-98): `handleAutoCharge()` uses `simulatePaymentProcessing()`

**Change to**:
```typescript
const handleAutoCharge = async () => {
  setProcessing(true);
  try {
    if (isRefund) {
      // Call real refund endpoint
      const response = await fetch('/api/stripe/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentIntentId: originalPaymentIntentId, // Pass from parent
          amount: amount
        })
      });
      // Handle response
    } else {
      // Call new charge-saved endpoint
      const response = await fetch('/api/stripe/charge-saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          amount: amount,
          description: 'Order adjustment'
        })
      });
      // Handle response
    }
  } catch (error) {
    // Show alternative methods on failure
  }
};
```

### Step 4: Pass payment info to modal

**File**: `admin/src/app/pages/orders/OrderEditPage.tsx`

When opening PaymentAdjustmentModal, query and pass:
- `originalPaymentIntentId` - for refunds
- `orderId` - for additional charges (backend will look up Stripe info)

---

## Feature: Create PaymentTransaction Records for Adjustments

**Critical**: All payment adjustments must create proper PT records for financial tracking.

### For Additional Payments (charge/collect)

Create new PaymentTransaction via `POST /api/payment-transactions`:

```typescript
await fetch('/api/payment-transactions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    customerId: order.customerId,
    employeeId: currentEmployeeId,
    channel: 'POS', // or 'PHONE' depending on context
    totalAmount: adjustmentAmount, // in cents
    taxAmount: 0, // adjustment doesn't include additional tax
    notes: `Order adjustment - ${reason}`,
    orderIds: [order.id],
    paymentMethods: [{
      type: paymentType, // 'CASH', 'CARD', etc.
      provider: provider, // 'STRIPE', 'SQUARE', 'INTERNAL'
      amount: adjustmentAmount,
      providerTransactionId: stripePaymentIntentId, // if Stripe
      cardLast4: cardLast4, // if card
      cardBrand: cardBrand
    }]
  })
});
```

### For Refunds

Use existing refund endpoint `POST /api/payment-transactions/:transactionId/refunds`:

```typescript
// First get the original transactionId from order's payment
const originalTransactionId = order.orderPayments[0]?.transactionId;

await fetch(`/api/payment-transactions/${originalTransactionId}/refunds`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: refundAmount, // in cents
    reason: 'Order adjustment - delivery fee reduced',
    employeeId: currentEmployeeId,
    refundMethods: [{
      type: paymentType, // 'CASH', 'CARD', etc.
      amount: refundAmount,
      provider: provider
    }]
  })
});
```

---

## Feature: Save Adjustment Notes

**File**: `admin/src/app/pages/orders/OrderEditPage.tsx`

After creating PaymentTransaction, also save a note to OrderCommunication:

```typescript
await fetch('/api/communications', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    orderId: order.id,
    type: 'NOTE',
    message: adjustmentResult.notes // e.g., "Payment adjusted: +$15.00 charged to Visa ending 4242"
  })
});
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `admin/src/app/pages/orders/OrderEditPage.tsx` | Fix stale state comparison, pass payment info to modal, save adjustment notes |
| `back/src/routes/orders.ts` | Recalculate paymentAmount when deliveryFee/discount changes |
| `back/src/routes/stripe.ts` | Add `POST /charge-saved` endpoint |
| `admin/src/app/components/orders/edit/modals/PaymentAdjustmentModal.tsx` | Replace simulation with real API calls |
| `back/src/services/paymentService.ts` | Add helper to get Stripe payment info for order (optional - could inline in stripe.ts) |

---

## Data Flow Reference

```
Order (id)
  └── OrderPayment (orderId, transactionId)
        └── PaymentTransaction (id)
              └── PaymentMethod
                    ├── providerTransactionId (Stripe paymentIntentId)
                    ├── providerMetadata (JSON: stripeCustomerId, paymentMethodId)
                    ├── cardLast4
                    └── cardBrand
```

---

## Verification

1. **Bug fix test**: Edit order, change delivery fee → PaymentAdjustmentModal should appear
2. **Stripe refund test**: Reduce order total → Modal appears → Click "Process Refund" → Check:
   - Stripe dashboard shows real refund
   - Refund record created in `payment_transactions/:id/refunds`
3. **Stripe charge test**: Increase order total → Modal appears → Click "Charge Card" → Check:
   - Stripe dashboard shows real charge
   - New PaymentTransaction created and linked to order
4. **Cash adjustment test**: Increase total, select Cash → Check:
   - New PaymentTransaction created with type=CASH
   - Note saved to order communications
5. **Cash refund test**: Decrease total, select Cash → Check:
   - Refund record created
   - Note saved
6. **Financial reports**: Run transaction report → Adjustments should appear with correct amounts
7. **Fallback test**: If Stripe fails, alternative payment methods should still work and create PT records

---

## Notes for Codex

- Use existing `useApiClient` hook for API calls in frontend
- Follow existing patterns in `stripe.ts` for error handling
- `PaymentMethod.providerMetadata` is JSON - parse to get Stripe IDs
- Test with Stripe test mode before production
- Orders paid with cash/check won't have Stripe info - modal should gracefully handle this (show only alternative methods)

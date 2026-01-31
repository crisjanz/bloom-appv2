# Gift Card Flow Improvements

**Status:** 🔜 Ready for Implementation
**Created:** 2026-01-30
**Priority:** High

---

## Overview
The gift card purchase flow on the customer website (www) has several issues:
1. Creates duplicate Stripe customers on every purchase instead of reusing existing ones
2. Doesn't pass logged-in customer ID to backend
3. No receipt email sent to purchaser (only gift card email to recipient)
4. Admin order receipt emails include unnecessary PDF attachment — should be text-only

---

## 🤖 Implementation Constraints for AI

**CRITICAL - Read Before Implementing:**

> **⚠️ FOR AI ASSISTANTS: You MUST read the required documentation before writing code. Follow existing patterns exactly.**

### Required Reading (IN ORDER)
1. `/docs/AI_IMPLEMENTATION_GUIDE.md` ← **READ THIS FIRST**
2. `/docs/System_Reference.md` (architecture context)
3. `/CLAUDE.md` (project conventions)

### Pattern Reference Files
**Study these files for implementation patterns:**
- **Provider customer pattern:** `/back/src/services/providerCustomerService.ts`
- **Receipt email pattern:** `/back/src/routes/email/index.ts` (POST `/api/email/receipt` — text-only receipt used in admin checkout)
- **Gift card email pattern:** `/back/src/services/emailService.ts` (`sendGiftCardEmail()`)
- **Admin receipt with PDF (to modify):** `/back/src/routes/email/send.ts`

**DO NOT write from scratch. COPY patterns from these files.**

---

## Goals

1. Reuse existing Stripe customers instead of creating duplicates on every payment
2. Pass logged-in customer's DB ID from frontend to backend for proper customer linking
3. Send a text receipt email to the gift card purchaser after successful purchase
4. Remove PDF attachment from admin order receipt emails (text-only everywhere)

---

## Task 1: Fix Stripe Duplicate Customers

### Problem
`back/src/routes/stripe.ts` line 199-208 — the `POST /api/stripe/payment-intent` endpoint always calls `stripe.customers.create()` without checking if a Stripe customer already exists for that email.

### Solution
Modify the payment-intent endpoint to use `providerCustomerService.getOrCreateStripeCustomer()` when a Bloom `customerId` is provided, or fall back to searching Stripe by email for guest users.

### File: `/back/src/routes/stripe.ts`

**Current code (lines 199-208):**
```typescript
let resolvedCustomerId = customerId;
if ((customerPhone || customerEmail) && !resolvedCustomerId) {
  const customer = await stripe.customers.create({
    email: customerEmail,
    name: customerName || customerEmail?.split('@')[0] || 'Customer',
    phone: customerPhone,
  });
  resolvedCustomerId = customer.id;
  console.log(`✅ Created Stripe customer: ${resolvedCustomerId} for ${customerPhone || customerEmail}`);
}
```

**Replace with:**
```typescript
import { getOrCreateStripeCustomer } from '../services/providerCustomerService';

// Inside the handler, after parsing request body:
let resolvedCustomerId = customerId; // customerId here = Stripe customer ID if passed directly

// If a Bloom customer ID is provided (logged-in user), use providerCustomerService
if (bloomCustomerId && !resolvedCustomerId) {
  const result = await getOrCreateStripeCustomer({
    bloomCustomerId,
    email: customerEmail,
    name: customerName,
    phone: customerPhone,
  });
  resolvedCustomerId = result.stripeCustomerId;
  console.log(`${result.isNew ? '✅ Created' : '♻️ Reused'} Stripe customer: ${resolvedCustomerId} for ${customerPhone || customerEmail}`);
} else if ((customerPhone || customerEmail) && !resolvedCustomerId) {
  // Guest user — search Stripe by email before creating
  const stripe = await paymentProviderFactory.getStripeClient();
  if (customerEmail) {
    const existing = await stripe.customers.list({ email: customerEmail, limit: 1 });
    if (existing.data.length > 0) {
      resolvedCustomerId = existing.data[0].id;
      console.log(`♻️ Reused Stripe customer: ${resolvedCustomerId} for ${customerEmail}`);
    }
  }
  if (!resolvedCustomerId) {
    const customer = await stripe.customers.create({
      email: customerEmail,
      name: customerName || customerEmail?.split('@')[0] || 'Customer',
      phone: customerPhone,
    });
    resolvedCustomerId = customer.id;
    console.log(`✅ Created Stripe customer: ${resolvedCustomerId} for ${customerPhone || customerEmail}`);
  }
}
```

**Also add `bloomCustomerId` to the destructured request body:**
```typescript
const {
  amount,
  currency = 'cad',
  customerId,
  bloomCustomerId,  // ← ADD THIS (Bloom DB customer ID)
  customerEmail,
  customerPhone,
  customerName,
  description,
  metadata = {},
  orderIds = []
} = req.body;
```

---

## Task 2: Pass Customer ID from Frontend

### File: `/www/src/pages/GiftCard.jsx`

In `handleSubmit`, pass `customer?.id` to service functions:

**Current (line 249):**
```javascript
const paymentIntent = await createDigitalGiftCardPaymentIntent({
  amount,
  purchaser: trimmedPurchaser,
  recipient: trimmedRecipient,
});
```

**Change to:**
```javascript
const paymentIntent = await createDigitalGiftCardPaymentIntent({
  amount,
  purchaser: trimmedPurchaser,
  recipient: trimmedRecipient,
  bloomCustomerId: customer?.id || null,
});
```

**Also pass to purchase call (line 269):**
```javascript
await purchaseDigitalGiftCard({
  amount,
  recipient: trimmedRecipient,
  purchaser: trimmedPurchaser,
  message: trimmedRecipient.message,
  bloomCustomerId: customer?.id || null,
});
```

### File: `/www/src/services/giftCardService.js`

**In `createDigitalGiftCardPaymentIntent` — add `bloomCustomerId` to payload:**
```javascript
export async function createDigitalGiftCardPaymentIntent({ amount, purchaser, recipient, bloomCustomerId }) {
  const payload = {
    amount: dollarsToCents(amount),
    currency: "cad",
    bloomCustomerId,  // ← ADD
    customerEmail: purchaser.email,
    customerName: purchaser.name,
    description: `Bloom Flower Shop digital gift card for ${purchaser.name || "guest"}`,
    metadata: { ... },
  };
  return api.post("/stripe/payment-intent", payload);
}
```

**In `purchaseDigitalGiftCard` — add `bloomCustomerId` to payload:**
```javascript
export async function purchaseDigitalGiftCard({ amount, recipient, purchaser, message, bloomCustomerId }) {
  const payload = {
    purchasedBy: purchaser.name,
    purchaserEmail: purchaser.email,  // ← ADD (needed for receipt)
    bloomCustomerId,                   // ← ADD
    cards: [ ... ],
  };
  return api.post("/gift-cards/purchase", payload);
}
```

---

## Task 3: Send Receipt Email to Purchaser

### File: `/back/src/routes/gift-cards/purchase.ts`

After the existing gift card email loop (line 209), add receipt email to purchaser:

```typescript
// After the gift card email loop, send receipt to purchaser
const purchaserEmail = req.body.purchaserEmail;
if (purchaserEmail && purchasedCards.length > 0) {
  try {
    const totalAmountCents = purchasedCards.reduce((sum, c) => sum + c.amount, 0);
    await emailService.sendGiftCardReceiptEmail({
      purchaserEmail,
      purchaserName: purchasedBy || 'Customer',
      cards: purchasedCards.map(c => ({
        recipientName: c.recipientName || 'Gift Card Recipient',
        recipientEmail: c.recipientEmail,
        amount: c.amount / 100,
        cardNumber: c.cardNumber,
      })),
      totalAmount: totalAmountCents / 100,
    });
    console.log('✅ Gift card receipt sent to purchaser:', purchaserEmail);
  } catch (error) {
    console.error('❌ Error sending gift card receipt to purchaser:', error);
  }
}
```

### File: `/back/src/services/emailService.ts`

Add new method `sendGiftCardReceiptEmail()`. Follow the pattern of `sendGiftCardEmail()` (line 158) but with receipt content for the purchaser:

```typescript
interface GiftCardReceiptData {
  purchaserEmail: string;
  purchaserName: string;
  cards: Array<{
    recipientName: string;
    recipientEmail: string;
    amount: number; // dollars
    cardNumber: string;
  }>;
  totalAmount: number; // dollars
}

async sendGiftCardReceiptEmail(data: GiftCardReceiptData): Promise<boolean> {
  const html = generateGiftCardReceiptHTML(data);
  return this.sendEmail({
    to: data.purchaserEmail,
    subject: `Your Bloom Flower Shop gift card receipt – $${data.totalAmount.toFixed(2)}`,
    html,
  });
}
```

**HTML template should include:**
- "Thank you for your purchase" header
- For each card: recipient name, amount, masked card number (show last 4 chars only, e.g. `GC-****-M3R8`)
- Total charged
- Contact info
- Follow the same email styling as `generateReceiptHTML()` (line 430 in emailService.ts)

---

## Task 4: Remove PDF from Admin Order Receipt

### File: `/back/src/routes/email/send.ts`

**Current code (lines 48-63):**
```typescript
const pdfBuffer = await buildReceiptPdf(order);
const html = buildReceiptEmail(order);
const filename = `receipt-${order.orderNumber ?? order.id}.pdf`;

const success = await emailService.sendEmail({
  to: toEmail,
  subject: `Your receipt from Bloom Flowers (${order.orderNumber ?? order.id})`,
  html,
  attachments: [
    {
      filename,
      content: pdfBuffer,
      contentType: 'application/pdf',
    },
  ],
});
```

**Replace with (remove PDF, keep HTML only):**
```typescript
const html = buildReceiptEmail(order);

const success = await emailService.sendEmail({
  to: toEmail,
  subject: `Your receipt from Bloom Flowers (${order.orderNumber ?? order.id})`,
  html,
});
```

**Also remove the unused import at the top of the file:**
```typescript
// Remove: import { buildReceiptPdf } from '../../templates/receipt-pdf';
```

**Note:** Do NOT delete `receipt-pdf.ts` — it may be used for invoice generation or future print receipts.

---

## Files to Modify

```
/back/src/routes/stripe.ts                    (Task 1: Stripe dedup)
/back/src/routes/gift-cards/purchase.ts       (Task 3: receipt email call)
/back/src/services/emailService.ts            (Task 3: new receipt method + HTML template)
/back/src/routes/email/send.ts                (Task 4: remove PDF attachment)
/www/src/pages/GiftCard.jsx                   (Task 2: pass customer ID)
/www/src/services/giftCardService.js          (Task 2: include bloomCustomerId + purchaserEmail)
```

---

## Implementation Checklist

- [ ] Modify `stripe.ts` payment-intent to use `getOrCreateStripeCustomer()` for logged-in users, email search for guests
- [ ] Add `bloomCustomerId` to request body destructuring in `stripe.ts`
- [ ] Pass `customer?.id` from `GiftCard.jsx` to both service calls
- [ ] Update `giftCardService.js` to include `bloomCustomerId` and `purchaserEmail` in payloads
- [ ] Add `purchaserEmail` to purchase request body handling in `purchase.ts`
- [ ] Create `sendGiftCardReceiptEmail()` in `emailService.ts` with HTML template
- [ ] Call receipt email after successful gift card purchase in `purchase.ts`
- [ ] Remove PDF attachment from `send.ts` receipt endpoint
- [ ] Remove unused `buildReceiptPdf` import from `send.ts`
- [ ] Test: logged-in user purchases gift card → no duplicate Stripe customer created
- [ ] Test: recipient receives gift card email
- [ ] Test: purchaser receives receipt email
- [ ] Test: admin order receipt sends without PDF

---

## Success Criteria

- [ ] No duplicate Stripe customers created for same email
- [ ] Logged-in users' Stripe IDs linked via ProviderCustomer table
- [ ] Purchaser receives receipt email with purchase details
- [ ] Recipient still receives gift card email (unchanged)
- [ ] Admin order receipts send as text-only (no PDF)
- [ ] No console errors
- [ ] Guest purchases still work (no customer ID = email-based Stripe lookup)

---

## Implementation Notes

**Dependencies:** None — all required services exist

**Testing Strategy:**
- Use Stripe test mode with card `4242 4242 4242 4242`
- Purchase gift card while logged in → verify ProviderCustomer record created
- Purchase again → verify same Stripe customer reused
- Check both purchaser and recipient inboxes for emails
- Send receipt from admin order detail → verify no PDF attached

**Deployment Notes:**
- No migrations needed (no schema changes)
- No environment variable changes needed

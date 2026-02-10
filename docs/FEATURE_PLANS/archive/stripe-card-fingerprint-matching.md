# Stripe Card Fingerprint — Possible Customer Match

**Status:** 💡 Parked (Future — revisit when rewards program is planned)
**Created:** 2026-01-29
**Priority:** Low

> **⚠️ REVIEW BEFORE IMPLEMENTING:** This plan was written well ahead of implementation. Stripe APIs, Terminal SDK, and BloomPOS architecture will likely have changed. Re-validate all assumptions, API behavior, and DB schema before coding.

---

## Overview

When a guest pays in-store via Stripe Terminal, check the card's fingerprint against saved payment methods. If a match is found, prompt staff to ask the customer if they'd like the purchase added to their account. This is **assistive, not automatic** — explicit verbal consent is required.

Primary value: feeds into a future **rewards/loyalty program** by linking more transactions to known customers.

---

## Key Constraints

- **No automatic customer matching** — staff must confirm with customer
- **No silent linking** of transactions to customer accounts
- **Apple Pay / Google Pay will not match** physical cards (different fingerprints from network tokens) — this is expected, skip the prompt
- Card fingerprints are **high-confidence hints**, not identity proof
- Multiple people can share a card (family, business)

---

## Stripe Fingerprint Behavior

- Stable across: manual card entry, online checkout, physical card via terminal
- NOT stable across: Apple Pay / Google Pay, card reissues / replacements
- Fingerprints are **not PAN** — safe to store in DB, but treat as personal data (access control, no plaintext logs)
- Available on `PaymentIntent` **after** confirmation, not mid-tap

---

## Proposed DB Schema

```prisma
model CustomerPaymentMethod {
  id                    String   @id @default(uuid())
  customerId            String
  customer              Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)
  stripePaymentMethodId String?
  stripeCustomerId      String?
  cardFingerprint       String
  last4                 String
  brand                 String
  expMonth              Int
  expYear               Int

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@index([cardFingerprint])
  @@index([customerId])
}
```

One customer → many cards. One fingerprint could match multiple customers (prompt staff to pick).

---

## Flow

1. **Payment completes** via Stripe Terminal (guest checkout, no customer selected)
2. **Read** `payment_method.card.fingerprint` from the PaymentIntent result
3. **Query** `CustomerPaymentMethod WHERE cardFingerprint = ?`
4. **If match found** → show POS prompt:
   > "This card might be on file for **John Doe**. Add this purchase to their account?"
   - **Yes** → attach Bloom customer to the order, optionally add `bloom_customer_id` metadata to Stripe charge
   - **No** → proceed as guest
5. **If no match** → proceed as guest silently (no prompt, no UX degradation)

---

## Populating Fingerprints

Two strategies (decide at implementation time):

1. **Lazy:** Save fingerprint whenever a known customer pays. Over time the table fills organically.
2. **Backfill:** Pull existing payment methods from Stripe API for customers who have `stripeCustomerId`. Run once as a seed script.

Likely do both: backfill existing + lazy going forward.

---

## UX Guidelines

- **Never say** "We recognized you" — say "This card might be on file for..."
- Consent-based, non-assumptive language
- Staff must verbally confirm with the customer
- Prompt is dismissable with a single tap (No = continue as guest)

---

## Compliance Notes

- Storing fingerprints is Stripe-allowed and PCI-safe
- Add to privacy policy: "We store tokenized payment identifiers to help recognize returning customers when you consent."
- Restrict DB access to fingerprint column
- Never log fingerprints in plaintext

---

## Dependencies

- Stripe Terminal integration (already exists)
- Customer management (already exists)
- **Rewards program** (future — this feature's primary value driver)

---

## Files to Create/Modify (estimate — revalidate before implementing)

### New Files
```
/back/prisma/migrations/XXXX_add_customer_payment_methods/
/back/src/routes/customer-payment-methods.ts
/admin/src/app/components/pos/CustomerMatchPrompt.tsx
```

### Modified Files
```
/back/prisma/schema.prisma                          (add CustomerPaymentMethod model)
/back/src/index.ts                                  (register route)
/admin/src/app/pages/pos/CheckoutFlow.tsx           (add fingerprint check after payment)
```

---

## Implementation Notes

- Re-read Stripe Terminal SDK docs at implementation time — API may have changed
- Review current POS checkout flow for the right insertion point
- Consider batch lookup if multiple customers share a fingerprint (show list, not just first match)
- This plan intentionally omits detailed code — too much will change before implementation

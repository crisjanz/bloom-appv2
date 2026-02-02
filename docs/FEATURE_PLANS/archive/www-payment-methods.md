# WWW Profile — Payment Methods Management

**Status:** 🔜 Ready for Implementation
**Created:** 2026-02-01
**Priority:** Medium

---

## Overview
Replace static Stripe/Square portal links in the www Profile PaymentMethodsTab with real card listing, delete, and add card functionality using Stripe Elements.

---

## 🤖 Implementation Constraints for AI

**CRITICAL - Read Before Implementing:**

> **⚠️ FOR AI ASSISTANTS: You MUST read the required documentation before writing code. Follow existing patterns exactly.**

### Required Reading (IN ORDER)
1. `/docs/AI_IMPLEMENTATION_GUIDE.md` ← **READ THIS FIRST**
2. `/docs/System_Reference.md` (architecture context)
3. `/docs/API_Endpoints.md` (existing endpoints)
4. `/CLAUDE.md` (project conventions)

### Pattern Reference Files
**Study these files for implementation patterns:**
- **Backend route pattern:** `/back/src/routes/stripe.ts` (existing Stripe endpoints — especially `POST /api/stripe/customer/payment-methods` at ~line 1082)
- **Frontend component pattern:** `www/src/pages/Profile.jsx` (existing PaymentMethodsTab at line 360)
- **Provider customer service:** `/back/src/services/providerCustomerService.ts` (getOrCreateStripeCustomer)

**DO NOT write from scratch. COPY patterns from these files.**

### Pre-Implementation Contract (Required — Answer Before Coding)

- **Goals → Changes mapping**: See Goals section below
- **Files to touch**: See Files to Modify section
- **Backend surface area**: 2 new endpoints in existing `stripe.ts` route file (already registered)
- **DB/migrations**: None — all models already exist
- **UI standards confirmation**: www uses plain React (not admin shared components). Use `api` service from `www/src/services/api.js` for API calls.
- **Unknowns / questions**: None

### Critical Don'ts
❌ Use `fetch()` directly in www → Use `api` from `www/src/services/api.js`
❌ Use admin shared components (InputField, Modal, etc.) in www — www has its own styling
❌ Use emojis in user-facing UI
❌ Forget to verify payment method belongs to customer before detaching

---

## Goals

1. List saved payment methods (cards) on Profile Payment Methods tab
2. Allow deleting/removing a saved card
3. Allow adding a new card via Stripe Elements (SetupIntent flow)

---

## Architecture & Endpoints

### Existing Infrastructure (DO NOT recreate)
- **`POST /api/stripe/customer/payment-methods`** — Already lists Stripe payment methods for a customer (accepts `{ email, phone, customerId }`)
- **`GET /api/stripe/public-key`** — Returns Stripe publishable key
- **`CustomerPaymentMethod`** model — Already stores `stripePaymentMethodId`, `stripeCustomerId`, `cardFingerprint`, `last4`, `brand`, `expMonth`, `expYear`
- **`ProviderCustomer`** model — Links local Customer to Stripe customer ID
- **`providerCustomerService.getOrCreateStripeCustomer(customerId, options)`** — Idempotent Stripe customer creation

### New Backend Endpoints

**File:** `/back/src/routes/stripe.ts` (add to existing file)

**`POST /api/stripe/customer/payment-methods/detach`**
- Accept `{ paymentMethodId, customerId }`
- Verify the payment method belongs to one of the customer's Stripe accounts (check via `ProviderCustomer`)
- Call `stripe.paymentMethods.detach(paymentMethodId)`
- Delete matching `CustomerPaymentMethod` record from database
- Return `{ success: true }`

**`POST /api/stripe/setup-intent`**
- Accept `{ customerId }` (local customer ID)
- Look up or create Stripe customer via `providerCustomerService.getOrCreateStripeCustomer(customerId, { email, firstName, lastName })`
- Call `stripe.setupIntents.create({ customer: stripeCustomerId, payment_method_types: ['card'] })`
- Return `{ clientSecret }`

### Database Schema
No changes needed. All required models already exist:
- `CustomerPaymentMethod` (stores card details)
- `ProviderCustomer` (links Customer → Stripe customer ID)

---

## UI Requirements

### Frontend Components

**Location:** `www/src/pages/Profile.jsx` (rewrite `PaymentMethodsTab` component, ~line 360)

**PaymentMethodsTab rewrite:**

**Card List:**
- On mount, call `POST /api/stripe/customer/payment-methods` with customer email
- Display each card: brand name, `•••• {last4}`, `Exp {MM/YY}`
- Show loading spinner while fetching
- Show empty state if no cards: "No saved payment methods. Cards are saved automatically during checkout, or you can add one below."

**Delete Card:**
- Small remove/trash button on each card row
- Simple confirm prompt before deleting
- Call `POST /api/stripe/customer/payment-methods/detach`
- Remove card from list on success

**Add Card:**
- "Add a card" button below the card list
- On click, show inline Stripe Elements `CardElement` form
- Fetch SetupIntent client secret from `POST /api/stripe/setup-intent`
- On confirm with `stripe.confirmCardSetup()`, refresh card list
- Cancel button to hide the form

### NPM Dependencies (install in `www/`)
```bash
npm install @stripe/stripe-js @stripe/react-stripe-js
```

### User Flow
1. Navigate to Profile → Payment Methods tab
2. See list of saved cards (or empty state)
3. To delete: click remove button → confirm → card removed
4. To add: click "Add a card" → enter card details in Stripe Elements → submit → card appears in list

---

## Implementation Checklist

### Phase 1: Install Dependencies
- [ ] Install `@stripe/stripe-js` and `@stripe/react-stripe-js` in `www/`

### Phase 2: Backend (2 endpoints)
- [ ] Add `POST /api/stripe/setup-intent` endpoint
- [ ] Add `POST /api/stripe/customer/payment-methods/detach` endpoint
- [ ] Both endpoints should verify customer ownership

### Phase 3: Frontend
- [ ] Rewrite `PaymentMethodsTab` in Profile.jsx
- [ ] Fetch and display saved cards on mount
- [ ] Add delete functionality with confirmation
- [ ] Add "Add card" with Stripe Elements CardElement + SetupIntent flow
- [ ] Loading, error, and empty states

### Phase 4: Testing
- [ ] List cards displays correctly
- [ ] Delete removes card from Stripe and UI
- [ ] Add card via Stripe Elements works with test card `4242 4242 4242 4242`
- [ ] Empty state shows when no cards
- [ ] Error handling for failed operations

### Phase 5: Documentation
- [ ] Update `/docs/API_Endpoints.md` with new endpoints
- [ ] Update `/docs/Progress_Tracker.markdown`
- [ ] Archive this feature plan

---

## Files to Modify

### Modified Files
```
back/src/routes/stripe.ts          (add 2 endpoints: detach + setup-intent)
www/src/pages/Profile.jsx          (rewrite PaymentMethodsTab component)
www/package.json                   (add @stripe/stripe-js, @stripe/react-stripe-js)
```

---

## Success Criteria

- [ ] Saved cards listed on Payment Methods tab
- [ ] Cards can be deleted
- [ ] New cards can be added via Stripe Elements
- [ ] Loading states during API calls
- [ ] Empty state when no cards
- [ ] Error messages on failures
- [ ] Mobile responsive
- [ ] Dark mode supported
- [ ] No console errors
- [ ] Documentation updated

---

## Post-Implementation

After completing implementation:

### Plan-to-Diff Verification (Required)

Before claiming the feature is done, provide:
- **Success Criteria → Evidence mapping**: For each Success Criterion, point to the exact file/component/route where it is satisfied.
- **Tests run**: List the exact commands you ran and the results.
- **Checklist audit**: Note any checklist items you skipped and why.
- **Git push**: Do **NOT** run `git push` automatically — ask Cris for confirmation.

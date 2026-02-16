# Stripe PaymentElement Migration (Apple Pay, Google Pay, Link)

**Status:** 🔜 Ready for Implementation
**Created:** 2026-02-16
**Priority:** High

---

## Overview
Migrate the www checkout from deprecated `CardElement` + `confirmCardPayment()` to `PaymentElement` + `confirmPayment()`. This single migration enables Apple Pay, Google Pay, and Stripe Link automatically — no separate integration needed per payment method. Also adds idempotency keys to payment intent creation to prevent duplicate charges.

---

## 🤖 Implementation Constraints for AI

**CRITICAL - Read Before Implementing:**

> **⚠️ FOR AI ASSISTANTS: You MUST read the required documentation before writing code. Follow existing patterns exactly.**

### Required Reading (IN ORDER)
1. `/CLAUDE.md` ← **READ THIS FIRST** (project conventions)
2. `/docs/AI_IMPLEMENTATION_GUIDE.md` (all patterns)
3. Stripe PaymentElement docs: https://docs.stripe.com/payments/payment-element
4. Stripe Migration guide: https://docs.stripe.com/payments/accept-a-payment?platform=web&ui=elements

### Pattern Reference Files
- **Current checkout flow:** `/www/src/pages/Checkout.jsx`
- **Current gift card flow:** `/www/src/pages/GiftCard.jsx`
- **Payment form components:** `/www/src/components/Checkout/PaymentStep/DesktopPaymentForm.jsx`
- **Backend Stripe routes:** `/back/src/routes/stripe.ts`
- **Checkout constants:** `/www/src/components/Checkout/shared/constants.js`

### Pre-Implementation Contract (Required — Answer Before Coding)
- **Goals → Changes mapping**: Map each Goal to the specific code changes/files.
- **Files to touch (exact paths)**: List every file you will create/modify.
- **Unknowns / questions**: If anything is ambiguous, ask now — do not start coding.

### Critical Don'ts
❌ Remove saved card functionality — it must still work alongside PaymentElement
❌ Change the backend payment intent creation logic (amounts, metadata, customer linking)
❌ Break the 3D Secure redirect recovery flow (sessionStorage pattern)
❌ Remove `automatic_payment_methods: { enabled: true }` from backend — this is required
❌ Use `payment_method_types: ['card']` — use `automatic_payment_methods` instead (already done)
❌ Hardcode payment method types on frontend — let Stripe decide what to show per device/browser

---

## Goals

1. **Replace `CardElement` with `PaymentElement`** across all www payment flows (checkout, gift cards, profile saved cards)
2. **Enable Apple Pay and Google Pay** — automatically shown by PaymentElement when available on device
3. **Enable Stripe Link** — auto-shown when customer enters email, for one-click checkout
4. **Add idempotency keys** to payment intent creation endpoints to prevent duplicate charges on network retry
5. **Migrate `confirmCardPayment()` to `confirmPayment()`** — deprecated API removal

---

## Architecture & Endpoints

### What Changes on Backend

**File:** `/back/src/routes/stripe.ts`

**Changes needed:**
1. **Allow redirects** — Change `allow_redirects: 'never'` to `allow_redirects: 'always'` on all payment intent creations. Apple Pay and Link may require redirect-based confirmation.
2. **Add idempotency keys** — Accept an `idempotencyKey` from frontend and pass to `stripe.paymentIntents.create()`.
3. **No other backend changes needed** — `automatic_payment_methods: { enabled: true }` already enables all payment methods server-side.

**Endpoints affected (no new endpoints):**
- `POST /api/stripe/payment-intent` — Add idempotency key support, allow redirects
- `POST /api/stripe/gift-card/payment-intent` — Same changes
- `POST /api/stripe/setup-intent` — Allow redirects for Link/wallet saves

### What Changes on Frontend

**Package check:** `www/package.json` already has `@stripe/react-stripe-js: ^5.3.0` and `@stripe/stripe-js: ^8.2.0` — these versions support `PaymentElement`. No package upgrades needed.

**Core migration pattern:**

```jsx
// BEFORE (current)
import { CardElement, useElements, useStripe } from "@stripe/react-stripe-js";

<CardElement options={CARD_ELEMENT_OPTIONS} />

const cardElement = elements.getElement(CardElement);
const { error } = await stripe.confirmCardPayment(clientSecret, {
  payment_method: { card: cardElement },
});

// AFTER (new)
import { PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";

<PaymentElement options={{ layout: 'tabs' }} />

const { error } = await stripe.confirmPayment({
  elements,
  confirmParams: {
    return_url: `${window.location.origin}/checkout?payment_status=pending`,
  },
  redirect: 'if_required', // Only redirect for wallets/3DS, not cards
});
```

### Saved Cards Handling

**Current approach:** Saved cards are fetched from backend and displayed as radio options. User selects a saved card OR enters new card via CardElement.

**New approach with PaymentElement:**
- PaymentElement with `customerSessionClientSecret` automatically shows saved cards within the element
- OR keep current saved card radio UI and only show PaymentElement for "new card" option
- **Recommended: Keep current saved card UI** — less migration risk, PaymentElement handles new payments only

### Apple Pay Domain Verification

**Required one-time setup (manual, not code):**
1. In Stripe Dashboard → Settings → Payment Methods → Apple Pay → Add domain
2. Add `hellobloom.ca` (current) and later `inyourvase.ca`
3. Download the verification file from Stripe
4. Host at: `https://hellobloom.ca/.well-known/apple-developer-merchantid-domain-association`
5. For Cloudflare Pages: add the file to `www/public/.well-known/apple-developer-merchantid-domain-association`

**Google Pay:** No domain registration needed. Works automatically.

**Stripe Link:** No setup needed. Activates when PaymentElement detects customer email.

---

## UI Requirements

### PaymentElement Appearance

The PaymentElement renders its own UI (card input, wallet buttons, Link). Style it to match the current checkout theme:

```jsx
const appearance = {
  theme: 'stripe', // or 'flat' to match minimal design
  variables: {
    colorPrimary: '#597485', // brand color — update to current brand-500
    borderRadius: '8px',
  },
};

<Elements stripe={stripePromise} options={{ clientSecret, appearance }}>
  <PaymentElement options={{ layout: 'tabs' }} />
</Elements>
```

**Important:** PaymentElement needs `clientSecret` passed to `<Elements>` at mount time (not just at confirmation). This means the payment intent must be created **before** showing the form, not on submit. Check if the current flow already does this or if it creates the intent on submit.

### User Flow Changes

**Current flow:**
1. Fill recipient → Fill customer info → Enter card in CardElement → Click "Place Order"
2. Payment intent created on submit → `confirmCardPayment()` called

**New flow (if intent created on submit — `redirect: 'if_required'`):**
1. Fill recipient → Fill customer info → PaymentElement shown → Click "Place Order"
2. Payment intent created → `confirmPayment()` with `redirect: 'if_required'`
3. For cards: completes inline (no redirect)
4. For Apple Pay/Google Pay: native sheet appears → completes inline
5. For Link: may redirect to verify → returns to `return_url`
6. For 3D Secure: redirects to bank → returns to `return_url`

**Alternative flow (if intent created early — deferred intent):**
- Use `mode: 'payment'` + `amount` in Elements options instead of `clientSecret`
- This shows PaymentElement immediately without a payment intent
- Intent created on submit with the collected payment method
- **This approach avoids creating abandoned payment intents for users who don't complete checkout**

**Recommendation:** Use the deferred intent approach (`mode: 'payment'`) to avoid creating payment intents for abandoned checkouts. This matches the current behavior where intent is created on submit.

---

## Implementation Checklist

### Phase 1: Backend — Idempotency & Redirect Support
- [ ] Add `idempotencyKey` parameter to `POST /api/stripe/payment-intent`
- [ ] Pass idempotency key to `stripe.paymentIntents.create({ ... }, { idempotencyKey })`
- [ ] Change `allow_redirects: 'never'` to `allow_redirects: 'always'` on all payment intent creations in `stripe.ts`
- [ ] Same changes for gift card payment intent endpoint
- [ ] Test that existing card payments still work after redirect change

### Phase 2: Apple Pay Domain Verification
- [ ] Create `www/public/.well-known/` directory
- [ ] Download Apple Pay domain verification file from Stripe Dashboard
- [ ] Place at `www/public/.well-known/apple-developer-merchantid-domain-association`
- [ ] Register `hellobloom.ca` in Stripe Dashboard → Apple Pay settings
- [ ] Verify file is served at `https://hellobloom.ca/.well-known/apple-developer-merchantid-domain-association`

### Phase 3: Migrate Checkout PaymentElement
- [ ] Update `www/src/components/Checkout/shared/constants.js` — add PaymentElement appearance config, remove `CARD_ELEMENT_OPTIONS`
- [ ] Update `www/src/components/Checkout/PaymentStep/DesktopPaymentForm.jsx` — replace `CardElement` with `PaymentElement`
- [ ] Update `www/src/components/Checkout/PaymentStep/MobilePaymentForm.jsx` — replace `CardElement` with `PaymentElement`
- [ ] Update `www/src/pages/Checkout.jsx`:
  - Replace `CardElement` import with `PaymentElement`
  - Replace `confirmCardPayment()` with `confirmPayment()`
  - Add `redirect: 'if_required'` to confirmPayment options
  - Generate and send idempotency key with payment intent creation
  - Update 3D Secure / redirect recovery flow for new return_url pattern
  - Keep saved card selection UI — only use PaymentElement for new card entry
- [ ] Update `<Elements>` wrapper to pass `appearance` option
- [ ] Test: Card payment (no redirect)
- [ ] Test: 3D Secure card (redirect + recovery)
- [ ] Test: Saved card selection still works

### Phase 4: Migrate Gift Card PaymentElement
- [ ] Update `www/src/components/GiftCard/PaymentSection.jsx` — replace `CardElement` with `PaymentElement`
- [ ] Update `www/src/pages/GiftCard.jsx`:
  - Replace `confirmCardPayment()` with `confirmPayment()`
  - Add idempotency key
  - Add `redirect: 'if_required'`
- [ ] Test gift card purchase with card
- [ ] Test gift card purchase with Apple Pay (if on Safari/iOS)

### Phase 5: Migrate Profile Saved Cards
- [ ] Update `www/src/components/Profile/PaymentMethodsTab.jsx` — replace `CardElement` with `PaymentElement` for adding new saved card
- [ ] Test adding a new saved card
- [ ] Test that existing saved cards still display correctly

### Phase 6: Testing & Verification
- [ ] Test on desktop Chrome (Google Pay should appear if user has it)
- [ ] Test on Safari macOS (Apple Pay should appear if configured)
- [ ] Test on iPhone Safari (Apple Pay + saved cards)
- [ ] Test on Android Chrome (Google Pay)
- [ ] Test Stripe Link flow (enter email → Link prompt)
- [ ] Test with Stripe test cards for 3D Secure: `4000002500003155`
- [ ] Test network error + retry (idempotency key prevents duplicate)
- [ ] Verify dark mode styling of PaymentElement
- [ ] Verify no console errors

### Phase 7: Cleanup & Docs
- [ ] Remove all `CARD_ELEMENT_OPTIONS` constants
- [ ] Remove all `CardElement` imports (should be zero remaining)
- [ ] Remove all `confirmCardPayment()` calls (should be zero remaining)
- [ ] Update `/docs/Progress_Tracker.markdown`
- [ ] Archive this feature plan to `/docs/FEATURE_PLANS/archive/`

---

## Files to Create/Modify

### New Files
```
www/public/.well-known/apple-developer-merchantid-domain-association  (from Stripe Dashboard)
```

### Modified Files
```
back/src/routes/stripe.ts                                          (idempotency keys, allow_redirects)
www/src/pages/Checkout.jsx                                         (CardElement → PaymentElement, confirmPayment)
www/src/pages/GiftCard.jsx                                         (same migration)
www/src/components/Checkout/PaymentStep/DesktopPaymentForm.jsx     (CardElement → PaymentElement)
www/src/components/Checkout/PaymentStep/MobilePaymentForm.jsx      (CardElement → PaymentElement)
www/src/components/GiftCard/PaymentSection.jsx                     (CardElement → PaymentElement)
www/src/components/Profile/PaymentMethodsTab.jsx                   (CardElement → PaymentElement)
www/src/components/Checkout/shared/constants.js                    (appearance config, remove CARD_ELEMENT_OPTIONS)
```

---

## Edge Cases & Validation

### Payment Method Availability
- Apple Pay only shows on Safari (macOS/iOS) with Apple Pay configured
- Google Pay only shows on Chrome with Google Pay configured
- Link shows when customer has a Stripe Link account (detected by email)
- If none available, PaymentElement falls back to card input only
- **No code needed** — PaymentElement handles all detection automatically

### Redirect Handling
- `redirect: 'if_required'` means most card payments complete inline (no redirect)
- Apple Pay / Google Pay complete inline (native sheet, no redirect)
- 3D Secure and some Link flows redirect → return to `return_url`
- Current sessionStorage recovery pattern should still work for redirect cases
- `return_url` must include query params to detect redirect return (e.g., `?payment_status=pending`)

### Saved Cards + PaymentElement Coexistence
- When user selects a saved card → use existing `confirmPayment()` with `payment_method: savedCardId`
- When user selects "New card" → show PaymentElement, use `elements` in `confirmPayment()`
- These are two separate code paths in the submit handler

### Idempotency
- Generate UUID on frontend before payment intent creation
- Same key sent on retry → Stripe returns same payment intent (no duplicate)
- Key is single-use per unique payment attempt
- Generate new key if user changes cart/amount

---

## Success Criteria

- [ ] Card payments work as before (no regression)
- [ ] Apple Pay button appears on Safari/iOS when Apple Pay is set up
- [ ] Google Pay button appears on Chrome when Google Pay is set up
- [ ] Stripe Link prompt appears when entering email
- [ ] Saved cards still work for logged-in users
- [ ] 3D Secure redirect + recovery still works
- [ ] Gift card purchases work with all payment methods
- [ ] Profile "Add card" works with PaymentElement
- [ ] No duplicate charges on network retry (idempotency)
- [ ] Dark mode styling matches checkout theme
- [ ] Mobile responsive on all payment methods
- [ ] No `CardElement` or `confirmCardPayment()` imports remain in codebase
- [ ] No console errors

---

## Implementation Notes

**Dependencies:**
- No new packages needed — `@stripe/react-stripe-js@^5.3.0` and `@stripe/stripe-js@^8.2.0` already support PaymentElement
- Apple Pay requires Stripe Dashboard domain registration (manual step)

**Deployment Notes:**
- Apple Pay verification file must be deployed to `www/public/.well-known/` before registering domain
- No database changes or migrations needed
- No environment variable changes needed
- Backend changes (idempotency + allow_redirects) should deploy before frontend changes

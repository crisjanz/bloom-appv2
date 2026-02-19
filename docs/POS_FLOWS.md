# POS Business Logic Flows

> Spec for auditing codebase against expected behavior.
> Each flow documents the **expected** step-by-step logic.

---

## 1. Order Creation

### Entry Points
| # | Entry Point | Description |
|---|-------------|-------------|
| 1 | **TakeOrderPage** | Phone/in-person orders — main input flow |
| 2 | **POS Screen** | Quick sale (uses TakeOrderPage internally) |
| 3 | **Website (www)** | Customer self-service online orders |
| 4 | **Mobile App** | Creates orders from photos |

---

### 1.1 TakeOrderPage Flow (Phone Orders)

**Step 1 — Customer Info (Buyer)**
- Search existing customers in DB
- Or add new customer inline

**Step 2 — Recipient Info**
- If customer has saved recipients → select from list
- Search saved shortcut addresses (e.g., hospitals)
- Or enter new recipient manually

**Step 3 — Order Details**
- Select delivery date
- Enter delivery instructions
- Enter card message

**Step 4 — Products**
- Search existing products by name/category
- Or create custom product with description (what customer wants)
- Can add multiple products
- Can edit or delete line items

**Step 5 — Payment**
- Select payment method (see Payment Flows below)
- Payment options are shared across TakeOrderPage and POS Screen

---

## 2. Payment Flows

> All payment methods are reusable across TakeOrderPage and POS Screen.

### 2.1 Card (Stripe)

**Opening the modal:**
- From **TakeOrderPage** → opens in **manual entry** mode (defaultMode='manual')
- From **POS Screen** → opens in **card reader** mode (defaultMode='main')
- User can switch between modes once modal is open

**Manual Entry flow (TakeOrderPage default):**
1. Modal opens with Stripe CardElement for card input
2. If customer has saved cards → show saved cards list with "Use" button
3. User enters card info (or selects saved card) + optional postal code
4. Optional: "Save card for future payments" checkbox
5. Press **"Charge Card"**
6. Frontend creates Stripe PaymentIntent via backend API
7. Frontend creates PaymentMethod via Stripe.js
8. Frontend confirms PaymentIntent with the PaymentMethod
9. On success → `onComplete` fires with card details (last4, brand, fingerprint, paymentIntentId)

**Card Reader flow (POS default):**
1. Modal checks for connected Stripe Terminal reader
2. Shows reader status (green/red dot)
3. Press **"Charge Card"** → sends to terminal reader
4. Polls `/api/stripe/terminal/payment-status/` every 2s until success/failure
5. On success → same `onComplete` as manual

**After successful charge (PaymentController):**
1. `handleCardComplete` → `finalizeFromModal` → `attemptFinalize` → `submitTransaction`
2. `submitTransaction` creates order(s) via `POST /api/orders/create`
3. Updates any draft orders to PAID status
4. Creates Payment Transaction (PT) via `POST /api/payment-transactions`
5. If no customer was attached + card fingerprint exists → checks for matching customers in DB
6. Shows completion summary screen

**Post-payment action toggles (applies to ALL payment methods):**

Reusable `<PaymentActionToggles />` component — lives at the **payment selection level**, NOT inside individual payment modals. Modals only handle payment-specific input (card info, cheque number, etc.).

Two separate print concepts:
- **Receipt** = for the customer (payment confirmation)
- **Ticket** = for the shop (order details for fulfillment)

✅ **EXPECTED behavior:**
1. Three toggles shown alongside payment method tiles (before choosing a method):
   - **Print Receipt** — toggle on/off
   - **Print Ticket** — toggle on/off
   - **Email Receipt** — toggle on/off, reveals email input field when ON
2. Email Receipt input field:
   - Auto-fills with customer email if on file
   - Editable — user can type/change email
   - If email is new or changed → saves to customer profile after successful payment
3. All toggles OFF by default
4. User toggles what they want → clicks payment method → modal opens (clean, no toggles)
5. On successful payment → auto-print and/or auto-email immediately (no additional modal/prompt)

**Component usage:**
- `PaymentController` (POS Screen) — replaces current "Quick Actions" section
- `PaymentSection` / `TakeOrderPaymentTiles` (TakeOrderPage) — new addition
- One component, two places, zero duplication

⚠️ **CURRENT behavior:**
- Print/Email toggles are "Quick Actions" in PaymentController only (not in TakeOrderPage)
- `onPrintReceipt` in completion summary is a `console.log` stub (not functional)
- No ticket printing exists at all
- No auto-print on charge success
- TakeOrderPage has `sendEmailReceipt`, `printReceipt`, `printTicket` state vars but not connected to UI

### 2.2 Cash

1. Modal opens showing order total
2. Enter cash received amount (or use quick-amount buttons)
3. System calculates change due
4. Post-payment action toggles already selected at payment selection level (see above)
5. Press **"Confirm"** → triggers unified post-payment flow (Section 3)
6. Change due displayed on completion

### 2.3 House Account

1. House Account tile should only be **enabled if customer has HA activated** on their profile
2. ⚠️ **CURRENT**: available to all customers — needs to check HA status
3. Modal opens showing order total
4. One field: **"Person Ordering"** (name of who placed the order on this account)
5. Post-payment action toggles already selected at payment selection level (see above)
6. Press **"Confirm"** → triggers unified post-payment flow (Section 3)
7. Order is charged to the house account balance (billed monthly)

### 2.4 Pay Later (rename from COD)

1. Modal opens showing order total
2. One field: **"Reference / Notes"** (e.g., who will be paying, when they'll pay)
3. Post-payment action toggles already selected at payment selection level (see above)
4. Press **"Confirm"** → triggers unified post-payment flow (Section 3)
5. Order created with `paymentStatus: UNPAID` (see Section 8 — Payment Status Separation)
6. Order proceeds through normal fulfillment flow (IN_DESIGN → READY → etc.)
7. When customer pays later → update `paymentStatus` to PAID, create PT with actual payment method

### 2.5 Cheque (rename from Check)

1. Modal opens showing order total
2. One required field: **"Cheque Number"** (for bookkeeping)
3. Post-payment action toggles already selected at payment selection level (see above)
4. Press **"Confirm"** → triggers unified post-payment flow (Section 3)
5. Cheque number stored in PT transaction metadata
6. Deposit tracking (cleared, bounced) is handled in accounting software — POS does not track this

⚠️ **RENAME**: All codebase references to "Check" → "Cheque" (labels, types, enums). We're in Canada.

### 2.6 Split Payment

**Setup:**
1. Click "Split Payment" → opens split payment view
2. Add rows — each row has: payment method dropdown, amount input, pay button
3. Amounts auto-distribute, remaining balance shown
4. Click "Pay" on each row → opens that method's payment modal (card entry, cash received, etc.)
5. Once all rows are paid (remaining = $0) → "Complete Split Payment" button appears
6. Complete → triggers unified post-payment flow (Section 3) with all payment methods

**Split view rendering:**
- **POS Screen**: replaces payment selection view (current behavior, fine)
- **TakeOrderPage**: currently replaces payment card content inline
- ✅ **EXPECTED for TakeOrderPage**: open as a popup Modal instead of replacing content

**Post-payment action toggles** already selected at payment selection level (see above)

🐛 **BUG — TakeOrderPage split is completely broken:**
- `handleSplitPayRow` in `TakeOrderPaymentTiles.tsx` (line 279) just sets row to `'completed'` immediately
- Never opens a payment modal — no card info collected, no cash received entered
- Clicking "Pay" on a card row marks it paid without actually charging the card
- **POS version works correctly** — `PaymentController` opens the right modal per row via `paymentModals.openModal(row.tender, row.amount, rowId)`
- Root cause: another symptom of two separate code paths for the same feature

⚠️ **COD → Pay Later rename needed** in `SplitPaymentView.tsx` tender options (line 37)

### 2.7 Discounts & Gift Cards

Opens via "Discounts" tile on payment selection screen. Three tabs:

**Tab 1 — Manual Discount:**
1. Choose type: Percentage or Dollar Amount
2. Enter value
3. Optional reason field
4. "Apply Discount" → adjusts order total on frontend
5. No backend call — stored on order during creation (`discount` field + `discountBreakdown`)

**Tab 2 — Gift Card (redemption as payment):**
1. Enter gift card number → "Check" button → backend verifies balance
2. Shows available balance → amount field auto-fills with max usable
3. User can adjust amount → "Apply"
4. Card is stored locally but **NOT redeemed yet** (correct pattern)
5. Can apply multiple gift cards, can remove any
6. Actual balance deduction happens post-payment in `submitTransaction` via `redeemGiftCard()`
7. If gift cards cover full order total → no other payment method needed

**Tab 3 — Coupon Code:**
1. Enter coupon code → auto-validates on blur via `POST /api/discounts/auto-apply`
2. Validation checks: code validity, usage limits, customer eligibility, product/category restrictions
3. Shows success message with discount amount, or error message
4. "Apply Coupon" → applies validated discount to order total
5. "Remove" → clears applied coupon
6. Usage count recorded by backend during order creation (`discountUsage` table + `usageCount` increment)

**All three adjust the order total before payment. None trigger post-payment actions (except gift card balance deduction).**

⚠️ **Minor issue**: `AdjustmentsModal` uses custom overlay (`fixed inset-0 bg-black/40`) instead of shared `Modal` component — should be migrated per CLAUDE.md standards

---

## 3. Unified Post-Payment Flow

> Applies to ALL payment methods (card, cash, house account, COD, check, split).
> Applies to ALL entry points (TakeOrderPage, POS Screen).

### 3.1 Expected Post-Payment Sequence

After any successful payment, the system should execute these steps in order:

**Step 1 — Create Orders**
- Non-draft items → `POST /api/orders/create` (creates orders with status PAID)
- Draft orders (from POS grid) → update to PAID status with calculated total
- Backend records discount/coupon usage automatically during order creation (`discountUsage` table + `usageCount` increment)

**Step 2 — Create Payment Transaction (PT)**
- `POST /api/payment-transactions` with all payment methods and linked order IDs
- Records: customer, employee, channel, total, tax, tip, payment method details
- Generates PT-XXXX transaction number for records

**Step 3 — Gift Card Processing** (if applicable)
- If gift cards were **purchased** in this order → activate them
- If gift cards were **used as payment** → deduct balances via `redeemGiftCard`
- Show gift card handoff modal if cards were activated

**Step 4 — Print / Email** (based on toggles selected before payment)
- **Print Receipt** → auto-print customer receipt (no prompt)
- **Print Ticket** → auto-print shop fulfillment ticket (no prompt)
- **Email Receipt** → auto-send receipt email to customer on file (no prompt/modal)
- All three are OFF by default, user selects before charging

**Step 5 — Completion**
- TakeOrderPage: show success toast → redirect to order view page
- POS Screen: show completion summary screen with transaction details

### 3.2 What Should NOT Fire Post-Payment

| Action | Status | Notes |
|--------|--------|-------|
| Auto email/SMS order confirmation | REMOVE | Customer is on the phone or in store — they know |
| Status change notifications (PAID) | REMOVE | See Section 7 — only delivery confirmation is automated |
| Card fingerprint customer matching | KEEP | Useful for linking walk-in customers to existing profiles |

### 3.3 Discounts & Coupons

Discounts do NOT trigger any post-payment actions. They only adjust the order total before payment:

- **Manual discount** ($ or %) → applied on frontend, stored on order
- **Coupon code** → validated via `/api/discounts/auto-apply`, applied on frontend, usage recorded by backend during order creation
- **Automatic discounts** → checked when cart changes, applied on frontend
- **Gift card redemption** → only one with a post-payment action (balance deduction)

All discount tracking (usage count, per-customer usage) happens inside `orders/create.ts` as part of order creation — not as a separate step.

### 3.4 Current Codebase Issues

⚠️ **Two completely separate code paths doing the same thing:**
- **TakeOrderPage** uses `PaymentSection` → `useOrderPayments` hook → own PT creation logic
- **POSPage** uses `PaymentController` → `useTransactionSubmission` hook → own PT creation logic
- Both duplicate: order creation, PT creation, gift card activation/redemption, receipt sending

⚠️ **Print not functional:**
- TakeOrderPage has `printReceipt` and `printTicket` state variables (lines 91-92 of PaymentSection) but they're **not connected to any UI or logic**
- POSPage `onPrintReceipt` is a `console.log` stub

⚠️ **Receipt sending differs between paths:**
- TakeOrderPage sends via `POST /api/email/receipt` directly
- POSPage uses `NotificationModal` component (extra UI step)
- Should be unified: auto-send on toggle, no modal

⚠️ **No rollback on partial failure:**
- If orders are created but PT transaction fails, code says "continue anyway"
- Result: PAID orders with no payment record in the system
- Same for gift card activation — orders + PT exist but cards aren't activated
- Should at minimum log a clear error/alert so it can be fixed manually

⚠️ **Channel/provider mismatch:**
- `PaymentSection` line 754 returns `'SQUARE'` for card payments (comment: "Phone orders use Square")
- But `CardPaymentModal` uses Stripe for everything
- Leftover from before Stripe migration — should be `'STRIPE'`

⚠️ **COD → Rename to "Pay Later":**
- COD (Cash on Delivery) doesn't apply — customer is almost never the recipient
- Actual use case: customer orders now, pays later (comes in or calls back)
- Rename throughout: UI label, payment method type, database enum
- Current codebase uses `'cod'` / `'COD'` — rename to `'pay_later'` / `'PAY_LATER'`

⚠️ **Payment status mixed into fulfillment status — MAJOR REFACTOR NEEDED:**
- See **Section 8** and `/docs/FEATURE_PLANS/payment-status-separation.md`
- Order `status` currently tracks BOTH fulfillment AND payment (PAID, REFUNDED, etc.)
- Pay Later orders get marked PAID even though they haven't paid
- Fulfilled unpaid orders lose their "unpaid" info when status changes to IN_DESIGN, READY, etc.
- Solution: separate `paymentStatus` field on Order model

---

## 4. POS Screen Flow

### 4.1 Main POS Features (all working)
- **Customer loading** — search and attach customer to transaction
- **Product grid** — add products from grid or add custom items
- **Cart management** — change quantities, edit, delete items
- **Drafts** — auto-save, load any draft at any time
- **Fullscreen / Settings / Dashboard** — buttons all functional

### 4.2 "Add Order" (TakeOrderPage Overlay)
- Opens TakeOrderPage as an overlay within POS
- Used for phone orders that need delivery info, recipients, etc.
- Shows "Send to POS" button in payment methods
- On send → creates draft orders → transfers to POS cart for payment

✅ **EXPECTED**: Remove all other payment methods from the TakeOrderPage overlay when opened from POS. Only "Send to POS" should be available — payment happens on the POS screen.

### 4.3 Collect Payment Screen

**Layout (top to bottom):**
1. **Header** — "Collect Payment", customer name, cancel button
2. **Summary cards** — Order Total, Applied Adjustments, (remove Quick Actions from here)
3. **Payment tiles** — Cash, Credit Card, House Account, Pay Later, Cheque, Split, Discounts
4. **Post-payment action toggles** — `<PaymentActionToggles />` component, placed BELOW payment tiles
   - Full-width row of larger toggle buttons spanning across the screen
   - Clearly separated from payment tiles
   - Layout: `[ Print Receipt ] [ Print Ticket ] [ Email Receipt 📧 email@... ]`
   - Used frequently — must be prominent and easy to tap

⚠️ **CURRENT**: Quick Actions are small buttons crammed into a summary card at the top — easy to miss and hard to tap

### 4.4 POS vs TakeOrderPage Differences

| Feature | POS Screen | TakeOrderPage |
|---------|-----------|---------------|
| Products | Grid + custom items | Search + custom items |
| Customer | Optional (walk-in) | Required |
| Recipient | Not applicable | Required for delivery |
| Delivery info | Not applicable | Date, instructions, card message |
| Payment | PaymentController (full flow) | PaymentSection (separate code path) |
| After payment | Completion summary screen | Success toast → redirect to order view |
| Drafts | Auto-save, loadable | Not applicable |
| Split payment | Works (opens modals per row) | Broken (skips payment collection) |

---

## 4. Website Order Flow

### 4.1 Checkout Wizard Steps

Customer-facing checkout at `www/` — 5-step wizard (`WizardCheckout.jsx`).

**Step 1 — Delivery / Pickup**
- Choose **Delivery** or **Pickup** (toggle buttons)
- "I am the recipient" toggle (below delivery/pickup buttons, single line)
  - When ON: auto-fills recipient from buyer info (Step 3)
  - When OFF: shows recipient name, phone, address fields
- Delivery date picker
- Delivery/pickup instructions (optional unless surprise delivery)
- **Surprise delivery** toggle:
  - Shows warning modal about unattended delivery risks
  - Modal warns: flowers cannot be left outside in below-zero temperatures — order returned to shop, redelivery fee applies
  - Makes delivery instructions required (need safe drop-off location)

**Step 2 — Card Message**
- Textarea for card message
- "Remind me next year" checkbox — available to ALL users (guest and logged-in)
  - Guest users: reminder created via email provided in Step 3 after checkout
  - Logged-in users: reminder linked to account

**Step 3 — Your Info (Buyer)**
- First name, last name, email, phone
- If logged in: auto-populated from profile
- If guest: manual entry
- Login option: opens inline login modal (no navigation away from checkout)
  - On successful login: modal closes, buyer fields auto-populate, saved recipients/cards load
  - All previously entered delivery/recipient data preserved

**Step 4 — Review & Pay**
- Order summary with all details
- Terms & Conditions link opens modal (no navigation away)
- Stripe payment form
- Gift card redemption option
- Place Order button

**Step 5 — Confirmation**
- Order confirmation with order number
- Summary of what was ordered and where it's going

### 4.2 Checkout Sequence (What Actually Happens)

**Frontend (`handlePlaceOrder` in WizardCheckout.jsx):**
1. Validate all steps (recipient, customer, payment)
2. Create/find buyer Customer record (`POST /api/customers`)
3. Save billing address if provided (`POST /api/customers/:id/addresses`)
4. Create/find recipient Customer record + delivery address
5. Link recipient to buyer (`POST /api/customers/:id/save-recipient`)
6. Create Stripe PaymentIntent (`POST /api/stripe/payment-intent`)
7. Confirm payment via Stripe.js (`stripe.confirmPayment`)
8. Call `POST /api/orders/save-draft` with `paymentIntentId` + confirmed status
9. If "Remind me next year" → `POST /api/reminders`
10. Show confirmation screen, clear cart
11. If guest and didn't create account → show "create account" modal

**Backend (`/api/orders/save-draft` in create.ts):**
1. Save birthday opt-in to customer if provided
2. Create Order record with status `PAID` + `paymentStatus: PAID` (when payment confirmed)
3. Calculate taxes, apply discounts, record discount usage
4. Update Stripe PaymentIntent description with order number
5. Return created orders

### 4.3 Post-Checkout: What Fires and What Doesn't

**Website orders use `/api/orders/save-draft` — a DIFFERENT code path than POS orders (`/api/orders/create`).**

| Action | POS (`/create`) | Website (`/save-draft`) | Notes |
|--------|----------------|------------------------|-------|
| Order created | ✅ | ✅ | |
| Payment Transaction (PT) created | ✅ | ❌ | **No PT record for website orders** |
| Status notifications triggered | ✅ | ❌ | **No confirmation email sent** |
| Print job queued | ✅ (delivery ticket + receipt) | ❌ | Expected — no printer at customer's house |
| Discount usage recorded | ✅ | ✅ | |
| Stripe PI description updated | N/A | ✅ | |
| Reminder created | N/A | ✅ (if opted in) | |

⚠️ **No Payment Transaction created for website orders:**
- POS orders create a PT record linking payment method, amounts, and order IDs
- Website orders only store `paymentIntentId` on the order — no PT in the system
- This means website revenue doesn't show up in transaction reports
- Should create PT after successful Stripe confirmation, same as POS

⚠️ **No confirmation email for website orders:**
- `save-draft` never calls `triggerStatusNotifications()`
- Customer places order, pays, and gets no email confirmation
- POS orders trigger PAID notifications (email/SMS based on settings)
- Website orders should send a confirmation email at minimum

⚠️ **No delivery ticket auto-printed for website orders:**
- POS path auto-queues delivery ticket print jobs for delivery orders
- Website orders create PAID delivery orders but never trigger a print
- Staff has to manually notice the new order in admin and print
- Should trigger delivery ticket print on website order creation (same as POS)

### 4.4 UX Issues

⚠️ **"Is for me?" toggle confusing:**
- Current label "This order is for me" unclear — rename to "I am the recipient"
- Remove explanation line ("Use your info from step 3 as the recipient")
- Move from its own section to directly below delivery/pickup buttons

⚠️ **Surprise modal too vague:**
- Says "extreme heat or cold" — needs specific below-zero temperature warning
- Redelivery fee language unclear

⚠️ **Delivery instructions not marked optional:**
- Label says "Delivery instructions" with no indication it's optional (confusing for users)
- Should say "Delivery instructions (optional)" — except for surprise deliveries where it's required

⚠️ **"Remind me next year" gated behind auth:**
- Checkbox only shows for logged-in users
- Guest users provide email in Step 3 — backend can create reminder from that
- `WizardCheckout.jsx` resets `rememberDate` on logout and guards `maybeCreateReminder` with `isAuthenticated`

⚠️ **Login link navigates away from checkout:**
- Step 3 has `<Link to="/login">` — loses all checkout state
- Should open inline modal, preserve all entered data

⚠️ **Terms link navigates away from checkout:**
- Review step links to `/terms` page — loses all checkout state
- Should open modal overlay with terms content

---

## 5. Mobile App Flow

### 5.1 Overview

Mobile-optimized admin interface at `/mobile` — used by staff on phones for quick tasks. NOT a customer-facing app.

**Entry points:** Mobile Home Page (`/mobile`) with tiles for:
- **Scan Order** — photo-to-order for external/wire orders
- **Deliveries** — today's delivery list
- **Inventory** — stock management
- **Orders** — order list

### 5.2 Scan Order Flow

Core feature: photograph a paper/email order → AI extracts data → review → create order in one tap.

**Workflow:** Scan on phone (quick entry) → review/edit on desktop → print ticket → fulfillment

**Three scan types via provider selector:**

| Provider | Input | Order Type | Use Case |
|----------|-------|-----------|----------|
| **FTD** | Photo of FTD wire-in slip | Delivery | Incoming wire orders from other florists |
| **DoorDash** | Photo of DoorDash order | Pickup | DoorDash marketplace orders |
| **Floranext** | Screenshot of Floranext email | Delivery or Pickup | Orders from legacy Floranext website (being replaced by Bloom www) |

**Step 1 — Select Provider**
- Dropdown of external providers (loaded from `/api/external-providers` + built-in Floranext)
- Defaults to FTD

**Step 2 — Capture Photo**
- Tap camera button → opens phone camera (or file picker)
- Accepts JPEG, PNG, PDF (max 10MB)
- Uploads to `POST /api/orders/scan` (or `/api/orders/scan/floranext`)

**Step 3 — AI Extraction (Gemini)**
- Backend sends image to Google Gemini for OCR + structured extraction
- Returns parsed order data: order number, sender, recipient, address, products, totals, card message
- For delivery orders: address validated against Google Maps Geocoding API
- Shows "Validated" or "Not Found" badge next to address

**Step 4 — Review Parsed Data**
- Shows all extracted fields for human review
- FTD: sender shop info, recipient, address (with validation), product, delivery fee ($15 flat), total, card message
- DoorDash: customer name, pickup date/time, items summary, total
- Floranext: sender + recipient details, delivery/pickup, multiple products with line items, full tax breakdown (GST/PST), card message, delivery instructions
- No inline editing — if Gemini gets it wrong, discard and scan again. Corrections happen on desktop.

**Step 5 — Create Order**
- "Create Order" button → calls backend endpoint
- Duplicate check: if `externalReference` already exists → 409 error ("Order already exists")
- On success: shows order number, "Scan Another" button

### 5.3 Backend: Create from Scan

**FTD orders (`POST /api/orders/create-from-scan`):**
1. Find or create **sender** customer (sending florist: shop name + shop code as last name)
2. Find or create **recipient** customer (by phone number match)
3. Find or create delivery address on recipient
4. Create Order: type=DELIVERY, status=PAID, orderSource=EXTERNAL, externalSource=FTD
5. Product price = total - $15 delivery fee (flat)
6. Tax = $0 (FTD includes tax in total)
7. Create Payment Transaction: type=EXTERNAL, provider=INTERNAL

**DoorDash orders (`POST /api/orders/create-from-scan`):**
1. Find or create system "DoorDash Pickup Orders" customer (shared for all DD orders)
2. Create Order: type=PICKUP, status=PAID, orderSource=EXTERNAL, externalSource=DOORDASH
3. Delivery date defaults to today if not specified
4. Tax split into GST/PST using configured tax rates (proportional split)
5. Create Payment Transaction: type=EXTERNAL, provider=INTERNAL

**Floranext orders (`POST /api/orders/create-from-floranext`):**
1. Find or create sender customer (by phone), save sender address + email
2. Find or create recipient customer (by phone)
3. Find or create delivery address on recipient (if delivery)
4. Create Order: type=DELIVERY or PICKUP, status=PAID, orderSource=WEBSITE, externalSource=OTHER
5. External reference prefixed with `FN-` (e.g., `FN-12345`)
6. Full tax breakdown with GST/PST amounts from scan
7. Multiple order items supported (one per product)
8. Create Payment Transaction: type=EXTERNAL, provider=INTERNAL

### 5.4 Post-Creation: What Fires

| Action | FTD | DoorDash | Floranext |
|--------|-----|----------|-----------|
| Order created with PAID status | ✅ | ✅ | ✅ |
| Payment Transaction created | ✅ | ✅ | ✅ |
| Notifications triggered | ❌ | ❌ | ❌ |
| Print job queued | ❌ | ❌ | ❌ |
| Duplicate check (externalReference) | ✅ | ✅ | ✅ |

No auto-print or notifications after scan — correct behavior. Staff reviews the order on desktop and prints from there.

### 5.5 Current Issues

⚠️ **Desktop scan modal should be removed:**
- `ScanExternalOrderModal` exists on the External Orders page (`ExternalOrdersPage.tsx`)
- Was never intended — scanning is a mobile-only workflow
- Remove the "Scan Order" button, modal component, and related state

⚠️ **FTD delivery fee hardcoded to $15:**
- `create-from-scan.ts` line 124: `const deliveryFee = 1500;`
- Should be configurable in settings or extracted from the scanned order

⚠️ **DoorDash uses system customer instead of actual customer:**
- All DoorDash orders share one "DoorDash Pickup Orders" customer record
- Fine for now (DD customers rarely repeat), but loses individual customer data
- Recipient name IS stored on `recipientName` field

⚠️ **Customer lookup only matches by phone:**
- `findOrCreateCustomer` searches by phone number only
- If same person has different phone numbers across orders → duplicate customer records
- No name-based matching or fuzzy search

---

## 6. Post-Order Flows
<!-- TODO: Editing, cancellation, refunds, fulfillment -->

---

## 7. Notifications

### 7.1 Design Principles
- Keep it simple — only send what customers actually expect from a flower shop
- No spam — florists are personal businesses, over-notifying feels corporate
- Email receipt only when asked for it
- Delivery confirmation is the #1 most valuable notification (kills "did my flowers arrive?" calls)

### 7.2 Automated Notifications (system-triggered)

| Trigger | Channel | Recipient | When | Notes |
|---------|---------|-----------|------|-------|
| **Delivery confirmed** | Email + SMS | Buyer (customer) | Driver marks order as delivered | Most important notification. Include delivery photo if available. |

**That's it.** Only one automated notification.

### 7.3 Manual Notifications (user-triggered)

| Action | Channel | Triggered From | Notes |
|--------|---------|----------------|-------|
| **Ready for pickup** | SMS | Communication dashboard | Staff decides who to contact (buyer, recipient, or person named in delivery instructions) — too many edge cases to automate |
| **SMS to recipient** | SMS | Communication dashboard | Confirm delivery time, coordinate access, etc. |

### 7.4 Notifications to REMOVE

These exist in the current codebase but should be disabled/removed:

| Status | Why Remove |
|--------|-----------|
| **PAID** (auto order confirmation) | Not needed — customer is on the phone when ordering, or gets website confirmation. Auto-emailing after POS charge is redundant and confusing for house accounts. |
| **IN_DESIGN** | Internal status, customer doesn't care |
| **READY** (all orders) | For delivery: not needed. For pickup: too many edge cases (buyer vs recipient vs third party) — handle manually via communication dashboard |
| **OUT_FOR_DELIVERY** | Nice in theory, but adds complexity for minimal value. Delivery confirmation covers it. |
| **COMPLETED** (auto email) | Replaced by delivery confirmation with photo — much more useful |

### 7.5 Per-Customer Notification Control

Not needed with simplified spec. Only two automated notifications remain:
- **Delivery confirmation** — always sent (everyone wants to know their flowers arrived)
- **Ready for pickup** — only for pickup orders (customer is waiting)

House account customers still get delivery confirmations (the buyer wants to know their order arrived). They just don't get receipts or invoices — those come via the monthly house account billing.

If per-customer opt-out is ever needed, add a `notificationsEnabled` boolean on Customer record, checked before sending.

### 7.6 Current Codebase Status

⚠️ **Over-built**: 5 status-based notification triggers with per-status email/SMS templates for both customer and recipient (20 template slots). Only 2 are actually needed.

**Files involved:**
- `back/src/utils/notificationTriggers.ts` — fires on every status change
- `back/src/services/notificationService.ts` — unified send service (email + SMS)
- `back/src/routes/settings/order-status-notifications.ts` — settings with 5 status configs
- `admin/src/app/components/settings/notifications/` — settings UI

**What to change:**
1. Remove PAID, IN_DESIGN, OUT_FOR_DELIVERY, COMPLETED auto-notifications
2. Keep READY trigger but only for PICKUP orders
3. Add delivery confirmation trigger (on driver delivery confirmation, not status change)
4. Keep manual receipt sending via NotificationModal as-is

---

## 8. Payment Status Separation (Major Refactor)

> See full feature plan: `/docs/FEATURE_PLANS/payment-status-separation.md`

### Problem
`OrderStatus` currently mixes fulfillment and payment concerns into one field. This breaks when:
- Pay Later orders get fulfilled (unpaid info lost when status moves to IN_DESIGN, READY, etc.)
- House Account orders are delivered but not yet billed
- Refunded orders need to keep their fulfillment history

### Solution
Add a separate `paymentStatus` field on the Order model:

| Field | Tracks | Values |
|-------|--------|--------|
| `status` | **Fulfillment** | DRAFT, PAID*, IN_DESIGN, READY, OUT_FOR_DELIVERY, COMPLETED, CANCELLED, REJECTED |
| `paymentStatus` | **Payment** | UNPAID, PAID, PARTIALLY_PAID, REFUNDED, PARTIALLY_REFUNDED |

*PAID remains in OrderStatus as a fulfillment milestone (order confirmed/accepted), but actual payment tracking moves to `paymentStatus`.

### Examples
| Scenario | `status` | `paymentStatus` |
|----------|----------|-----------------|
| Card payment, in design | IN_DESIGN | PAID |
| Pay Later, delivered | COMPLETED | UNPAID |
| House Account, fulfilled | COMPLETED | UNPAID |
| Partial refund after delivery | COMPLETED | PARTIALLY_REFUNDED |
| Cash order, ready for pickup | READY | PAID |

# Subscription System

**Status:** 🔜 Ready for Implementation
**Created:** 2026-02-17
**Priority:** High

---

## Overview

A flexible subscription system for recurring flower deliveries that supports both **recurring billing** (direct card charges via stored payment method) and **prepaid** (pay upfront for X deliveries). Customers choose between **Designer's Choice** (pick a price tier + color palette) or **Pick Your Arrangements** (select specific products per delivery). Recipients can manage upcoming deliveries via a simple portal (subscription number + postal code lookup, no login required).

This replaces the limited Floranext subscription system which only supports order duplication with manual monthly charges and has no prepaid tracking, product selection flexibility, or recipient self-service.

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
- **Backend route pattern:** `/back/src/routes/orders.ts` (complex CRUD with related models)
- **Frontend list page pattern:** `/admin/src/app/components/orders/` (list + detail + modals)
- **Stripe integration pattern:** `/back/src/routes/payments.ts` (existing Stripe usage, saved payment methods)
- **Customer portal pattern:** `/www/src/pages/GiftCardBalance.jsx` (public lookup without login)
- **Reminder email pattern:** `/back/src/routes/reminders.ts` (scheduled notifications)

**DO NOT write from scratch. COPY patterns from these files.**

### Pre-Implementation Quiz (Answer Before Coding)

**Question 1: API Client**
- What hook do you use for all frontend API calls?
- Answer: `useApiClient` (not fetch)

**Question 2: Price Storage**
- How are monetary values stored in the database?
- Answer: As `Int` in `cents`

**Question 3: Validation**
- What library validates backend requests?
- Answer: `Zod` with `.parse()` method

### Pre-Implementation Contract (Required — Answer Before Coding)

Provide a short implementation contract (bullets):
- **Goals → Changes mapping**: Map each Goal to the specific code changes/files.
- **Files to touch (exact paths)**: List every file you will create/modify.
- **Backend surface area**: Endpoints to add/modify + where they are registered.
- **DB/migrations**: Prisma schema changes + migration name you will run.
- **UI standards confirmation**: Confirm you will follow shared UI patterns (StandardTable/DatePicker/shared Modal + form components) and `value={x || ''}`.
- **Unknowns / questions**: If anything is ambiguous, ask now — do not start coding.

### Critical Don'ts
❌ Use `fetch()` directly → Use `useApiClient` hook
❌ Store prices as floats → Use integers in cents
❌ Skip cascade deletes → Add `onDelete: Cascade`
❌ Forget route registration → Register in `/back/src/index.ts`
❌ Skip migrations → Run `npx prisma migrate dev --name feature_name`

### Frontend/UI Critical Don'ts (Project Standards)
❌ Build custom tables / table HTML → Use `StandardTable`
❌ Use `<input type="date">` → Use `DatePicker` from `@shared/ui/forms/date-picker`
❌ Use raw `<input>`, `<select>`, `<textarea>` → Use shared form components (`InputField`, `Select`, `Label`, etc.)
❌ Create custom modals/overlays (`fixed inset-0 ...`) → Use shared `Modal` from `@shared/ui/components/ui/modal`
❌ Allow null/undefined input values → Always use `value={x || ''}`
❌ Use emojis in user-facing UI → Use Heroicons / existing icon library from `@shared/assets/icons`

---

## Goals

1. **Support both billing models** — Recurring (direct card charges per delivery) and Prepaid (pay upfront, track remaining deliveries)
2. **Hybrid product selection** — "Designer's Choice" (price tier + color palette) or "Pick Your Arrangements" (choose specific products, even different ones per delivery)
3. **Flexible delivery scheduling** — Choose specific dates, skip/reschedule, with day-of-week or custom date patterns
4. **Recipient self-service portal** — Recipients manage upcoming deliveries via subscription number + postal code lookup (no login)
5. **Sell subscriptions on both POS and storefront** — Admin creates in POS, customers can also purchase on www site

---

## Key Concepts

### Billing Models

| Model | How it works | Payment | Use case |
|-------|-------------|---------|----------|
| **Recurring** | Charges saved card on file each delivery cycle | Direct `paymentIntents.create` using stored PaymentMethod | "Monthly flowers, cancel anytime" |
| **Prepaid** | Full amount paid upfront | Single charge at purchase | "12 deliveries for the year, paid now" |

**No Stripe Subscriptions API.** All billing is handled via direct charges against stored payment methods. This gives full control over charge timing (charge when you prep, not on a rigid cycle) and makes variable pricing per delivery trivial.

### Subscription Style (Product Selection)

| Style | How it works | Pricing |
|-------|-------------|---------|
| **Designer's Choice** | Customer picks a price tier + optional color palette. Florist arranges whatever's fresh. | Fixed price per delivery (the tier price) |
| **Pick Your Arrangements** | Customer selects from subscription-eligible products. Can pick the same for all deliveries or different products per delivery. | Each delivery priced at the selected product's price |

Products must be flagged as `availableForSubscription = true` in the Product model to appear in the "Pick Your Arrangements" flow.

### Subscription vs Delivery

- **Subscription** = the agreement (billing model, style, frequency, recipient)
- **Delivery** = a single scheduled fulfillment within a subscription (has a date, status, product assignment, can be skipped/rescheduled)

### Subscription Lifecycle

```
ACTIVE → deliveries auto-generated based on schedule
PAUSED → no new deliveries generated, no charges
CANCELLED → no further deliveries, no charges
COMPLETED → all prepaid deliveries fulfilled
```

---

## Architecture & Endpoints

### Backend API Routes

**File:** `/back/src/routes/subscriptions.ts`

**Admin Endpoints (authenticated):**
- `GET /api/subscriptions` — List all subscriptions (with filters: status, customer, billing type, style)
- `GET /api/subscriptions/:id` — Get subscription detail with deliveries
- `POST /api/subscriptions` — Create new subscription
- `PATCH /api/subscriptions/:id` — Update subscription (product, schedule, recipient)
- `POST /api/subscriptions/:id/pause` — Pause subscription
- `POST /api/subscriptions/:id/resume` — Resume subscription
- `POST /api/subscriptions/:id/cancel` — Cancel subscription
- `PATCH /api/subscriptions/:id/deliveries/:deliveryId` — Update a delivery (reschedule, skip, update notes, change product)
- `POST /api/subscriptions/:id/deliveries` — Manually add a delivery
- `POST /api/subscriptions/:id/generate-deliveries` — Generate next batch of deliveries based on schedule
- `GET /api/subscription-plans` — List price tiers for Designer's Choice (admin management)
- `POST /api/subscription-plans` — Create/update price tiers

**Storefront Endpoints (public, www):**
- `GET /api/storefront/subscription-plans` — Get available plans + price tiers
- `GET /api/storefront/subscription-products` — Get products flagged as subscription-eligible
- `POST /api/storefront/subscriptions` — Purchase a subscription (processes payment via Stripe Checkout)
- `GET /api/storefront/subscriptions/lookup` — Recipient portal lookup (subscription number + postal code)
- `PATCH /api/storefront/subscriptions/:id/deliveries/:deliveryId` — Recipient reschedules a delivery or adds notes (validated by accessCode)

**Cron/Scheduled Jobs:**
- **Delivery generator** — Runs daily, creates upcoming Delivery records for active subscriptions (looks ahead 30 days)
- **Order creator** — X days before delivery date, auto-creates an Order from the subscription/delivery template so it appears in your prep workflow
- **Payment processor** — When order is created for a recurring subscription, charges the stored card. If charge fails, flags the delivery and notifies admin.
- **Reminder emails** — Sends recipient a reminder before each delivery with portal link

### Database Schema

**Models to create:**

```prisma
// Add to existing Product model:
// availableForSubscription Boolean @default(false)

model SubscriptionPlan {
  id              String   @id @default(uuid())
  name            String   // "Petite Bouquet", "Classic Arrangement", "Premium"
  description     String?
  priceCents      Int      // Price per delivery in cents
  image           String?  // R2 image URL
  isActive        Boolean  @default(true)
  sortOrder       Int      @default(0)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model Subscription {
  id              String             @id @default(uuid())
  subscriptionNumber String          @unique // e.g. "SUB-0001"

  // Billing
  billingType     SubscriptionBillingType // RECURRING | PREPAID
  status          SubscriptionStatus      // ACTIVE | PAUSED | CANCELLED | COMPLETED

  // Style
  style           SubscriptionStyle       // DESIGNERS_CHOICE | PICK_YOUR_OWN

  // Designer's Choice fields
  planId          String?                 // Links to SubscriptionPlan (price tier)
  plan            SubscriptionPlan?       @relation(fields: [planId], references: [id])
  colorPalette    String?                 // "Warm" | "Cool" | "Bright" | "Pastel" | null (no preference)

  // Pricing
  defaultPriceCents Int                   // Default price per delivery (from plan or first product)
  totalPrepaidCents Int?                  // Total paid upfront (prepaid only)
  totalDeliveries   Int?                  // Total deliveries purchased (prepaid only)
  completedDeliveries Int    @default(0)  // Counter for prepaid tracking

  // Schedule
  frequency       SubscriptionFrequency  // WEEKLY | BIWEEKLY | MONTHLY | CUSTOM
  preferredDayOfWeek Int?                 // 0=Sun, 1=Mon... (for weekly/biweekly)
  customDates     DateTime[]              // For CUSTOM frequency — specific dates
  startDate       DateTime                // When the subscription starts

  // Payment
  stripeCustomerId    String?             // Stripe Customer ID (for stored card)
  stripePaymentMethodId String?           // Stored payment method for recurring charges

  // People
  customerId      String                  // Who's paying (buyer)
  customer        Customer                @relation(fields: [customerId], references: [id])

  // Recipient (may differ from customer)
  recipientName   String
  recipientPhone  String?
  recipientEmail  String?
  recipientAddress String
  recipientCity    String
  recipientProvince String?
  recipientPostalCode String

  // Portal access
  accessCode      String             @unique // Generated code for recipient portal lookup

  // Metadata
  notes           String?            // Internal admin notes
  source          SubscriptionSource // POS | STOREFRONT
  createdAt       DateTime           @default(now())
  updatedAt       DateTime           @updatedAt
  cancelledAt     DateTime?
  pausedAt        DateTime?

  deliveries      SubscriptionDelivery[]

  @@index([customerId])
  @@index([status])
  @@index([accessCode])
  @@index([subscriptionNumber])
}

model SubscriptionDelivery {
  id              String                    @id @default(uuid())
  subscriptionId  String
  subscription    Subscription              @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)

  // What's being delivered
  // For DESIGNERS_CHOICE: uses parent subscription's plan/price
  // For PICK_YOUR_OWN: each delivery can have its own product
  productId       String?                   // Specific product (for PICK_YOUR_OWN style)
  product         Product?                  @relation(fields: [productId], references: [id])
  productName     String?                   // Snapshot of product name at time of assignment
  priceCents      Int                       // Price for THIS delivery (may vary per product)

  // Schedule
  scheduledDate   DateTime
  deliveredDate   DateTime?

  // Status
  status          SubscriptionDeliveryStatus // SCHEDULED | PREPARING | DELIVERED | SKIPPED | RESCHEDULED

  // Linked order (auto-created when delivery is being prepared)
  orderId         String?                   @unique
  order           Order?                    @relation(fields: [orderId], references: [id])

  // Overrides (recipient can customize per-delivery)
  customNotes     String?                   // "I'll be away, leave at door"

  // Payment tracking (for recurring)
  stripePaymentIntentId String?             // PaymentIntent ID for this charge
  paidAt          DateTime?
  paymentFailed   Boolean   @default(false)

  rescheduleCount Int       @default(0)     // Track reschedules (max 2)

  createdAt       DateTime                  @default(now())
  updatedAt       DateTime                  @updatedAt

  @@index([subscriptionId])
  @@index([scheduledDate])
  @@index([status])
}

enum SubscriptionBillingType {
  RECURRING
  PREPAID
}

enum SubscriptionStatus {
  ACTIVE
  PAUSED
  CANCELLED
  COMPLETED
}

enum SubscriptionStyle {
  DESIGNERS_CHOICE
  PICK_YOUR_OWN
}

enum SubscriptionFrequency {
  WEEKLY
  BIWEEKLY
  MONTHLY
  CUSTOM
}

enum SubscriptionDeliveryStatus {
  SCHEDULED
  PREPARING
  DELIVERED
  SKIPPED
  RESCHEDULED
}

enum SubscriptionSource {
  POS
  STOREFRONT
}
```

**Migration command:**
```bash
npx prisma migrate dev --name add_subscription_system
```

---

## UI Requirements

### Admin POS — Subscription Plans Management

**Route:** `/subscriptions/plans` (or tab within subscriptions page)

Simple CRUD for Designer's Choice price tiers:
- Name, description, price, image, active/inactive, sort order
- Also: toggle `availableForSubscription` on existing products (could be a checkbox on the product edit form)

### Admin — Shared Subscription Components

**IMPORTANT: Same components used in two contexts:**
1. **Dashboard**: Full-page routes via sidebar nav (`/subscriptions`, `/subscriptions/new`, `/subscriptions/:id`)
2. **POS Screen**: Loaded in the left panel (same pattern as order creation) via "Subscriptions" button next to "Add Order"

Components are context-agnostic — they render the same UI regardless of whether they're in a full-page route or the POS left panel. The parent container handles the layout difference.

### Subscription List

**Route:** `/subscriptions` (dashboard) or POS left panel
**Page Title:** `"Subscriptions | Bloom POS"` (add to `useDocumentTitle`)

Standard list page layout per CLAUDE.md:
- Header with "Subscriptions" title + "+ New Subscription" button
- Filters: status (All/Active/Paused/Cancelled/Completed), billing type (All/Recurring/Prepaid), style (All/Designer's Choice/Pick Your Own), search by customer/recipient name
- StandardTable columns: Subscription #, Customer, Recipient, Style, Frequency, Billing Type, Status, Next Delivery, Actions
- Status shown with colored dots (Active=green, Paused=yellow, Cancelled=red, Completed=gray)
- Clicking a row navigates to subscription detail

### Subscription Detail

**Route:** `/subscriptions/:id` (dashboard) or replaces list in POS left panel
**Page Title:** `"Subscription SUB-XXXX | Bloom POS"` (dynamic)

**Top section:**
- Subscription number, status badge, billing type badge, style badge
- Action buttons: Pause/Resume, Cancel, Edit
- Key stats: deliveries completed / total (prepaid), next delivery date, price

**Info cards (2-column grid):**
- **Customer & Recipient** — buyer info, recipient info, delivery address
- **Product & Schedule** — style, plan/color palette (Designer's Choice) or product list (Pick Your Own), frequency, preferred day
- **Billing** — billing type, default price, payment method on file, total paid / remaining (prepaid)

**Deliveries table:**
- StandardTable: Date, Product, Price, Status, Order #, Notes, Actions (Skip, Reschedule, Change Product, View Order)
- Upcoming deliveries shown first, past deliveries below
- Skip button opens confirmation modal
- Reschedule opens DatePicker modal
- Change Product (Pick Your Own only) opens product selector modal

### Create/Edit Subscription (Wizard Flow)

**Route:** `/subscriptions/new` (dashboard) or replaces list in POS left panel
**Matches the www storefront flow but with admin extras.**

**Step 1: Customer**
- Customer search/select (existing customer picker component)
- Shows customer's saved payment methods (if any)

**Step 2: Recipient**
- "Same as customer" checkbox (pre-fills fields)
- Name, phone (PhoneInput), email, delivery address

**Step 3: Schedule**
- Frequency cards: Weekly / Biweekly / Monthly / Custom
- Preferred day of week (for weekly/biweekly)
- Start date (DatePicker)
- For custom: date picker to add specific dates

**Step 4: Billing**
- Recurring vs Prepaid toggle
- Recurring: select card on file (from customer's stored Stripe payment methods) or add new card
- Prepaid: number of deliveries input, auto-calculates total displayed

**Step 5: Product Selection (Style)**
- Designer's Choice vs Pick Your Arrangements toggle
- **Designer's Choice**: select a plan tier (from SubscriptionPlan) + optional color palette dropdown
- **Pick Your Arrangements**:
  - Grid of subscription-eligible products (`availableForSubscription = true`)
  - Default: pick one product for all deliveries
  - "Customize each delivery" toggle: shows delivery slot list with dates, each with a product picker
  - Delivery count determined by duration (prepaid) or shows first N upcoming slots (recurring)

**Step 6: Review & Confirm**
- Full summary: customer, recipient, schedule, billing, products, pricing
- For prepaid with mixed products: itemized price per delivery + total
- Internal notes field (admin only — not on www flow)
- "Create Subscription" button

**Navigation:** Back/Next buttons on each step. Progress indicator at top. Can click back to edit any step before confirming.

### WWW Storefront — Subscription Page

**Route:** `/subscriptions`
**Page Title:** `"Flower Subscriptions | In Your Vase Flowers"` (add to `useDocumentTitle`)

**Hero section:**
- Headline: "Fresh Flowers, Delivered on Your Schedule"
- Brief description of the subscription service

**Step 1: Choose Frequency + Duration**
- Frequency cards: Weekly / Biweekly / Monthly
- Duration: Ongoing or fixed (3, 6, 12 deliveries, custom)
- Prepaid vs Recurring toggle (with explanation: "Pay as you go" vs "Prepay & save")

**Step 2: Choose Your Style**
Two paths presented as cards:

**Path A: "Designer's Choice"**
- "Let our florists surprise you with seasonal blooms"
- Show price tier cards (from SubscriptionPlan): Petite $35, Classic $55, Premium $85
- Optional color palette selector: Warm Tones, Cool Tones, Bright & Colorful, Soft Pastels, No Preference

**Path B: "Pick Your Arrangements"**
- "Choose exactly what you'd like to receive"
- Grid of subscription-eligible products with images and prices
- Default: pick one product for all deliveries
- Toggle: "Want different arrangements each delivery?" → shows per-delivery product picker
  - Each delivery slot shows date + product dropdown/card selector
  - For ongoing subscriptions: pick a default product (can change future deliveries via portal)

**Step 3: Recipient Details**
- "Is this for you or someone else?"
- Recipient name, phone, email, delivery address
- Delivery day preference (day of week picker for weekly/biweekly)
- Start date picker
- Special instructions (e.g., "no lilies", "leave at door")

**Step 4: Payment**
- Order summary showing: style, frequency, duration, price per delivery, total (if prepaid)
- For Pick Your Own with mixed products: itemized list showing each delivery's product + price
- Stripe Checkout for payment (saves card for recurring)

**Step 5: Confirmation**
- Subscription number displayed prominently
- "Your recipient can manage deliveries at [portal link]"
- Subscription number + postal code = portal access
- Email confirmation sent to buyer and recipient

### WWW Storefront — Recipient Portal

**Route:** `/my-subscription`
**Page Title:** `"My Subscription | In Your Vase Flowers"` (add to `useDocumentTitle`)

**Lookup form:**
- Subscription number + postal code
- Simple, clean — similar to gift card balance check page
- Access code as fallback input (for edge cases like postal code change)

**After lookup — Subscription dashboard:**
- Subscription status, style, frequency
- **Upcoming deliveries** list with dates and assigned product/plan
  - "Reschedule" button → opens date picker (constrained to valid delivery windows, max 2 reschedules per delivery)
  - "Add note" → e.g. "leave at back door this time"
  - For Pick Your Own: "Change arrangement" → shows product selector for that delivery
- **Past deliveries** list
- **Subscription info** — next delivery, deliveries remaining (prepaid), color palette (Designer's Choice)

**No login required.** Subscription number + postal code = access.

---

## Delivery Generation Logic

### Auto-Generation (Cron Job)

Runs daily. For each ACTIVE subscription:

1. Look at `frequency` and last generated delivery date
2. Generate deliveries for the next 30 days that don't already exist
3. For **WEEKLY**: every 7 days on `preferredDayOfWeek`
4. For **BIWEEKLY**: every 14 days on `preferredDayOfWeek`
5. For **MONTHLY**: same day each month (or last day if month is shorter)
6. For **CUSTOM**: use `customDates` array — only generate if date is within next 30 days
7. For **PREPAID**: stop generating once `completedDeliveries >= totalDeliveries`

**Product assignment on generation:**
- **Designer's Choice**: delivery inherits `priceCents` from the subscription's plan. No product assigned — florist decides when prepping.
- **Pick Your Own (same for all)**: delivery gets the subscription's default product + that product's price.
- **Pick Your Own (customized per delivery)**: if customer pre-selected products for specific delivery slots, use those. Otherwise, use the default product.

### Order Creation (Cron Job)

Runs daily. For deliveries with `scheduledDate` within the next X days (configurable, default 2):

1. Auto-create an Order from the delivery details (product, price, recipient, address)
2. Link order to delivery (`SubscriptionDelivery.orderId`)
3. Order appears in normal order workflow (prep, delivery, etc.)
4. Order includes note: "Subscription SUB-XXXX — Delivery 5 of 12"
5. **For recurring billing**: charge the stored card via `stripe.paymentIntents.create`
   - Use `stripeCustomerId` + `stripePaymentMethodId` from subscription
   - Charge `priceCents` of the specific delivery (supports variable pricing)
   - On success: set `paidAt` and `stripePaymentIntentId` on the delivery
   - On failure: set `paymentFailed = true`, notify admin via WebSocket, hold the order

### Reminder Emails

Send recipient an email X days before delivery (configurable, default 2):
- "Your flowers are scheduled for delivery on [date]"
- For Pick Your Own: "You're receiving: [product name]"
- "Need to make changes? Visit [portal link]"
- Include subscription number for portal access

---

## Payment Flow (Direct Charges, No Stripe Subscriptions API)

### POS Payment Flow (Terminal)

After the subscription wizard, "Send to POS" — same pattern as regular orders:

- **Prepaid**: POS right panel shows full prepaid total. Process payment at terminal.
- **Recurring**: POS right panel shows first delivery price. Process payment at terminal.
- **Both types**: PaymentIntent is created with `setup_future_usage: 'off_session'` so the card is saved automatically when the customer taps/inserts/swipes. No extra steps.
- Subscription activates once payment succeeds. Card is attached to Stripe Customer for future charges.

### Recurring Billing

**No Stripe Subscriptions API used.** Full control via direct charges:

1. Customer's card is saved via terminal payment with `setup_future_usage: 'off_session'` (POS) or Stripe Checkout setup mode (storefront)
2. When a delivery's order is auto-created (X days before scheduled date), charge the card:
   ```
   stripe.paymentIntents.create({
     amount: delivery.priceCents,
     currency: 'cad',
     customer: subscription.stripeCustomerId,
     payment_method: subscription.stripePaymentMethodId,
     off_session: true,
     confirm: true,
     metadata: { subscriptionId, deliveryId }
   })
   ```
3. Charge amount = the specific delivery's `priceCents` (supports different products at different prices)
4. If charge fails → flag delivery as `paymentFailed`, notify admin in POS
5. Admin can retry charge manually or contact customer

**Benefits over Stripe Subscriptions API:**
- Charge when YOU'RE ready (prep day), not on a rigid billing cycle
- Variable pricing per delivery is trivial (different products = different prices)
- No webhook complexity for invoice lifecycle
- Full control over retry logic

### Prepaid Billing

1. Full amount charged at purchase: `sum of all delivery priceCents`
   - Designer's Choice: `planPrice * totalDeliveries`
   - Pick Your Own (same): `productPrice * totalDeliveries`
   - Pick Your Own (mixed): sum of each selected product's price
2. Single Stripe Checkout session or direct charge
3. No per-delivery charges — just track `completedDeliveries` counter
4. When `completedDeliveries >= totalDeliveries` → subscription status = COMPLETED

### Storefront Payment

- Uses Stripe Checkout session (redirect flow) for both recurring and prepaid
- For recurring: Checkout session in `setup` mode to save card, then we charge per-delivery
- For prepaid: Checkout session in `payment` mode for the full amount
- After successful checkout, create the Subscription record and generate initial deliveries

---

## Implementation Checklist

### Phase 1: Backend — Schema & Core CRUD
- [ ] Add `availableForSubscription` Boolean field to Product model
- [ ] Add Prisma models (SubscriptionPlan, Subscription, SubscriptionDelivery, enums)
- [ ] Run migration: `npx prisma migrate dev --name add_subscription_system`
- [ ] Create `/back/src/routes/subscriptions.ts`
- [ ] Add Zod validation schemas for all endpoints
- [ ] Implement admin CRUD endpoints (list, get, create, update)
- [ ] Implement subscription plan CRUD endpoints
- [ ] Implement pause/resume/cancel actions
- [ ] Implement delivery management (skip, reschedule, change product, add)
- [ ] Register route in `/back/src/index.ts`
- [ ] Add `subscriptions` relation to Customer model and Order model in schema

### Phase 2: Backend — Payment Processing
- [ ] Implement direct card charge for recurring deliveries (paymentIntents.create with stored PaymentMethod)
- [ ] Implement Stripe Checkout session for storefront purchases (setup mode for recurring, payment mode for prepaid)
- [ ] Implement manual charge retry endpoint for failed payments
- [ ] Implement prepaid total calculation (handle mixed product pricing)

### Phase 3: Backend — Cron Jobs
- [ ] Implement delivery generation cron (daily, looks ahead 30 days)
- [ ] Implement order creation cron (creates orders X days before delivery + charges card for recurring)
- [ ] Implement reminder email cron (sends X days before delivery)
- [ ] Add subscription number auto-increment (SUB-0001, SUB-0002...)
- [ ] Handle payment failure notifications (WebSocket to admin)

### Phase 4: Admin — Frontend (Shared Components)
- [ ] Create `useSubscriptions` hook
- [ ] Subscription plan management (Designer's Choice tiers CRUD)
- [ ] Add `availableForSubscription` toggle to product edit form
- [ ] Subscription list component with filters and StandardTable
- [ ] Subscription detail component with delivery timeline
- [ ] Create subscription wizard (multi-step flow: customer → recipient → schedule → billing → products → review)
- [ ] Per-delivery product picker for "customize each delivery" flow
- [ ] Delivery management modals (skip, reschedule, change product)
- [ ] Payment failure alerts and manual retry button
- [ ] Add sidebar nav item "Subscriptions" → `/subscriptions` routes (dashboard full-page)
- [ ] Add "Subscriptions" button to POS screen (next to "Add Order") → loads components in POS left panel
- [ ] Ensure components work in both contexts (full-page route and POS left panel)
- [ ] Add route-to-title mapping in `useDocumentTitle`

### Phase 5: WWW Storefront — Purchase Flow
- [ ] Subscription landing page with hero + step-by-step flow
- [ ] Frequency + duration selector
- [ ] Style selection: Designer's Choice (plan tiers + color palette) vs Pick Your Arrangements (product grid)
- [ ] Per-delivery product customization UI ("customize each delivery" toggle)
- [ ] Recipient details form
- [ ] Order summary with itemized pricing (supports mixed products)
- [ ] Stripe Checkout integration (setup mode for recurring, payment mode for prepaid)
- [ ] Confirmation page with subscription number + portal info
- [ ] Add route-to-title mapping in www `useDocumentTitle`

### Phase 6: WWW Storefront — Recipient Portal
- [ ] Lookup page (`/my-subscription`) — subscription number + postal code (access code fallback)
- [ ] Subscription dashboard (upcoming/past deliveries)
- [ ] Reschedule delivery (date picker with valid windows, max 2 reschedules)
- [ ] Add delivery notes
- [ ] Change arrangement per delivery (Pick Your Own only — product selector)

### Phase 7: Integration & Testing
- [ ] Test full recurring flow: create → order auto-created → card charged → delivered
- [ ] Test full prepaid flow: purchase → deliveries tracked → completed
- [ ] Test variable pricing: Pick Your Own with different products per delivery
- [ ] Test recipient portal: lookup → reschedule → change product → notes
- [ ] Test storefront purchase flow (both recurring and prepaid)
- [ ] Test pause/resume/cancel from admin
- [ ] Test payment failure → admin notification → manual retry
- [ ] Verify dark mode support
- [ ] Check mobile responsiveness (375px+)
- [ ] Test edge cases (see below)

### Phase 8: Documentation
- [ ] Update `/docs/API_Endpoints.md`
- [ ] Update `/docs/Progress_Tracker.markdown`
- [ ] Archive this feature plan
- [ ] Verify no broken references

---

## Edge Cases & Validation

### Input Validation
- Customer must exist before creating subscription
- Recipient address required (delivery service)
- Price per delivery must be > 0
- Prepaid: total deliveries must be >= 1
- Frequency: preferredDayOfWeek required for WEEKLY/BIWEEKLY
- Custom dates must be in the future
- Pick Your Own products must have `availableForSubscription = true`
- If product is deactivated/deleted, existing subscriptions keep the snapshot name but new deliveries need attention

### Business Rules
- Cannot cancel a prepaid subscription that has remaining paid deliveries (only pause, or refund remaining via admin)
- Skipping a prepaid delivery does NOT count toward `completedDeliveries` — it gets rescheduled
- Skipping a recurring delivery skips the charge for that cycle
- Rescheduling limited to 2 times per delivery to prevent abuse
- Delivery dates must be on shop operating days (respect shop schedule)
- Recipient portal changes: only future deliveries (2+ days out), not past or today/tomorrow
- When a product's price changes, existing scheduled deliveries keep their original `priceCents` (snapshot at generation time)
- Pick Your Own with mixed products: prepaid total = sum of all selected products' prices at time of purchase

### Error Scenarios
- Card charge fails → delivery flagged as `paymentFailed`, admin notified via WebSocket, order held
- Recipient enters wrong postal code → "Subscription not found" (no info leak)
- All deliveries completed (prepaid) → subscription auto-marked COMPLETED
- Customer deleted → subscriptions cancelled (cascade consideration)
- Product removed from subscription eligibility → existing deliveries unaffected, new deliveries need default/fallback
- Card expired → charge fails on next delivery, admin notified to get new card from customer

---

## Files to Create/Modify

### New Files
```
/back/src/routes/subscriptions.ts                              (~600 lines)
/back/src/cron/subscriptionDeliveryGenerator.ts                (~150 lines)
/back/src/cron/subscriptionOrderCreator.ts                     (~150 lines)
/back/src/cron/subscriptionReminders.ts                        (~80 lines)
/admin/src/shared/hooks/useSubscriptions.ts                    (~200 lines)
/admin/src/shared/hooks/useSubscriptionPlans.ts                (~100 lines)
/admin/src/app/components/subscriptions/SubscriptionList.tsx    (~200 lines) — shared: dashboard + POS panel
/admin/src/app/components/subscriptions/SubscriptionDetail.tsx  (~400 lines) — shared: dashboard + POS panel
/admin/src/app/components/subscriptions/SubscriptionWizard.tsx  (~500 lines) — shared: multi-step create flow
/admin/src/app/components/subscriptions/SubscriptionPlans.tsx   (~200 lines) — admin plan tier CRUD
/admin/src/app/components/subscriptions/DeliveryModals.tsx      (~200 lines) — skip/reschedule/change product
/admin/src/app/components/subscriptions/steps/               — wizard step components
  CustomerStep.tsx, RecipientStep.tsx, ScheduleStep.tsx,
  BillingStep.tsx, ProductStep.tsx, ReviewStep.tsx
/www/src/pages/Subscriptions.jsx                               (~400 lines)
/www/src/pages/SubscriptionCheckout.jsx                        (~350 lines)
/www/src/pages/MySubscription.jsx                              (~300 lines)
```

### Modified Files
```
/back/src/index.ts                          (add route registration)
/back/prisma/schema.prisma                  (add models + enums + relations + Product flag)
/admin/src/app/App.tsx                      (add routes)
/admin/src/shared/ui/layout/AppLayout.tsx   (add sidebar nav item)
/admin/src/shared/hooks/useDocumentTitle.ts (add route titles)
/admin/src/app/components/products/ProductForm.tsx (add availableForSubscription toggle)
/www/src/App.jsx                            (add routes)
/www/src/hooks/useDocumentTitle.js          (add route titles)
/docs/API_Endpoints.md                      (add endpoint documentation)
/docs/Progress_Tracker.markdown             (mark as in progress / completed)
```

---

## Success Criteria

- [ ] Recurring subscriptions charge stored card directly per delivery
- [ ] Prepaid subscriptions track remaining deliveries accurately
- [ ] Designer's Choice subscriptions work with plan tiers + color palette
- [ ] Pick Your Arrangements subscriptions allow different products per delivery
- [ ] Deliveries auto-generate based on schedule (weekly/biweekly/monthly/custom)
- [ ] Orders auto-created from subscriptions appear in normal prep workflow
- [ ] Admin can create, pause, resume, cancel subscriptions from POS
- [ ] Admin can skip, reschedule, and change product on individual deliveries
- [ ] Customers can purchase subscriptions on www storefront (both styles, both billing types)
- [ ] Recipients can view and manage upcoming deliveries via portal (no login)
- [ ] Recipients can change their arrangement (Pick Your Own) via portal
- [ ] Reminder emails sent before each delivery with portal link
- [ ] Payment failures flagged to admin with retry option
- [ ] Variable pricing works correctly (different products = different prices per delivery)
- [ ] Mobile responsive (375px+)
- [ ] Dark mode supported
- [ ] No console errors
- [ ] Documentation updated

---

## Implementation Notes

**Dependencies:**
- Stripe integration (already exists for payments — extend for direct off-session charges)
- Email system (already exists for reminders — extend templates)
- Order system (already exists — subscriptions create orders)
- Customer system (already exists — subscriptions link to customers)
- Product system (already exists — add subscription eligibility flag)

**Stripe API Resources Used:**
- `stripe.paymentIntents.create` with `off_session: true` (recurring per-delivery charges)
- `stripe.checkout.sessions.create` (storefront purchases — setup mode for recurring, payment mode for prepaid)
- No Stripe Subscriptions API, no webhooks for invoice lifecycle

**Deployment Notes:**
- Migration will run automatically on Render deploy
- Cron jobs: use `node-cron` or Render Cron Jobs
- No new environment variables needed (uses existing STRIPE_SECRET_KEY)

---

## Post-Implementation

After completing implementation:

### Plan-to-Diff Verification (Required)

Before claiming the feature is done, provide:
- **Success Criteria → Evidence mapping**: For each Success Criterion, point to the exact file/component/route where it is satisfied.
- **Tests run**: List the exact commands you ran and the results.
- **Checklist audit**: Note any checklist items you skipped and why.
- **Git push**: Do **NOT** run `git push` automatically — ask Cris for confirmation.

1. **Verify:**
   - All success criteria met
   - Documentation updated
   - No broken references

2. **Update:**
   - Mark feature as completed in Progress_Tracker
   - **REQUIRED**: Move this file to `/docs/FEATURE_PLANS/archive/` after all checklist items are verified.

3. **Deploy:**
   - Commit with message: "feat: subscription system with recurring and prepaid billing"
   - Push to trigger deployment (ask for confirmation first)
   - Verify in staging environment

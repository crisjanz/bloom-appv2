# Checkout Redesign — Step Wizard, Occasions, Card Messages & Reminder Emails

**Status:** 🔜 Ready for Implementation
**Created:** 2026-02-16
**Priority:** High

---

## Overview
Full redesign of the www checkout from collapsible accordion to a step-by-step wizard with progress indicator. Adds occasion selector, card message suggestions, "this order is for me" pickup shortcut, billing address collection, birthday treat opt-in, and an automated reminder email system for birthdays and anniversaries.

This plan combines three initiatives:
1. **Checkout UX overhaul** — wizard flow, progress bar, one step at a time
2. **Occasion & card message suggestions** — occasion dropdown + message ideas from existing `MessageSuggestion` API
3. **Reminder email system** — birthday/anniversary email reminders with cron, templates, and admin settings

---

## 🤖 Implementation Constraints for AI

**CRITICAL - Read Before Implementing:**

> **⚠️ FOR AI ASSISTANTS: You MUST read the required documentation before writing code. Follow existing patterns exactly.**

### Required Reading (IN ORDER)
1. `/CLAUDE.md` ← **READ THIS FIRST** (project conventions, form patterns, toast rules)
2. `/docs/AI_IMPLEMENTATION_GUIDE.md` (all patterns)
3. `/docs/System_Reference.md` (architecture context)
4. `/docs/Mobile_UX_Guidelines.md` (responsive design)

### Pattern Reference Files
- **Current checkout (to be replaced):** `/www/src/pages/Checkout.jsx`
- **Current desktop/mobile forms:** `/www/src/components/Checkout/RecipientStep/`, `/www/src/components/Checkout/PaymentStep/`
- **Checkout constants/state:** `/www/src/components/Checkout/shared/constants.js`
- **Admin message suggestions modal:** `/admin/src/app/components/orders/MessageSuggestions.tsx` — category names, UI pattern
- **Admin settings for suggestions:** `/admin/src/app/components/settings/orders/MessageSuggestionsCard.tsx`
- **Backend messages API:** `/back/src/routes/messages.ts` — `GET /api/messages`
- **Email service:** `/back/src/services/emailService.ts` — SendGrid/nodemailer
- **Email templates:** `/back/src/templates/email/` — existing HTML template pattern
- **Customer routes:** `/back/src/routes/customers.ts` — birthday field handling

### Pre-Implementation Contract (Required — Answer Before Coding)
- **Goals → Changes mapping**: Map each Goal to the specific code changes/files.
- **Files to touch (exact paths)**: List every file you will create/modify.
- **DB/migrations**: Prisma schema changes + migration name.
- **Unknowns / questions**: If anything is ambiguous, ask now — do not start coding.

### Critical Don'ts
❌ Use raw `<input>`, `<select>` — use the www checkout's existing form component patterns
❌ Make occasion or card message required — both are optional
❌ Change how `cardMessage` or `occasion` are saved to Order — backend already handles these fields
❌ Create new API for message suggestions — use existing `GET /api/messages`
❌ Send reminder emails without checking opt-in — ALWAYS check `birthdayOptIn` / `anniversaryOptIn`
❌ Hardcode shop name in emails — pull from `ShopSettings`
❌ Break saved recipient functionality — it must still work in the new wizard
❌ Break 3D Secure redirect recovery — sessionStorage pattern must still work

---

## What Already Exists

### Database
- `Order.occasion` — `String?` field on Order model
- `Order.cardMessage` — `String?` field on Order model
- `MessageSuggestion` model — `{ id, label, message }` where `label` is category (BIRTHDAY, SYMPATHY, etc.)
- `Customer.birthdayMonth/Day/Year` — birthday fields already exist
- `Customer.birthdayOptIn` — opt-in toggle already exists
- `CustomerRecipient` — sender→recipient relationship for saved recipients

### Backend
- `GET /api/messages` — Returns all message suggestions sorted by label
- Customer create/update routes already handle birthday fields
- `emailService.ts` — SendGrid + nodemailer with store branding

### Admin
- `MessageSuggestionsCard.tsx` — CRUD for message suggestions (Settings > Orders)
- Categories in use: SYMPATHY, BIRTHDAY, ANNIVERSARY, THANK_YOU, LOVE, GET_WELL, CONGRATULATIONS, OTHER
- `BirthdayGiftsPage.tsx` — existing birthday marketing page

### www Checkout (current — to be replaced)
- Accordion/collapsible sections (3 sections: Recipient, Customer, Payment)
- `CardElement` recently migrated to `PaymentElement`
- Saved cards, saved recipients, coupon codes all functional
- Mobile and desktop layouts are separate components

---

## Goals

1. **Wizard-style checkout** — one step at a time with progress indicator, identical on mobile and desktop
2. **"This order is for me" shortcut** — skips redundant recipient entry for pickup orders
3. **Occasion selector + message suggestions** — dropdown + filterable pre-written messages from existing API
4. **Billing address collection** — in customer info step
5. **Birthday treat opt-in** — collect birthday in checkout for marketing
6. **"Remember this date" reminder opt-in** — feeds into automated reminder system
7. **Automated reminder emails** — daily cron sends birthday/anniversary reminders on schedule
8. **Admin reminder settings** — enable/disable, configure timing, send test emails

---

## Part 1: Checkout Wizard UX

### Progress Indicator

Horizontal bar at top of checkout, visible at all times:

```
Desktop:
  Delivery ——— Message ——— Your Info ——— Payment
     ●            ○            ○            ○

Mobile (375px):
     ●    ○    ○    ○
       Delivery
```

- Filled/colored dot = completed step
- Current step = highlighted + label shown
- Future steps = dimmed dots
- Mobile: only dots + current step label (horizontal space limited)
- Clicking a completed step navigates back to it

### Pre-Checkout Gate (Not in progress bar)

Before the wizard starts, show a lightweight screen:

```
Have an account? Log in for saved addresses and faster checkout.

[Continue as Guest]    [Log In]
```

- If logged in already, skip this — go straight to step 1
- Login pre-fills steps 1 and 3 with saved data
- Guest continues to step 1 with empty forms
- This is NOT a step in the progress indicator

### Step 1: Delivery

| Element | Details |
|---------|---------|
| "This order is for me" toggle | When ON: hides recipient name/phone/address fields. Recipient auto-fills from step 3 data. |
| Delivery vs Pickup toggle | Pickup hides address fields. Combined with "for me" = minimal step. |
| Saved recipients dropdown | Logged-in users only. Pre-fills name/phone/address. |
| Recipient first name | Required (unless "for me") |
| Recipient last name | Required (unless "for me") |
| Recipient phone | Required (unless "for me") |
| Recipient address | Street, city, province, postal code (unless pickup or "for me" + pickup) |
| Delivery date picker | Required |
| Delivery instructions | Presets dropdown + free text |
| [Continue] button | Validates, advances to step 2 |

**"For me" + pickup behavior:**
- Step 1 shows only: delivery date + delivery instructions
- Recipient data comes from step 3 after completion
- If user goes back to step 1, shows a note: "Recipient: (your info from step 3)"

### Step 2: Card Message

| Element | Details |
|---------|---------|
| Occasion dropdown | Optional. Values: Birthday, Anniversary, Sympathy, Thank You, Love & Romance, Get Well, Congratulations, Other |
| "Message ideas" link | Expands suggestion panel filtered by occasion (or all if none selected) |
| Message suggestions panel | Clickable suggestions from `GET /api/messages`. Clicking fills textarea. |
| Card message textarea | 250 char max. Optional. |
| "Remember this date" checkbox | Logged-in only. Label: "Remind me next year". Saves the delivery date + occasion to feed reminder system. |
| [Continue] button | Advances to step 3 |

**"For me" toggle behavior:**
- If "This order is for me" was checked in step 1, step 2 is **skipped by default**
- Progress bar shows step 2 as skipped/dimmed
- A small link appears: "Want to add a card message?" — clicking it opens step 2
- This handles the edge case of someone picking up an order for themselves that still has a card

### Step 3: Your Info (Billing)

| Element | Details |
|---------|---------|
| First name | Required |
| Last name | Required |
| Email | Required |
| Phone | Required |
| Billing address | Street, city, province, postal code |
| Birthday month/day | Optional. Two dropdowns (month + day). |
| Birthday opt-in checkbox | "Get a birthday treat from us!" |
| Create account checkbox | Guest only. When checked, shows password field. |
| Password field | Guest only, visible when create account is checked. |
| Login link | Guest only: "Already have an account? Log in" |
| [Continue] button | Validates, advances to step 4 |

**If "for me" is ON:** After completing step 3, recipient info in step 1 auto-fills with this data. If user goes back to step 1, they see their own info populated.

### Step 4: Review & Pay

| Element | Details |
|---------|---------|
| **Summary section** | Compact display of steps 1-3 data with "Edit" link per section |
| — Delivery summary | Recipient name, address, date, delivery/pickup |
| — Card message summary | Occasion + message preview (or "No card message") |
| — Your info summary | Name, email, phone |
| **Cart items** | Product name × quantity, price each |
| **Coupon code** | Collapsible "Have a coupon?" link → input + Apply button |
| **Totals** | Subtotal, Delivery fee, Discount, Tax, Total |
| **Payment** | Saved cards selector (logged-in) / PaymentElement (new card) |
| **Save card checkbox** | "Save card for future purchases" (checked by default) |
| **Notes for florist** | Collapsible: "Add notes for the florist" link → textarea. Collapsed by default. |
| **Terms checkbox** | "I agree to Terms & Conditions" |
| **[Place Order] button** | Submits payment |

### Navigation

- **Back button** on steps 2-4 (goes to previous step)
- **Progress bar dots** clickable for completed steps only
- **"Edit" links** on step 4 summary jump to that step
- **Browser back button** goes to previous step (not away from checkout) — use history state
- **Data persists** across steps (React state, not lost on navigation)

### Responsive Design

- **Same wizard flow** on mobile and desktop — no separate mobile/desktop components
- **Single component set** — responsive via Tailwind breakpoints
- Mobile: full-width form fields, stacked layout
- Desktop: max-width container (e.g., `max-w-2xl mx-auto`), optional sidebar with cart summary on larger screens (`lg:` breakpoint)

---

## Part 2: Occasion & Message Suggestions

### Occasion Options

```js
const occasionOptions = [
  { value: "", label: "Select an occasion (optional)" },
  { value: "BIRTHDAY", label: "Birthday" },
  { value: "ANNIVERSARY", label: "Anniversary" },
  { value: "SYMPATHY", label: "Sympathy" },
  { value: "THANK_YOU", label: "Thank You" },
  { value: "LOVE", label: "Love & Romance" },
  { value: "GET_WELL", label: "Get Well" },
  { value: "CONGRATULATIONS", label: "Congratulations" },
  { value: "OTHER", label: "Other" },
];
```

### Message Suggestions Component

- Fetch suggestions once on checkout load via `GET /api/messages`
- Expandable panel below textarea (not a modal — keep user in flow)
- If occasion selected: filter suggestions to matching `label` category
- If no occasion: show all suggestions grouped by category
- Clicking a suggestion fills the `cardMessage` textarea (replaces current text)
- User can still edit after selecting
- Panel collapses after selection
- If no suggestions exist in system, hide the "Message ideas" link entirely

### "Remember This Date" Checkbox

- Only visible for logged-in users
- When checked: saves `{ occasion, deliveryDate, recipientName }` to a new `CustomerReminder` record
- This feeds the reminder email system (Part 3)
- Label: "Remind me about this next year"

---

## Part 3: Reminder Email System

### Database Schema Changes

**Add to Customer model:**
```prisma
  // Anniversary (new)
  anniversaryMonth     Int?
  anniversaryDay       Int?
  anniversaryYear      Int?
  anniversaryOptIn     Boolean  @default(false)
  anniversaryUpdatedAt DateTime?
```

**New model — customer reminders (from checkout "remember this date"):**
```prisma
model CustomerReminder {
  id             String   @id @default(cuid())
  customerId     String
  customer       Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)
  occasion       String   // BIRTHDAY, ANNIVERSARY, etc.
  month          Int      // 1-12
  day            Int      // 1-31
  recipientName  String?  // "Sarah" — who the flowers were for
  note           String?  // Optional personal note for the reminder email
  isActive       Boolean  @default(true)
  createdAt      DateTime @default(now())

  @@index([customerId])
  @@index([month, day])
}
```

**New model — track sent reminders (prevent duplicates):**
```prisma
model ReminderEmail {
  id          String       @id @default(cuid())
  customerId  String
  customer    Customer     @relation(fields: [customerId], references: [id], onDelete: Cascade)
  reminderId  String?      // FK to CustomerReminder (null for birthday/anniversary reminders)
  type        ReminderType // BIRTHDAY, ANNIVERSARY, OCCASION
  year        Int          // Which year's reminder (2026, 2027...)
  daysBefore  Int          // How many days before the date it was sent
  sentAt      DateTime     @default(now())
  emailTo     String

  @@unique([customerId, type, year, daysBefore, reminderId])
  @@index([customerId])
}

enum ReminderType {
  BIRTHDAY
  ANNIVERSARY
  OCCASION
}
```

**New model — admin settings:**
```prisma
model ReminderSettings {
  id                    String  @id @default(cuid())
  birthdayEnabled       Boolean @default(false)
  anniversaryEnabled    Boolean @default(false)
  occasionEnabled       Boolean @default(false)
  reminderDaysBefore    Json    @default("[7, 1]")  // Array e.g. [7, 3, 1]
  birthdaySubject       String  @default("A Special Day is Coming Up!")
  birthdayTemplate      String? // Custom HTML override (null = default)
  anniversarySubject    String  @default("Your Anniversary is Coming Up!")
  anniversaryTemplate   String?
  occasionSubject       String  @default("Don't Forget — A Special Occasion is Coming!")
  occasionTemplate      String?
  updatedAt             DateTime @updatedAt
}
```

**Migration:**
```bash
npx prisma migrate dev --name add_reminder_system_and_customer_reminders
```

### Backend API Routes

**File:** `/back/src/routes/reminders.ts`

**Admin endpoints:**
- `GET /api/reminders/settings` — Get reminder settings
- `PATCH /api/reminders/settings` — Update reminder settings
- `GET /api/reminders/upcoming` — Preview upcoming reminders for next 30 days
- `GET /api/reminders/history` — Paginated sent reminder log
- `POST /api/reminders/send-test` — Send test reminder email to admin

**Customer endpoints (from checkout):**
- `POST /api/reminders` — Create a CustomerReminder (called when "Remember this date" is checked)
- `GET /api/reminders/mine` — List my active reminders (authenticated customer)
- `DELETE /api/reminders/:id` — Delete a reminder (authenticated customer)

**Public endpoint:**
- `GET /api/reminders/unsubscribe?token=...&type=...` — One-click unsubscribe from email link

**Add to customer routes:**
- Update customer create/update to accept `anniversaryMonth`, `anniversaryDay`, `anniversaryOptIn`

### Cron Job

**File:** `/back/src/cron/reminderCron.ts`

**Schedule:** Daily at 8:00 AM `America/Vancouver`

**Logic:**
```
1. Check ReminderSettings — is anything enabled?
2. Get reminder days array (e.g., [7, 1])
3. For each day offset:
   a. Calculate target date (today + offset)
   b. BIRTHDAY: Find customers where birthdayMonth/Day = target, birthdayOptIn = true, has email, no ReminderEmail for this year+offset
   c. ANNIVERSARY: Same for anniversaryMonth/Day + anniversaryOptIn
   d. OCCASION: Find CustomerReminders where month/day = target, isActive = true, customer has email, no ReminderEmail
   e. Send email for each match
   f. Create ReminderEmail record
4. Log summary
```

**Registration in `/back/src/index.ts`:**
```ts
import cron from 'node-cron';
import { processReminders } from './cron/reminderCron';
cron.schedule('0 8 * * *', processReminders, { timezone: 'America/Vancouver' });
```

### Email Templates

**Files:**
- `/back/src/templates/email/birthday-reminder.ts`
- `/back/src/templates/email/anniversary-reminder.ts`
- `/back/src/templates/email/occasion-reminder.ts`

**Template content:**
- Shop logo + name (from ShopSettings)
- Personalized greeting: "Hi {firstName}!"
- Context: "Sarah's birthday is in 7 days!" or "Your anniversary is coming up!"
- CTA button: "Shop Now" → link to www homepage
- Unsubscribe link at bottom (CAN-SPAM compliant)
- Clean design matching existing email templates

### Unsubscribe Flow

1. Each email includes: `https://domain/api/reminders/unsubscribe?token=...&type=birthday`
2. Token = signed HMAC containing `customerId` + `type`
3. Clicking sets opt-in to false (birthday/anniversary) or `isActive = false` (occasion reminder)
4. Shows simple "You've been unsubscribed" page
5. No login required

---

## Part 4: Admin UI for Reminders

### Reminder Settings Card

**Location:** Settings > Notifications (or Marketing section)

**Elements:**
- Birthday reminders toggle ON/OFF
- Anniversary reminders toggle ON/OFF
- Occasion reminders toggle ON/OFF (for "remember this date" checkout reminders)
- Reminder timing: "Send reminders X days before" — editable list (e.g., 7, 1)
- Email subject lines — editable inputs per type
- Send test email button
- Upcoming reminders preview table (next 30 days)

### Customer Form Updates

**File:** `/admin/src/app/components/customers/cards/CustomerInfoCard.tsx`

Add anniversary fields matching existing birthday pattern:
- Anniversary month/day inputs
- Anniversary opt-in toggle

### Reminder History (optional)

Table in admin showing sent reminders:
- Customer name, email, type, date sent
- Uses StandardTable with pagination

---

## Product Page — Card Message Note

**Quick addition to product pages:**

Add a small note near the "Add to Cart" button:

```
"You'll add your personal card message at checkout"
```

Styled as subtle helper text (`text-sm text-body-color`). Resolves customer anxiety about missing card message entry.

---

## Implementation Checklist

### Phase 1: Checkout Wizard Foundation
- [ ] Create `WizardCheckout` component with step state management (currentStep, stepData)
- [ ] Create `ProgressBar` component (dots + labels, responsive)
- [ ] Create `PreCheckoutGate` component (login/guest choice)
- [ ] Set up step navigation (next, back, jump to completed step)
- [ ] Set up browser history state for back button support
- [ ] Wire up existing checkout state (cart, auth, etc.)

### Phase 2: Step 1 — Delivery
- [ ] Create `DeliveryStep` component
- [ ] "This order is for me" toggle with conditional field visibility
- [ ] Delivery vs Pickup toggle
- [ ] Saved recipients dropdown (logged-in)
- [ ] Recipient name, phone, address fields
- [ ] Delivery date picker
- [ ] Delivery instructions (presets + free text)
- [ ] Validation before advancing

### Phase 3: Step 2 — Card Message
- [ ] Create `CardMessageStep` component
- [ ] Occasion dropdown
- [ ] Fetch message suggestions via `GET /api/messages` on checkout load
- [ ] Create `MessageSuggestions` expandable panel (filter by occasion)
- [ ] Card message textarea (250 char)
- [ ] "Remember this date" checkbox (logged-in only)
- [ ] Skip logic when "for me" is toggled (with "Add a card message" link)

### Phase 4: Step 3 — Your Info
- [ ] Create `YourInfoStep` component
- [ ] Name, email, phone fields
- [ ] Billing address fields (street, city, province, postal)
- [ ] Birthday month/day dropdowns + "Get a birthday treat" checkbox
- [ ] Create account checkbox + password field (guest)
- [ ] Login link (guest)
- [ ] Auto-fill recipient in step 1 when "for me" is on

### Phase 5: Step 4 — Review & Pay
- [ ] Create `ReviewPayStep` component
- [ ] Compact summary of steps 1-3 with "Edit" links
- [ ] Cart items display
- [ ] Collapsible coupon code input
- [ ] Totals breakdown (subtotal, delivery, discount, tax, total)
- [ ] Saved cards / PaymentElement
- [ ] "Save card" checkbox
- [ ] Collapsible "Add notes for the florist" textarea
- [ ] Terms checkbox
- [ ] Place Order button
- [ ] Wire up existing payment flow (createCheckoutPaymentIntent, confirmPayment, 3D Secure recovery)

### Phase 6: Integration & Cleanup
- [ ] Replace old accordion checkout with new wizard
- [ ] Ensure saved recipients still work
- [ ] Ensure coupon codes still work
- [ ] Ensure 3D Secure redirect recovery still works
- [ ] Ensure sessionStorage pending checkout still works
- [ ] Test guest flow end-to-end
- [ ] Test logged-in flow end-to-end
- [ ] Test "for me" + pickup shortcut
- [ ] Test "for me" + delivery
- [ ] Remove old accordion components (DesktopRecipientForm, MobileRecipientForm, etc.)
- [ ] Add "You'll add your card message at checkout" note to product pages

### Phase 7: Database — Reminder System
- [ ] Add anniversary fields to Customer model
- [ ] Create `CustomerReminder` model
- [ ] Create `ReminderEmail` model
- [ ] Create `ReminderSettings` model
- [ ] Add `ReminderType` enum
- [ ] Run migration: `npx prisma migrate dev --name add_reminder_system_and_customer_reminders`

### Phase 8: Backend — Reminder APIs
- [ ] Create `/back/src/routes/reminders.ts`
- [ ] `GET /api/reminders/settings` + `PATCH`
- [ ] `GET /api/reminders/upcoming`
- [ ] `GET /api/reminders/history`
- [ ] `POST /api/reminders/send-test`
- [ ] `POST /api/reminders` (create from checkout)
- [ ] `GET /api/reminders/mine` (customer's reminders)
- [ ] `DELETE /api/reminders/:id`
- [ ] `GET /api/reminders/unsubscribe?token=...&type=...`
- [ ] Register route in `/back/src/index.ts`
- [ ] Update customer create/update routes for anniversary fields

### Phase 9: Reminder Email Templates & Cron
- [ ] Install `node-cron` if not present
- [ ] Create `/back/src/cron/reminderCron.ts`
- [ ] Create `/back/src/templates/email/birthday-reminder.ts`
- [ ] Create `/back/src/templates/email/anniversary-reminder.ts`
- [ ] Create `/back/src/templates/email/occasion-reminder.ts`
- [ ] Register cron in `/back/src/index.ts`
- [ ] Test with customer whose birthday is tomorrow

### Phase 10: Admin UI — Reminders
- [ ] Create `ReminderSettingsCard.tsx` in settings
- [ ] Add anniversary fields to `CustomerInfoCard.tsx`
- [ ] Reminder history table (optional)

### Phase 11: www — Customer Profile Reminders
- [ ] Add "My Reminders" section to customer profile
- [ ] List active reminders with delete option
- [ ] Birthday/anniversary inputs if not already in profile

### Phase 12: Testing & Docs
- [ ] Full checkout flow — guest, card payment
- [ ] Full checkout flow — logged in, saved card
- [ ] Pickup + "for me" shortcut
- [ ] Delivery + occasion + card message
- [ ] Message suggestions filtering
- [ ] "Remember this date" creates CustomerReminder
- [ ] Reminder cron sends emails correctly
- [ ] No duplicate reminder emails
- [ ] Unsubscribe works
- [ ] Mobile responsive (375px+)
- [ ] Dark mode (if www supports it)
- [ ] No console errors
- [ ] Update `/docs/API_Endpoints.md`
- [ ] Update `/docs/Progress_Tracker.markdown`
- [ ] Archive this plan to `/docs/FEATURE_PLANS/archive/`

---

## Files to Create/Modify

### New Files
```
# Checkout wizard
www/src/components/Checkout/WizardCheckout.jsx           (main wizard container + state)
www/src/components/Checkout/ProgressBar.jsx              (step indicator)
www/src/components/Checkout/PreCheckoutGate.jsx          (login/guest gate)
www/src/components/Checkout/steps/DeliveryStep.jsx       (step 1)
www/src/components/Checkout/steps/CardMessageStep.jsx    (step 2)
www/src/components/Checkout/steps/YourInfoStep.jsx       (step 3)
www/src/components/Checkout/steps/ReviewPayStep.jsx      (step 4)
www/src/components/Checkout/steps/MessageSuggestions.jsx  (expandable suggestions panel)
www/src/components/Checkout/steps/OrderSummary.jsx       (reusable summary for step 4)

# Reminder system
back/src/routes/reminders.ts
back/src/cron/reminderCron.ts
back/src/templates/email/birthday-reminder.ts
back/src/templates/email/anniversary-reminder.ts
back/src/templates/email/occasion-reminder.ts
admin/src/app/components/settings/notifications/ReminderSettingsCard.tsx
```

### Modified Files
```
# Checkout
www/src/pages/Checkout.jsx                               (replace accordion with WizardCheckout)
www/src/components/Checkout/shared/constants.js           (occasion options, updated initial state)
www/src/services/checkoutService.js                      (add createReminder call)

# Product page
www/src/components/ProductDetail/ or similar              (add card message note)

# Backend
back/prisma/schema.prisma                                (CustomerReminder, ReminderEmail, ReminderSettings, anniversary fields)
back/src/index.ts                                        (register reminders route + cron)
back/src/routes/customers.ts                             (anniversary fields in create/update)

# Admin
admin/src/app/components/customers/cards/CustomerInfoCard.tsx  (anniversary fields)
admin/src/app/pages/settings/notifications.tsx            (add ReminderSettingsCard)
```

### Files to Remove (after wizard is complete)
```
www/src/components/Checkout/RecipientStep/DesktopRecipientForm.jsx
www/src/components/Checkout/RecipientStep/MobileRecipientForm.jsx
www/src/components/Checkout/PaymentStep/DesktopPaymentForm.jsx
www/src/components/Checkout/PaymentStep/MobilePaymentForm.jsx
www/src/components/Checkout/shared/AccordionSections.jsx
www/src/components/Checkout/shared/MobileCheckout.jsx
www/src/components/Checkout/shared/SidebarSummary.jsx
www/src/components/Checkout/CustomerStep/ (if exists)
```

---

## Edge Cases & Validation

### "For Me" Toggle
- Toggling ON after entering recipient data: store entered data, show "for me" state
- Toggling OFF: restore previously entered recipient data (if any)
- "For me" + delivery: still needs delivery address (could be different from billing)
- "For me" + pickup: minimal step — just date + instructions

### Card Message Step Skip
- Skipped step still sends `occasion: null, cardMessage: null` to order
- If user clicks "Add a card message" after skipping, step 2 becomes active and progress bar updates

### Reminder Date Calculation
- "Remember this date" uses the delivery date's month/day (not order date)
- Year rollover: delivery Dec 28 → reminder next year Dec 21 (7 days before)
- Multiple reminders for same customer + same date: allowed (different occasions/recipients)

### Reminder Email Edge Cases
- Customer has no email → skip silently
- Customer opted out → skip
- SendGrid/SMTP error → log, continue to next customer, don't crash cron
- Customer deleted between check and send → handle gracefully

### Checkout State Persistence
- All step data lives in React state (same as current)
- 3D Secure redirect: save all step data to sessionStorage (extend current pattern)
- Browser refresh: data lost (acceptable — same as current)

---

## Success Criteria

### Checkout
- [ ] Step wizard works with progress indicator (desktop + mobile)
- [ ] Pre-checkout gate shows for guests, skips for logged-in
- [ ] "For me" toggle skips recipient fields and card message step
- [ ] Occasion dropdown works, filters message suggestions
- [ ] Message suggestions fill textarea on click
- [ ] Billing address collected in step 3
- [ ] Birthday opt-in collected in step 3
- [ ] Step 4 shows editable summary with Edit links
- [ ] Collapsible coupon and florist notes in step 4
- [ ] Saved cards and PaymentElement work
- [ ] "Save card" checkbox works
- [ ] Guest checkout works end-to-end
- [ ] Logged-in checkout works end-to-end
- [ ] 3D Secure redirect recovery works
- [ ] Product page shows "card message at checkout" note
- [ ] Mobile responsive (375px+)

### Reminders
- [ ] "Remember this date" creates CustomerReminder record
- [ ] Birthday reminder emails send on schedule
- [ ] Anniversary reminder emails send on schedule
- [ ] Occasion reminder emails send on schedule
- [ ] No duplicate emails (ReminderEmail tracking)
- [ ] Unsubscribe link works (one-click, no login)
- [ ] Admin can enable/disable each reminder type
- [ ] Admin can configure days-before timing
- [ ] Admin can send test emails
- [ ] Anniversary fields in admin customer form
- [ ] Cron handles errors gracefully
- [ ] CAN-SPAM compliant (unsubscribe + physical address)
- [ ] No console errors

---

## Implementation Notes

**Dependencies:**
- `node-cron` (install in back/ if not present)
- No new packages needed for www/ checkout wizard

**Deployment Notes:**
- Migration runs automatically on Render deploy
- Cron job starts with server — no separate process needed
- No environment variable changes needed (uses existing email config)

**Recommended implementation order:**
1. Phases 1-6 (checkout wizard) — this is the largest change, do it first
2. Phases 7-9 (reminder backend) — can be done independently
3. Phase 10-11 (admin + profile UI for reminders)
4. Phase 12 (testing + docs)

# Reminder Domain Unification

**Status:** 🔜 Ready for Implementation
**Created:** 2026-02-20
**Priority:** High

---

## Overview

The current reminder system stores state in three places: `Customer` birthday/anniversary fields, `CustomerReminder` (occasions), and `ReminderEmail` (send log). This plan consolidates everything into a unified `Reminder` + `ReminderDispatch` model, refactors the cron to use the new tables, and adds a minimal customer-facing opt-out page accessible via unsubscribe link (extending the existing token system in `reminderUtils.ts`).

**What stays the same:**
- Admin reminder pages — no new admin UI (existing pages continue working against new tables)
- `ReminderSettings` model — unchanged, cron still reads from it
- Existing unsubscribe token system (`back/src/utils/reminderUtils.ts`) — extended, not replaced

**What's new:**
- Unified `Reminder` table replacing Customer birthday/anniversary fields + `CustomerReminder`
- `ReminderDispatch` replacing `ReminderEmail` with better error tracking
- Customer-facing opt-out page (reminder toggles only — no newsletter/promo/SMS)
- Guest checkout reminder capture (links to customer created during checkout)

---

## 🤖 Implementation Constraints for AI

**CRITICAL - Read Before Implementing:**

> **⚠️ FOR AI ASSISTANTS: You MUST read the required documentation before writing code. Follow existing patterns exactly.**

### Required Reading (IN ORDER)
1. `/docs/AI_IMPLEMENTATION_GUIDE.md`
2. `/docs/System_Reference.md`
3. `/docs/API_Endpoints.md`
4. `/CLAUDE.md`

### Pattern Reference Files
**Study these files for implementation patterns:**
- **Existing reminder routes:** `/back/src/routes/reminders.ts` (admin CRUD, unsubscribe handler, settings)
- **Existing reminder cron:** `/back/src/cron/reminderCron.ts` (send logic, dedupe, template rendering)
- **Existing unsubscribe tokens:** `/back/src/utils/reminderUtils.ts` (`buildUnsubscribeUrl`, `generateReminderUnsubscribeToken`)
- **Website page pattern:** `/www/src/pages/Profile.jsx`
- **Website route pattern:** `/www/src/routes/root.jsx`

### Pre-Implementation Quiz (Answer Before Coding)

**Question 1: API Client**
- What hook do you use for all frontend API calls?
- Answer: `useApiClient` (not `fetch`)

**Question 2: Price Storage**
- How are monetary values stored in the database?
- Answer: As `Int` in `cents`

**Question 3: Validation**
- What library validates backend requests?
- Answer: `Zod` with `.parse()`

### Pre-Implementation Contract (Required — Answer Before Coding)

- **Goals → Changes mapping**
  - Goal 1 (unified model): New `Reminder` + `ReminderDispatch` tables, backfill from legacy, cron cutover.
  - Goal 2 (customer opt-out): Extend existing unsubscribe flow → render a preferences page instead of instant-unsubscribe. Three reminder toggles only.
  - Goal 3 (guest capture): Checkout creates `Reminder` linked to the customer record created in the same checkout transaction.
- **Files to touch (exact paths)**: Listed in "Files to Create/Modify".
- **Backend surface area**: Modify `/back/src/routes/reminders.ts` (existing) + add preference endpoints; register in `/back/src/index.ts`.
- **DB/migrations**: Prisma schema changes in `/back/prisma/schema.prisma`; migration `unify_reminder_domain`.
- **UI standards confirmation**: Use shared form components and `value={x || ''}` on preference page.

### Critical Don'ts
❌ Use `fetch()` directly in www React code
❌ Create new admin reminder pages — existing pages stay as-is
❌ Add newsletter/promo/SMS preference fields — out of scope
❌ Replace the existing unsubscribe token system — extend it
❌ Ship without backfill verification
❌ Create a separate "email match job" for guest reminders — link during checkout

### Frontend/UI Critical Don'ts (Project Standards)
❌ Custom overlay modals in www
❌ Null/undefined controlled values (`value={x || ''}` required)

---

## Goals

1. Consolidate all reminder definitions into one `Reminder` table.
2. Consolidate all send history into one `ReminderDispatch` table.
3. Provide a customer-facing opt-out page for reminder categories (birthday/anniversary/occasion).
4. Support guest checkout reminder capture linked to the customer created during checkout.

---

## Architecture & Endpoints

### Backend API Routes

**File:** `/back/src/routes/reminders.ts` (extend existing)

**Existing endpoints (keep working, read from new tables):**
- `GET /api/reminders/settings` — reminder settings
- `PUT /api/reminders/settings` — update settings
- `GET /api/reminders/upcoming` — upcoming reminders
- `GET /api/reminders/history` — send history
- `POST /api/reminders/test-send` — test email
- `POST /api/reminders` — create reminder
- `DELETE /api/reminders/:id` — delete reminder

**Modify:**
- `GET /api/reminders/unsubscribe?token=...` — currently instant-unsubscribes → change to render opt-out preferences page

**New endpoints:**
- `GET /api/reminders/preferences?token=...` — get current reminder opt-out preferences for token's customer
- `PATCH /api/reminders/preferences` — update reminder opt-outs (token or auth)
- `POST /api/reminders/checkout` — create reminder from checkout (receives `customerId` + date)

### Database Schema

**New models:**

```prisma
enum ReminderKind {
  BIRTHDAY
  ANNIVERSARY
  OCCASION
}

enum ReminderDispatchStatus {
  SENT
  FAILED
  SKIPPED
}

model Reminder {
  id              String        @id @default(cuid())
  customerId      String?
  customer        Customer?     @relation(fields: [customerId], references: [id], onDelete: SetNull)
  contactEmail    String?       // Fallback for guests (before customer record exists)
  kind            ReminderKind
  occasion        String?       // Free text for OCCASION kind (e.g., "Mother's Day")
  month           Int
  day             Int
  recipientName   String?
  note            String?
  source          String?       // CHECKOUT, PROFILE, ADMIN, LEGACY_MIGRATION
  isActive        Boolean       @default(true)
  lastTriggeredAt DateTime?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  dispatches      ReminderDispatch[]

  @@index([customerId, isActive])
  @@index([kind, month, day, isActive])
  @@index([contactEmail])
}

model ReminderDispatch {
  id               String                @id @default(cuid())
  reminderId       String
  reminder         Reminder              @relation(fields: [reminderId], references: [id], onDelete: Cascade)
  customerId       String?
  customer         Customer?             @relation(fields: [customerId], references: [id], onDelete: SetNull)
  status           ReminderDispatchStatus
  scheduledForDate DateTime
  sentAt           DateTime?
  emailTo          String?
  subject          String?
  errorMessage     String?
  dedupeKey        String                @unique
  createdAt        DateTime              @default(now())

  @@index([reminderId, scheduledForDate])
  @@index([customerId, createdAt])
}
```

**Models kept unchanged:**
- `ReminderSettings` — cron still reads enabled flags, daysBefore, subjects/templates from here

**Legacy deprecation (post-cutover, after verification):**
- Remove `Customer.birthdayOptIn`, `birthdayMonth`, `birthdayDay`, `anniversaryOptIn`, `anniversaryMonth`, `anniversaryDay`, etc.
- Remove `CustomerReminder` and `ReminderEmail` models

**Migration command:**
```bash
npx prisma migrate dev --name unify_reminder_domain
```

---

## UI Requirements

### Customer Opt-Out Page

**File:** `/www/src/pages/ReminderPreferences.jsx`

**Access method:** Unsubscribe link in reminder emails → `GET /api/reminders/unsubscribe?token=...` → redirects to `/reminder-preferences?token=...`

**Page content (minimal):**
- Heading: "Reminder Preferences"
- Three toggles:
  - Birthday reminders (on/off)
  - Anniversary reminders (on/off)
  - Occasion reminders (on/off)
- "Unsubscribe from all reminders" link/button
- Save button
- No login required — token-based access

**How opt-outs work:**
- Toggling off a category sets `isActive = false` on all matching `Reminder` rows for that customer
- Toggling on re-activates them (`isActive = true`)
- "Unsubscribe all" sets all three off
- Cron already skips `isActive: false` reminders — no separate preference table needed

**Note:** No `CommunicationPreference` model. Opt-outs are stored directly on `Reminder.isActive`. This avoids a redundant table — if we add newsletter/notification preferences later, we can introduce a preferences model then.

### Guest Checkout Reminder Capture

**Existing flow in `WizardCheckout.jsx`:**
1. User checks "Remind me next year" on card message step (currently gated behind `isAuthenticated`)
2. After successful checkout, `maybeCreateReminder()` is called

**Changes:**
- Remove `isAuthenticated` gate on "Remind me next year" checkbox in `CardMessageStep.jsx`
- Remove auth guard in `maybeCreateReminder()` in `WizardCheckout.jsx`
- `POST /api/reminders/checkout` receives `customerId` (the customer record is always created during checkout — either existing logged-in customer or new guest customer created by `save-draft`)
- No "email match job" needed — customer always exists by the time reminder is created

### Mobile Responsiveness
- Reminder preferences page supports mobile view (375px+)

---

## Implementation Checklist

### Phase 1: Schema + Migration + Backfill
- [ ] Add `Reminder`, `ReminderDispatch` models + enums to Prisma schema
- [ ] Run migration: `npx prisma migrate dev --name unify_reminder_domain`
- [ ] Create backfill script (`/back/src/scripts/migrations/backfill-reminders.ts`):
  - `Customer` birthday fields (where `birthdayOptIn: true`) → `Reminder` rows with `kind: BIRTHDAY`
  - `Customer` anniversary fields (where `anniversaryOptIn: true`) → `Reminder` rows with `kind: ANNIVERSARY`
  - `CustomerReminder` rows → `Reminder` rows with `kind: OCCASION`
  - `ReminderEmail` rows → `ReminderDispatch` rows (best-effort mapping)
- [ ] Verify backfill: count comparisons, spot checks

### Phase 2: Cron Cutover + Existing Endpoints
- [ ] Refactor `reminderCron.ts` to query `Reminder` table instead of `Customer` birthday/anniversary fields and `CustomerReminder`
- [ ] Update `reminderAlreadySent()` to check `ReminderDispatch` instead of `ReminderEmail`
- [ ] Update `recordReminderEmail()` to write `ReminderDispatch` instead of `ReminderEmail`
- [ ] Update existing admin endpoints in `reminders.ts` to read/write new tables:
  - `GET /upcoming` — query `Reminder` instead of Customer + CustomerReminder
  - `GET /history` — query `ReminderDispatch` instead of `ReminderEmail`
  - `POST /` (create) — create `Reminder` instead of `CustomerReminder`
  - `DELETE /:id` — delete from `Reminder` instead of `CustomerReminder`
- [ ] Verify existing admin reminder pages still work

### Phase 3: Opt-Out Page + Unsubscribe Flow
- [ ] Modify `GET /api/reminders/unsubscribe?token=...` to redirect to `/reminder-preferences?token=...` instead of instant-unsubscribe
- [ ] Add `GET /api/reminders/preferences?token=...` — returns `isActive` status grouped by kind for the token's customer
- [ ] Add `PATCH /api/reminders/preferences` — toggle `isActive` on/off for all reminders of a given kind for the customer
- [ ] Create `/www/src/pages/ReminderPreferences.jsx` — three toggles + unsubscribe all + save
- [ ] Add route in `/www/src/routes/root.jsx`
- [ ] Add page title in `www/src/hooks/useDocumentTitle.js`

### Phase 4: Guest Checkout Capture
- [ ] Remove `isAuthenticated` gate on "Remind me next year" in `CardMessageStep.jsx`
- [ ] Remove auth guard in `maybeCreateReminder()` in `WizardCheckout.jsx`
- [ ] Add `POST /api/reminders/checkout` endpoint — creates `Reminder` with `customerId` from checkout
- [ ] Verify: guest checkout → reminder created → appears in admin upcoming list

### Phase 5: Cleanup + Documentation
- [ ] Remove legacy reads/writes from cron and routes (confirm no code still touches old tables)
- [ ] Remove `Customer` birthday/anniversary fields, `CustomerReminder`, `ReminderEmail` models (separate migration after verification window)
- [ ] Update `/docs/API_Endpoints.md`
- [ ] Update `/docs/Progress_Tracker.markdown`

---

## Data Flow

**Reminder Creation (Checkout):**
```
Checkout submit → save-draft creates/finds Customer
  → maybeCreateReminder() → POST /api/reminders/checkout
  → Create Reminder row with customerId + kind + month/day
```

**Reminder Send (Cron — unchanged logic, new tables):**
```
Daily cron (8AM Pacific) → load ReminderSettings
  → for each daysBefore value, calculate target month/day
  → query Reminder where kind + month/day + isActive
  → check ReminderDispatch for dedupe (customerId + reminderId + year + daysBefore)
  → render email from ReminderSettings templates
  → send via emailService
  → write ReminderDispatch (SENT/FAILED/SKIPPED)
```

**Opt-Out Flow:**
```
Email unsubscribe link → GET /api/reminders/unsubscribe?token=...
  → validate token (existing reminderUtils.ts)
  → redirect to /reminder-preferences?token=...
  → page loads GET /api/reminders/preferences?token=...
  → customer toggles categories → PATCH /api/reminders/preferences
  → sets isActive=false on matching Reminder rows
```

---

## Edge Cases & Validation

### Input Validation
- Reminder month/day must be valid (1-12, 1-31, validated per month)
- Checkout endpoint requires `customerId` + `month` + `day` + `kind`
- Occasion reminders require non-empty `occasion` string

### Business Rules
- `isActive: false` reminders are never sent (cron skips them)
- Opt-out toggles set `isActive` on all reminders of that kind for the customer
- Dedupe key: `${reminderId}-${year}-${daysBefore}` (prevents duplicate sends)
- `ReminderSettings` global toggles still control whether each type runs at all

### Migration Edge Cases
- Leap day birthdays (Feb 29): cron already handles this via `getTargetDate()` — keep existing behavior
- Multiple reminders on same date: allowed (different occasions for different recipients)
- Customers with `birthdayOptIn: true` but null month/day: skip during backfill, log warning

### Error Scenarios
- Send failure writes `ReminderDispatch` with `FAILED` + `errorMessage`
- Invalid/expired unsubscribe token: show error page (existing behavior)
- Backfill script is idempotent — can re-run safely (check for existing Reminder with same customerId + kind + month + day)

---

## Files to Create/Modify

### New Files
```
/back/prisma/migrations/*_unify_reminder_domain/migration.sql
/back/src/scripts/migrations/backfill-reminders.ts
/www/src/pages/ReminderPreferences.jsx
```

### Modified Files
```
/back/prisma/schema.prisma                    (add Reminder + ReminderDispatch models + enums)
/back/src/routes/reminders.ts                 (update CRUD to new tables, add preferences + checkout endpoints)
/back/src/cron/reminderCron.ts                (query new tables instead of legacy)
/back/src/utils/reminderUtils.ts              (extend unsubscribe token to support preferences redirect)
/back/src/index.ts                            (no new route file — endpoints stay in reminders.ts)
/www/src/components/Checkout/steps/CardMessageStep.jsx  (remove isAuthenticated gate)
/www/src/components/Checkout/WizardCheckout.jsx         (remove auth guard on maybeCreateReminder)
/www/src/routes/root.jsx                      (add /reminder-preferences route)
/www/src/hooks/useDocumentTitle.js            (add page title)
/docs/API_Endpoints.md
/docs/Progress_Tracker.markdown
```

---

## Success Criteria

- [ ] All reminder definitions stored in unified `Reminder` table
- [ ] All send history stored in `ReminderDispatch` table
- [ ] Cron sends from new tables, dedupe works correctly
- [ ] Existing admin reminder pages work unchanged
- [ ] Customer can toggle reminder categories on/off via unsubscribe link
- [ ] Guest checkout can create reminders (linked to customer created during checkout)
- [ ] No duplicate sends
- [ ] Legacy tables removable after verification

---

## Post-Implementation

### Plan-to-Diff Verification (Required)

Before claiming the feature is done, provide:
- **Success Criteria → Evidence mapping**: For each criterion, point to the exact file/route where it is satisfied.
- **Backfill verification**: Row count comparisons (legacy vs new tables).
- **Checklist audit**: Note any skipped items and why.
- **Git push**: Do **NOT** push automatically — ask Cris for confirmation.

After verification:
1. Mark feature as completed in `Progress_Tracker.markdown`
2. Move this file to `/docs/FEATURE_PLANS/archive/`

---

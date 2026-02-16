# Customer Reminder Email System (Birthday & Anniversary)

**Status:** 🔜 Ready for Implementation
**Created:** 2026-02-16
**Priority:** Medium

---

## Overview
Send automated reminder emails to customers before their stored birthdays and anniversaries, prompting them to order flowers. Customers already have `birthdayMonth`, `birthdayDay`, and `birthdayOptIn` fields in the database. This plan adds anniversary date fields, a daily cron job to find upcoming dates, email templates, opt-in/opt-out management, and admin settings to configure the reminder schedule.

---

## 🤖 Implementation Constraints for AI

**CRITICAL - Read Before Implementing:**

> **⚠️ FOR AI ASSISTANTS: You MUST read the required documentation before writing code. Follow existing patterns exactly.**

### Required Reading (IN ORDER)
1. `/CLAUDE.md` ← **READ THIS FIRST** (project conventions)
2. `/docs/AI_IMPLEMENTATION_GUIDE.md` (all patterns)
3. `/docs/System_Reference.md` (architecture context)

### Pattern Reference Files
- **Email service:** `/back/src/services/emailService.ts` — SendGrid/nodemailer setup, existing email sending pattern
- **Email templates:** `/back/src/templates/email/` — existing HTML email template pattern
- **Email settings:** `/back/src/services/emailSettingsService.ts` — store email config
- **Notification service:** `/back/src/services/notificationService.ts` — existing notification patterns
- **Customer routes:** `/back/src/routes/customers.ts` — birthday field handling (lines 210-385)
- **Customer schema:** `/back/prisma/schema.prisma` — Customer model with birthday fields
- **Birthday gifts page:** `/admin/src/app/pages/marketing/BirthdayGiftsPage.tsx` — existing birthday UI

### Pre-Implementation Contract (Required — Answer Before Coding)
- **Goals → Changes mapping**: Map each Goal to the specific code changes/files.
- **Files to touch (exact paths)**: List every file you will create/modify.
- **DB/migrations**: Prisma schema changes + migration name you will run.
- **Unknowns / questions**: If anything is ambiguous, ask now — do not start coding.

### Critical Don'ts
❌ Send emails without checking opt-in status — ALWAYS check `birthdayOptIn` / `anniversaryOptIn`
❌ Send duplicate reminders — track sent reminders in database
❌ Hardcode shop name — pull from `ShopSettings`
❌ Use `fetch()` directly in backend — use existing `emailService`
❌ Run the cron inside the Express process without graceful shutdown handling
❌ Send reminders for past dates that were missed — only send for upcoming dates

---

## What Already Exists

### Database (Customer model)
```prisma
birthdayMonth       Int?
birthdayDay         Int?
birthdayYear        Int?       // optional, not needed for reminders
birthdayOptIn       Boolean    @default(false)
birthdayUpdatedAt   DateTime?
```

### Backend
- `emailService.ts` — SendGrid + nodemailer with store branding
- `emailSettingsService.ts` — Reads store email settings (provider, from address, etc.)
- Birthday fields already handled in customer create/update routes

### Admin
- `BirthdayGiftsPage.tsx` — Marketing page for birthday-related features
- Customer form already has birthday opt-in toggle and date fields

### www (Customer Website)
- Customer profile may need birthday/anniversary input (check if exists)

---

## Goals

1. **Add anniversary date fields** to Customer model (`anniversaryMonth`, `anniversaryDay`, `anniversaryOptIn`)
2. **Daily cron job** that finds customers with upcoming birthdays/anniversaries and sends reminder emails
3. **Configurable reminder schedule** — admin sets how many days before the date to send (e.g., 7 days before, 3 days before)
4. **Email templates** — branded reminder emails with shop name, occasion, and a link to shop
5. **Sent tracking** — prevent duplicate sends, log all reminder emails
6. **Admin settings UI** — enable/disable reminders, set timing, preview/edit email template
7. **Customer opt-in/opt-out** — respect existing `birthdayOptIn`, add `anniversaryOptIn`, allow unsubscribe from email

---

## Architecture & Endpoints

### Database Schema Changes

**Add to Customer model:**
```prisma
model Customer {
  // ... existing fields ...

  // Anniversary (new)
  anniversaryMonth     Int?
  anniversaryDay       Int?
  anniversaryYear      Int?
  anniversaryOptIn     Boolean  @default(false)
  anniversaryUpdatedAt DateTime?
}
```

**New model — track sent reminders:**
```prisma
model ReminderEmail {
  id          String   @id @default(cuid())
  customerId  String
  customer    Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)
  type        ReminderType  // BIRTHDAY or ANNIVERSARY
  year        Int           // Which year's reminder (2026, 2027...)
  daysBefore  Int           // How many days before the date it was sent
  sentAt      DateTime @default(now())
  emailTo     String        // Email address used

  @@unique([customerId, type, year, daysBefore])  // Prevent duplicates
  @@index([customerId])
}

enum ReminderType {
  BIRTHDAY
  ANNIVERSARY
}
```

**Add to ShopSettings or create ReminderSettings:**
```prisma
model ReminderSettings {
  id                    String  @id @default(cuid())
  birthdayEnabled       Boolean @default(false)
  anniversaryEnabled    Boolean @default(false)
  reminderDaysBefore    Json    @default("[7, 1]")  // Array of days, e.g. [7, 3, 1]
  birthdaySubject       String  @default("A Special Day is Coming Up!")
  birthdayTemplate      String? // Custom HTML override (null = use default)
  anniversarySubject    String  @default("Your Anniversary is Coming Up!")
  anniversaryTemplate   String? // Custom HTML override (null = use default)
  updatedAt             DateTime @updatedAt
}
```

**Migration:**
```bash
npx prisma migrate dev --name add_reminder_system
```

### Backend API Routes

**File:** `/back/src/routes/reminders.ts`

**Endpoints:**
- `GET /api/reminders/settings` — Get reminder settings (admin)
- `PATCH /api/reminders/settings` — Update reminder settings (admin)
- `GET /api/reminders/upcoming` — Preview upcoming reminders for next 30 days (admin)
- `GET /api/reminders/history` — List sent reminder emails with pagination (admin)
- `POST /api/reminders/send-test` — Send a test reminder email to admin (admin)

**File:** `/back/src/routes/customers.ts` (modify)
- Update create/update handlers to accept `anniversaryMonth`, `anniversaryDay`, `anniversaryOptIn`

**Unsubscribe endpoint (public, no auth):**
- `GET /api/reminders/unsubscribe?token=...&type=birthday` — One-click unsubscribe from email link

### Cron Job

**File:** `/back/src/cron/reminderCron.ts`

**Schedule:** Runs daily at 8:00 AM `America/Vancouver` (configurable)

**Logic:**
```
1. Check if reminders are enabled (ReminderSettings)
2. Get reminder days array (e.g., [7, 1])
3. For each reminder day offset:
   a. Calculate target date (today + offset days)
   b. Find customers where:
      - birthdayMonth = target month AND birthdayDay = target day
      - birthdayOptIn = true
      - email is not null
      - No ReminderEmail record for this customer + BIRTHDAY + current year + daysBefore
   c. Send birthday reminder email to each
   d. Create ReminderEmail record
4. Repeat for anniversaries
5. Log summary (X birthday, Y anniversary emails sent)
```

**Cron registration:** Add to `/back/src/index.ts` using `node-cron` (already available or install):
```ts
import cron from 'node-cron';
import { processReminders } from './cron/reminderCron';

// Daily at 8am Pacific
cron.schedule('0 8 * * *', processReminders, { timezone: 'America/Vancouver' });
```

### Email Templates

**File:** `/back/src/templates/email/birthday-reminder.ts`
**File:** `/back/src/templates/email/anniversary-reminder.ts`

**Template content:**
- Shop logo + name (from ShopSettings)
- Personalized greeting: "Hi {firstName}!"
- Occasion message: "{recipientName}'s birthday is in {days} days!" or "Your anniversary is coming up in {days} days!"
- CTA button: "Shop Now" → link to www homepage or occasion category
- Unsubscribe link at bottom
- Simple, clean design matching existing email templates

### Unsubscribe Flow

**How it works:**
1. Each reminder email includes an unsubscribe link: `https://hellobloom.ca/api/reminders/unsubscribe?token=...&type=birthday`
2. Token is a signed JWT or HMAC containing `customerId` + `type`
3. Clicking sets `birthdayOptIn = false` (or `anniversaryOptIn = false`)
4. Shows a simple "You've been unsubscribed" page
5. No login required (CAN-SPAM compliance)

---

## UI Requirements

### Admin — Reminder Settings

**Location:** Add to existing marketing/notifications settings, or new section in Settings > Notifications

**Components:**
1. **Enable/disable toggles** — Birthday reminders ON/OFF, Anniversary reminders ON/OFF
2. **Reminder timing** — Multi-select or chips: "Send reminders X days before" (e.g., 7, 3, 1)
3. **Email subject lines** — Editable text inputs for birthday and anniversary
4. **Send test email** button — Sends a sample to the admin's email
5. **Upcoming reminders preview** — Table showing next 30 days of scheduled reminders

### Admin — Customer Form

**Modify:** `/admin/src/app/components/customers/cards/CustomerInfoCard.tsx` (or separate card)

**Add anniversary fields:**
- Anniversary date picker (month/day only)
- Anniversary opt-in toggle
- Same pattern as existing birthday fields

### Admin — Reminder History

**Optional but nice:** A page or tab showing sent reminder emails with:
- Customer name, email, type (birthday/anniversary), date sent
- Uses StandardTable with pagination

### www — Customer Profile

**Add to profile page (if birthday/anniversary input doesn't exist there):**
- Birthday month/day input
- Anniversary month/day input
- Opt-in checkboxes: "Send me birthday reminders" / "Send me anniversary reminders"

---

## Implementation Checklist

### Phase 1: Database
- [ ] Add anniversary fields to Customer model (`anniversaryMonth`, `anniversaryDay`, `anniversaryYear`, `anniversaryOptIn`, `anniversaryUpdatedAt`)
- [ ] Create `ReminderEmail` model
- [ ] Create `ReminderSettings` model
- [ ] Add `ReminderType` enum
- [ ] Run migration: `npx prisma migrate dev --name add_reminder_system`

### Phase 2: Backend — Customer Anniversary Fields
- [ ] Update customer create route to accept anniversary fields
- [ ] Update customer update route to accept anniversary fields
- [ ] Add validation (month 1-12, day 1-31)

### Phase 3: Backend — Reminder Settings API
- [ ] Create `/back/src/routes/reminders.ts`
- [ ] `GET /api/reminders/settings`
- [ ] `PATCH /api/reminders/settings`
- [ ] `GET /api/reminders/upcoming` (preview next 30 days)
- [ ] `GET /api/reminders/history` (paginated sent log)
- [ ] `POST /api/reminders/send-test`
- [ ] `GET /api/reminders/unsubscribe?token=...&type=...`
- [ ] Register route in `/back/src/index.ts`

### Phase 4: Email Templates
- [ ] Create `/back/src/templates/email/birthday-reminder.ts`
- [ ] Create `/back/src/templates/email/anniversary-reminder.ts`
- [ ] Include shop branding, CTA, unsubscribe link
- [ ] Test rendering with sample data

### Phase 5: Cron Job
- [ ] Install `node-cron` if not already present (`npm install node-cron @types/node-cron`)
- [ ] Create `/back/src/cron/reminderCron.ts`
- [ ] Implement daily reminder processing logic
- [ ] Add duplicate prevention (check ReminderEmail table)
- [ ] Register cron in `/back/src/index.ts`
- [ ] Add logging for sent count

### Phase 6: Admin UI — Settings
- [ ] Add reminder settings section to notifications or marketing settings page
- [ ] Enable/disable toggles, timing config, subject line inputs
- [ ] Send test email button
- [ ] Upcoming reminders preview table

### Phase 7: Admin UI — Customer Form
- [ ] Add anniversary fields to CustomerInfoCard (or new card)
- [ ] Anniversary month/day inputs + opt-in toggle
- [ ] Match existing birthday field pattern

### Phase 8: www — Customer Profile
- [ ] Add birthday and anniversary inputs to profile page (if not already there)
- [ ] Opt-in/opt-out checkboxes
- [ ] Save via existing customer update endpoint

### Phase 9: Testing
- [ ] Test cron job with a customer whose birthday is tomorrow
- [ ] Test duplicate prevention (run cron twice, only one email)
- [ ] Test unsubscribe link (sets opt-in to false)
- [ ] Test with no email on customer (should skip, not error)
- [ ] Test admin settings save/load
- [ ] Test send test email
- [ ] Verify email renders correctly (check spam score)

### Phase 10: Docs & Cleanup
- [ ] Update `/docs/API_Endpoints.md` with new routes
- [ ] Update `/docs/Progress_Tracker.markdown`
- [ ] Archive this feature plan to `/docs/FEATURE_PLANS/archive/`

---

## Files to Create/Modify

### New Files
```
back/src/routes/reminders.ts                              (~200 lines)
back/src/cron/reminderCron.ts                             (~150 lines)
back/src/templates/email/birthday-reminder.ts             (~100 lines)
back/src/templates/email/anniversary-reminder.ts          (~100 lines)
admin/src/app/components/settings/notifications/ReminderSettingsCard.tsx  (~200 lines)
```

### Modified Files
```
back/prisma/schema.prisma                                 (Customer anniversary fields, ReminderEmail, ReminderSettings, ReminderType)
back/src/index.ts                                         (register reminders route + cron)
back/src/routes/customers.ts                              (anniversary fields in create/update)
admin/src/app/components/customers/cards/CustomerInfoCard.tsx  (anniversary fields)
admin/src/app/pages/settings/notifications.tsx             (add ReminderSettingsCard)
www/src/components/Profile/                               (birthday/anniversary inputs if not present)
```

---

## Edge Cases & Validation

### Date Validation
- Month: 1-12, Day: 1-31 (allow Feb 30 etc. — simpler than full validation, these are just reminders)
- No year required for reminders (month/day only)

### Email Edge Cases
- Customer has no email → skip silently
- Customer opted out → skip
- Customer deleted between cron check and send → handle gracefully
- SendGrid/SMTP error → log, don't crash cron, continue to next customer

### Timezone
- All reminder checks use `America/Vancouver` timezone
- "7 days before" means 7 calendar days in Pacific time

### Year Rollover
- Birthday Dec 28, today Dec 21, reminder 7 days before → works
- Birthday Jan 2, today Dec 26, reminder 7 days before → must handle year boundary

### Duplicate Prevention
- Unique constraint: `[customerId, type, year, daysBefore]`
- If cron runs twice on same day, second run finds existing records and skips

---

## Success Criteria

- [ ] Birthday reminder emails send automatically on schedule
- [ ] Anniversary reminder emails send automatically on schedule
- [ ] No duplicate emails sent
- [ ] Unsubscribe link works (one-click, no login)
- [ ] Admin can enable/disable each reminder type
- [ ] Admin can configure days-before timing
- [ ] Admin can send test emails
- [ ] Customer anniversary fields saveable in admin
- [ ] Email includes shop branding and "Shop Now" CTA
- [ ] Cron job handles errors gracefully (doesn't crash server)
- [ ] No console errors
- [ ] CAN-SPAM compliant (unsubscribe link, physical address in footer)

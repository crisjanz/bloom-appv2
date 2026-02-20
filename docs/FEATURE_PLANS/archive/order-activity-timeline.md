# Order Activity Timeline

**Status:** 🔜 Ready for Implementation
**Created:** 2026-02-19
**Priority:** Medium

---

## Overview

Unified activity timeline on the Order Edit page showing all order-related events in chronological order. Currently, order history is scattered across multiple tables (`OrderCommunication`, `PrintJob`, payment transactions) with no status change tracking at all. This feature introduces an `OrderActivity` table as the single source for all order events, and renders them as a timeline below the order details card.

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
- **Backend route pattern:** `/back/src/routes/orders/status.ts` (status change handling)
- **Frontend component pattern:** `/admin/src/app/components/orders/edit/OrderSections.tsx` (order detail display)
- **Custom hook pattern:** `/admin/src/shared/hooks/useApiClient.ts`

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

1. **Single timeline** showing all order events — no more checking 4 different places
2. **Status change audit trail** — who changed what, when (currently not tracked at all)
3. **Payment event visibility** — charges, refunds, adjustments visible on the order
4. **Minimal disruption** — existing `OrderCommunication` and `PrintJob` tables stay as-is; timeline queries them alongside `OrderActivity`

---

## Architecture & Endpoints

### Backend API Routes

**File:** `/back/src/routes/orders/activity.ts`

**Endpoints:**
- `GET /api/orders/:orderId/activity` — Returns merged timeline (OrderActivity + OrderCommunication + PrintJob events), sorted newest-first, with pagination

### Database Schema

**New model:**

```prisma
model OrderActivity {
  id        String   @id @default(uuid())
  orderId   String
  order     Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)

  type      OrderActivityType
  summary   String              // Human-readable: "Status changed to READY"
  details   Json?               // Structured data for the event (see below)

  actorId   String?             // Employee ID (null = system/automated)
  actor     Employee?           @relation(fields: [actorId], references: [id])
  actorName String?             // Denormalized for display (avoids join)

  createdAt DateTime @default(now())

  @@index([orderId, createdAt])
}

enum OrderActivityType {
  STATUS_CHANGE        // Fulfillment status changed
  PAYMENT_STATUS_CHANGE // paymentStatus changed
  PAYMENT_RECEIVED     // New PT created
  REFUND_PROCESSED     // Refund created
  PAYMENT_ADJUSTMENT   // Order total changed + PT adjustment
  ORDER_EDITED         // Field(s) modified (delivery date, products, etc.)
  ORDER_CREATED        // Initial creation
}
```

**Migration command:**
```bash
npx prisma migrate dev --name add_order_activity
```

### Event `details` JSON Examples

```jsonc
// STATUS_CHANGE
{ "from": "IN_DESIGN", "to": "READY" }

// PAYMENT_STATUS_CHANGE
{ "from": "UNPAID", "to": "PAID" }

// PAYMENT_RECEIVED
{ "transactionNumber": "PT-0042", "amount": 8500, "methods": ["CARD (Stripe ****4242)"] }

// REFUND_PROCESSED
{ "refundNumber": "RF-0003", "amount": 8500, "reason": "Order cancelled", "methods": ["CARD (Stripe)"] }

// PAYMENT_ADJUSTMENT
{ "oldTotal": 8500, "newTotal": 10000, "difference": 1500, "method": "CARD" }

// ORDER_EDITED
{ "section": "delivery", "changes": { "deliveryDate": { "from": "2026-02-20", "to": "2026-02-22" } } }

// ORDER_CREATED
{ "source": "WEBSITE", "channel": "WEBSITE" }
```

### Where to Log Events (Instrumentation Points)

| Event | Where to add logging |
|-------|---------------------|
| STATUS_CHANGE | `back/src/routes/orders/status.ts` — after successful status update |
| PAYMENT_STATUS_CHANGE | `back/src/services/orderPaymentStatusService.ts` — inside `recalculateOrderPaymentStatuses` when status actually changes |
| PAYMENT_RECEIVED | `back/src/services/transactionService.ts` — after PT creation |
| REFUND_PROCESSED | `back/src/services/refundService.ts` — after refund record created |
| PAYMENT_ADJUSTMENT | `admin/src/app/pages/orders/OrderEditPage.tsx` → backend call after adjustment modal completes |
| ORDER_EDITED | `back/src/routes/orders/update.ts` — after successful update, diff old vs new values |
| ORDER_CREATED | `back/src/routes/orders/create.ts` and `create-from-scan.ts` — after order creation |

---

## UI Requirements

### Frontend Components

**Location:** `/admin/src/app/components/orders/edit/`

**Components needed:**
1. **OrderActivityTimeline.tsx** — Main timeline component, renders below order details card
2. **ActivityEntry.tsx** — Single timeline entry with icon, timestamp, summary, expandable details

### Layout on OrderEditPage

```tsx
<div className="max-w-4xl mx-auto">
  <OrderHeader ... />
  <ComponentCard title="Order Details">
    <OrderSections ... />
  </ComponentCard>

  {/* NEW — Activity Timeline */}
  <ComponentCard title="Activity" className="mt-6">
    <OrderActivityTimeline orderId={order.id} />
  </ComponentCard>
</div>
```

### Timeline Entry Design

Each entry is a single row:

```
[icon] [summary text]                              [relative timestamp]
       [expandable detail line, if applicable]
```

**Icons per type** (use Heroicons):
- STATUS_CHANGE → `ArrowPathIcon` (circular arrows)
- PAYMENT_RECEIVED → `BanknotesIcon`
- REFUND_PROCESSED → `ArrowUturnLeftIcon`
- PAYMENT_ADJUSTMENT → `AdjustmentsHorizontalIcon`
- ORDER_EDITED → `PencilIcon`
- ORDER_CREATED → `PlusCircleIcon`
- SMS/Email (from OrderCommunication) → `ChatBubbleLeftIcon` / `EnvelopeIcon`
- Print (from PrintJob) → `PrinterIcon`
- Note (from OrderCommunication type=NOTE) → `DocumentTextIcon`

**Colors:** Use `text-gray-600 dark:text-gray-400` for most entries. Use `text-red-600` for refunds/cancellations. Use `text-green-600` for payments received.

### Merging Existing Data

The `GET /api/orders/:orderId/activity` endpoint merges three sources:

1. **OrderActivity** records (new table)
2. **OrderCommunication** records (existing — SMS, emails, notes)
3. **PrintJob** records (existing — receipts, tickets)

All three are mapped to a unified shape and sorted by `createdAt` descending. This avoids migrating existing data into the new table.

```ts
type TimelineEntry = {
  id: string;
  type: string;           // OrderActivityType | 'SMS_SENT' | 'SMS_RECEIVED' | 'EMAIL_SENT' | 'NOTE' | 'PRINT'
  summary: string;
  details?: Record<string, any>;
  actorName?: string;
  createdAt: string;
};
```

### Pagination

- Default: last 20 entries
- "Load more" button at bottom (not infinite scroll — keeps it simple)
- Query param: `?limit=20&before=<timestamp>`

---

## Implementation Checklist

### Phase 1: Backend — Schema & Logging
- [ ] Add `OrderActivity` model + `OrderActivityType` enum to Prisma schema
- [ ] Run migration: `npx prisma migrate dev --name add_order_activity`
- [ ] Add `logOrderActivity()` helper function in `/back/src/services/orderActivityService.ts`
- [ ] Instrument `status.ts` — log STATUS_CHANGE after status update
- [ ] Instrument `orderPaymentStatusService.ts` — log PAYMENT_STATUS_CHANGE when paymentStatus changes
- [ ] Instrument `transactionService.ts` — log PAYMENT_RECEIVED after PT creation
- [ ] Instrument `refundService.ts` — log REFUND_PROCESSED after refund
- [ ] Instrument `update.ts` — log ORDER_EDITED with field diffs
- [ ] Instrument `create.ts` and `create-from-scan.ts` — log ORDER_CREATED
- [ ] Register activity route in `/back/src/index.ts`

### Phase 2: Backend — API Endpoint
- [ ] Create `/back/src/routes/orders/activity.ts`
- [ ] Implement `GET /api/orders/:orderId/activity` — merge OrderActivity + OrderCommunication + PrintJob
- [ ] Add pagination support (`limit` + `before` cursor)
- [ ] Test endpoint with existing orders

### Phase 3: Frontend
- [ ] Create `OrderActivityTimeline.tsx` — fetches and renders timeline
- [ ] Create `ActivityEntry.tsx` — single entry with icon, summary, timestamp
- [ ] Add timeline to `OrderEditPage.tsx` below order details card
- [ ] Add "Load more" pagination
- [ ] Verify dark mode support

### Phase 4: Testing
- [ ] Create an order → verify ORDER_CREATED entry
- [ ] Change status → verify STATUS_CHANGE entry with from/to
- [ ] Edit delivery date → verify ORDER_EDITED entry with diff
- [ ] Process refund → verify REFUND_PROCESSED entry
- [ ] Verify existing SMS/email/notes appear in timeline
- [ ] Verify existing print jobs appear in timeline

### Phase 5: Documentation
- [ ] Update `/docs/API_Endpoints.md`
- [ ] Update `/docs/Progress_Tracker.markdown`
- [ ] Add note to POS_FLOWS.md section 6
- [ ] Archive this feature plan

---

## Edge Cases & Validation

### Business Rules
- Activity records are append-only (never edited or deleted)
- `actorId` is null for system-generated events (auto payment status changes, automated notifications)
- `actorName` is denormalized so timeline still works if employee is deleted
- ORDER_EDITED should only log fields that actually changed (diff old vs new)
- Don't log no-op updates (e.g., saving a modal without changing anything)

### Error Scenarios
- If activity logging fails, the parent operation (status change, refund, etc.) should NOT fail — log error and continue
- Empty timeline state: show "No activity yet" message
- Orders created before this feature will have no OrderActivity records but will still show OrderCommunication and PrintJob entries

---

## Files to Create/Modify

### New Files
```
/back/src/services/orderActivityService.ts          (~60 lines) — logOrderActivity() helper
/back/src/routes/orders/activity.ts                  (~120 lines) — GET endpoint with merge logic
/admin/src/app/components/orders/edit/OrderActivityTimeline.tsx  (~150 lines)
/admin/src/app/components/orders/edit/ActivityEntry.tsx           (~80 lines)
```

### Modified Files
```
/back/prisma/schema.prisma                           (add OrderActivity model + enum)
/back/src/index.ts                                   (register activity route)
/back/src/routes/orders/status.ts                    (add activity logging)
/back/src/routes/orders/update.ts                    (add activity logging)
/back/src/routes/orders/create.ts                    (add activity logging)
/back/src/routes/orders/create-from-scan.ts          (add activity logging)
/back/src/services/transactionService.ts             (add activity logging)
/back/src/services/refundService.ts                  (add activity logging)
/back/src/services/orderPaymentStatusService.ts      (add activity logging)
/admin/src/app/pages/orders/OrderEditPage.tsx        (add timeline component)
/docs/API_Endpoints.md                               (document new endpoint)
/docs/Progress_Tracker.markdown                      (mark as completed)
```

---

## Success Criteria

- [ ] All order events appear in chronological timeline on order edit page
- [ ] Status changes show who changed and from/to values
- [ ] Payment events show amounts and methods
- [ ] Existing communications (SMS, email, notes) appear in timeline
- [ ] Existing print jobs appear in timeline
- [ ] Activity logging never blocks parent operations
- [ ] Dark mode supported
- [ ] "Load more" pagination works
- [ ] No console errors

---

## Implementation Notes

**Dependencies:**
- None — can be implemented independently

**Key Decision — Merge vs Migrate:**
Existing `OrderCommunication` and `PrintJob` data is NOT migrated into `OrderActivity`. Instead, the API endpoint merges all three at query time. This avoids a complex data migration and keeps existing features working unchanged. If query performance becomes an issue later (unlikely — it's per-order, not global), a materialized view or denormalized table can be added.

**Employee Context:**
The current `update.ts` and `status.ts` endpoints don't receive `employeeId` consistently. The status endpoint gets it from `req.body.employeeId`. The update endpoint doesn't receive it at all. Both should be updated to extract the employee from the auth session (when available) for accurate actor tracking.

**Deployment Notes:**
- Migration will run automatically on Render deploy
- No environment variable changes needed
- Existing orders will have partial timelines (only communications + print jobs) — this is fine

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
   - Commit with message: "feat: add order activity timeline"
   - Push to trigger deployment (ask for confirmation first)
   - Verify in staging environment

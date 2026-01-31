# Communications Upgrade - Chat Style & Incoming SMS

**Status:** 🔜 Ready for Implementation
**Created:** 2026-01-18
**Priority:** High

---

## Overview
Upgrade the existing OrderCommunicationModal to support two-way SMS with Apple Messages-style chat bubbles. Add Twilio webhook to receive customer replies. Show unread message badges on order cards and the Delivery menu.

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
- **Backend route pattern:** `/back/src/routes/communications.ts` (existing communications routes)
- **Backend SMS pattern:** `/back/src/routes/sms/index.ts` (existing SMS routes)
- **Frontend component pattern:** `/admin/src/app/components/delivery/CommunicationTimeline.tsx`
- **WebSocket pattern:** `/back/src/websocket.ts` (if exists) or check AI_IMPLEMENTATION_GUIDE.md

**DO NOT write from scratch. COPY patterns from these files.**

### Pre-Implementation Quiz (Answer Before Coding)

**Question 1: API Client**
- What hook do you use for all frontend API calls?
- Answer: `useApiClient` (not fetch)

**Question 2: Communication Type**
- What enum value exists for incoming SMS?
- Answer: `SMS_RECEIVED` (already in CommunicationType enum)

**Question 3: Phone Matching**
- Where are customer/recipient phone numbers stored?
- Answer: `customer.phone` and `deliveryAddress.phone` on Order

### Critical Don'ts
❌ Use `fetch()` directly → Use `useApiClient` hook
❌ Create new communication types → Use existing `SMS_RECEIVED` enum
❌ Forget WebSocket events → Emit `sms:received` for real-time updates
❌ Skip phone normalization → Use existing `formatPhoneNumber()` in smsService

---

## Goals

1. Enable two-way SMS communication with customers via Twilio webhook
2. Display messages in Apple Messages-style chat bubbles (outbound right/blue, inbound left/gray)
3. Show unread badges on order cards and Delivery menu for quick visibility
4. Real-time message updates via WebSocket

---

## Architecture & Endpoints

### Backend API Routes

**New File:** `/back/src/routes/sms/webhook.ts`

**Endpoints:**
- `POST /api/sms/webhook` — Twilio webhook for incoming SMS (public, no auth)

**Modified File:** `/back/src/routes/communications.ts`

**New Endpoints:**
- `GET /api/communications/unread-count` — Get total unread count (for menu badge)
- `PATCH /api/orders/:orderId/communications/mark-read` — Mark order's communications as read

### Database Schema

**Modify OrderCommunication model - add readAt field:**

```prisma
model OrderCommunication {
  // ... existing fields ...
  readAt    DateTime?  // NEW: null = unread, timestamp = read
}
```

**Migration command:**
```bash
npx prisma migrate dev --name add_communication_read_status
```

### Twilio Webhook Logic

**File:** `/back/src/routes/sms/webhook.ts`

```
1. Receive POST from Twilio with From, Body, To
2. Normalize From phone number
3. Find recent orders (last 7 days) matching phone:
   - Check deliveryAddress.phone first
   - Fall back to customer.phone
4. If order found:
   - Create OrderCommunication with type SMS_RECEIVED, readAt: null
   - Emit WebSocket event 'sms:received' { orderId, message, timestamp }
5. Return TwiML response (empty <Response/>)
```

**Phone matching query:**
```typescript
const recentOrders = await prisma.order.findMany({
  where: {
    OR: [
      { deliveryAddress: { phone: normalizedPhone } },
      { customer: { phone: normalizedPhone } }
    ],
    createdAt: { gte: sevenDaysAgo }
  },
  orderBy: { createdAt: 'desc' },
  take: 1
});
```

---

## UI Requirements

### 1. Upgrade CommunicationTimeline to Chat Style

**File:** `/admin/src/app/components/delivery/CommunicationTimeline.tsx`

**Changes:**
- Replace list view with chat bubble layout
- Outbound messages (SMS_SENT, EMAIL_SENT): Right-aligned, blue/brand background, white text
- Inbound messages (SMS_RECEIVED): Left-aligned, gray background, dark text
- Phone calls and notes: Centered, subtle styling (system messages)
- Show timestamp below each bubble
- Auto-scroll to newest message

**Chat bubble styles:**
```tsx
// Outbound (right side)
<div className="flex justify-end">
  <div className="max-w-[70%] bg-brand-500 text-white rounded-2xl rounded-br-sm px-4 py-2">
    {message}
    <div className="text-xs text-white/70 mt-1">{time}</div>
  </div>
</div>

// Inbound (left side)
<div className="flex justify-start">
  <div className="max-w-[70%] bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-2xl rounded-bl-sm px-4 py-2">
    {message}
    <div className="text-xs text-gray-500 mt-1">{time}</div>
  </div>
</div>
```

### 2. Unread Badge on Order Cards

**File:** `/admin/src/app/pages/delivery/DeliveryPage.tsx` (or wherever order cards are rendered)

**Changes:**
- Fetch unread count per order from API
- Show red circle badge with count on orders with unread messages
- Badge position: Top-right of order card

**Badge component:**
```tsx
{unreadCount > 0 && (
  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
    {unreadCount > 9 ? '9+' : unreadCount}
  </span>
)}
```

### 3. Unread Badge on Delivery Menu

**File:** `/admin/src/app/components/layout/Sidebar.tsx` (or AppSidebar)

**Changes:**
- Call `/api/communications/unread-count` on mount and via WebSocket updates
- Show red badge next to "Delivery" menu item when count > 0

### 4. Mark as Read

**Trigger:** When user opens OrderCommunicationModal, call `PATCH /api/orders/:orderId/communications/mark-read`

**File:** `/admin/src/app/components/delivery/OrderCommunicationModal.tsx`

---

## Implementation Checklist

### Phase 1: Backend - Webhook & Database
- [ ] Add `readAt DateTime?` to OrderCommunication in schema.prisma
- [ ] Run migration: `npx prisma migrate dev --name add_communication_read_status`
- [ ] Create `/back/src/routes/sms/webhook.ts` with Twilio webhook handler
- [ ] Mount webhook route in `/back/src/routes/sms/index.ts` (no auth middleware)
- [ ] Add phone matching logic to find order by incoming phone number
- [ ] Create OrderCommunication with type SMS_RECEIVED on incoming message

### Phase 2: Backend - Unread Count Endpoints
- [ ] Add `GET /api/communications/unread-count` endpoint
- [ ] Add `PATCH /api/orders/:orderId/communications/mark-read` endpoint
- [ ] Test endpoints manually

### Phase 3: Backend - WebSocket
- [ ] Add WebSocket event emission for `sms:received`
- [ ] Include orderId, message, and unread count in event payload

### Phase 4: Frontend - Chat Bubbles
- [ ] Redesign CommunicationTimeline.tsx with chat bubble layout
- [ ] Style outbound messages (right, blue)
- [ ] Style inbound messages (left, gray)
- [ ] Style system messages (phone calls, notes) as centered/subtle
- [ ] Add auto-scroll to newest message
- [ ] Test dark mode

### Phase 5: Frontend - Unread Badges
- [ ] Add unread count to order cards in DeliveryPage
- [ ] Add unread badge to Delivery menu item in sidebar
- [ ] Call mark-read endpoint when modal opens
- [ ] Subscribe to WebSocket for real-time badge updates

### Phase 6: Testing & Documentation
- [ ] Test: Send SMS to Twilio number → appears in modal
- [ ] Test: Badge shows on order card and menu
- [ ] Test: Opening modal clears badge
- [ ] Test: Real-time updates via WebSocket
- [ ] Update `/docs/API_Endpoints.md`
- [ ] Update `/docs/Progress_Tracker.markdown`

---

## Data Flow

**Incoming SMS Flow:**
```
Customer texts Twilio number
  → Twilio POSTs to /api/sms/webhook
  → Backend finds order by phone
  → Creates OrderCommunication (type: SMS_RECEIVED, readAt: null)
  → Emits WebSocket 'sms:received'
  → Frontend receives event
  → Updates badge counts
  → If modal open, shows new message
```

**Mark Read Flow:**
```
User opens OrderCommunicationModal
  → useEffect calls PATCH /api/orders/:id/communications/mark-read
  → Backend sets readAt = now() for all unread
  → Badge count decrements
```

---

## Edge Cases & Validation

### Phone Matching
- Normalize all phone numbers to E.164 format before comparing
- If no order found for phone, log but don't error (spam/wrong number)
- Match most recent order if multiple orders have same phone

### Webhook Security
- Twilio webhook should be public (no auth) but validate Twilio signature
- Use `twilio.validateRequest()` to verify requests are from Twilio

### Error Scenarios
- No matching order: Log and return empty TwiML
- WebSocket disconnected: Badges update on next page load
- Network errors: Show toast, allow retry

---

## Files to Create/Modify

### New Files
```
/back/src/routes/sms/webhook.ts              (~80 lines)
```

### Modified Files
```
/back/prisma/schema.prisma                   (add readAt field)
/back/src/routes/sms/index.ts                (mount webhook)
/back/src/routes/communications.ts           (add unread endpoints)
/back/src/websocket.ts                       (add sms:received event)
/admin/src/app/components/delivery/CommunicationTimeline.tsx  (chat bubbles)
/admin/src/app/components/delivery/OrderCommunicationModal.tsx (mark read)
/admin/src/app/pages/delivery/DeliveryPage.tsx (order card badges)
/admin/src/app/components/layout/AppSidebar.tsx (menu badge)
```

---

## Success Criteria

- [ ] Incoming SMS from customer creates SMS_RECEIVED communication
- [ ] Chat view shows bubbles (outbound right/blue, inbound left/gray)
- [ ] Unread badge appears on order card when reply received
- [ ] Unread badge appears on Delivery menu
- [ ] Opening modal marks messages as read and clears badges
- [ ] Real-time updates work via WebSocket
- [ ] Dark mode supported
- [ ] No console errors

---

## Implementation Notes

**Estimated Effort:** 4-6 hours

**Dependencies:**
- Twilio account with webhook URL configured
- WebSocket setup (check if exists, may need to add)

**Twilio Setup Required:**
User must configure webhook URL in Twilio console after deployment:
1. Go to Twilio Console → Phone Numbers → Select number
2. Under Messaging Configuration, set webhook URL to: `https://[backend-url]/api/sms/webhook`
3. Method: POST

**Deployment Notes:**
- Migration will run automatically on Render deploy
- Webhook URL needs manual configuration in Twilio console after deploy

---

## Post-Implementation

After completing implementation:

1. **Verify:**
   - All success criteria met
   - Twilio webhook configured and tested
   - Documentation updated

2. **Update:**
   - Mark feature as ✅ Completed in Progress_Tracker
   - Archive or delete this plan

3. **Deploy:**
   - Commit with message: "feat: add two-way SMS with chat bubbles and unread badges"
   - Push to trigger deployment
   - Configure Twilio webhook URL
   - Verify in staging environment

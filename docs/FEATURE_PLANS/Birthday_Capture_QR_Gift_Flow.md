# Birthday Capture + Recipient QR Birthday Gift Flow

**Status:** 🔜 Ready for Implementation
**Created:** 2026-01-30
**Priority:** High

---

## Overview
Two-part feature: (A) Capture customer birthdays during checkout via opt-in month/day fields, and (B) a QR-based gift flow where birthday-occasion order recipients scan a card to receive a coupon immediately, with optional "save for later" that collects birthday + contact info with consent.

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
- **Backend route pattern:** `/back/src/routes/orders.ts`
- **Frontend checkout pattern:** `/www/src/` (checkout flow components)
- **Public page pattern:** `/www/src/` (unauthenticated pages)

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

### Critical Don'ts
❌ Use `fetch()` directly → Use `useApiClient` hook
❌ Store prices as floats → Use integers in cents
❌ Skip cascade deletes → Add `onDelete: Cascade`
❌ Forget route registration → Register in `/back/src/index.ts`
❌ Skip migrations → Run `npx prisma migrate dev --name feature_name`
❌ Use emojis in UI → Use Heroicons or existing icon library

---

## Goals

1. Capture customer birthdays at checkout via non-invasive opt-in (month/day only, year optional)
2. Enable a gift-first QR flow where recipients see a coupon immediately without login
3. Provide optional "save for later" that collects birthday + contact only with explicit consent
4. Prevent abuse with single-claim tokens and expiry

---

## Feature A — Customer Birthday During Checkout

### UX Requirements

- Add optional section in checkout (collapsed by default):
  - Title: "Birthday treat (optional)" (use cake icon from Heroicons, NOT emoji)
  - Copy: "Want a little surprise from us on your birthday?"
  - Checkbox toggle: "Send me a birthday surprise"
  - When checked, reveal:
    - Birthday month (dropdown 1–12)
    - Birthday day (dropdown 1–31)
    - Year (optional, numeric, nullable)
  - Helper text: "We only use this for your birthday. No spam."

### Database Schema — Customer Birthday Fields

Add to `Customer` model:

```prisma
// Add to existing Customer model
birthdayMonth    Int?
birthdayDay      Int?
birthdayYear     Int?
birthdayOptIn    Boolean  @default(false)
birthdayUpdatedAt DateTime?
```

**Migration command:**
```bash
npx prisma migrate dev --name add_customer_birthday_fields
```

**Validation:**
- If `birthdayOptIn = true`, require `birthdayMonth` and `birthdayDay`
- Year remains optional
- No birthday data stored unless opt-in is true

### Checkout API Changes

Extend checkout submit payload:
- `birthdayOptIn: boolean`
- `birthdayMonth?: number` (1–12)
- `birthdayDay?: number` (1–31)
- `birthdayYear?: number` (optional)

**Backend behavior on order submit:**
- If customer is authenticated: save birthday fields to customer record
- If guest checkout: create/find customer record by email/phone, save birthday there
- Show confirmation: "Birthday treat saved!"

---

## Feature B — Recipient QR Card + Coupon-First Flow

### Physical Card Concept (no code)
- Business-card sized insert in birthday-occasion orders
- Front: "Happy Birthday from Bloom" (use icons, NOT emojis)
- Back: "A small birthday gift for you — scan to use now or save for later"
- QR points to: `/birthday-gift/<token>`

### B1 — Core Flow

1. Recipient scans QR
2. Landing page immediately shows gift/coupon (no login required)
3. Recipient chooses:
   - **Use now** → show coupon code + "Shop now" link (MVP approach)
   - **Save for later** → optional opt-in form (birthday month/day + contact)
4. If they complete "save for later":
   - Create/update customer profile for the scanner (NOT the original purchaser)
   - Attach coupon + set `birthdayOptIn=true`
   - Token becomes CLAIMED

### B2 — Database Schema

**New model: `GiftToken`**

```prisma
model GiftToken {
  id                    String        @id @default(uuid())
  token                 String        @unique
  type                  GiftTokenType @default(BIRTHDAY_RECIPIENT_GIFT)
  status                GiftTokenStatus @default(ACTIVE)
  expiresAt             DateTime?
  issuedForOrderId      String?
  issuedForOrder        Order?        @relation(fields: [issuedForOrderId], references: [id])
  issuedToRecipientName String?
  redeemedAt            DateTime?
  redeemedByCustomerId  String?
  redeemedByCustomer    Customer?     @relation(fields: [redeemedByCustomerId], references: [id])
  couponId              String?
  coupon                Coupon?       @relation(fields: [couponId], references: [id])
  metadata              Json?
  createdAt             DateTime      @default(now())
  updatedAt             DateTime      @updatedAt

  @@index([token])
  @@index([status])
}

enum GiftTokenType {
  BIRTHDAY_RECIPIENT_GIFT
}

enum GiftTokenStatus {
  ACTIVE
  CLAIMED
  REDEEMED
  EXPIRED
  REVOKED
}
```

**Coupon model (if not existing):**

```prisma
model Coupon {
  id               String    @id @default(uuid())
  code             String    @unique
  type             CouponType
  value            Int       // cents for fixed, percentage points for percent
  minSubtotalCents Int?
  validFrom        DateTime?
  validTo          DateTime?
  maxRedemptions   Int?
  perCustomerLimit Int?      @default(1)
  redemptionCount  Int       @default(0)
  isActive         Boolean   @default(true)
  giftTokens       GiftToken[]
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  @@index([code])
}

enum CouponType {
  FIXED
  PERCENT
  FREE_ADDON
}
```

**Migration command:**
```bash
npx prisma migrate dev --name add_gift_tokens_and_coupons
```

**Security:** Token must be cryptographically random (e.g., `crypto.randomUUID()` or `nanoid()`). Never sequential.

### B3 — Backend Endpoints

**File:** `/back/src/routes/gifts.ts`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/gifts/birthday/create` | Admin/Internal | Create gift token for a birthday order |
| `GET` | `/api/gifts/birthday/:token` | Public | Get gift details for landing page |
| `POST` | `/api/gifts/birthday/:token/save` | Public | Save for later with opt-in data |

**1) Create Gift Token (internal)**
- Input: `{ orderId }`
- Output: `{ token, url }`
- Generates random token, creates coupon, stores in GiftToken table

**2) Public Gift Page**
- Validate token exists, is ACTIVE, not expired
- Return: `{ giftTitle, giftDescription, couponCode, couponValue, couponType, tokenStatus }`

**3) Save for Later**
- Input: `{ birthdayMonth, birthdayDay, birthdayYear?, contactType: 'email' | 'sms', email?, phone?, consent: boolean }`
- Validate token is ACTIVE
- Create or find customer by email/phone
- Save birthday fields + `birthdayOptIn=true`
- Set token status to CLAIMED, associate `redeemedByCustomerId`
- Return: `{ success, couponCode, message }`

### B4 — Token Status Rules

| Status | Meaning |
|--------|---------|
| ACTIVE | Can be used or saved |
| CLAIMED | Saved to a customer; can still be redeemed by that customer |
| REDEEMED | Coupon consumed |
| EXPIRED | Past expiry date |
| REVOKED | Manually invalidated |

**Rules:**
- One token = one person (claim/redeem once)
- "Use now" without identifying → redemption at coupon checkout time
- Single-claim enforced

### B5 — Frontend Pages / Components

**Checkout birthday section (www):**
- Hidden by default (checkbox toggle)
- Month/day dropdowns
- Year optional
- Uses existing form component patterns

**Public landing page: `/birthday-gift/:token` (www)**
- Fetch gift details from backend (no auth)
- Display: gift headline, coupon value + restrictions
- Two buttons: "Use now" / "Save for later"
- "Use now" → reveal coupon code + "Shop now" link
- "Save for later" → inline form (NOT modal):
  - Birthday month/day dropdowns, year optional
  - Contact preference toggle (email/SMS) + input
  - Consent checkbox
  - Submit button
- After save success: "Saved! We'll keep this for you." + coupon code + "Shop now"

### B6 — Anti-abuse / Privacy

- No auto-email/text unless recipient explicitly submits "save" form
- Token non-guessable + rate-limited
- Single-claim / single-redeem per token
- Expiry: 180 days default
- No extra tracking beyond existing logging

---

## Implementation Checklist

### Phase 1: Schema + Migrations
- [ ] Add birthday fields to Customer model
- [ ] Create GiftToken model
- [ ] Create Coupon model (if not existing)
- [ ] Run migrations
- [ ] Verify schema with `npx prisma generate`

### Phase 2: Customer Birthday at Checkout
- [ ] Add Zod validation for birthday fields in checkout payload
- [ ] Extend checkout endpoint to save birthday data
- [ ] Build checkout UI section (www) with toggle + dropdowns
- [ ] Test opt-in flow (authenticated + guest)

### Phase 3: Gift Token Backend
- [ ] Create `/back/src/routes/gifts.ts`
- [ ] Implement POST `/api/gifts/birthday/create`
- [ ] Implement GET `/api/gifts/birthday/:token`
- [ ] Implement POST `/api/gifts/birthday/:token/save`
- [ ] Register route in `/back/src/index.ts`
- [ ] Add Zod validation schemas

### Phase 4: Gift Landing Page (www)
- [ ] Create public route `/birthday-gift/:token`
- [ ] Build landing page component
- [ ] Implement "Use now" flow (show coupon code)
- [ ] Implement "Save for later" inline form
- [ ] Add success/error states
- [ ] Mobile responsive (375px+)

### Phase 5: Status Transitions + Anti-abuse
- [ ] Implement token expiry check
- [ ] Enforce single-claim logic
- [ ] Add rate limiting on public endpoints
- [ ] Test abuse scenarios

### Phase 6: Documentation
- [ ] Update `/docs/API_Endpoints.md`
- [ ] Update `/docs/Progress_Tracker.markdown`
- [ ] Archive this feature plan

---

## Data Flow

**Birthday Opt-in at Checkout:**
```
Checkout Form → birthdayOptIn toggle → month/day inputs
  → POST /api/checkout (extended payload)
  → Zod validation
  → Prisma Customer.update({ birthdayMonth, birthdayDay, birthdayOptIn })
  → Response
```

**Gift Token Creation:**
```
Order placed (occasion=Birthday) → POST /api/gifts/birthday/create
  → Generate random token + create Coupon
  → Prisma GiftToken.create()
  → Return { token, url }
```

**Recipient Scans QR:**
```
Scan QR → GET /birthday-gift/:token (frontend route)
  → GET /api/gifts/birthday/:token
  → Validate token ACTIVE + not expired
  → Display gift + coupon details
  → User chooses "Use now" or "Save for later"
```

---

## Edge Cases & Validation

### Input Validation
- Birthday month: 1–12 integer
- Birthday day: 1–31 integer (basic; no month-specific validation needed for MVP)
- Year: 4-digit number or null
- Email: valid email format
- Phone: valid via PhoneInput component

### Business Rules
- Birthday data ONLY stored when `birthdayOptIn = true`
- Token expires after 180 days
- One token = one claim = one redemption
- Guest customers created/matched by email or phone

### Error Scenarios
- Token not found → 404 with friendly message
- Token expired → show "This gift has expired" message
- Token already claimed → show "This gift has already been claimed"
- Network errors → standard error handling
- Invalid birthday input → Zod validation errors

---

## Files to Create/Modify

### New Files
```
/back/src/routes/gifts.ts                              (~200 lines)
/www/src/pages/BirthdayGift/BirthdayGiftPage.tsx       (~250 lines)
/www/src/components/checkout/BirthdayOptIn.tsx          (~100 lines)
```

### Modified Files
```
/back/src/index.ts                  (register gifts route)
/back/prisma/schema.prisma          (add GiftToken, Coupon models + Customer birthday fields)
/www/src/routes.tsx                  (add /birthday-gift/:token route)
/www/src/components/checkout/...    (integrate BirthdayOptIn into checkout flow)
/docs/API_Endpoints.md              (add gift endpoints)
/docs/Progress_Tracker.markdown     (mark as in progress/completed)
```

---

## Success Criteria

- [ ] Customer can opt-in to birthday at checkout (month/day required, year optional)
- [ ] No birthday stored unless opted in
- [ ] Birthday appears on customer admin profile view
- [ ] Scanning QR shows gift immediately without login
- [ ] "Use now" provides a usable coupon code + shop link
- [ ] "Save for later" collects consent + birthday + contact, stores on scanner's customer profile
- [ ] Token cannot be claimed/redeemed multiple times
- [ ] Token expires after configured period
- [ ] Mobile responsive (375px+)
- [ ] Dark mode supported
- [ ] No console errors
- [ ] Documentation updated

---

## Implementation Notes

**Dependencies:**
- Existing Customer model
- Existing Order model with occasion field
- Checkout flow in www

**Testing Strategy:**
- Manual testing in dev environment
- Test authenticated + guest checkout birthday opt-in
- Test QR scan → use now flow
- Test QR scan → save for later flow
- Test expired/claimed/revoked token states
- Test abuse: multiple scans, invalid tokens

**Deployment Notes:**
- Migrations will run automatically on Render deploy
- No environment variable changes needed

---

## Post-Implementation

After completing implementation:

1. **Verify:**
   - All success criteria met
   - Documentation updated
   - No broken references

2. **Update:**
   - Mark feature as ✅ Completed in Progress_Tracker
   - Archive or delete this plan

3. **Deploy:**
   - Commit with message: "feat: add birthday capture + recipient QR gift flow"
   - Push to trigger deployment
   - Verify in staging environment

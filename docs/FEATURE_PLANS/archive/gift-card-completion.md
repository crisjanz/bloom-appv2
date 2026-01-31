# Gift Card Feature Completion

## Overview
Gift card infrastructure exists (DB schema, API routes, admin list page, website purchase page) but key UI pieces are broken or missing. This plan connects the dots.

## Current State

### ✅ Working
- **Prisma schema**: `GiftCard` + `GiftCardTransaction` models
- **Backend API routes**: `/api/gift-cards/batch`, `/purchase`, `/activate`, `/check`, `/redeem`, list endpoints
- **Admin list page**: `GiftCardsPage.tsx` — displays cards with filters
- **Website purchase page**: `www/src/pages/GiftCard.jsx` — multi-step form with Stripe integration
- **Website routing**: `/gift-cards` route exists
- **Payment flow**: Gift card input/redeem modals exist in admin POS & take-order payment

### 🛠️ Broken / Missing

1. **Admin "Create Batch" button** (`GiftCardsPage.tsx` line 237) — currently calls `loadGiftCards()` (refresh) instead of opening a batch creation modal
2. **Admin "View Details" button** — shows `alert()` placeholder instead of a real detail modal
3. **Admin deactivate** — placeholder `alert()`, no API call
4. **Admin: No way to create a single gift card** (only batch)
5. **Website gift card page** — not linked from navigation (no way for customers to find it)
6. **Currency bug**: DB stores cents (Int), but `redeem.ts` and `check.ts` use `$${amount.toFixed(2)}` treating values as dollars — needs audit

---

## Implementation Tasks

### Task 1: Admin — Create Batch Modal
**File**: New `admin/src/app/components/gift-cards/CreateBatchModal.tsx`
**Modify**: `admin/src/app/pages/gift-cards/GiftCardsPage.tsx`

- Create modal using shared `Modal` component
- Fields:
  - **Quantity** (number input, 1–1000, default 100)
  - **Type** (select: Physical / Digital)
- Submit button calls `POST /api/gift-cards/batch`
- On success: show count of created cards, refresh list
- Wire the "Create Batch" button to open this modal instead of calling `loadGiftCards()`

### Task 2: Admin — Gift Card Detail Modal
**File**: New `admin/src/app/components/gift-cards/GiftCardDetailModal.tsx`
**Modify**: `GiftCardsPage.tsx`

- Modal shows:
  - Card number, type, status
  - Initial value, current balance (use `formatCurrency()` from `@shared/utils/currency`)
  - Recipient name/email, message
  - Created date, expiration date
  - Transaction history table (fetch from `GET /api/gift-cards/:id` which includes transactions)
- Actions in modal:
  - **Deactivate** (if ACTIVE) — needs new backend endpoint `PATCH /api/gift-cards/:id/deactivate`
  - **Adjust balance** (admin override) — needs new endpoint `POST /api/gift-cards/:id/adjust`
- Replace the `handleViewDetails` alert with opening this modal

### Task 3: Backend — Missing Admin Endpoints
**File**: `back/src/routes/gift-cards/index.ts` + new route files

- `PATCH /api/gift-cards/:id/deactivate` — set status to CANCELLED, create transaction record
- `POST /api/gift-cards/:id/adjust` — admin balance adjustment (+ or -), create transaction record with notes
- `GET /api/gift-cards/:id` — already exists, but verify it includes `transactions` in response

### Task 4: Currency Audit
**Files**: `back/src/routes/gift-cards/redeem.ts`, `check.ts`, `activate.ts`, `purchase.ts`

- **DB stores cents** (Int fields). Verify all routes treat values as cents consistently.
- `redeem.ts` line 52: `$${card.currentBalance.toFixed(2)}` — if `currentBalance` is cents, this displays wrong (e.g., 5000 cents → "$5000.00" instead of "$50.00")
- `purchase.ts` line 70: validates `amount >= 25` — is this dollars or cents? If cents, min is $0.25 which is wrong. If dollars, it's inconsistent with DB.
- Fix: Either all API inputs/outputs use cents (preferred, matches rest of app) OR clearly document dollar amounts at API boundary and convert. **Recommend cents everywhere.**
- Update `www/src/pages/GiftCard.jsx` and `www/src/services/giftCardService.js` to match.

### Task 5: Website — Add Gift Card to Navigation
**Files**: Website nav/header component (find the Gifts category dropdown)

- Add "Gift Cards" as a nav item **under the "Gifts" category** dropdown, alongside chocolates, candles, soaps, etc.
- Unlike other items (which link to product category pages), this one links to `/gift-cards` (the gift card purchase page)
- This is a special-case nav item — it's not a product category from the DB, it's a hardcoded link
- Verify the existing purchase page works end-to-end with Stripe
- Ensure amounts sent to API match the cents convention (see Task 4)

### Task 6: Website — Check Balance Page
**File**: New `www/src/pages/GiftCardBalance.jsx`
**Modify**: `www/src/routes/root.jsx`

- Simple page: enter card number → calls `POST /api/gift-cards/check` → shows balance
- Add route `/gift-cards/balance`
- Link from footer or gift card page

---

## Implementation Order
1. **Task 4** (Currency audit) — foundational, affects all other tasks
2. **Task 3** (Backend endpoints) — needed by admin UI
3. **Task 1** (Create Batch modal)
4. **Task 2** (Detail modal)
5. **Task 5** (Website nav)
6. **Task 6** (Balance check page)

## Ready for Implementation: ✅

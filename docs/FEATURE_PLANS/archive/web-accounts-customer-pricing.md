# Feature: Web Accounts & Customer-Specific Pricing

## Overview
Use existing `Customer` accounts for `www` login (no separate WebUser model). Discounts can be tied to specific customers, so when they log in and shop online, their pricing applies automatically.

**Primary use case:** St. Mary's Church gets free bud vases for newborn families. They log in on www, order bud vases at $0, shop fulfills.

---

## Goals
- ✅ Online login system for `www` (Customer auth already exists)
- ✅ Customer-specific discounts (extend existing Discount model)
- ✅ Auto-apply discounts at www checkout when customer is logged in
- ✅ Admin can manage which customers get which discounts

---

## Schema Changes

### Use existing `Customer` auth
`Customer` already stores `password`, `isRegistered`, and `lastLogin` and is used for `www` login today.

### Extend: `Discount`
```prisma
// Add nullable fields
customerId        String?
customer          Customer? @relation(fields: [customerId], references: [id])
periodLimit       Int?              // Max uses per period (e.g., 4)
periodType        PeriodType?       // WEEKLY | MONTHLY | YEARLY (calendar windows)
periodWindowDays  Int?              // Rolling window in days (e.g., 7, 30)
```
- When `customerId` is set, discount only applies to that customer.
- When `periodLimit` + `periodType` are set, usage is capped per time window.
  - Example: `periodLimit: 4, periodType: MONTHLY` → 4 free bud vases/month.
  - Checked against `DiscountUsage.usedAt` within the current period.
  - Resets automatically each period (no cron needed — just query the window).
- When `periodLimit` + `periodWindowDays` are set, usage is capped per rolling day window.
  - Example: `periodLimit: 4, periodWindowDays: 30` → 4 uses per rolling 30 days.
  - Example: `periodLimit: 1, periodWindowDays: 7` → 1 use per rolling 7 days.
  - If both `periodType` and `periodWindowDays` are set, prefer `periodWindowDays`.

```prisma
enum PeriodType {
  WEEKLY
  MONTHLY
  YEARLY
}
```

### Extend: `Customer`
```prisma
// Add relations
discounts    Discount[]
```

---

## API Endpoints

### Auth (www)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/customers/login` | Email/password login, returns JWT |
| POST | `/api/customers/logout` | Clear session |
| GET | `/api/customers/me` | Current customer + profile info |

### www Shopping (future - when www e-commerce is built)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/www/products` | Product catalog |
| POST | `/api/discounts/auto-apply` | Auto-apply customer discounts to cart |
| POST | `/api/www/orders` | Place order |

---

## Discount Changes

### Existing `auto-apply` endpoint update
- Accept optional `customerId` parameter
- When checking eligible discounts, include those where `customerId` matches the logged-in customer (or is null for global discounts)
- No change to existing discount logic — just one more filter condition
- Enforce `periodLimit` with either `periodType` (calendar windows) or `periodWindowDays` (rolling windows)

### Admin UI
- Add optional "Customer" dropdown to CreateDiscountModal
- When a customer is selected, discount only applies to that customer
- Label: "Restrict to customer" with customer search/select
- Add "Usage limit per period" fields:
  - Limit count (number)
  - Window type: `Calendar` (Weekly/Monthly/Yearly) or `Rolling days`
  - Rolling days input (e.g., 7, 30)
  - Helper text examples: "4 uses per 30 days", "1 use per 7 days"

---

## Flows

### Setup (Admin)
1. Customer "St. Mary's Church" already exists in CRM
2. Admin creates Discount:
   - Type: `SALE_PRICE`, value: `0`
   - Trigger: `AUTOMATIC_PRODUCT`
   - Products: Bud Vase(s)
   - Customer: St. Mary's Church
   - Max quantity: optional (e.g., 3 per order)
3. Church logs in on `www` using the same email (if not registered yet, they can register and claim the existing customer record)

### Ordering (www)
1. Church person goes to www, logs in
2. Browses catalog, adds bud vases to cart
3. At checkout, system auto-applies $0 pricing
4. Order placed → appears in admin/POS for fulfillment

---

## Implementation Phases

### Phase 1: Schema + Discount Scoping
- [ ] Add `customerId` to `Discount` + migration
- [ ] Add `periodLimit` + `periodType` to `Discount` + migration
- [ ] Add `periodWindowDays` to `Discount` + migration
- [ ] Add `PeriodType` enum

### Phase 2: Discount Scoping + Admin UI
- [ ] Update discount auto-apply logic to filter by `customerId`
- [ ] Update discount validate logic to check `customerId`
- [ ] Add customer selector to CreateDiscountModal
- [ ] Enforce `periodLimit` with `periodType` or `periodWindowDays` (per-customer window) in validate + auto-apply
- [ ] Test: discount only applies for linked customer

### Phase 3: Connect www Auth + Discounts
The www already has: product catalog, cart (CartContext), checkout flow (CheckoutForm, CouponForm, PaymentBox), auth (AuthContext, Login, Signup, Profile), gift cards, wishlist, delivery date picker, and address autocomplete.

Work needed:
- [ ] Pass `customerId` from auth context to discount auto-apply at checkout
- [ ] Update `CartContext.jsx` to fetch and display auto-applied customer discounts
- [ ] Update `CheckoutForm.jsx` to include customer-specific discounts in order submission

---

## Existing www Components (reference)

| Component | Path | Status |
|-----------|------|--------|
| Auth | `www/src/contexts/AuthContext.jsx` | Exists — uses Customer auth |
| Login/Signup | `www/src/pages/Login.jsx`, `Signup.jsx` | Exists — uses Customer auth |
| Cart | `www/src/contexts/CartContext.jsx` | Exists — needs discount integration |
| Checkout | `www/src/components/Checkouts/CheckoutForm.jsx` | Exists — needs customerId pass-through |
| Coupon | `www/src/components/Checkouts/CouponForm.jsx` | Exists — works as-is |
| Product catalog | `www/src/components/Filters/`, `ProductDetails/` | Exists — no changes needed |
| Profile | `www/src/pages/Profile.jsx` | Exists — may need minor updates |

---

## Notes
- www e-commerce is largely built — Phase 3 is integration work, not a greenfield build
- Customer register already supports claiming an existing customer by email (if not registered)

---

**Status:** ✅ Completed — 2026-02-06

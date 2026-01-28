# Feature: Web Accounts & Customer-Specific Pricing

## Overview
Allow customers (e.g., churches, businesses) to create online accounts on `www` that link to their existing customer record. Discounts can be tied to specific customers, so when they log in and shop online, their pricing applies automatically.

**Primary use case:** St. Mary's Church gets free bud vases for newborn families. They log in on www, order bud vases at $0, shop fulfills.

---

## Goals
- ✅ Online login system for `www` (WebUser → Customer)
- ✅ Customer-specific discounts (extend existing Discount model)
- ✅ Auto-apply discounts at www checkout when customer is logged in
- ✅ Admin can manage which customers get which discounts

---

## Schema Changes

### New Model: `WebUser`
```prisma
model WebUser {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String
  customerId   String   @unique
  customer     Customer @relation(fields: [customerId], references: [id])
  lastLoginAt  DateTime?
  enabled      Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

### Extend: `Discount`
```prisma
// Add nullable field
customerId   String?
customer     Customer? @relation(fields: [customerId], references: [id])
```
When `customerId` is set, discount only applies to that customer.

### Extend: `Customer`
```prisma
// Add relations
webUser      WebUser?
discounts    Discount[]
```

---

## API Endpoints

### Auth (www)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/www/auth/login` | Email/password login, returns JWT |
| POST | `/api/www/auth/logout` | Clear session |
| GET | `/api/www/auth/me` | Current user + customer info |

### Web User Management (admin)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/web-users` | List all web users |
| POST | `/api/web-users` | Create web user (link to customer) |
| PUT | `/api/web-users/:id` | Update web user |
| DELETE | `/api/web-users/:id` | Delete web user |
| POST | `/api/web-users/:id/reset-password` | Generate temp password |

### www Shopping (future - when www e-commerce is built)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/www/products` | Product catalog |
| POST | `/api/www/cart/discounts` | Auto-apply customer discounts to cart |
| POST | `/api/www/orders` | Place order |

---

## Discount Changes

### Existing `auto-apply` endpoint update
- Accept optional `customerId` parameter
- When checking eligible discounts, include those where `customerId` matches the logged-in customer
- No change to existing discount logic — just one more filter condition

### Admin UI
- Add optional "Customer" dropdown to CreateDiscountModal
- When a customer is selected, discount only applies to that customer
- Label: "Restrict to customer" with customer search/select

---

## Flows

### Setup (Admin)
1. Customer "St. Mary's Church" already exists in CRM
2. Admin creates a WebUser for them (email + generated password)
3. Admin creates Discount:
   - Type: `SALE_PRICE`, value: `0`
   - Trigger: `AUTOMATIC_PRODUCT`
   - Products: Bud Vase(s)
   - Customer: St. Mary's Church
   - Max quantity: optional (e.g., 3 per order)
4. Share login credentials with church contact

### Ordering (www)
1. Church person goes to www, logs in
2. Browses catalog, adds bud vases to cart
3. At checkout, system auto-applies $0 pricing
4. Order placed → appears in admin/POS for fulfillment

---

## Implementation Phases

### Phase 1: Schema + Auth
- [ ] Add `WebUser` model + migration
- [ ] Add `customerId` to `Discount` + migration
- [ ] Build www auth endpoints (login/logout/me)
- [ ] Build admin web-user CRUD endpoints + UI

### Phase 2: Discount Scoping
- [ ] Update discount auto-apply logic to filter by `customerId`
- [ ] Update discount validate logic to check `customerId`
- [ ] Add customer selector to CreateDiscountModal
- [ ] Test: discount only applies for linked customer

### Phase 3: Connect www Auth + Discounts
The www already has: product catalog, cart (CartContext), checkout flow (CheckoutForm, CouponForm, PaymentBox), auth (AuthContext, Login, Signup, Profile), gift cards, wishlist, delivery date picker, and address autocomplete.

Work needed:
- [ ] Refactor `AuthContext.jsx` to use `WebUser` model (login → `/api/www/auth/login`)
- [ ] Refactor `Signup.jsx` / `CreateAccountModal.jsx` to create WebUser linked to Customer
- [ ] Pass `customerId` from auth context to discount auto-apply at checkout
- [ ] Update `CartContext.jsx` to fetch and display auto-applied customer discounts
- [ ] Update `CheckoutForm.jsx` to include customer-specific discounts in order submission

---

## Existing www Components (reference)

| Component | Path | Status |
|-----------|------|--------|
| Auth | `www/src/contexts/AuthContext.jsx` | Exists — needs WebUser refactor |
| Login/Signup | `www/src/pages/Login.jsx`, `Signup.jsx` | Exists — needs WebUser refactor |
| Cart | `www/src/contexts/CartContext.jsx` | Exists — needs discount integration |
| Checkout | `www/src/components/Checkouts/CheckoutForm.jsx` | Exists — needs customerId pass-through |
| Coupon | `www/src/components/Checkouts/CouponForm.jsx` | Exists — works as-is |
| Product catalog | `www/src/components/Filters/`, `ProductDetails/` | Exists — no changes needed |
| Profile | `www/src/pages/Profile.jsx` | Exists — may need minor updates |

---

## Notes
- www e-commerce is largely built — Phase 3 is integration work, not a greenfield build
- One WebUser per Customer (1:1). If multi-login needed later, change to 1:many
- WebUser auth is separate from admin auth (different JWT/session, different middleware)

---

**Status:** 📜 Draft — awaiting approval

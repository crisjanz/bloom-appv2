# House Account Management System

**Status**: ✅ Completed (2026-02-07)
**Priority**: High
**Estimated Scope**: Medium (2-3 implementation sessions)

---

## Overview

Add house account (HA) management for florist business customers who order frequently and pay monthly instead of per-order. Common use cases: funeral homes, hotels, corporate accounts, event planners.

---

## Goals

1. Track which customers have house accounts enabled
2. Maintain a ledger of charges (orders) and payments per customer
3. Calculate and display current balance
4. Allow staff to apply payments received
5. Generate printable monthly statements
6. Integrate with existing payment flow (HOUSE_ACCOUNT payment method already exists)

---

## Current State

| Component | Status |
|-----------|--------|
| `HOUSE_ACCOUNT` in PaymentMethodType enum | ✅ Exists |
| `houseAccountEnabled` in PaymentSettings | ✅ Exists (global toggle) |
| Per-customer HA tracking | ❌ Missing |
| Transaction ledger | ❌ Missing |

---

## Database Schema Changes

### 1. Add fields to Customer model

```prisma
model Customer {
  // ... existing fields ...

  // House Account
  isHouseAccount       Boolean   @default(false)
  houseAccountTerms    String?   @default("NET_30")  // NET_30, NET_15, etc.
  houseAccountNotes    String?   // Internal notes about this account

  houseAccountLedger   HouseAccountLedger[]
}
```

### 2. New HouseAccountLedger model

```prisma
model HouseAccountLedger {
  id            String   @id @default(uuid())
  customerId    String
  customer      Customer @relation(fields: [customerId], references: [id])

  type          HouseAccountEntryType  // CHARGE, PAYMENT, ADJUSTMENT
  amount        Int                    // cents (positive = charge/owes more, negative = payment/owes less)
  balance       Int                    // running balance after this entry (in cents)

  description   String                 // "Order #1234" or "Payment received - Check #567"
  reference     String?                // order ID, check number, etc.

  orderId       String?                // Link to order if CHARGE
  order         Order?   @relation(fields: [orderId], references: [id])

  transactionId String?                // Link to payment transaction if PAYMENT
  transaction   PaymentTransaction? @relation(fields: [transactionId], references: [id])

  createdAt     DateTime @default(now())
  createdBy     String?                // Employee ID who entered this

  @@index([customerId])
  @@index([createdAt])
}

enum HouseAccountEntryType {
  CHARGE      // Order placed on house account
  PAYMENT     // Payment received from customer
  ADJUSTMENT  // Manual adjustment (write-off, correction, opening balance)
}
```

### Migration

```bash
npx prisma migrate dev --name add_house_account_ledger
```

---

## API Endpoints

### New Routes: `/api/house-accounts`

| Method | Endpoint | Description | Request Body |
|--------|----------|-------------|--------------|
| GET | `/api/house-accounts` | List all HA customers with balances | Query: `?hasBalance=true` |
| GET | `/api/house-accounts/:customerId` | Get customer HA details + ledger | Query: `?from=date&to=date` |
| PUT | `/api/house-accounts/:customerId` | Update HA settings | `{ terms, notes }` |
| POST | `/api/house-accounts/:customerId/enable` | Enable HA for customer | - |
| POST | `/api/house-accounts/:customerId/disable` | Disable HA for customer | - |
| POST | `/api/house-accounts/:customerId/payments` | Apply a payment | `{ amount, reference, notes }` |
| POST | `/api/house-accounts/:customerId/adjustments` | Add adjustment | `{ amount, description }` |
| GET | `/api/house-accounts/:customerId/statement` | Generate statement | Query: `?from=date&to=date` |

### Response Formats

**List response:**
```json
{
  "accounts": [
    {
      "customerId": "uuid",
      "customerName": "Victoria Funeral Home",
      "email": "...",
      "phone": "...",
      "terms": "NET_30",
      "currentBalance": 125000,  // cents ($1,250.00)
      "lastActivity": "2026-02-01T..."
    }
  ]
}
```

**Detail response:**
```json
{
  "customer": { "id", "firstName", "lastName", "email", "phone" },
  "houseAccount": {
    "terms": "NET_30",
    "notes": "Bill to: Accounts Payable dept",
    "currentBalance": 125000
  },
  "ledger": [
    {
      "id": "uuid",
      "type": "CHARGE",
      "amount": 15000,
      "balance": 140000,
      "description": "Order #1234",
      "reference": "order-uuid",
      "createdAt": "2026-02-05T..."
    }
  ]
}
```

**Statement response:**
```json
{
  "customer": { ... },
  "statementPeriod": { "from": "2026-01-01", "to": "2026-01-31" },
  "openingBalance": 50000,
  "charges": [
    { "date": "...", "orderNumber": 1234, "description": "...", "amount": 15000 }
  ],
  "payments": [
    { "date": "...", "reference": "Check #456", "amount": -25000 }
  ],
  "closingBalance": 40000
}
```

---

## Integration with Payment Flow

When an order is paid using `HOUSE_ACCOUNT` payment method:

1. **In `transactionService.ts`** after creating PaymentTransaction:
   - Check if payment method type is `HOUSE_ACCOUNT`
   - Get customer's current balance (sum of ledger entries)
   - Create `HouseAccountLedger` entry:
     - `type`: CHARGE
     - `amount`: order payment amount (positive, in cents)
     - `balance`: previousBalance + amount
     - `description`: `Order #${orderNumber}`
     - `orderId`: order ID
     - `transactionId`: transaction ID

2. **In `houseAccountService.ts`** for applying payments:
   - Get current balance
   - Create `HouseAccountLedger` entry:
     - `type`: PAYMENT
     - `amount`: negative (reduces balance)
     - `balance`: previousBalance - paymentAmount
     - `description`: `Payment received${reference ? ` - ${reference}` : ''}`
     - `reference`: check number, etc.

---

## Admin UI Pages

### 1. House Accounts List Page

**Route:** `/house-accounts`

**Components:**
- Page header: "House Accounts" title + "View All Customers" link
- Filter: Show all / With balance only
- StandardTable columns:
  - Customer name (link to detail)
  - Email
  - Phone
  - Terms (NET_30, etc.)
  - Current Balance (formatted as currency)
  - Last Activity (date)
  - Actions: View, Apply Payment, Statement

### 2. House Account Detail Page

**Route:** `/house-accounts/:customerId`

**Sections:**
1. **Header card:**
   - Customer name, contact info
   - Current balance (large, prominent)
   - Terms (editable dropdown)
   - Notes (editable textarea)
   - Actions: Apply Payment, Add Adjustment, Print Statement

2. **Ledger table:**
   - Date
   - Type (CHARGE/PAYMENT/ADJUSTMENT badge)
   - Description
   - Amount (green for payments, red for charges)
   - Running Balance
   - Reference link (order number links to order)

3. **Pagination** for ledger

### 3. Apply Payment Modal

**Fields:**
- Amount (currency input, required)
- Reference (text, optional - e.g., "Check #1234")
- Notes (textarea, optional)

**On submit:**
- POST to `/api/house-accounts/:customerId/payments`
- Refresh ledger

### 4. Statement View

**Route:** `/house-accounts/:customerId/statement` (or modal)

**Controls:**
- Date range picker (default: current month)
- Print button

**Content:**
- Business header (from ShopSettings)
- Customer billing info
- Statement period
- Opening balance
- Charges table (date, order #, description, amount)
- Payments table (date, reference, amount)
- Closing balance
- Print-friendly CSS (hide nav, controls)

---

## Files to Create

### Backend

| File | Purpose |
|------|---------|
| `back/prisma/schema.prisma` | Add Customer fields + HouseAccountLedger model |
| `back/src/routes/houseAccounts.ts` | All HA routes |
| `back/src/services/houseAccountService.ts` | Business logic |
| `back/src/routes/index.ts` | Register new routes |
| `back/src/services/transactionService.ts` | **Modify** - add ledger entry on HA payment |

### Frontend

| File | Purpose |
|------|---------|
| `admin/src/app/pages/house-accounts/HouseAccountsPage.tsx` | List page |
| `admin/src/app/pages/house-accounts/HouseAccountDetailPage.tsx` | Detail + ledger |
| `admin/src/app/pages/house-accounts/components/ApplyPaymentModal.tsx` | Payment form |
| `admin/src/app/pages/house-accounts/components/AddAdjustmentModal.tsx` | Adjustment form |
| `admin/src/app/pages/house-accounts/components/StatementView.tsx` | Printable statement |
| `admin/src/app/routes/index.tsx` | **Modify** - add routes |
| `admin/src/shared/ui/common/Sidebar.tsx` | **Modify** - add nav item under Operations or Finance |

---

## Implementation Order

1. **Database migration** - Add schema changes, run migration
2. **Backend service** - `houseAccountService.ts` with:
   - `getBalance(customerId)` - sum ledger entries
   - `getLedger(customerId, from?, to?)` - paginated entries
   - `enableAccount(customerId)`
   - `disableAccount(customerId)`
   - `applyPayment(customerId, amount, reference, notes, employeeId)`
   - `addAdjustment(customerId, amount, description, employeeId)`
   - `generateStatement(customerId, from, to)`
3. **Backend routes** - Wire up all endpoints
4. **Transaction integration** - Modify `transactionService.ts` to create ledger entries
5. **Admin list page** - Table of HA customers with balances
6. **Admin detail page** - Customer info + ledger table
7. **Apply payment modal** - Form + API call
8. **Statement view** - Date picker + printable format

---

## Verification Checklist

- [ ] Enable HA for a customer via admin
- [ ] Create an order for that customer
- [ ] Pay order using HOUSE_ACCOUNT method
- [ ] Verify ledger entry created with correct amount
- [ ] Verify balance updated on list and detail pages
- [ ] Apply a payment via modal
- [ ] Verify balance decreases correctly
- [ ] Add a manual adjustment
- [ ] Generate statement for date range
- [ ] Print statement (verify formatting)
- [ ] Disable HA for customer (should still show history)

---

## Out of Scope (Phase 2)

- Online checkout with HA for logged-in customers (www integration)
- Credit limit enforcement
- PDF statement export (just browser print for now)
- Automated monthly statement emails
- Aging reports (30/60/90 days overdue)
- Interest/late fee calculation

---

## UI Patterns Reference

Follow existing patterns from CLAUDE.md:
- Use `StandardTable` for all tables
- Use `Modal` from `@shared/ui/components/ui/modal`
- Use `InputField`, `Select`, `DatePicker` from shared forms
- Use `formatCurrency()` for all money display
- Use `FormFooter` and `LoadingButton` for forms
- Currency in cents everywhere (use `dollarsToCents()` for input)

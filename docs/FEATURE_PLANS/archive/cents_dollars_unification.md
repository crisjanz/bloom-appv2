# Cents/Dollars Unification Plan

**Status:** 📜 Ready for Implementation
**Priority:** CRITICAL
**Effort:** 4-6 hours
**Created:** 2026-01-16

---

## 🎯 Problem Statement

**Current Issue:** Inconsistent currency handling causes frequent bugs:
- Delivery fees showing as $1400.00 instead of $14.00 (double conversion)
- Some values in cents, some in dollars, difficult to track
- Manual conversions scattered throughout codebase
- Every new session introduces conversion bugs

**Root Cause Analysis:**
```
✅ Database (Prisma):         CENTS (Int)
✅ Backend API:               CENTS (Int)
❌ Frontend State:            MIXED (delivery fees in cents, product prices in dollars)
❌ usePaymentCalculations:   INPUT: cents → OUTPUT: dollars (confusing!)
❌ Display Logic:             Manual conversions everywhere
```

**Industry Standard (Stripe, Shopify, Square):**
- Store EVERYTHING in cents (smallest currency unit)
- Process EVERYTHING in cents
- Convert to dollars ONLY for display via utility function
- Single source of truth: "if it's a number, it's cents"

---

## 🎯 Goals

1. **Unify all monetary values to cents** throughout the entire frontend
2. **Single conversion point** via `formatCurrency()` utility
3. **Eliminate manual /100 conversions** scattered in code
4. **TypeScript safety** with branded types (optional but recommended)
5. **Zero floating-point errors** in calculations

---

## 📋 Current State Audit

### Database Schema (✅ Already in Cents)
```prisma
model ProductVariant {
  price           Int      // cents
  discountPrice   Int?     // cents
  priceDifference Int?     // cents
}

model OrderItem {
  unitPrice Int  // cents
  rowTotal  Int  // cents
}

model Order {
  deliveryFee Int @default(0)  // cents
  discount    Int @default(0)  // cents
}
```

### Frontend State (❌ MIXED - Problem Area)
```typescript
// TakeOrderPage - customProducts
type Product = {
  description: string;
  category: string;
  price: string;      // ❌ DOLLARS as string (e.g., "25.00")
  qty: string;
  tax: boolean;
}

// usePaymentCalculations
const { itemTotal, gst, pst, grandTotal } = usePaymentCalculations(
  orders,
  deliveryFeeInCents,   // ✓ INPUT: cents
  discountInCents       // ✓ INPUT: cents
);
// ❌ OUTPUT: dollars (itemTotal, gst, pst, grandTotal all in dollars)
```

### Affected Components
1. **TakeOrderPage** (`admin/src/app/pages/orders/TakeOrderPage.tsx`)
   - `customProducts.price` stored as dollars (string)
   - `calculateItemsTotal()` uses `parseFloat(p.price)` (dollars)

2. **ProductsCard** (`admin/src/app/components/orders/ProductsCard.tsx`)
   - Input fields show dollars
   - Stores as dollar strings

3. **usePaymentCalculations** (`admin/src/domains/payments/hooks/usePaymentCalculations.ts`)
   - Accepts cents, returns dollars (confusing!)
   - Line 25: `deliveryChargeInDollars = deliveryCharge / 100`

4. **TakeOrderPaymentTiles** (`admin/src/app/components/orders/payment/TakeOrderPaymentTiles.tsx`)
   - Manual display conversions
   - Line 347: `${(safeTotalDeliveryFee / 100).toFixed(2)}`

5. **PaymentSection** (`admin/src/app/components/orders/payment/PaymentSection.tsx`)
   - Passes totals to API (needs to be in cents)

6. **POS Components** (`admin/src/app/components/pos/*`)
   - Need audit for consistency

---

## 🏗️ Implementation Plan

### Phase 1: Create Utility Functions (15 min)

**File:** `admin/src/shared/utils/currency.ts`

```typescript
/**
 * Currency utilities - Single source of truth for money handling
 *
 * RULE: ALL monetary values are stored in CENTS throughout the app.
 * ONLY convert to dollars for display using formatCurrency().
 */

/** Cents - branded type for type safety */
export type Cents = number & { readonly __brand: 'Cents' };

/** Dollars - only for display, never for storage */
export type Dollars = string;

/**
 * Convert cents to formatted dollar string for display
 * @param cents - Amount in cents (e.g., 2500)
 * @returns Formatted dollar string (e.g., "$25.00")
 */
export function formatCurrency(cents: number): Dollars {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Convert cents to dollar number (for calculations if needed)
 * @param cents - Amount in cents
 * @returns Dollars as number (e.g., 25.00)
 */
export function centsToDollars(cents: number): number {
  return cents / 100;
}

/**
 * Convert dollar input to cents for storage
 * @param dollars - Dollar amount as string or number (e.g., "25.00" or 25)
 * @returns Cents as integer (e.g., 2500)
 */
export function dollarsToCents(dollars: string | number): number {
  const dollarNum = typeof dollars === 'string' ? parseFloat(dollars) : dollars;
  return Math.round(dollarNum * 100);
}

/**
 * Parse user input (handles various formats)
 * @param input - User input (e.g., "25", "25.00", "$25")
 * @returns Cents as integer
 */
export function parseUserCurrency(input: string): number {
  const cleaned = input.replace(/[$,]/g, '');
  const dollars = parseFloat(cleaned) || 0;
  return Math.round(dollars * 100);
}
```

### Phase 2: Refactor usePaymentCalculations (30 min)

**File:** `admin/src/domains/payments/hooks/usePaymentCalculations.ts`

**BEFORE:**
```typescript
export const usePaymentCalculations = (
  orders: OrderEntry[],
  deliveryCharge: number,      // cents
  discount: number,             // cents
  discountType: '$' | '%'
) => {
  // Converts to dollars internally
  const deliveryChargeInDollars = deliveryCharge / 100;
  const discountInDollars = discount / 100;

  // Returns dollars
  return {
    itemTotal,    // dollars
    gst,          // dollars
    pst,          // dollars
    grandTotal    // dollars
  };
};
```

**AFTER:**
```typescript
import { dollarsToCents } from '@shared/utils/currency';

export const usePaymentCalculations = (
  orders: OrderEntry[],
  deliveryChargeCents: number,  // cents
  discountCents: number,         // cents
  discountType: '$' | '%'
) => {
  // Calculate base item total IN CENTS
  const itemTotalCents = useMemo(() => {
    return orders.reduce((total, order) => {
      const subtotal = order.customProducts.reduce((sum, item) => {
        // Convert product price from cents to cents (no-op once we fix products)
        const priceCents = parseInt(item.price) || 0; // Will be cents after Phase 3
        const qty = parseInt(item.qty) || 0;
        return sum + priceCents * qty;
      }, 0);
      return total + subtotal;
    }, 0);
  }, [orders]);

  // All calculations in CENTS
  const subtotalBeforeTaxCents = Math.max(0, itemTotalCents + deliveryChargeCents - discountCents);

  // Calculate taxable amount in CENTS
  const taxableAmountCents = /* ... calculate from products with tax=true */;

  // GST/PST in CENTS
  const gstCents = Math.round(taxableAmountCents * (individualTaxRates.gst / 100));
  const pstCents = Math.round(taxableAmountCents * (individualTaxRates.pst / 100));

  // Grand total in CENTS
  const grandTotalCents = Math.max(0, subtotalBeforeTaxCents + gstCents + pstCents);

  // Return EVERYTHING in cents
  return {
    itemTotal: itemTotalCents,       // cents
    subtotal: subtotalBeforeTaxCents, // cents
    gst: gstCents,                   // cents
    pst: pstCents,                   // cents
    grandTotal: grandTotalCents,     // cents
    calculateDiscountAmount: discountCents, // cents
    taxRates: individualTaxRates
  };
};
```

### Phase 3: Refactor Product State to Cents (1 hour)

**File:** `admin/src/app/components/orders/ProductsCard.tsx`

**Type Changes:**
```typescript
type Product = {
  description: string;
  category: string;
  price: string;  // KEEP as string for input binding, but store CENTS
  qty: string;
  tax: boolean;
  productId?: string;
};
```

**Input Handling:**
```typescript
// When user types in price field
const handlePriceChange = (index: number, value: string) => {
  // Store the raw input string for display
  handleProductChange(index, 'price', value);
};

// When calculating totals, convert to cents
const calculateRowTotal = (priceInput: string, qty: string): string => {
  const priceCents = parseUserCurrency(priceInput);
  const quantity = parseInt(qty) || 0;
  const totalCents = priceCents * quantity;
  return formatCurrency(totalCents);
};
```

**Display:**
```typescript
<InputField
  label="Price"
  type="text"
  value={product.price || ''}
  onChange={(e) => handlePriceChange(index, e.target.value)}
  placeholder="25.00"
/>
```

### Phase 4: Update TakeOrderPage (1 hour)

**File:** `admin/src/app/pages/orders/TakeOrderPage.tsx`

**State Changes:**
```typescript
// Product prices now stored as cent strings internally
// But displayed as dollar strings in inputs

const calculateItemsTotal = () => {
  return orderState.orders.reduce((sum, order) => {
    return sum + order.customProducts.reduce((pSum, p) => {
      const priceCents = parseUserCurrency(p.price);
      const qty = parseInt(p.qty) || 0;
      return pSum + (priceCents * qty);
    }, 0);
  }, 0);
};

// All values now in cents
const { itemTotal, gst, pst, grandTotal } = usePaymentCalculations(
  orderState.orders,
  totalDeliveryFee,   // Already in cents
  totalDiscountCents, // Already in cents
  "$"
);
```

**Display Updates:**
```typescript
{/* All displays use formatCurrency */}
<div>Items Total: {formatCurrency(itemTotal)}</div>
<div>Delivery Fee: {formatCurrency(totalDeliveryFee)}</div>
<div>GST: {formatCurrency(gst)}</div>
<div>PST: {formatCurrency(pst)}</div>
<div>Grand Total: {formatCurrency(grandTotal)}</div>
```

### Phase 5: Update All Display Components (1.5 hours)

**Components to Update:**

1. **TakeOrderPaymentTiles.tsx**
```typescript
// BEFORE: Manual conversions
<span>${(safeTotalDeliveryFee / 100).toFixed(2)}</span>
<span>${safeGst.toFixed(2)}</span>

// AFTER: Single utility
<span>{formatCurrency(totalDeliveryFee)}</span>
<span>{formatCurrency(gst)}</span>
```

2. **PaymentSection.tsx**
```typescript
// Pass cents to API (no conversion needed)
const totals = {
  itemTotal,        // cents
  deliveryFee: totalDeliveryFee, // cents
  discount: manualDiscount + couponDiscount + giftCardDiscount, // cents
  gst,              // cents
  pst,              // cents
  grandTotal        // cents
};
```

3. **POS Components**
   - PaymentController.tsx
   - POSTransactionView.tsx
   - SplitPaymentView.tsx

### Phase 6: Update API Response Handling (30 min)

**When fetching products from API:**
```typescript
// API returns price in cents
const product = await fetch('/api/products/123').then(r => r.json());

// Display to user (convert for input field)
setFormData({
  ...formData,
  price: (product.price / 100).toFixed(2) // Show as dollars in input
});

// Store internally as cents string for calculations
const internalPrice = product.price.toString(); // Keep as cents
```

### Phase 7: Update CLAUDE.md Documentation (15 min)

Replace the "Dollar/Cents Conversion Pattern" section with:

```markdown
### Currency Handling Pattern

**CRITICAL - ALWAYS follow this unified pattern**

**Single Source of Truth:**
- **ALL monetary values are in CENTS** (integers) throughout the application
- **Database**: cents (Int)
- **Backend API**: cents (Int)
- **Frontend State**: cents (numbers)
- **Display ONLY**: dollars via `formatCurrency()`

**Utility Functions:**
```tsx
import { formatCurrency, dollarsToCents, parseUserCurrency } from '@shared/utils/currency';

// Display cents as dollars
<div>Total: {formatCurrency(totalCents)}</div>  // "$25.00"

// Convert user input to cents
const cents = parseUserCurrency(userInput);  // "25.00" → 2500

// Convert dollars to cents
const cents = dollarsToCents(25.00);  // 2500
```

**Common Patterns:**

```tsx
// ✅ CORRECT - Everything in cents
const { itemTotal, gst, pst, grandTotal } = usePaymentCalculations(
  orders,
  deliveryFeeCents,
  discountCents,
  "$"
);
// Returns: ALL values in cents

// Display
<span>{formatCurrency(itemTotal)}</span>
<span>{formatCurrency(gst)}</span>
<span>{formatCurrency(grandTotal)}</span>

// ❌ WRONG - Manual conversions
<span>${(itemTotal / 100).toFixed(2)}</span>  // Never do this!
```

**Input Fields:**
```tsx
// Product price input (user enters dollars, we store as cents)
<InputField
  label="Price"
  value={(priceCents / 100).toFixed(2)}  // Display as dollars
  onChange={(e) => {
    const cents = dollarsToCents(e.target.value);
    updatePrice(cents);  // Store as cents
  }}
/>
```

**Why This Matters:**
- Prevents $1400.00 vs $14.00 bugs completely
- Single conversion point = impossible to miss
- No floating-point errors (integers only)
- Matches industry standard (Stripe, Shopify, Square)
```

---

## 🧪 Testing Plan

### Unit Tests
- [ ] `formatCurrency(2500)` → `"$25.00"`
- [ ] `dollarsToCents("25.00")` → `2500`
- [ ] `parseUserCurrency("$25")` → `2500`
- [ ] `usePaymentCalculations` returns all values in cents

### Integration Tests
1. **TakeOrderPage**
   - [ ] Add product with price $25.00
   - [ ] Verify `itemTotal` is 2500 cents
   - [ ] Verify display shows "$25.00"

2. **Payment Flow**
   - [ ] Create order with $100 delivery fee
   - [ ] Verify delivery fee stored as 10000 cents
   - [ ] Verify API receives 10000, not 100

3. **Tax Calculations**
   - [ ] $100 order with 5% GST
   - [ ] Verify GST calculated as 500 cents ($5.00)

### Manual Testing Checklist
- [ ] TakeOrder: Add products, verify prices display correctly
- [ ] TakeOrder: Check delivery fee shows correct amount
- [ ] Payment: Complete order, verify totals are correct
- [ ] POS: Process transaction, verify amounts
- [ ] Order View: Check all monetary values display properly

---

## 🚨 Breaking Changes & Migration

### Database Migration
**NOT NEEDED** - Database already stores cents.

### API Changes
**NOT NEEDED** - API already uses cents.

### Frontend Migration
**Backward Compatibility:**
- Old orders in state with dollar prices will be converted on load
- Migration function to convert existing localStorage/cache

```typescript
// Migration helper (run once on app load)
function migrateOrderStateToCents(orders: any[]) {
  return orders.map(order => ({
    ...order,
    customProducts: order.customProducts.map(p => ({
      ...p,
      // If price is < 1000, assume it's dollars and convert
      price: parseFloat(p.price) < 1000
        ? dollarsToCents(p.price).toString()
        : p.price
    }))
  }));
}
```

---

## 📊 Success Metrics

- [ ] Zero manual `/ 100` or `* 100` conversions outside `currency.ts`
- [ ] All `usePaymentCalculations` outputs in cents
- [ ] All display logic uses `formatCurrency()`
- [ ] TypeScript errors for incorrect usage (if using branded types)
- [ ] No currency bugs reported in next 3 sessions

---

## 🔄 Rollout Plan

1. **Create utility functions** - Safe, no breaking changes
2. **Update CLAUDE.md** - Document new pattern
3. **Refactor usePaymentCalculations** - Core calculation fix
4. **Update TakeOrderPage** - Most critical user-facing area
5. **Update payment components** - Payment flow fix
6. **Update POS components** - Last but important
7. **Testing & validation** - Full regression test

**Estimated Time:** 4-6 hours total

---

## ✅ Definition of Done

- [ ] All monetary values stored as cents (numbers) in frontend state
- [ ] `formatCurrency()` utility used for ALL displays
- [ ] `usePaymentCalculations` accepts cents, returns cents
- [ ] Zero manual conversions outside utility functions
- [ ] CLAUDE.md updated with new pattern
- [ ] All tests passing
- [ ] Can create order in TakeOrder with correct totals
- [ ] Can process payment in POS with correct amounts
- [ ] Delivery fees display correctly ($14.00, not $1400.00 or $0.14)

---

## 📝 Notes

- This is the ROOT CAUSE of recurring currency bugs
- One-time effort eliminates entire class of bugs
- Follows industry best practices (Stripe, Shopify, Square)
- TypeScript branded types optional but recommended for extra safety

# Payment Refactoring Backup - January 2025

## Purpose
This backup contains original versions of payment-related files BEFORE the comprehensive refactoring.
Created on: October 18, 2025

## Files Backed Up

### 1. PaymentController.tsx.backup (1,426 lines)
**Original Path:** `/admin/src/app/components/pos/payment/PaymentController.tsx`
**Used By:** POSPage.tsx
**Purpose:** Main POS payment collection controller with split payment, discounts, gift cards

### 2. POSUnifiedPaymentModal.tsx.backup (1,316 lines)
**Original Path:** `/admin/src/app/components/pos/payment/POSUnifiedPaymentModal.tsx`
**Used By:** NONE (Dead code - not imported anywhere)
**Purpose:** Duplicate payment modal (to be deleted)

### 3. CreateDiscountModal.tsx.backup (1,037 lines)
**Original Path:** `/admin/src/app/components/discounts/CreateDiscountModal.tsx`
**Used By:** Discount management pages
**Purpose:** Create/edit discount rules and coupons

### 4. CardPaymentModal.tsx.backup (766 lines)
**Original Path:** `/admin/src/app/components/pos/payment/CardPaymentModal.tsx`
**Used By:** PaymentController (old implementation)
**Purpose:** Card payment processing (Stripe/Square)

### 5. PaymentSection.tsx.backup (763 lines)
**Original Path:** `/admin/src/app/components/orders/payment/PaymentSection.tsx`
**Used By:** TakeOrderPage
**Purpose:** Payment section for take-order workflow

## Total Lines: 5,307 lines

## Refactoring Goals
- Delete dead code (POSUnifiedPaymentModal)
- Extract shared utilities (formatCurrency, mapPaymentMethodType, etc.)
- Create focused payment hooks
- Fix guest customer creation bug
- Reduce duplication
- Improve maintainability

## Target: ~2,500 lines (53% reduction)

## How to Use This Backup
If you need to reference the original implementation:
1. Open the `.backup` file
2. Compare with the refactored version
3. Look for the specific function/logic you need

## Notes
- All files include full implementation with comments
- Line numbers may differ from current versions
- Keep this backup until refactoring is complete and tested in production

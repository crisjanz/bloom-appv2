# Toast Notifications (sonner) - Admin Dashboard

**Status:** 🔜 Ready for Implementation
**Created:** 2026-02-15
**Priority:** High

---

## Overview
Save/submit handlers throughout the admin dashboard have no success feedback. The button spins briefly then nothing happens. Some handlers use `alert()`, some use custom state messages, most are completely silent. Adding `sonner` toast library for consistent success/error feedback on all save operations.

---

## 🤖 Implementation Constraints for AI

**CRITICAL - Read Before Implementing:**

> **⚠️ FOR AI ASSISTANTS: You MUST read the required documentation before writing code. Follow existing patterns exactly.**

### Required Reading (IN ORDER)
1. `/CLAUDE.md` ← **READ THIS FIRST** (project conventions, form patterns, toast rules)
2. `/docs/AI_IMPLEMENTATION_GUIDE.md` (all patterns)

### Pattern Reference Files
- **Toast usage pattern:** See "Toast Pattern" section below
- **Save handler examples:** `/admin/src/app/pages/customers/CustomerFormPage.tsx`
- **Settings card examples:** `/admin/src/app/components/settings/business/StoreInfoCard.tsx`

### Critical Don'ts
❌ Use `alert()` for success/error feedback → Use `toast.success()` / `toast.error()`
❌ Leave save handlers without user-visible feedback
❌ Add `<Toaster />` anywhere except `App.tsx` (already mounted once)
❌ Use custom `setSuccessMessage` state patterns → Use `toast` instead
❌ Remove existing error state (`setError`) that displays inline — only replace `alert()` and add missing success feedback

---

## Goals

1. **Every save/submit/delete action shows a toast notification** confirming success or failure
2. **Replace all `alert()` calls** with toast equivalents
3. **Clean up redundant `setSuccessMessage` patterns** where toast replaces them
4. **Update CLAUDE.md** with toast notification rules for future development

---

## Architecture

### Library
- **Package:** `sonner` (npm install in `admin/`)
- **Mount:** `<Toaster />` in `admin/src/app/App.tsx` with `richColors` and `position="top-right"`

### Toast Pattern
```tsx
import { toast } from 'sonner';

// In any save handler:
try {
  const response = await fetch(...);
  if (!response.ok) throw new Error('Failed to save');
  toast.success('Customer saved');
} catch (err) {
  toast.error('Failed to save customer');
}

// For delete confirmations:
toast.success('Employee deleted');

// Keep messages short and specific:
// ✅ "Settings saved"
// ✅ "Address deleted"
// ✅ "Password updated"
// ❌ "Your settings have been saved successfully!"
```

---

## Implementation Checklist

### Phase 1: Setup
- [ ] Run `npm install sonner` in `admin/`
- [ ] Add `<Toaster richColors position="top-right" />` to `admin/src/app/App.tsx`
- [ ] Update `/CLAUDE.md` — add toast notification rules to Form Patterns section (see "CLAUDE.md Addition" below)

### Phase 2: Migrate `alert()` calls to toast
- [ ] `admin/src/app/components/orders/RecipientCard.tsx` — multiple alert() calls
- [ ] `admin/src/app/components/customers/AdditionalAddressesCard.tsx` — alert() on validation
- [ ] `admin/src/app/components/settings/website/AnnouncementBannerCard.tsx` — alert() on save
- [ ] `admin/src/app/pages/FulfillmentPage.tsx` — alert() on image save

### Phase 3: Add toast to silent settings save handlers
- [ ] `admin/src/app/components/settings/business/StoreInfoCard.tsx`
- [ ] `admin/src/app/components/settings/business/BusinessHoursCard.tsx`
- [ ] `admin/src/app/components/settings/business/TaxCard.tsx`
- [ ] `admin/src/app/components/settings/business/EmployeeListCard.tsx`
- [ ] `admin/src/app/components/settings/business/AddressShortcutsCard.tsx`
- [ ] `admin/src/app/components/settings/orders/GeneralSettingsCard.tsx`
- [ ] `admin/src/app/components/settings/orders/WireoutSettingsCard.tsx`
- [ ] `admin/src/app/components/settings/orders/AddOnGroupsCard.tsx`
- [ ] `admin/src/app/components/settings/delivery/DeliveryChargesCard.tsx`
- [ ] `admin/src/app/components/settings/delivery/DeliveryPickupTimesCard.tsx`
- [ ] `admin/src/app/components/settings/payments/BuiltInMethodsCard.tsx`
- [ ] `admin/src/app/components/settings/payments/StripeCard.tsx`
- [ ] `admin/src/app/components/settings/payments/SquareCard.tsx`
- [ ] `admin/src/app/components/settings/payments/PaypalCard.tsx`
- [ ] `admin/src/app/components/settings/payments/OtherMethodsCard.tsx`
- [ ] `admin/src/app/components/settings/payments/HouseAccountsCard.tsx`
- [ ] `admin/src/app/components/settings/notifications/OrderStatusNotificationsCard.tsx`
- [ ] `admin/src/app/components/settings/notifications/NotificationTemplatesCard.tsx`
- [ ] `admin/src/app/components/settings/pos/POSTabsCard.tsx`
- [ ] `admin/src/app/components/settings/website/FAQManagementCard.tsx`
- [ ] `admin/src/app/components/settings/website/MessageSuggestionsCard.tsx`
- [ ] `admin/src/app/components/settings/website/ReportingCategoriesCard.tsx`
- [ ] `admin/src/app/components/settings/ChangePasswordModal.tsx`
- [ ] `admin/src/app/components/settings/business/SetPasswordModal.tsx`
- [ ] `admin/src/app/pages/settings/print.tsx`
- [ ] `admin/src/app/pages/settings/email.tsx`

### Phase 4: Add toast to silent page/modal save handlers
- [ ] `admin/src/app/pages/customers/CustomerFormPage.tsx`
- [ ] `admin/src/app/components/orders/edit/modals/DeliveryEditModal.tsx`
- [ ] `admin/src/app/components/orders/edit/modals/RecipientEditModal.tsx`
- [ ] `admin/src/app/components/orders/edit/modals/CustomerEditModal.tsx`
- [ ] `admin/src/app/components/orders/edit/modals/PaymentEditModal.tsx`
- [ ] `admin/src/app/components/orders/ScanExternalOrderModal.tsx`
- [ ] `admin/src/app/pages/house-accounts/HouseAccountDetailPage.tsx`
- [ ] `admin/src/app/pages/house-accounts/components/AddAdjustmentModal.tsx`
- [ ] `admin/src/app/pages/house-accounts/components/ApplyPaymentModal.tsx`
- [ ] `admin/src/app/pages/marketing/BirthdayGiftsPage.tsx`
- [ ] `admin/src/app/pages/mobile/MobileInventoryPage.tsx`
- [ ] `admin/src/app/components/inventory/QuickAdjustModal.tsx`
- [ ] `admin/src/app/components/gift-cards/CreateBatchModal.tsx`
- [ ] `admin/src/app/components/gift-cards/GiftCardSaleModal.tsx`
- [ ] `admin/src/app/components/settings/misc/ImportCard.tsx`
- [ ] `admin/src/app/components/settings/misc/ImportJsonCard.tsx`

### Phase 5: Cleanup & Documentation
- [ ] Remove `setSuccessMessage` / `setStatusMessage` state + JSX where replaced by toast
- [ ] Verify no remaining `alert()` calls for save/error feedback
- [ ] Update `/docs/Progress_Tracker.markdown`
- [ ] Archive this feature plan to `/docs/FEATURE_PLANS/archive/`

---

## CLAUDE.md Addition

Add to the **Form Patterns** section after "Error Display":

```markdown
**Success Feedback (Toast Notifications):**
- `import { toast } from 'sonner'` - **Use for ALL save/submit success feedback**
- **EVERY save/submit handler MUST show a toast on success**: `toast.success('Customer saved')`
- **EVERY save/submit handler MUST show a toast on error**: `toast.error('Failed to save customer')`
- Keep messages short and specific (e.g., "Settings saved", "Order updated", "Address deleted")
- NEVER use `alert()` for success/error feedback
- NEVER leave save handlers without user-visible success confirmation
- `<Toaster />` is already mounted in `App.tsx` — do not add it again
```

---

## Success Criteria

- [ ] All save/submit/delete handlers show toast on success
- [ ] All save/submit/delete handlers show toast on error
- [ ] No `alert()` calls remain for save/error feedback
- [ ] Dark mode toasts render correctly
- [ ] CLAUDE.md updated with toast rules
- [ ] No console errors

---

## Post-Implementation

1. **Verify** all success criteria met
2. **Update** Progress_Tracker — mark as completed
3. **REQUIRED**: Move this file to `/docs/FEATURE_PLANS/archive/`
4. **Commit**: `feat: add toast notifications across admin dashboard`
5. **Push**: Ask Cris for confirmation before pushing

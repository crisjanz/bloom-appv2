# Customer/Address Schema Refactor

**Status:** 🔜 Ready for Implementation
**Created:** 2026-02-09
**Priority:** High

---

## Overview

Simplify the Customer/Address schema to eliminate redundancy and confusion. Current issues:
1. `homeAddressId` on Customer is redundant (should be `isPrimary` on Address or `primaryAddressId` on Customer)
2. `firstName`/`lastName` on Address duplicates Customer name (confusing for recipient scenarios)
3. `label` and `addressType` overlap (both describe address type)
4. Merge operations create duplicate addresses (same content, multiple records)
5. Checkout shows multiple dropdown entries for same recipient (one per address, not per recipient)

**Proposed Changes:**
- Rename `homeAddressId` → `primaryAddressId` (clearer naming)
- Replace `firstName`/`lastName` → `attention` (for business deliveries: "Attn: Reception")
- Remove `label` field entirely (addressType will replace it, start fresh - DO NOT migrate label data)
- Change `addressType` from enum to String (allow custom values)
- Fix merge logic to deduplicate addresses by content

---

## 🤖 Implementation Constraints for AI

**CRITICAL - Read Before Implementing:**

> **⚠️ This is a live production database. Follow the safe migration strategy exactly. NO data loss is acceptable.**

### Required Reading (IN ORDER)
1. `/docs/AI_IMPLEMENTATION_GUIDE.md` ← **READ THIS FIRST**
2. `/docs/System_Reference.md` (architecture context)
3. `/docs/DISCUSSION_RECAP_Customer_Address_Schema.md` (refactor context)
4. `/CLAUDE.md` (project conventions)

### Critical Don'ts
❌ Remove old fields immediately → Use multi-step migration (add new, migrate data, remove old)
❌ Lose production data → Test migration script on dev database first
❌ Skip data verification → Verify row counts match before/after
❌ Push without confirmation → ALWAYS ask user before `git push`

### Safe Migration Strategy (MANDATORY)

**Phase 1: Additive Changes (No Data Loss)**
- Add new fields alongside old fields
- Keep all existing data intact

**Phase 2: Data Migration**
- Run migration script to copy old → new
- Verify data integrity (row counts, sample checks)

**Phase 3: Code Updates**
- Update all 177+ files to use new fields
- Test each layer (backend → admin → www)

**Phase 4: Cleanup (After Verification)**
- Remove old fields only after everything works

---

## Goals

1. **Simplify schema**: Remove redundant fields (`homeAddressId`, `firstName`/`lastName`, `label`)
2. **Preserve all data**: No data loss during migration (live Render database)
3. **Fix duplicate addresses**: Merge logic deduplicates by content
4. **Fix checkout dropdown**: Show one entry per recipient, not per address
5. **Update 177+ files**: All references updated to use new schema

---

## Architecture & Endpoints

### Database Schema Changes

**Before:**
```prisma
model Customer {
  id            String   @id @default(uuid())
  firstName     String
  lastName      String
  email         String?
  phone         String?
  homeAddressId String?  // Points to "primary" address
  homeAddress   Address? @relation("HomeAddress", fields: [homeAddressId], references: [id])
  addresses     Address[] @relation("CustomerAddresses")
}

model Address {
  id          String       @id @default(uuid())
  customerId  String
  customer    Customer     @relation("CustomerAddresses", fields: [customerId], references: [id])

  firstName   String?      // Confusing - duplicates customer name
  lastName    String?      // Confusing - duplicates customer name
  phone       String?
  label       String?      // "Home", "Work", "Mom's House"
  addressType AddressType? // RESIDENCE, BUSINESS, HOSPITAL, FUNERAL_HOME

  address1    String
  address2    String?
  city        String
  province    String
  postalCode  String
  country     String       @default("CA")
}
```

**After:**
```prisma
model Customer {
  id               String   @id @default(uuid())
  firstName        String
  lastName         String
  email            String?
  phone            String?
  primaryAddressId String?  // Renamed from homeAddressId (clearer)
  primaryAddress   Address? @relation("PrimaryAddress", fields: [primaryAddressId], references: [id])
  addresses        Address[] @relation("CustomerAddresses")
}

model Address {
  id          String   @id @default(uuid())
  customerId  String
  customer    Customer @relation("CustomerAddresses", fields: [customerId], references: [id])

  attention   String?  // "Reception", "Attn: Sarah in Unit 3" (replaces firstName/lastName)
  phone       String?
  addressType String?  // Free text, UI provides common options (RESIDENCE, BUSINESS, HOSPITAL, FUNERAL_HOME, Custom)

  address1    String
  address2    String?
  city        String
  province    String
  postalCode  String
  country     String   @default("CA")
}
```

### Migration Steps

**Migration 1: Add New Fields**
```bash
npx prisma migrate dev --name add_primary_address_and_attention
```

Changes:
- Add `Customer.primaryAddressId` (nullable, keeps `homeAddressId`)
- Add `Address.attention` (nullable, keeps `firstName`/`lastName`)
- Change `Address.addressType` from enum to String (keeps `label`)

**Migration 2: Data Migration Script**
Run custom script to:
- Copy `homeAddressId` → `primaryAddressId`
- Copy `firstName + " " + lastName` → `attention` (if present)
- **DO NOT copy `label`** - Drop it, addressType will be set by users going forward

**Migration 3: Remove Old Fields**
```bash
npx prisma migrate dev --name remove_old_address_fields
```

Changes:
- Remove `Customer.homeAddressId`
- Remove `Address.firstName`
- Remove `Address.lastName`
- Remove `Address.label`

### Backend Routes to Update

**Primary files:**
- `/back/src/routes/customers.ts` - Customer CRUD + merge logic (deduplicate addresses)
- `/back/src/routes/orders/create.ts` - Order creation (uses addresses)
- `/back/src/routes/orders/update.ts` - Order updates (uses addresses)
- `/back/src/routes/orders/create-from-scan.ts` - Scan order creation
- `/back/src/routes/import.ts` - Data import
- `/back/src/routes/import-json.ts` - JSON import
- `/back/src/utils/notificationTriggers.ts` - Uses homeAddress

**All files (177 total) - Search results:**
- Backend: 50+ files (routes, services, utils, templates)
- Admin: 100+ files (pages, components, hooks, domains)
- www: 20+ files (checkout, profile, services)

---

## UI Requirements

### Frontend Changes Needed

**Admin Components:**
1. **HomeAddressCard.tsx** → Rename to **PrimaryAddressCard.tsx**
   - Change `homeAddress` → `primaryAddress`
   - Change `homeAddressId` → `primaryAddressId`

2. **CustomerFormPage.tsx** - Update address form
   - Replace `firstName`/`lastName` inputs → single `attention` input
   - Replace `label` input → `addressType` dropdown with custom option
   - Dropdown options: RESIDENCE, BUSINESS, HOSPITAL, FUNERAL_HOME, Custom

3. **AddAddressModal.tsx** - Update address form
   - Same changes as CustomerFormPage

4. **AddressesCard.tsx** - Display addresses
   - Show `attention` instead of `firstName lastName`
   - Show `addressType` instead of `label`

5. **RecipientCard.tsx** - Order recipient display
   - Use `attention` field for business deliveries
   - Update address display

6. **TakeOrderPage.tsx** - Order creation
   - Update recipient address handling

7. **POSPage.tsx** - Customer selection
   - Update customer/address display

**www Components:**
1. **Checkout pages** - All checkout steps
   - Update address forms (attention + addressType)
   - Update saved recipients dropdown

2. **Profile page** - Customer address management
   - Update address display/edit

### User Flow Changes

**Before:**
- Customer has `homeAddress` (primary)
- Address has `firstName`, `lastName`, `label`, `addressType`
- Checkout shows 3 entries for 1 recipient with 3 addresses

**After:**
- Customer has `primaryAddress` (clearer naming)
- Address has `attention`, `addressType` only
- Checkout shows 1 entry per recipient (selects primary address by default)

---

## Implementation Checklist

### Phase 1: Database Migration (Additive)
- [ ] Update Prisma schema (add new fields, keep old)
- [ ] Run migration: `npx prisma migrate dev --name add_primary_address_and_attention`
- [ ] Verify migration on dev database
- [ ] Deploy to Render staging (migration runs automatically)
- [ ] Verify Render database (both old and new fields exist)

### Phase 2: Data Migration Script
- [ ] Create `/back/src/scripts/migrate-address-data.ts`
- [ ] Script copies: homeAddressId → primaryAddressId
- [ ] Script copies: firstName/lastName → attention
- [ ] Script does NOT copy label (drop it, clean start for addressType)
- [ ] Run script on dev database
- [ ] Verify data integrity (check sample records)
- [ ] Run script on Render staging database
- [ ] Verify Render data (compare row counts, spot check records)

### Phase 3: Backend Updates
- [ ] Update `/back/src/routes/customers.ts`
  - Change `homeAddressId` → `primaryAddressId`
  - Change `homeAddress` → `primaryAddress`
  - Update merge logic to deduplicate addresses by content
  - Update address CRUD to use `attention` and `addressType`
- [ ] Update `/back/src/routes/orders/create.ts`
  - Use `attention` field for recipient address
  - Use `addressType` field
- [ ] Update `/back/src/routes/orders/update.ts`
  - Same changes as create
- [ ] Update `/back/src/routes/orders/create-from-scan.ts`
  - Update address handling
- [ ] Update `/back/src/routes/import.ts`
  - Map old fields → new fields
- [ ] Update `/back/src/routes/import-json.ts`
  - Map old fields → new fields
- [ ] Update `/back/src/utils/notificationTriggers.ts`
  - Use `primaryAddress` instead of `homeAddress`
- [ ] Update all other backend files (services, templates, etc.)
- [ ] Test all endpoints with curl/Postman

### Phase 4: Admin Frontend Updates (Type Definitions)
- [ ] Update `/admin/src/shared/types/customer.ts`
  - Change `homeAddressId` → `primaryAddressId`
  - Change `homeAddress` → `primaryAddress`
  - Remove `firstName`, `lastName`, `label` from Address type
  - Add `attention` to Address type
  - Change `addressType` from enum to string
- [ ] Update `/admin/src/domains/customers/entities/Customer.ts`
  - Same type changes
- [ ] Update `/admin/src/domains/orders/entities/Order.ts`
  - Update address type references

### Phase 5: Admin Frontend Updates (Services & Hooks)
- [ ] Update `/admin/src/domains/customers/services/CustomerService.ts`
  - Use new field names
- [ ] Update `/admin/src/domains/customers/repositories/CustomerRepository.ts`
  - Update Prisma queries
- [ ] Update `/admin/src/domains/customers/hooks/useCustomerService.ts`
  - Update API calls
- [ ] Update `/admin/src/domains/orders/services/OrderService.ts`
  - Update address handling
- [ ] Update `/admin/src/domains/orders/repositories/OrderRepository.ts`
  - Update Prisma queries

### Phase 6: Admin Frontend Updates (Components - Customer)
- [ ] Rename `/admin/src/app/components/customers/cards/HomeAddressCard.tsx` → `PrimaryAddressCard.tsx`
  - Update all references: homeAddress → primaryAddress
- [ ] Update `/admin/src/app/components/customers/cards/AddressesCard.tsx`
  - Display `attention` instead of `firstName lastName`
  - Display `addressType` instead of `label`
- [ ] Update `/admin/src/app/components/customers/cards/AdditionalAddressesCard.tsx`
  - Same display changes
- [ ] Update `/admin/src/app/components/customers/modals/AddAddressModal.tsx`
  - Replace firstName/lastName inputs → attention input
  - Replace label input → addressType dropdown (with custom option)
- [ ] Update `/admin/src/app/components/customers/modals/ViewRecipientModal.tsx`
  - Update address display
- [ ] Update `/admin/src/app/pages/customers/CustomerFormPage.tsx`
  - Update address form (attention + addressType)
  - Use PrimaryAddressCard instead of HomeAddressCard
- [ ] Update `/admin/src/app/pages/customers/CustomersPage.tsx`
  - Update customer list display
- [ ] Update `/admin/src/app/pages/customers/DuplicatesPage.tsx`
  - Update duplicate detection/display

### Phase 7: Admin Frontend Updates (Components - Orders)
- [ ] Update `/admin/src/app/components/orders/RecipientCard.tsx`
  - Use `attention` field
  - Use `addressType` field
  - Use `primaryAddress` instead of `homeAddress`
- [ ] Update `/admin/src/app/components/orders/RecipientSearchModal.tsx`
  - Update address display
- [ ] Update `/admin/src/app/components/orders/RecipientPhoneMatchModal.tsx`
  - Update address display
- [ ] Update `/admin/src/app/components/orders/CustomerCard.tsx`
  - Use `primaryAddress`
- [ ] Update `/admin/src/app/pages/orders/TakeOrderPage.tsx`
  - Update recipient address handling
- [ ] Update `/admin/src/app/pages/orders/OrderEditPage.tsx`
  - Update address editing

### Phase 8: Admin Frontend Updates (Components - Other)
- [ ] Update `/admin/src/app/pages/pos/POSPage.tsx`
  - Update customer/address display
- [ ] Update `/admin/src/app/pages/events/CreateEventPage.tsx`
  - Update recipient address handling
- [ ] Update `/admin/src/app/pages/events/EventDetailPage.tsx`
  - Update address display
- [ ] Update `/admin/src/app/pages/delivery/DeliveryPage.tsx`
  - Update address display
- [ ] Update `/admin/src/app/pages/driver/DriverRoutePage.tsx`
  - Update route display with new address fields
- [ ] Update all other admin components (settings, reports, etc.)

### Phase 9: www Frontend Updates
- [ ] Update `/www/src/services/checkoutService.js`
  - Update getSavedRecipients to group by recipient (not address)
  - Use new field names
- [ ] Update `/www/src/components/Checkout/shared/utils.js`
  - Use `primaryAddress` instead of `homeAddress`
  - Use `attention` and `addressType`
- [ ] Update `/www/src/components/Checkout/CustomerStep/DesktopCustomerForm.jsx`
  - Update address form
- [ ] Update `/www/src/components/Checkout/CustomerStep/MobileCustomerForm.jsx`
  - Update address form
- [ ] Update `/www/src/components/Checkout/RecipientStep/DesktopRecipientForm.jsx`
  - Update address form
  - Update saved recipients dropdown
- [ ] Update `/www/src/components/Checkout/RecipientStep/MobileRecipientForm.jsx`
  - Update address form
  - Update saved recipients dropdown
- [ ] Update `/www/src/pages/Profile.jsx`
  - Update address display/edit
- [ ] Update `/www/src/pages/Checkout.jsx`
  - Verify all checkout steps work

### Phase 10: Testing
- [ ] Test customer creation (with primary address)
- [ ] Test customer editing (changing primary address)
- [ ] Test address creation (with attention + addressType)
- [ ] Test address editing
- [ ] Test order creation (with recipient address)
- [ ] Test order editing (changing recipient address)
- [ ] Test POS customer selection
- [ ] Test checkout flow (all steps)
- [ ] Test saved recipients dropdown (should show 1 per recipient)
- [ ] Test customer merge (should deduplicate addresses)
- [ ] Test event creation (with recipient)
- [ ] Test scan order creation
- [ ] Test data import/export
- [ ] Test mobile responsiveness (all forms)
- [ ] Test dark mode (all components)
- [ ] Verify no console errors
- [ ] Verify no TypeScript errors

### Phase 11: Cleanup (After Verification)
- [ ] Update Prisma schema (remove old fields)
- [ ] Run migration: `npx prisma migrate dev --name remove_old_address_fields`
- [ ] Verify migration on dev database
- [ ] Deploy to Render staging
- [ ] Verify Render database (old fields removed)
- [ ] Verify all features still work

### Phase 12: Documentation
- [ ] Update `/docs/System_Reference.md` (new schema)
- [ ] Update `/docs/API_Endpoints.md` (updated endpoints)
- [ ] Update `/docs/Progress_Tracker.markdown` (mark complete)
- [ ] Archive `/docs/DISCUSSION_RECAP_Customer_Address_Schema.md`
- [ ] Archive this feature plan

---

## Data Flow

**Address Deduplication in Merge:**
```
Merge Customers A, B, C → A
  → Get all addresses from A, B, C
  → Group by content hash (address1 + city + province + postalCode)
  → Keep first address per hash, delete duplicates
  → Update A.addresses with deduplicated list
```

**Saved Recipients in Checkout:**
```
User loads checkout recipient step
  → GET /api/customers/:id/recipients
  → Backend returns recipients (unique by recipientId, not addressId)
  → Frontend displays 1 dropdown entry per recipient
  → On select, use recipient.primaryAddress (or show address picker if multiple)
```

---

## Edge Cases & Validation

### Data Migration Edge Cases
1. **Customer with no homeAddressId**: primaryAddressId remains null ✓
2. **Address with only firstName (no lastName)**: attention = firstName ✓
3. **Address with only lastName (no firstName)**: attention = lastName ✓
4. **Address with neither firstName nor lastName**: attention = null ✓
5. **Address with existing label**: label is dropped (not migrated) ✓
6. **Address with existing addressType**: addressType value kept as-is ✓

### Merge Edge Cases
1. **Two addresses with identical content**: Keep first, delete second
2. **Two addresses with same street but different attention**: Keep both (attention differs)
3. **Two addresses with same street but different phone**: Keep both (phone differs)
4. **Customer with primaryAddressId pointing to deleted address**: Set to null after merge

### Checkout Edge Cases
1. **Recipient with no addresses**: Show address form (cannot select saved)
2. **Recipient with 1 address**: Auto-select that address
3. **Recipient with multiple addresses**: Show address picker dropdown
4. **Saved recipient deleted**: Handle 404 gracefully

---

## Files to Create/Modify

### New Files
```
/back/src/scripts/migrate-address-data.ts    (~100 lines)
```

### Modified Files (177+ total)

**Backend (50+ files):**
```
/back/prisma/schema.prisma
/back/src/routes/customers.ts
/back/src/routes/orders/create.ts
/back/src/routes/orders/update.ts
/back/src/routes/orders/create-from-scan.ts
/back/src/routes/orders/scan.ts
/back/src/routes/orders/list.ts
/back/src/routes/orders/single.ts
/back/src/routes/orders/delivery.ts
/back/src/routes/orders/status.ts
/back/src/routes/import.ts
/back/src/routes/import-json.ts
/back/src/routes/events.ts
/back/src/routes/communications.ts
/back/src/routes/customersAuth.ts
/back/src/routes/driver/route-view.ts
/back/src/utils/notificationTriggers.ts
/back/src/services/emailService.ts
/back/src/services/notificationService.ts
/back/src/services/printService.ts
/back/src/templates/*.ts (all receipt/invoice templates)
... (30+ more backend files)
```

**Admin Frontend (100+ files):**
```
/admin/src/shared/types/customer.ts
/admin/src/domains/customers/entities/Customer.ts
/admin/src/domains/customers/services/CustomerService.ts
/admin/src/domains/customers/repositories/CustomerRepository.ts
/admin/src/domains/customers/hooks/useCustomerService.ts
/admin/src/domains/orders/entities/Order.ts
/admin/src/domains/orders/services/OrderService.ts
/admin/src/domains/orders/repositories/OrderRepository.ts
/admin/src/app/pages/customers/*.tsx (all customer pages)
/admin/src/app/pages/orders/*.tsx (all order pages)
/admin/src/app/pages/pos/POSPage.tsx
/admin/src/app/pages/events/*.tsx (all event pages)
/admin/src/app/pages/delivery/*.tsx (all delivery pages)
/admin/src/app/components/customers/**/*.tsx (all customer components)
/admin/src/app/components/orders/**/*.tsx (all order components)
... (80+ more admin files)
```

**www Frontend (20+ files):**
```
/www/src/services/checkoutService.js
/www/src/components/Checkout/shared/utils.js
/www/src/components/Checkout/CustomerStep/*.jsx
/www/src/components/Checkout/RecipientStep/*.jsx
/www/src/pages/Checkout.jsx
/www/src/pages/Profile.jsx
... (15+ more www files)
```

**Documentation:**
```
/docs/System_Reference.md
/docs/API_Endpoints.md
/docs/Progress_Tracker.markdown
/docs/DISCUSSION_RECAP_Customer_Address_Schema.md (archive)
/docs/FEATURE_PLANS/Customer_Address_Schema_Refactor.md (archive)
```

---

## Success Criteria

### Database
- [ ] All migrations run successfully on dev and Render
- [ ] No data loss (verify row counts before/after)
- [ ] primaryAddressId matches old homeAddressId (100% match)
- [ ] attention field populated for all addresses with firstName/lastName
- [ ] addressType populated from label where applicable
- [ ] Old fields removed cleanly (no orphaned data)

### Backend
- [ ] All API endpoints work with new schema
- [ ] Customer merge deduplicates addresses by content
- [ ] Order creation uses new address fields
- [ ] Import/export handles new schema
- [ ] No TypeScript errors
- [ ] No runtime errors in logs

### Admin Frontend
- [ ] Customer form creates/edits with new address fields
- [ ] PrimaryAddressCard displays correctly
- [ ] AddAddressModal uses attention + addressType dropdown
- [ ] Order creation/editing uses new address fields
- [ ] POS customer selection works
- [ ] Event creation/editing works
- [ ] All address displays show attention and addressType correctly
- [ ] No TypeScript errors
- [ ] No console errors
- [ ] Dark mode works
- [ ] Mobile responsive

### www Frontend
- [ ] Checkout customer step uses new address fields
- [ ] Checkout recipient step uses new address fields
- [ ] Saved recipients dropdown shows 1 entry per recipient
- [ ] Profile page displays/edits addresses correctly
- [ ] No console errors
- [ ] Mobile responsive

### Verification
- [ ] Tested on dev environment (all features)
- [ ] Tested on Render staging (all features)
- [ ] Verified duplicate recipients bug is fixed
- [ ] Verified merge deduplication works
- [ ] No broken features
- [ ] No regressions

---

## Implementation Notes

**Estimated Effort:** 3-5 hours (177+ files to update)

**Dependencies:**
- None (self-contained refactor)

**Blockers:**
- Must test data migration script thoroughly before running on Render

**Testing Strategy:**
1. Test each phase in order on dev environment
2. Run data migration script on dev first (verify results)
3. Deploy Phase 1 + 2 to Render staging (additive, safe)
4. Deploy Phase 3-9 to Render staging (code updates)
5. Test all features on Render staging
6. Deploy Phase 11 to Render staging (cleanup)
7. Final verification on Render staging

**Deployment Notes:**
- Migrations run automatically on Render deploy
- No environment variable changes needed
- Database downtime: 0 (additive migrations are non-blocking)
- Code downtime: 0 (rolling deploy)

**Rollback Plan:**
If something goes wrong after Phase 11 (removing old fields):
1. Revert migration: `npx prisma migrate resolve --rolled-back [migration-name]`
2. Re-add old fields with new migration
3. Run reverse data migration (new → old fields)
4. Revert code changes

---

## Post-Implementation

### Plan-to-Diff Verification (Required)

**Success Criteria → Evidence:**
- Database: Check Render Prisma Studio for schema + data
- Backend: Test all endpoints with curl (see checklist)
- Admin: Test all pages manually (see checklist)
- www: Test checkout + profile (see checklist)

**Tests Run:**
- (List exact features tested and results)

**Checklist Audit:**
- (Note any skipped items and why)

**Git Push:**
- Do **NOT** run `git push` automatically
- Ask user for confirmation before pushing

### Final Steps
1. **Verify:**
   - All success criteria met
   - Documentation updated
   - No broken references

2. **Update:**
   - Mark as ✅ Completed in Progress_Tracker
   - Archive DISCUSSION_RECAP_Customer_Address_Schema.md
   - Archive this plan

3. **Deploy:**
   - Commit: "refactor: simplify customer/address schema (remove redundant fields)"
   - Push after user confirmation
   - Verify in Render staging environment

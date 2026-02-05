# Inventory Management

**Status:** ✅ Completed (2026-02-05)
**Created:** 2026-02-04
**Priority:** High

---

## Overview
Add easy inventory management to both mobile and desktop POS without navigating to the product section. Features include mobile QR scanning for quick product lookup, stock adjustments, printable inventory count sheets, and price tag label printing for a thermal label printer.

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
- **Backend route pattern:** `/back/src/routes/products.ts`
- **Frontend list page pattern:** `/admin/src/app/pages/products/ProductsPage.tsx`
- **Mobile page pattern:** `/admin/src/app/pages/mobile/MobileScanPage.tsx`
- **Custom hook pattern:** `/admin/src/shared/hooks/useApiClient.ts`
- **PDF generation pattern:** `/back/src/templates/order-ticket-pdf.ts`
- **QR code pattern:** `/back/src/utils/qrCodeGenerator.ts`

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

### Pre-Implementation Contract (Required — Answer Before Coding)

Provide a short implementation contract (bullets):
- **Goals → Changes mapping**: Map each Goal to the specific code changes/files.
- **Files to touch (exact paths)**: List every file you will create/modify.
- **Backend surface area**: Endpoints to add/modify + where they are registered.
- **DB/migrations**: No schema changes required (uses existing ProductVariant.stockLevel and sku)
- **UI standards confirmation**: Confirm you will follow shared UI patterns (StandardTable/DatePicker/shared Modal + form components) and `value={x || ''}`.
- **Unknowns / questions**: If anything is ambiguous, ask now — do not start coding.

### Critical Don'ts
❌ Use `fetch()` directly → Use `useApiClient` hook
❌ Store prices as floats → Use integers in cents
❌ Skip cascade deletes → Add `onDelete: Cascade`
❌ Forget route registration → Register in `/back/src/index.ts`
❌ Skip migrations → Run `npx prisma migrate dev --name feature_name`

### Frontend/UI Critical Don'ts (Project Standards)
❌ Build custom tables / table HTML → Use `StandardTable`
❌ Use `<input type="date">` → Use `DatePicker` from `@shared/ui/forms/date-picker`
❌ Use raw `<input>`, `<select>`, `<textarea>` → Use shared form components (`InputField`, `Select`, `Label`, etc.)
❌ Create custom modals/overlays (`fixed inset-0 ...`) → Use shared `Modal` from `@shared/ui/components/ui/modal`
❌ Allow null/undefined input values → Always use `value={x || ''}`
❌ Use emojis in user-facing UI → Use Heroicons / existing icon library from `@shared/assets/icons`

---

## Goals

1. **Quick inventory lookup** — Scan QR code or search by name/SKU to find products instantly on mobile
2. **Easy stock adjustments** — Update stock levels without navigating to product edit page
3. **Printable count sheets** — Generate PDF inventory sheets for manual stock counting
4. **Price tag labels** — Print QR + name + price labels via thermal printer (Clabel CT221B)

---

## Architecture & Endpoints

### Backend API Routes

**File:** `/back/src/routes/inventory.ts`

**Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/inventory` | List inventory with filters (search, category, lowStockOnly) |
| GET | `/api/inventory/lookup` | Lookup product by SKU (query param: `?sku=X`) |
| PATCH | `/api/inventory/:variantId` | Quick stock adjustment |
| POST | `/api/inventory/bulk-adjust` | Bulk update multiple items |
| GET | `/api/inventory/report` | Generate printable inventory count sheet PDF |
| GET | `/api/inventory/qr/:variantId` | Generate QR code image (PNG data URL) |
| GET | `/api/inventory/label/:variantId` | Generate single price tag label PDF |
| POST | `/api/inventory/labels` | Generate batch labels (array of variantIds) |

### Database Schema

**No schema changes required.** Uses existing fields:

```prisma
model ProductVariant {
  sku            String   @unique
  stockLevel     Int?
  trackInventory Boolean  @default(true)
  // ... existing fields
}
```

**QR Code Format:** `BLOOM:SKU:{sku}` (e.g., `BLOOM:SKU:BLM-001234`)

---

## UI Requirements

### Frontend Components

**Desktop Inventory Page**
- **Location:** `/admin/src/app/pages/inventory/InventoryPage.tsx`
- **Route:** `/inventory`
- **Features:**
  - Search by name/SKU
  - Filter by category
  - Low stock only toggle
  - StandardTable with columns: SKU, Product, Variant, Stock, Status, Actions
  - Inline +/- adjust buttons
  - Bulk select for batch operations
  - Print Inventory button (count sheet)
  - Print Labels button (price tags)

**Status column indicators:**
- Green dot "In Stock" (stock > 5)
- Yellow dot "Low" (stock 1-5)
- Red dot "Out" (stock = 0)
- Gray "Not Tracked" (trackInventory = false)

**Mobile Inventory Page**
- **Location:** `/admin/src/app/pages/mobile/MobileInventoryPage.tsx`
- **Route:** `/mobile/inventory`
- **Features:**
  - Large "Scan QR" button to open camera
  - Text search fallback for SKU/name
  - Product card after scan: image, name, SKU, current stock
  - Quick adjust: +/- buttons or direct number input
  - Save button to update stock
  - "Scan Another" to continue

**Modals:**
- **QuickAdjustModal.tsx** — Adjust single product stock
- **PrintInventoryModal.tsx** — Filter options for count sheet PDF
- **PrintLabelsModal.tsx** — Select products, quantity, generate label PDF

**Custom Hook:**
- **File:** `/admin/src/shared/hooks/useInventory.ts`
- **Exports:** `{ items, loading, error, lookup, adjustStock, bulkAdjust, refresh }`

### User Flow — Mobile

1. Tap "Inventory" tile on mobile home
2. Tap "Scan QR" to open camera
3. Point at QR code → auto-scans
4. Product card appears with current stock
5. Tap +/- or enter new quantity
6. Tap "Save" → stock updates
7. Tap "Scan Another" to continue

### User Flow — Desktop

1. Navigate to Inventory from sidebar
2. View full inventory list with search/filters
3. Click +/- inline to quick adjust, or select row for modal
4. Click "Print Inventory" to generate count sheet
5. Click "Print Labels" to generate price tags

### Mobile Responsiveness
- Mobile page is full-width, no sidebar
- Desktop page uses standard admin layout
- All modals responsive (max-w-2xl)

---

## PDF Templates

### Inventory Count Sheet

**File:** `/back/src/templates/inventory-sheet-pdf.ts`

**Format:** Letter size, portrait

```
INVENTORY COUNT SHEET
[Shop Name] - Generated: [Date]

Instructions: Count each item and write quantity in "Counted" column.

| SKU | Product Name | Current | Counted | Notes |
|-----|--------------|---------|---------|-------|
| ... | ...          |   12    | _____   |       |
```

**Options:** Filter by category, low stock only, sort order

### Price Tag Labels

**File:** `/back/src/templates/price-label-pdf.ts`

**Format:** 2" x 1" thermal label (adjustable)

```
┌─────────────────────────────┐
│ [QR]  Product Name          │
│ [QR]  $29.95                │
│ [QR]  SKU: BLM-001          │
└─────────────────────────────┘
```

**Printer:** Clabel CT221B thermal printer via browser print dialog

---

## Implementation Checklist

### Phase 1: Backend
- [ ] Create route file `/back/src/routes/inventory.ts`
- [ ] Add Zod validation schemas for all endpoints
- [ ] Implement GET `/api/inventory` (list with filters)
- [ ] Implement GET `/api/inventory/lookup` (SKU lookup)
- [ ] Implement PATCH `/api/inventory/:variantId` (adjust stock)
- [ ] Implement POST `/api/inventory/bulk-adjust` (bulk update)
- [ ] Implement GET `/api/inventory/qr/:variantId` (QR generation)
- [ ] Register route in `/back/src/index.ts`
- [ ] Test endpoints with curl

### Phase 2: PDF Templates
- [ ] Create `/back/src/templates/inventory-sheet-pdf.ts` (count sheet)
- [ ] Create `/back/src/templates/price-label-pdf.ts` (price labels)
- [ ] Implement GET `/api/inventory/report` (count sheet PDF)
- [ ] Implement GET `/api/inventory/label/:variantId` (single label)
- [ ] Implement POST `/api/inventory/labels` (batch labels)
- [ ] Test PDF generation

### Phase 3: Frontend Data Layer
- [ ] Create `/admin/src/shared/hooks/useInventory.ts`
- [ ] Add TypeScript interfaces
- [ ] Implement useApiClient integration
- [ ] Add loading/error states

### Phase 4: Desktop UI
- [ ] Create `/admin/src/app/pages/inventory/InventoryPage.tsx`
- [ ] Create `/admin/src/app/components/inventory/QuickAdjustModal.tsx`
- [ ] Create `/admin/src/app/components/inventory/PrintInventoryModal.tsx`
- [ ] Create `/admin/src/app/components/inventory/PrintLabelsModal.tsx`
- [ ] Add route to `/admin/src/app/App.tsx`
- [ ] Add sidebar navigation in `/admin/src/app/layout/AppSidebar.tsx`

### Phase 5: Mobile UI
- [ ] Create `/admin/src/app/pages/mobile/MobileInventoryPage.tsx`
- [ ] Implement camera QR scanning (jsQR or similar library)
- [ ] Add product lookup result card
- [ ] Add stock adjustment controls
- [ ] Add "Inventory" tile to `/admin/src/app/pages/mobile/MobileHomePage.tsx`
- [ ] Add route to `/admin/src/app/App.tsx`

### Phase 6: Testing & Documentation
- [ ] Test mobile QR scanning on iPhone
- [ ] Test desktop list and filters
- [ ] Test PDF printing (count sheet and labels)
- [ ] Verify dark mode support
- [ ] Update `/docs/API_Endpoints.md`
- [ ] Update `/docs/Progress_Tracker.markdown`

---

## Files to Create/Modify

### New Files
```
/back/src/routes/inventory.ts                              (~300 lines)
/back/src/templates/inventory-sheet-pdf.ts                 (~150 lines)
/back/src/templates/price-label-pdf.ts                     (~100 lines)
/admin/src/shared/hooks/useInventory.ts                    (~100 lines)
/admin/src/app/pages/inventory/InventoryPage.tsx           (~250 lines)
/admin/src/app/pages/mobile/MobileInventoryPage.tsx        (~300 lines)
/admin/src/app/components/inventory/QuickAdjustModal.tsx   (~100 lines)
/admin/src/app/components/inventory/PrintInventoryModal.tsx (~80 lines)
/admin/src/app/components/inventory/PrintLabelsModal.tsx   (~100 lines)
```

### Modified Files
```
/back/src/index.ts                              (add route registration)
/admin/src/app/App.tsx                          (add /inventory and /mobile/inventory routes)
/admin/src/app/layout/AppSidebar.tsx            (add Inventory nav item)
/admin/src/app/pages/mobile/MobileHomePage.tsx  (add Inventory tile button)
/docs/API_Endpoints.md                          (add endpoint documentation)
/docs/Progress_Tracker.markdown                 (mark as completed)
```

---

## Success Criteria

- [ ] Mobile: Scan QR with iPhone camera, see product, adjust stock, verify DB updated
- [ ] Desktop: Filter by category, search by name/SKU, adjust stock inline
- [ ] Bulk: Select multiple products, update all at once
- [ ] Count sheet PDF: Generate, print, verify all items listed with blank count column
- [ ] Price labels PDF: Generate, print to Clabel printer, verify QR scans correctly on phone
- [ ] QR generation: Generate QR for product, phone camera decodes it correctly
- [ ] Dark mode: All UI works in dark mode
- [ ] No console errors
- [ ] Documentation updated

---

## Implementation Notes

**Dependencies:**
- QR scanning library for mobile (e.g., `jsQR`, `html5-qrcode`, or `@zxing/browser`)
- Existing `qrcode` package for generation (already installed)
- Existing `pdfkit` for PDF generation (already installed)

**Testing Strategy:**
- Manual testing on iPhone for camera scanning
- Test with actual Clabel CT221B printer for labels
- Verify QR codes scan correctly after printing

**Deployment Notes:**
- No database migration needed
- No environment variable changes needed

---

## Post-Implementation

After completing implementation:

### Plan-to-Diff Verification (Required)

Before claiming the feature is done, provide:
- **Success Criteria → Evidence mapping**: For each Success Criterion, point to the exact file/component/route where it is satisfied.
- **Tests run**: List the exact commands you ran and the results.
- **Checklist audit**: Note any checklist items you skipped and why.
- **Git push**: Do **NOT** run `git push` automatically — ask Cris for confirmation.

1. **Verify:**
   - All success criteria met
   - Documentation updated
   - No broken references

2. **Update:**
   - Mark feature as ✅ Completed in Progress_Tracker
   - Archive or delete this plan

3. **Deploy:**
   - Commit with message: "feat: add inventory management with mobile scanning and label printing"
   - Push to trigger deployment (ask for confirmation first)
   - Verify in staging environment

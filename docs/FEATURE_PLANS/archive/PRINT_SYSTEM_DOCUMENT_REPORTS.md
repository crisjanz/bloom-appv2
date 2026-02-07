# Print System -- Document Reports Unification

**Status:** Completed  
**Created:** 2026-02-07  
**Priority:** High

---

## Overview
Unify all remaining "browser-only" admin prints (Sales Report, House Account Statement, Inventory Count Sheet, Gift Card Handoff) under the existing print system so they respect **Documents** print settings (browser vs print agent) and use server-side PDF templates like receipts/tickets.

---

## AI Implementation Constraints

**CRITICAL - Read Before Implementing:**

> **WARNING FOR AI ASSISTANTS: You MUST read the required documentation before writing code. Follow existing patterns exactly.**

### Required Reading (IN ORDER)
1. `/docs/AI_IMPLEMENTATION_GUIDE.md`
2. `/docs/System_Reference.md`
3. `/docs/API_Endpoints.md`
4. `/CLAUDE.md`

### Pattern Reference Files
**Study these files for implementation patterns:**
- **Backend route pattern:** `/back/src/routes/print/index.ts`
- **Frontend component pattern:** `/admin/src/app/components/orders/ReceiptInvoiceModal.tsx`
- **Custom hook pattern:** `/admin/src/shared/hooks/useInventory.ts` (print-related API calls)

**DO NOT write from scratch. COPY patterns from these files.**

### Pre-Implementation Quiz (Answer Before Coding)

**Question 1: API Client**
- What hook do you use for all frontend API calls?
- Answer: `useApiClient`

**Question 2: Price Storage**
- How are monetary values stored in the database?
- Answer: As `Int` in cents

**Question 3: Validation**
- What library validates backend requests?
- Answer: `Zod` with `.parse()` method

### Pre-Implementation Contract (Required -- Answer Before Coding)

Provide a short implementation contract (bullets):
- **Goals -> Changes mapping**:
  - Sales Report print -> new `/api/print/sales-report` endpoint + PDF template + admin print action uses print system.
  - House Account Statement print -> new `/api/print/house-account-statement` endpoint + PDF template + admin print action uses print system.
  - Inventory Count Sheet print -> new `/api/print/inventory-report` endpoint (reusing `buildInventorySheetPdf`) + admin print action uses print system.
  - Gift Card Handoff print -> new `/api/print/gift-cards` endpoint + PDF template + handoff modal uses print system.
- **Files to touch (exact paths)**:
  - `back/src/routes/print/index.ts`
  - `back/src/routes/reports.ts` (or new report service module for shared sales report logic)
  - `back/src/routes/house-accounts.ts` (if print endpoint lives here instead of print router)
  - `back/src/routes/inventory.ts` (if reusing existing report endpoint)
  - `back/src/services/printService.ts` (only if needed for non-order data typing)
  - `back/src/templates/sales-report-pdf.ts`
  - `back/src/templates/house-account-statement-pdf.ts`
  - `back/src/templates/gift-card-handoff-pdf.ts`
  - `admin/src/app/pages/reports/SalesReportPage.tsx`
  - `admin/src/app/pages/house-accounts/HouseAccountStatementPage.tsx`
  - `admin/src/app/pages/inventory/InventoryPage.tsx`
  - `admin/src/app/components/orders/payment/GiftCardHandoffModal.tsx`
  - `docs/API_Endpoints.md`
  - `docs/Progress_Tracker.markdown`
- **Backend surface area**:
  - Add print endpoints under `/api/print/*` that return `{ action: 'queued' | 'browser-print' | 'skipped', ... }` and respect Documents print settings (`PrintJobType.REPORT`).
- **DB/migrations**:
  - No schema changes, no migrations.
- **UI standards confirmation**:
  - Use `useApiClient`, standard success/error messaging pattern (ReceiptInvoiceModal).
  - No new raw inputs; reuse existing UI components.
- **Unknowns / questions**:
  - For Sales Report printing: should the PDF include **all matching orders** or **only the current page** (25 rows)? Clarify before coding.

---

## Goals
1. All Sales Report, House Account Statement, Inventory Count Sheet, and Gift Card Handoff prints route through the print system (Documents settings).
2. Each print produces a server-side PDF template (browser fallback uses stored PDF).
3. Admin UI no longer calls `window.print()` for these flows; it uses print system responses instead.

---

## Architecture & Endpoints

### Backend API Routes

**File:** `/back/src/routes/print/index.ts`

**Endpoints (new):**
- `POST /api/print/sales-report` -- Print sales report (filters: `startDate`, `endDate`, `paymentMethod`, `status`, `orderSource`)
- `POST /api/print/house-account-statement` -- Print house account statement (payload: `customerId`, optional `from`, `to`)
- `POST /api/print/inventory-report` -- Print inventory count sheet (payload mirrors `/api/inventory/report` filters)
- `POST /api/print/gift-cards` -- Print gift card handoff details (payload: gift card IDs or card data)

**Print routing:** Use `PrintJobType.REPORT` for all of the above so Documents settings apply.

### Database Schema
No changes.

---

## UI Requirements

### Frontend Components (modified)
1. **SalesReportPage.tsx** -- replace browser print with `/api/print/sales-report`
2. **HouseAccountStatementPage.tsx** -- replace browser print with `/api/print/house-account-statement`
3. **InventoryPage.tsx** -- "Print Inventory Count Sheet" uses `/api/print/inventory-report`
4. **GiftCardHandoffModal.tsx** -- print button calls `/api/print/gift-cards`

### User Flow
1. User clicks "Print" for a report/statement.
2. Admin calls `/api/print/*` endpoint.
3. Backend checks print settings for `REPORT`:
   - Browser destination -> returns `pdfUrl`
   - Print agent -> queues job and returns `queued`
4. UI shows success message or opens `pdfUrl`.

### Mobile Responsiveness
No layout changes required; keep existing responsive styles.

---

## Implementation Checklist

### Phase 1: Backend
- [ ] Add new print endpoints in `/back/src/routes/print/index.ts`
- [ ] Create PDF templates:
  - `/back/src/templates/sales-report-pdf.ts`
  - `/back/src/templates/house-account-statement-pdf.ts`
  - `/back/src/templates/gift-card-handoff-pdf.ts`
- [ ] Reuse `buildInventorySheetPdf` for inventory count sheet print
- [ ] Wire print settings routing via `printSettingsService.getConfigForType(PrintJobType.REPORT)`
- [ ] Return browser PDF via `storePdf`, else queue via `printService.queuePrintJob`

### Phase 2: Frontend
- [ ] Replace `window.print()` flows with `useApiClient` calls (ReceiptInvoiceModal pattern)
- [ ] Handle `queued / browser-print / skipped` responses consistently
- [ ] Keep existing on-screen views (do not remove report UI)

### Phase 3: Docs
- [ ] Update `/docs/API_Endpoints.md` with new print endpoints
- [ ] Update `/docs/Progress_Tracker.markdown` (add "Documents print unification")

---

## Data Flow

**Print Flow (Documents):**
```
User clicks Print
 -> admin calls /api/print/{report}
 -> printSettingsService.getConfigForType(REPORT)
 -> build PDF template
   -> storePdf() if destination=browser
   -> queue print job with pdfBase64 if destination=agent
 -> response: browser-print | queued | skipped
```

---

## Edge Cases & Validation

### Input Validation
- Validate date ranges and filter enums via Zod.
- Gift card print payload must include at least one card ID or card payload.

### Business Rules
- Always use Documents print settings (`PrintJobType.REPORT`).
- PDFs must use shop name from `StoreSettings` (no hardcoded "Bloom").

### Error Scenarios
- Missing store settings (fallback to empty values).
- No data in report -> still generate a "No results" PDF.
- Print disabled -> return `{ action: 'skipped' }`.

---

## Files to Create/Modify

### New Files
```
/back/src/templates/sales-report-pdf.ts
/back/src/templates/house-account-statement-pdf.ts
/back/src/templates/gift-card-handoff-pdf.ts
```

### Modified Files
```
/back/src/routes/print/index.ts
/back/src/routes/reports.ts (if shared data helpers added)
/admin/src/app/pages/reports/SalesReportPage.tsx
/admin/src/app/pages/house-accounts/HouseAccountStatementPage.tsx
/admin/src/app/pages/inventory/InventoryPage.tsx
/admin/src/app/components/orders/payment/GiftCardHandoffModal.tsx
/docs/API_Endpoints.md
/docs/Progress_Tracker.markdown
```

---

## Success Criteria

- [ ] Sales Report print uses `/api/print/sales-report` and respects Documents settings.
- [ ] House Account Statement print uses `/api/print/house-account-statement` and respects Documents settings.
- [ ] Inventory Count Sheet print uses `/api/print/inventory-report` and respects Documents settings.
- [ ] Gift Card Handoff print uses `/api/print/gift-cards` and respects Documents settings.
- [ ] All four generate PDF templates server-side and avoid `window.print()` in admin.
- [ ] API/docs updated; no console errors.

---

## Implementation Notes

**Estimated Effort:** 1-2 days

**Dependencies:**
- Existing print system (`PrintJobType.REPORT`)
- Store settings (`storeSettings`) for shop name

**Testing Strategy:**
- Manual print on browser destination (PDF opens)
- Manual print on agent destination (job queued)
- Verify PDFs render with filters and empty states

---

## Post-Implementation

### Plan-to-Diff Verification (Required)
- Success Criteria -> Evidence mapping
- Tests run
- Checklist audit
- Ask for `git push` confirmation

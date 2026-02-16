# Order Number Prefix

**Status:** 🔜 Ready for Implementation
**Created:** 2026-02-15
**Priority:** High

---

## Overview
Add an optional prefix (e.g. `B`) to order numbers displayed throughout the app. This allows distinguishing Bloom POS orders from legacy Floranext orders during the transition period. The prefix is stored in `ShopProfile.settings` JSON field and can be toggled on/off from Settings > Orders. When off, order numbers display as plain numbers. When on, they display as e.g. `B6001`.

The `orderNumber` column remains an `Int` in the database. The prefix is purely a display concern applied via a `formatOrderNumber()` utility.

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
- **Backend settings route pattern:** `/back/src/routes/settings/operations.ts` (GET + PUT on a settings resource)
- **Backend template pattern:** `/back/src/templates/receipt-thermal.ts` (how order numbers are currently rendered)
- **Frontend settings component pattern:** `/admin/src/app/components/settings/orders/GeneralSettingsCard.tsx` (target file — currently empty placeholder)

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
- **DB/migrations**: None — uses existing `ShopProfile.settings` JSON field.
- **UI standards confirmation**: Confirm you will follow shared UI patterns and `value={x || ''}`.
- **Unknowns / questions**: If anything is ambiguous, ask now — do not start coding.

### Critical Don'ts
❌ Use `fetch()` directly → Use `useApiClient` hook
❌ Change the `orderNumber` column type → It stays as `Int`
❌ Forget route registration → Register in `/back/src/index.ts`
❌ Hardcode the prefix → Always read from settings

### Frontend/UI Critical Don'ts (Project Standards)
❌ Build custom tables / table HTML → Use `StandardTable`
❌ Use raw `<input>`, `<select>`, `<textarea>` → Use shared form components (`InputField`, `Select`, `Label`, etc.)
❌ Create custom modals/overlays → Use shared `Modal` from `@shared/ui/components/ui/modal`
❌ Allow null/undefined input values → Always use `value={x || ''}`
❌ Use emojis in user-facing UI → Use Heroicons / existing icon library from `@shared/assets/icons`

---

## Goals

1. **Configurable prefix**: Admin can toggle an order number prefix on/off and set the prefix string (default: `B`)
2. **Consistent display**: All order number displays (admin UI, receipts, invoices, emails, PDFs, tickets) use the prefix when enabled
3. **Zero data migration**: The `orderNumber` column remains `Int`. Prefix is display-only.
4. **Easy removal**: Turning the toggle off instantly removes the prefix everywhere

---

## Architecture & Endpoints

### Backend API Routes

**File:** `/back/src/routes/settings/order-settings.ts`

**Endpoints:**
- `GET /api/settings/order-settings` — Returns `{ orderNumberPrefix: string }` from `ShopProfile.settings` JSON
- `PUT /api/settings/order-settings` — Updates `{ orderNumberPrefix: string }` in `ShopProfile.settings` JSON

**How the settings JSON works:**
The `ShopProfile` model already has a `settings Json? @default("{}")` field. We store:
```json
{
  "orderNumberPrefix": "B"
}
```
When prefix is empty string `""`, no prefix is applied.

### Shared Utility

**Backend file:** `/back/src/utils/formatOrderNumber.ts`
**Admin file:** `/admin/src/shared/utils/formatOrderNumber.ts`

```ts
export function formatOrderNumber(orderNumber: number | string | null | undefined, prefix?: string): string {
  if (orderNumber == null) return 'N/A';
  return prefix ? `${prefix}${orderNumber}` : `${orderNumber}`;
}
```

### Database Schema

**No schema changes.** Uses existing `ShopProfile.settings` JSON field.

```prisma
model ShopProfile {
  id                 String   @id @default(cuid())
  googleGeminiApiKey String?
  settings           Json?    @default("{}")  // ← store orderNumberPrefix here
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
  googleMapsApiKey   String?

  @@map("shop_profile")
}
```

---

## UI Requirements

### Frontend Component

**File to edit:** `/admin/src/app/components/settings/orders/GeneralSettingsCard.tsx`

This file currently contains only a placeholder TODO. Replace it with:

1. **Toggle switch**: "Add prefix to order numbers" — on/off
2. **Prefix input**: Text input for the prefix string (default `B`), only visible when toggle is ON
3. **Live preview**: Shows example like "Orders will display as: **B1001**"
4. **Save button**: Calls `PUT /api/settings/order-settings`

Use `useApiClient` for API calls. Follow the pattern in other settings cards.

### User Flow
1. Navigate to Settings > Orders
2. See "Order Number Prefix" section in General Settings card
3. Toggle on → prefix input appears with default "B"
4. Optionally change prefix string
5. Save → all order number displays across the app now use the prefix
6. Toggle off + Save → prefix removed everywhere

---

## Implementation Checklist

### Phase 1: Backend — Settings API
- [ ] Create `/back/src/routes/settings/order-settings.ts` with GET and PUT endpoints
- [ ] GET reads `ShopProfile.settings.orderNumberPrefix`, defaults to `""`
- [ ] PUT validates and saves `orderNumberPrefix` string to `ShopProfile.settings`
- [ ] Register routes in `/back/src/index.ts`: `GET /api/settings/order-settings` and `PUT /api/settings/order-settings`

### Phase 2: Backend — Utility + Templates
- [ ] Create `/back/src/utils/formatOrderNumber.ts`
- [ ] Update ALL backend templates to use `formatOrderNumber()`. Each template caller must load `ShopProfile.settings` once and pass the prefix. Files to update:
  - [ ] `/back/src/templates/receipt-thermal.ts` — uses `Order #${order.orderNumber ?? order.id}`
  - [ ] `/back/src/templates/receipt-pdf.ts` — uses `Order #${order.orderNumber ?? order.id}`
  - [ ] `/back/src/templates/invoice-pdf.ts` — uses `Order #${orderNumber}` (lines 102, 136)
  - [ ] `/back/src/templates/order-ticket-pdf.ts` — uses `# ${orderNumber}`, `Order # ${orderNumber}`, `Order #${orderNumber}` (lines 65, 133, 296, 380, 405)
  - [ ] `/back/src/templates/sales-report-pdf.ts` — uses `#${order.orderNumber}` (line 215)
  - [ ] `/back/src/templates/house-account-statement-pdf.ts` — uses `#${entry.orderNumber}` (line 236)
  - [ ] `/back/src/templates/email/invoice-email.ts` — uses `order #${order.orderNumber ?? order.id}` (line 33)
  - [ ] `/back/src/templates/email/receipt-email.ts` — uses `order #${order.orderNumber ?? order.id}` (line 33)

**IMPORTANT**: Each template rendering function is called from a route handler. The route handler should fetch the prefix once from `ShopProfile.settings` and pass it as a parameter to the template function. Search for where each template function is called to find the route handlers.

### Phase 3: Admin — Utility + Frontend Display
- [ ] Create `/admin/src/shared/utils/formatOrderNumber.ts`
- [ ] Fetch order settings on app init (or in a hook) and make prefix available app-wide
- [ ] Replace ALL `#{orderNumber}` / `#${orderNumber}` patterns in admin with `formatOrderNumber()`. Files to update:

**Orders & POS:**
  - [ ] `app/pages/orders/OrdersListPage.tsx` (line 228): `#{order.orderNumber}`
  - [ ] `app/components/orders/edit/OrderHeader.tsx` (line 54): `Order #{order.orderNumber}`
  - [ ] `app/pages/pos/POSPage.tsx` (lines 407-441): `Order #${orderNumber}`, draft display

**Fulfillment:**
  - [ ] `app/pages/FulfillmentPage.tsx` (line 718): `Order #{order.orderNumber}`
  - [ ] `app/pages/mobile/MobileFulfillmentPage.tsx` (line 125): `#{order.orderNumber}`
  - [ ] `app/pages/mobile/MobileDeliveryPage.tsx` (lines 107, 270, 381): `Order #${stop.order.orderNumber}`, `#{order.orderNumber}`

**Delivery/Routes:**
  - [ ] `app/pages/delivery/DeliveryPage.tsx` (lines 131, 575): `#${order.orderNumber}`
  - [ ] `app/pages/delivery/RouteBuilderPage.tsx` (lines 178, 230, 309): `#{order.orderNumber}`
  - [ ] `app/pages/driver/DriverRoutePage.tsx` (lines 381, 478, 512, 542): `Order #${stop.order?.orderNumber}`, `Order #{data.order.orderNumber}`

**Reports:**
  - [ ] `app/pages/reports/SalesReportPage.tsx` (line 217): `#{order.orderNumber}`
  - [ ] `app/pages/reports/TaxExportPage.tsx` (line 265): `#{row.orderNumber}`
  - [ ] `app/pages/reports/TransactionsReportPage.tsx` (lines 377-385): `#{firstOrder}`

**House Accounts:**
  - [ ] `app/pages/house-accounts/HouseAccountStatementPage.tsx` (lines 166, 169): `#{row.orderNumber}`
  - [ ] `app/pages/house-accounts/HouseAccountDetailPage.tsx` (line 242): `#{entry.order.orderNumber}`

**Components:**
  - [ ] `app/components/orders/ReceiptInvoiceModal.tsx` (line 140): `Order #{orderNumber}`
  - [ ] `app/components/customers/cards/OrderHistoryCard.tsx` (line 161): `#{order.orderNumber || ...}`
  - [ ] `app/components/refunds/RefundModal.tsx` (lines 96, 412): `#${order.orderNumber || ...}`

**Header/Search/Notifications:**
  - [ ] `shared/ui/header/GlobalSearch.tsx` (line 260): `Order #{results.order.orderNumber}`
  - [ ] `shared/ui/header/LegacyOrderSearch.tsx` (lines 160, 252): `Order #{selectedOrder.orderNumber}`, `#{order.orderNumber}`
  - [ ] `shared/ui/header/NotificationDropdown.tsx` (lines 242, 290): `Order #{notification.order.orderNumber}`
  - [ ] `shared/ui/header/PrintStatusDropdown.tsx` (line 213): `#${job.order.orderNumber}`

### Phase 4: Admin — Settings UI
- [ ] Implement `GeneralSettingsCard.tsx` with toggle + prefix input + preview + save
- [ ] Use `useApiClient` for GET/PUT calls
- [ ] Follow existing settings card patterns

### Phase 5: Documentation
- [ ] Update `/docs/API_Endpoints.md` with new settings endpoints
- [ ] Update `/docs/Progress_Tracker.markdown`

---

## Prefix Availability Strategy

The admin frontend needs the prefix available everywhere without fetching it on every page.

**Recommended approach**: Create a React context or a simple hook `useOrderNumberPrefix()` that:
1. Fetches `GET /api/settings/order-settings` once on app load
2. Caches the result
3. Returns the prefix string (or `""` if disabled)
4. The `formatOrderNumber()` calls use this cached prefix

Alternatively, include the prefix in an existing app-init settings fetch if one exists (check how other global settings are loaded).

---

## Edge Cases & Validation

### Input Validation
- Prefix must be alphanumeric, max 5 characters
- Empty prefix = feature disabled (same as toggle off)

### Business Rules
- Prefix is display-only — never stored in `orderNumber` column
- Legacy order search (Floranext) should NOT apply the prefix — those orders keep their original numbers
- The `#` character is NOT part of the prefix. The display pattern is `#{prefix}{number}`, e.g. `#B6001`

### Error Scenarios
- If settings fetch fails, default to no prefix (graceful degradation)
- Empty `ShopProfile` → default to no prefix

---

## Files to Create/Modify

### New Files
```
/back/src/routes/settings/order-settings.ts           (~40 lines)
/back/src/utils/formatOrderNumber.ts                   (~10 lines)
/admin/src/shared/utils/formatOrderNumber.ts           (~10 lines)
```

### Modified Files
```
/back/src/index.ts                                     (add 2 route registrations)
/back/src/templates/receipt-thermal.ts                  (use formatOrderNumber)
/back/src/templates/receipt-pdf.ts                      (use formatOrderNumber)
/back/src/templates/invoice-pdf.ts                      (use formatOrderNumber)
/back/src/templates/order-ticket-pdf.ts                 (use formatOrderNumber)
/back/src/templates/sales-report-pdf.ts                 (use formatOrderNumber)
/back/src/templates/house-account-statement-pdf.ts      (use formatOrderNumber)
/back/src/templates/email/invoice-email.ts              (use formatOrderNumber)
/back/src/templates/email/receipt-email.ts              (use formatOrderNumber)
/admin/src/app/components/settings/orders/GeneralSettingsCard.tsx  (full implementation)
~25 admin files                                        (replace #{orderNumber} with formatOrderNumber())
```

---

## Success Criteria

- [ ] Toggle ON with prefix "B" → all order numbers display as `#B1001` format
- [ ] Toggle OFF → all order numbers display as `#1001` format (plain numbers)
- [ ] Receipts, invoices, order tickets, emails all respect the prefix setting
- [ ] Settings page shows toggle, prefix input, and live preview
- [ ] Legacy order search does NOT apply prefix
- [ ] No console errors
- [ ] Dark mode supported on settings UI

---

## Implementation Notes

**Dependencies:**
- None — uses existing `ShopProfile.settings` JSON field

**Testing Strategy:**
- Toggle prefix on, set to "B"
- Create a POS order → verify order number shows as `#B{number}` in:
  - Order list page
  - Order edit header
  - Receipt PDF / thermal
  - Invoice PDF / email
  - Order ticket PDF
  - Fulfillment pages
  - Delivery pages
  - Reports
- Toggle prefix off → verify all above show plain `#{number}`
- Verify legacy order search still shows original Floranext numbers

**Deployment Notes:**
- No migration needed
- No environment variable changes

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
   - Mark feature as completed in Progress_Tracker
   - Archive or delete this plan

3. **Deploy:**
   - Commit with message: "feat: add configurable order number prefix"
   - Push to trigger deployment (ask for confirmation first)
   - Verify in staging environment

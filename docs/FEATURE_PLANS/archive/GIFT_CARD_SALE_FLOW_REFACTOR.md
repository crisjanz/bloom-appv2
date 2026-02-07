# Gift Card Sale Flow Refactor

**Status**: ✅ Completed (2026-02-07)
**Priority**: High
**Estimated Scope**: Medium (2-3 sessions)

---

## Overview

Simplify POS gift card sales with a scan-first approach for physical cards and streamlined electronic card creation. Replace the confusing "activation modal" with a unified "Sell Gift Card" modal.

---

## Goals

1. Scan-first flow for physical gift cards (no product search needed)
2. Unified modal for both physical and electronic gift cards
3. Auto-generate unique codes for electronic cards (EGC- prefix)
4. Physical cards use batch-printed codes (GC- prefix)
5. Optional email delivery for any gift card
6. Print QR/barcode labels for batch-created cards (40x30mm)

---

## Card Number Prefixes

| Type | Prefix | Source |
|------|--------|--------|
| Physical | `GC-XXXX-XXXX-XXXX` | Batch-created, pre-printed |
| Electronic | `EGC-XXXX-XXXX-XXXX` | Auto-generated on sale |

This prevents accidental use of batch numbers for electronic cards.

---

## New Flow

### Physical Card (Scan-First)

1. Staff scans pre-printed card barcode/QR in POS
2. System detects `GC-*` pattern → opens **Sell Gift Card** modal
3. Card number shown (read-only), email toggle OFF
4. Staff selects amount ($25, $50, $100, or custom)
5. Optional: toggle email ON to send digital copy
6. Click "Add to Cart" → item added with card info attached
7. Complete payment → card activated

### Electronic Card (Product-First)

1. Staff adds "Electronic Gift Card" product (SKU: `GC-CUSTOM`)
2. System intercepts → opens **Sell Gift Card** modal
3. Card number auto-generated (`EGC-XXXX-XXXX-XXXX`), email toggle ON
4. Staff selects amount, enters recipient email (required), name, message
5. Click "Add to Cart" → item added with card info attached
6. Complete payment → card activated, email sent

---

## Modal Design: Sell Gift Card

```
┌──────────────────────────────────────────────────┐
│  Sell Gift Card                              [X] │
├──────────────────────────────────────────────────┤
│                                                  │
│  Card Number                                     │
│  ┌────────────────────────────────────────────┐  │
│  │ GC-A7B2-9K4M-X3Y1                          │  │  ← read-only
│  └────────────────────────────────────────────┘  │
│                                                  │
│  Amount                                          │
│  ┌──────┐ ┌──────┐ ┌───────┐ ┌────────────────┐  │
│  │ $25  │ │ $50  │ │ $100  │ │ $ [________]   │  │
│  └──────┘ └──────┘ └───────┘ └────────────────┘  │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │ [ ] Send digital copy via email            │  │  ← checkbox
│  └────────────────────────────────────────────┘  │
│                                                  │
│  ┌─ Shown when checkbox is ON ───────────────┐   │
│  │                                           │   │
│  │  Recipient Email *                        │   │
│  │  [________________________________]       │   │
│  │                                           │   │
│  │  Recipient Name                           │   │
│  │  [________________________________]       │   │
│  │                                           │   │
│  │  Message                                  │   │
│  │  [________________________________]       │   │
│  │  [________________________________]       │   │
│  │                                           │   │
│  └───────────────────────────────────────────┘   │
│                                                  │
│              [Cancel]        [Add to Cart]       │
└──────────────────────────────────────────────────┘
```

### Modal Behavior

| Trigger | Card Number | Email Toggle | Email Required |
|---------|-------------|--------------|----------------|
| Scan `GC-*` | Scanned value (read-only) | OFF | No |
| Add "Electronic Gift Card" | Auto-generate `EGC-*` | ON (locked) | Yes |

---

## Batch Creation + Label Printing

When creating a batch of physical gift cards, add option to print QR labels.

### Create Batch Modal (Updated)

```
┌──────────────────────────────────────────────────┐
│  Create Gift Card Batch                      [X] │
├──────────────────────────────────────────────────┤
│                                                  │
│  Quantity                                        │
│  [10_______]                                     │
│                                                  │
│  [ ] Print QR labels (40x30mm)                   │
│                                                  │
│              [Cancel]        [Create Batch]      │
└──────────────────────────────────────────────────┘
```

### Label Specifications

- **Size**: 40mm x 30mm
- **Content**: QR code encoding card number + human-readable text below
- **Layout**: Grid layout for sheet printing OR continuous for label printer
- **Print Agent**: Use existing print infrastructure (`/api/print/*`)

### Label Design (40x30mm)

```
┌────────────────────────┐
│    ┌──────────┐        │
│    │ QR CODE  │        │
│    │          │        │
│    └──────────┘        │
│  GC-A7B2-9K4M-X3Y1     │
└────────────────────────┘
```

### Single Card Reprint

From the Gift Card detail modal, add "Print Label" button for reprinting a single QR label (misprints, lost labels, etc.).

---

## Database Changes

### GiftCard Model Updates

Add `type` distinction if not already present:

```prisma
model GiftCard {
  // ... existing fields ...

  // Ensure cardNumber prefix indicates type:
  // GC-* = physical (batch)
  // EGC-* = electronic (auto-generated)
}
```

No schema changes needed - prefix in cardNumber handles type distinction.

---

## API Changes

### New/Modified Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/gift-cards/generate-number` | Generate unique EGC-* number for electronic cards |
| POST | `/api/gift-cards/batch` | **Modify**: Add `printLabels: boolean` option |
| POST | `/api/print/gift-card-labels` | Generate label PDF for batch (40x30mm grid) |
| POST | `/api/print/gift-card-label/:cardId` | Generate single label PDF (40x30mm) for reprint |

### Generate Number Response

```json
{
  "cardNumber": "EGC-X7K2-M9P4-Q3R1"
}
```

### Batch Creation with Labels

```json
// Request
{
  "quantity": 10,
  "printLabels": true
}

// Response
{
  "cards": [...],
  "labelPdfUrl": "/api/print/pdf/gc-labels-20260207-abc123.pdf"  // if printLabels: true
}
```

---

## Files to Create/Modify

### Backend

| File | Change |
|------|--------|
| `back/src/routes/gift-cards/index.ts` | Add `/generate-number` endpoint |
| `back/src/routes/gift-cards/index.ts` | Modify batch to support `printLabels` |
| `back/src/routes/print.ts` | Add `/api/print/gift-card-labels` endpoint |
| `back/src/templates/gift-card-labels-pdf.ts` | **New**: PDF template for 40x30mm labels |
| `back/src/services/giftCardService.ts` | Add `generateElectronicNumber()` function |

### Frontend

| File | Change |
|------|--------|
| `admin/src/app/components/gift-cards/GiftCardSaleModal.tsx` | **New**: Unified sale modal |
| `admin/src/app/components/gift-cards/CreateBatchModal.tsx` | Add print labels checkbox |
| `admin/src/app/components/gift-cards/GiftCardDetailModal.tsx` | Add "Print Label" button |
| `admin/src/app/components/pos/POSPage.tsx` | Handle GC-* scan → open modal |
| `admin/src/app/pages/orders/TakeOrderPage.tsx` | Handle GC-* scan → open modal |
| `admin/src/app/components/pos/POSCart.tsx` | Intercept GC-CUSTOM product → open modal |
| `admin/src/shared/utils/giftCardHelpers.ts` | Update to handle EGC-* prefix |
| `admin/src/app/components/orders/payment/GiftCardActivationModal.tsx` | **Delete**: No longer needed |

---

## Implementation Order

1. **Backend: Generate number endpoint** - `/api/gift-cards/generate-number` for EGC-* codes
2. **Backend: Label PDF template** - 40x30mm QR labels using existing PDF infrastructure
3. **Backend: Batch endpoint update** - Add `printLabels` option
4. **Frontend: GiftCardSaleModal** - New unified modal component
5. **Frontend: POS scan handler** - Detect GC-* scans, open modal
6. **Frontend: GC-CUSTOM intercept** - Intercept product add, open modal with email ON
7. **Frontend: Cart integration** - Store card info on line item
8. **Frontend: Remove old modal** - Delete GiftCardActivationModal
9. **Frontend: CreateBatchModal** - Add print labels checkbox
10. **Payment flow update** - Use card info from line item (no activation modal)

---

## Verification Checklist

### Physical Card Flow
- [ ] Scan `GC-XXXX-XXXX-XXXX` in POS → modal opens with card number shown
- [ ] Email toggle is OFF by default
- [ ] Select amount → Add to Cart → item shows in cart with card info
- [ ] Complete payment → card activated with correct amount
- [ ] Toggle email ON → fields appear, send digital copy on payment

### Electronic Card Flow
- [ ] Add "Electronic Gift Card" product → modal opens
- [ ] Card number auto-generated with EGC-* prefix
- [ ] Email toggle is ON and required
- [ ] Enter email, name, message → Add to Cart
- [ ] Complete payment → card activated, email sent

### Batch Label Printing
- [ ] Create batch with "Print QR labels" checked
- [ ] PDF generated with correct 40x30mm label layout
- [ ] QR codes scan correctly to card numbers
- [ ] Print via print agent works

### Single Card Reprint
- [ ] Open gift card detail modal → "Print Label" button visible
- [ ] Click button → generates single 40x30mm label PDF
- [ ] QR scans correctly to card number

### Edge Cases
- [ ] Scanning already-active card shows error
- [ ] EGC-* numbers never collide with batch GC-* numbers
- [ ] Custom amount validation ($25-$300)
- [ ] Email validation for electronic cards

---

## Out of Scope

- Customer-facing website gift card purchase (already exists, unchanged)
- Gift card balance lookup changes
- Expiration date handling
- Multi-quantity in single modal (one card at a time for clarity)

---

## UI Patterns Reference

- Use `Modal` from `@shared/ui/components/ui/modal`
- Use `InputField` for text inputs
- Use `formatCurrency()` for amount display
- Currency in cents internally
- NO emojis in UI (use icons from `@shared/assets/icons`)
- Amount buttons: `bg-brand-500` when selected, `bg-gray-100` otherwise

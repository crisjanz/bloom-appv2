# POS Issues Tracker

Source of truth for implementation progress from `docs/POS_FLOWS.md`.

Status values: `TODO` | `IN_PROGRESS` | `BLOCKED` | `DONE`

| ID | Priority | Area | Issue | Status | Commit | QA Notes |
|---|---|---|---|---|---|---|
| POS-001 | P0 | TakeOrder Split Payment | Split row "Pay" marks completed without collecting payment in modal | DONE | - | Implemented modal-per-row flow with split payload persistence in `TakeOrderPaymentTiles` |
| POS-002 | P0 | Payment Provider | `PaymentSection` maps card provider as `SQUARE` while card flow uses Stripe | DONE | - | Fallback provider mapping updated to `STRIPE` in `PaymentSection` and `paymentHelpers` |
| POS-003 | P0 | Website Payments | No PT record created for website orders (`/save-draft`) | TODO | - | Validate transactions report includes website orders |
| POS-004 | P1 | Payment Actions | Print/Email toggles not unified across TakeOrder/POS and not auto-executed consistently | TODO | - | Verify toggles work the same in both flows |
| POS-005 | P1 | House Account | House Account payment option enabled for customers without HA activation | DONE | - | House Account tile now disabled unless `customer.isHouseAccount`, with split-row guard in POS/TakeOrder and full customer object preserved on selection |
| POS-006 | P1 | Naming | Rename `Check` to `Cheque` in labels/types/enums | TODO | - | Verify labels and payload mappings |
| POS-007 | P1 | Naming | Rename `COD` to `Pay Later` across flow and split tender options | TODO | - | Verify UI + method mappings |
| POS-008 | P2 | UI Consistency | `AdjustmentsModal` should use shared `Modal` component pattern | TODO | - | Match shared modal styling + behavior |
| POS-009 | P2 | POS UI | Move quick actions to dedicated post-payment toggles row | TODO | - | Confirm tap targets and placement |
| POS-010 | P0 | Data Model | Separate `paymentStatus` from fulfillment `status` (major refactor) | TODO | - | Tracked with dedicated feature plan |

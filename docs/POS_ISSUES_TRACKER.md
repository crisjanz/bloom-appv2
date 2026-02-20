# POS Issues Tracker

Source of truth for implementation progress from `docs/POS_FLOWS.md`.

Status values: `TODO` | `IN_PROGRESS` | `BLOCKED` | `DONE`

| ID | Priority | Area | Issue | Status | Commit | QA Notes |
|---|---|---|---|---|---|---|
| POS-001 | P0 | TakeOrder Split Payment | Split row "Pay" marks completed without collecting payment in modal | DONE | - | Implemented modal-per-row flow with split payload persistence in `TakeOrderPaymentTiles` |
| POS-002 | P0 | Payment Provider | `PaymentSection` maps card provider as `SQUARE` while card flow uses Stripe | DONE | - | Fallback provider mapping updated to `STRIPE` in `PaymentSection` and `paymentHelpers` |
| POS-003 | P0 | Website Payments | No PT record created for website orders (`/save-draft`) | DONE | - | `save-draft` now creates Stripe CARD PT entries (channel `WEBSITE`) for confirmed payment intents |
| POS-004 | P1 | Payment Actions | Print/Email toggles not unified across TakeOrder/POS and not auto-executed consistently | TODO | - | Verify toggles work the same in both flows |
| POS-005 | P1 | House Account | House Account payment option enabled for customers without HA activation | DONE | - | House Account tile now disabled unless `customer.isHouseAccount`, with split-row guard in POS/TakeOrder and full customer object preserved on selection |
| POS-006 | P1 | Naming | Rename `Check` to `Cheque` in labels/types/enums | TODO | - | Verify labels and payload mappings |
| POS-007 | P1 | Naming | Rename `COD` to `Pay Later` across flow and split tender options | TODO | - | Verify UI + method mappings |
| POS-008 | P2 | UI Consistency | `AdjustmentsModal` should use shared `Modal` component pattern | TODO | - | Match shared modal styling + behavior |
| POS-009 | P2 | POS UI | Move quick actions to dedicated post-payment toggles row | TODO | - | Confirm tap targets and placement |
| POS-010 | P0 | Data Model | Separate `paymentStatus` from fulfillment `status` (major refactor) | DONE | - | Tracked with dedicated feature plan |
| POS-011 | P1 | Payment Architecture | Duplicate payment pipelines in TakeOrder (`PaymentSection/useOrderPayments`) and POS (`PaymentController/useTransactionSubmission`) | TODO | - | Consolidate to a shared submission flow to remove drift |
| POS-012 | P0 | Payment Reliability | Partial-failure path can leave orders created without PT/gift-card completion | TODO | - | Add transactional guardrails and clear operator alerting |
| POS-013 | P1 | Website Checkout | Website orders do not send confirmation email after successful checkout | DONE | - | `/api/orders/save-draft` now triggers configured PAID notifications (same template/settings path as POS) |
| POS-014 | P1 | Website Ops | Website delivery orders do not auto-queue fulfillment ticket printing | DONE | - | `/api/orders/save-draft` now queues `ORDER_TICKET` print jobs for confirmed website delivery and pickup orders |
| POS-015 | P2 | Website UX | "This order is for me" copy/placement is confusing in checkout | TODO | - | Rename to "I am the recipient" and place under delivery/pickup toggle |
| POS-016 | P2 | Website UX | Surprise-delivery modal copy is vague (missing explicit below-zero warning) | TODO | - | Tighten warning and redelivery fee wording |
| POS-017 | P2 | Website UX | Delivery instructions label does not indicate optional vs required state | TODO | - | Show "(optional)" except when surprise flow makes it required |
| POS-018 | P2 | Website UX | "Remind me next year" is gated to authenticated users only | TODO | - | Allow guest reminder creation using checkout email |
| POS-019 | P1 | Website UX | Checkout Step 3 login link navigates away and risks state loss | DONE | - | Replaced Step 3 `/login` link with inline checkout login modal to preserve entered state |
| POS-020 | P1 | Website UX | Terms link navigates away from checkout instead of modal overlay | DONE | - | Checkout review step now opens Terms in inline modal (`CheckoutTermsModal`) and preserves checkout state |
| POS-021 | P2 | Mobile Scan | Desktop scan modal (`ScanExternalOrderModal`) still present on External Orders page | TODO | - | Remove desktop scan entry points; keep scan mobile-only |
| POS-022 | P1 | Mobile Scan | FTD scan flow hardcodes delivery fee to $15 | TODO | - | Make fee configurable or parse from order data |
| POS-023 | P2 | Mobile Scan | DoorDash scan flow uses shared system customer record for all orders | TODO | - | Evaluate per-customer capture strategy without breaking current ops |
| POS-024 | P2 | Mobile Scan | Scan customer matching by phone only creates duplicate customer records | TODO | - | Add secondary name/email matching heuristics |
| POS-025 | P0 | Order Payments | No "Collect/Apply Payment" action for existing `paymentStatus: UNPAID` orders | TODO | - | Add payment collection flow that creates PT and recalculates payment status |
| POS-026 | P1 | Order Status | Status transitions allow backward jumps without confirmation | TODO | - | Add confirmation/guardrails for regressions in fulfillment status |
| POS-027 | P1 | Payment Adjustments | Sub-$0.50 order edits skip PT adjustments and create accounting drift | TODO | - | Revisit threshold behavior to avoid silent mismatches |
| POS-028 | P1 | Cleanup | Test endpoint `POST /api/orders/test-notification` still exists | DONE | - | Removed test-only notification route from `orders/status.ts` |
| POS-029 | P2 | Notifications | Notification system is over-built relative to simplified trigger spec | TODO | - | Reduce status-trigger/template sprawl to required notifications only |

# POS-012 Atomic Payment Submission Guardrails

**Status:** 🔜 Ready for Implementation
**Created:** 2026-02-21
**Priority:** High (P0)
**Tracker:** `POS-012` in `/docs/POS_ISSUES_TRACKER.md`

---

## Overview

`POS-012` is a reliability refactor, not just flow resequencing.

Today, payment completion is orchestrated from the frontend in two separate paths:
- `PaymentController` + `useTransactionSubmission` (POS)
- `PaymentSection` + `useOrderPayments` (TakeOrder)

Both paths can partially succeed, then continue:
- Orders can be created/updated, then PT creation can fail.
- Gift card activation/redeem can fail after financial records are written.
- Some failures are logged but not surfaced in a durable, retryable way.

This plan adds a single backend submission workflow with transactional core steps, idempotency, and explicit failure states so operators can recover safely.

---

## 🤖 Implementation Constraints for AI

**CRITICAL - Read Before Implementing:**

> **⚠️ FOR AI ASSISTANTS: You MUST read the required documentation before writing code. Follow existing patterns exactly.**

### Required Reading (IN ORDER)
1. `/docs/AI_IMPLEMENTATION_GUIDE.md`
2. `/docs/System_Reference.md`
3. `/docs/API_Endpoints.md`
4. `/CLAUDE.md`
5. `/docs/POS_FLOWS.md` (Section 3.4 and POS-012 notes)
6. `/docs/POS_ISSUES_TRACKER.md` (`POS-012`, and related `POS-011`)

### Pattern Reference Files
- **Order creation logic:** `/back/src/routes/orders/create.ts`
- **PT creation route:** `/back/src/routes/payment-transactions.ts`
- **PT service transaction pattern:** `/back/src/services/transactionService.ts`
- **POS payment orchestration (current):** `/admin/src/domains/payments/hooks/useTransactionSubmission.ts`
- **TakeOrder payment orchestration (current):** `/admin/src/app/components/orders/payment/PaymentSection.tsx`
- **POS controller integration:** `/admin/src/app/components/pos/payment/PaymentController.tsx`
- **Frontend API client pattern:** `/admin/src/shared/hooks/useApiClient.ts`

### Pre-Implementation Quiz (Answer Before Coding)

**Question 1: API Client**
- What hook do you use for all frontend API calls?
- Answer: `useApiClient` (not `fetch`)

**Question 2: Price Storage**
- How are monetary values stored in the database?
- Answer: As `Int` in `cents`

**Question 3: Validation**
- What library validates backend requests?
- Answer: `Zod` with `.parse()`

### Pre-Implementation Contract (Required — Answer Before Coding)

- **Goals -> Changes mapping**
  - Goal 1 (atomic core commit): New backend submission service performs order create/update + PT creation in one DB transaction boundary.
  - Goal 2 (no silent partial success): Remove "continue anyway" behavior from frontend and route all submissions through one backend endpoint.
  - Goal 3 (clear operator recovery): Persist workflow state + failure stage + retry endpoint + surfaced workflow ID.
- **Files to touch (exact paths):** Listed in "Files to Create/Modify".
- **Backend surface area:** Add `/api/payment-submissions` routes and register in `/back/src/index.ts`.
- **DB/migrations:** Add workflow persistence models/enums in `/back/prisma/schema.prisma`; migration `pos_payment_submission_guardrails`.
- **UI standards confirmation:** Keep existing payment UI, only update orchestration hooks/handlers.
- **Unknowns / questions:** If a side effect cannot be made atomic (gift cards/print/email), mark it as retryable with durable state; do not silently swallow errors.

### Critical Don'ts
❌ Do not leave `continue anyway` behavior for PT creation failures  
❌ Do not mark submission successful if core financial commit failed  
❌ Do not rely on console logs as the only failure signal  
❌ Do not keep two separate orchestration pipelines after cutover  
❌ Do not add frontend `fetch()` calls in new payment code

---

## Goals

1. Ensure core payment commit is atomic: no persisted "orders paid" state without a linked PT record.
2. Provide durable workflow state for non-atomic side effects (gift cards, print/email) with retry support.
3. Unify POS and TakeOrder payment submission to one backend contract to eliminate drift.
4. Provide explicit operator-visible failure context (workflow ID, failed stage, retry action).

---

## Architecture & Endpoints

### Backend API Routes

**New file:** `/back/src/routes/payment-submissions.ts`

**Endpoints:**
- `POST /api/payment-submissions` — submit payment workflow with idempotency key
- `GET /api/payment-submissions/:id` — get workflow status/details
- `POST /api/payment-submissions/:id/retry` — retry failed side effects
- `GET /api/payment-submissions/failures` — list recent failed/retry-required workflows

### Request Contract (POST)

```ts
{
  idempotencyKey: string; // required, unique per submission attempt key
  channel: 'POS' | 'PHONE';
  customerId: string;
  employeeId?: string;
  orderPayload: {
    createOrders?: any[];      // non-draft orders
    draftOrderIds?: string[];  // draft orders to settle
  };
  payments: Array<{
    type: string;
    provider: string;
    amount: number; // cents
    metadata?: Record<string, any>;
  }>;
  taxAmount?: number;
  tipAmount?: number;
  notes?: string;
  giftCardActions?: {
    purchases?: any[];
    redemptions?: any[];
  };
  postActions?: {
    printReceipt?: boolean;
    printTicket?: boolean;
    emailReceipt?: boolean;
    receiptEmail?: string;
  };
}
```

### Response Contract

```ts
{
  workflowId: string;
  status: 'COMPLETED' | 'RETRY_REQUIRED' | 'FAILED';
  transactionId?: string;
  transactionNumber?: string;
  orderIds: string[];
  failedStage?: string;
  errorMessage?: string;
}
```

### Core Workflow Stages

1. `VALIDATE_INPUT`
2. `CORE_TRANSACTION`
3. `SIDE_EFFECTS_GIFT_CARD_PURCHASE`
4. `SIDE_EFFECTS_GIFT_CARD_REDEEM`
5. `SIDE_EFFECTS_POST_ACTIONS`
6. `COMPLETED`

### Transaction Boundary

Inside one `prisma.$transaction`:
- Create new orders and/or update draft orders for settlement
- Create PT via `transactionService` (or extracted internal method)
- Link all orders to PT
- Update order payment state as part of the same commit path
- Persist workflow core-result metadata

If any core step fails, rollback entire core transaction and return `FAILED`.

### Non-Atomic Side Effects

Gift card operations and print/email are tracked as workflow steps:
- On side-effect failure, return `RETRY_REQUIRED` (not silent success)
- Persist `failedStage`, `errorMessage`, and retry payload
- Expose retry endpoint for operators

This keeps financial consistency while still handling external/async side effects safely.

---

## Database Schema

**Models to create/modify:**

```prisma
enum PaymentWorkflowStatus {
  PROCESSING
  COMPLETED
  FAILED
  RETRY_REQUIRED
}

enum PaymentWorkflowStage {
  VALIDATE_INPUT
  CORE_TRANSACTION
  SIDE_EFFECTS_GIFT_CARD_PURCHASE
  SIDE_EFFECTS_GIFT_CARD_REDEEM
  SIDE_EFFECTS_POST_ACTIONS
  COMPLETED
}

model PaymentWorkflow {
  id             String                @id @default(uuid())
  idempotencyKey String                @unique
  status         PaymentWorkflowStatus @default(PROCESSING)
  stage          PaymentWorkflowStage  @default(VALIDATE_INPUT)
  channel        PaymentChannel
  customerId     String
  employeeId     String?
  transactionId  String?
  orderIds       String[]              @default([])
  requestPayload Json
  resultPayload  Json?
  failedStage    PaymentWorkflowStage?
  errorMessage   String?
  retryCount     Int                   @default(0)
  startedAt      DateTime              @default(now())
  completedAt    DateTime?
  createdAt      DateTime              @default(now())
  updatedAt      DateTime              @updatedAt

  customer       Customer              @relation(fields: [customerId], references: [id])
  employee       Employee?             @relation(fields: [employeeId], references: [id])
  transaction    PaymentTransaction?   @relation(fields: [transactionId], references: [id], onDelete: SetNull)
  events         PaymentWorkflowEvent[]

  @@index([status, updatedAt])
  @@index([channel, createdAt])
  @@map("payment_workflows")
}

model PaymentWorkflowEvent {
  id          String               @id @default(uuid())
  workflowId  String
  stage       PaymentWorkflowStage
  status      PaymentWorkflowStatus
  message     String?
  payload     Json?
  createdAt   DateTime             @default(now())

  workflow    PaymentWorkflow      @relation(fields: [workflowId], references: [id], onDelete: Cascade)

  @@index([workflowId, createdAt])
  @@map("payment_workflow_events")
}
```

**Migration command:**
```bash
npx prisma migrate dev --name pos_payment_submission_guardrails
```

---

## UI Requirements

### Frontend Integration

Use one submission hook for both flows:
- `PaymentController` (POS)
- `PaymentSection` (TakeOrder)

Expected behavior:
1. UI only shows completion when submission status is `COMPLETED`
2. If `RETRY_REQUIRED`, show explicit warning with workflow ID and failed stage
3. Retry action can call `/api/payment-submissions/:id/retry`
4. Remove legacy direct PT creation branches and "continue anyway" paths

### Operator Alerting

Minimum alerting behavior:
- Return workflow ID in all non-success responses
- Persist failed workflows in DB
- Expose failed workflows list for support/ops visibility

No major UI redesign is required for POS-012. This is a reliability/orchestration change.

---

## Implementation Checklist

### Phase 1: Backend Core Submission
- [ ] Add Prisma enums/models for `PaymentWorkflow` + `PaymentWorkflowEvent`
- [ ] Run migration: `npx prisma migrate dev --name pos_payment_submission_guardrails`
- [ ] Create service `/back/src/services/paymentSubmissionService.ts`
- [ ] Implement transactional core commit (orders + PT + links) with strict rollback
- [ ] Add route `/back/src/routes/payment-submissions.ts`
- [ ] Register route in `/back/src/index.ts`

### Phase 2: Side-Effect Reliability
- [ ] Add durable step tracking for gift card purchase/redeem
- [ ] Add durable step tracking for print/email actions
- [ ] Return `RETRY_REQUIRED` on side-effect failures
- [ ] Add retry endpoint `/api/payment-submissions/:id/retry`

### Phase 3: Frontend Cutover
- [ ] Add shared hook `/admin/src/domains/payments/hooks/usePaymentSubmission.ts`
- [ ] Update `/admin/src/app/components/pos/payment/PaymentController.tsx` to use new endpoint
- [ ] Update `/admin/src/app/components/orders/payment/PaymentSection.tsx` to use new endpoint
- [ ] Remove duplicate PT orchestration in `/admin/src/domains/payments/hooks/useTransactionSubmission.ts`
- [ ] Remove duplicate PT orchestration in `/admin/src/domains/orders/hooks/useOrderPayments.ts`

### Phase 4: Alerting + Recovery UX
- [ ] Add failed-workflow query endpoint
- [ ] Surface failure state in payment completion errors (workflow ID + failed stage)
- [ ] Add retry action from frontend where practical

### Phase 5: Testing
- [ ] Unit tests: idempotency key replay returns same result
- [ ] Unit tests: core transaction rollback on forced PT failure
- [ ] Integration tests: order creation failure, PT failure, gift card activation failure, redeem failure
- [ ] Integration tests: duplicate submit (double-click/network retry)
- [ ] Verify no path leaves paid order without PT linkage

---

## Data Flow

**Success Flow**
```text
Frontend submit
  -> POST /api/payment-submissions (idempotencyKey)
  -> Core DB transaction (orders + PT + links)
  -> Side effects (gift cards, print/email)
  -> COMPLETED
  -> Frontend completion UI
```

**Side-Effect Failure Flow**
```text
Frontend submit
  -> Core DB transaction committed
  -> Gift card or print/email step fails
  -> Workflow marked RETRY_REQUIRED with failedStage
  -> Frontend shows warning + workflow ID
  -> Operator retries via /retry endpoint
```

**Core Failure Flow**
```text
Frontend submit
  -> Core DB transaction fails
  -> Full rollback
  -> Workflow marked FAILED
  -> Frontend shows hard failure (no completion state)
```

---

## Edge Cases & Validation

### Input Validation
- Reject missing/empty `idempotencyKey`
- Validate payment total coverage and non-negative cents
- Require at least one order target (create or draft update)
- Require customer for all submissions

### Business Rules
- No `PAID` order state should persist without PT link
- House account validation remains enforced in `transactionService`
- Gift card side effects must be durable/retryable if not atomic

### Failure Scenarios
- Duplicate submission requests (same idempotency key)
- Network timeout after backend commit
- PT failure after order preparation but before commit
- Gift card purchase/redeem failure after core commit
- Print/email downstream failures

---

## Files to Create/Modify

### New Files
```text
/back/src/routes/payment-submissions.ts
/back/src/services/paymentSubmissionService.ts
/admin/src/domains/payments/hooks/usePaymentSubmission.ts
```

### Modified Files
```text
/back/prisma/schema.prisma
/back/src/index.ts
/back/src/routes/orders/create.ts
/back/src/routes/payment-transactions.ts
/back/src/services/transactionService.ts
/admin/src/app/components/pos/payment/PaymentController.tsx
/admin/src/app/components/orders/payment/PaymentSection.tsx
/admin/src/app/components/orders/payment/CollectPaymentModal.tsx  ← update recordPayment() to call /api/payment-submissions (Phase 3 cutover)
/admin/src/domains/payments/hooks/useTransactionSubmission.ts
/admin/src/domains/orders/hooks/useOrderPayments.ts
/docs/API_Endpoints.md
/docs/POS_ISSUES_TRACKER.md
```

---

## Out of Scope

- POS-004 toggle UI redesign details
- POS-006/POS-007 naming refactors (`Check -> Cheque`, `COD -> Pay Later`)
- Full POS-011 code deduplication beyond payment submission cutover

POS-012 should still lay the backend foundation POS-011 can complete against.


# Refund System Implementation Plan

## Overview
Comprehensive refund system supporting full/partial refunds for single and multi-order transactions, with external provider integration and item-level refund breakdowns.

## Current State Analysis

### ✅ What Exists
- `PaymentTransaction` model with multi-order support via `OrderPayment` junction
- `Refund` and `RefundMethod` models (schema.prisma:1112-1145)
- `transactionService.processRefund()` method
- `PaymentTransactionStatus` has REFUNDED/PARTIALLY_REFUNDED states
- `PaymentAdjustmentModal` component (basic payment adjustments)

### ❌ What's Missing
- Order-specific refund tracking (refunds linked to transaction, not individual orders)
- Partial refund at item level
- `OrderStatus.REFUNDED` / `PARTIALLY_REFUNDED` states
- Refund UI/modal workflow
- External provider system (rename WIREIN → EXTERNAL, add provider config)
- Ability to refund one order from multi-order transaction

---

## Phase 1: Database Schema Changes

### 1.1 OrderStatus Enum Extension
**File:** `back/prisma/schema.prisma`

```prisma
enum OrderStatus {
  DRAFT
  PAID
  IN_DESIGN
  READY
  OUT_FOR_DELIVERY
  COMPLETED
  REJECTED
  CANCELLED
  REFUNDED              // NEW: Full refund processed
  PARTIALLY_REFUNDED    // NEW: Partial refund processed
}
```

### 1.2 External Provider System
**File:** `back/prisma/schema.prisma`

#### Rename OrderSource WIREIN → EXTERNAL
```prisma
enum OrderSource {
  PHONE
  WALKIN
  EXTERNAL     // RENAMED from WIREIN
  WEBSITE
  POS
}
```

#### Expand OrderExternalSource
```prisma
enum OrderExternalSource {
  FTD
  DOORDASH
  FUNERAL_SERVICE
  OTHER
}
```

#### Payment Method Type Update
```prisma
enum PaymentMethodType {
  CASH
  CARD
  GIFT_CARD
  STORE_CREDIT
  CHECK
  COD
  HOUSE_ACCOUNT
  OFFLINE
  EXTERNAL  // RENAMED from FTD - stores provider in providerMetadata.source
}
```

#### New ExternalProvider Configuration Table
```prisma
model ExternalProvider {
  id        String   @id @default(cuid())
  name      String   @unique // "FTD", "DoorDash", "Funeral Home A"
  code      String   @unique // "FTD", "DOORDASH", "FUNERAL_A"
  isActive  Boolean  @default(true)
  sortOrder Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("external_providers")
}
```

### 1.3 Order-Level Refund Tracking
**File:** `back/prisma/schema.prisma`

Add junction table to link refunds to specific orders:

```prisma
model OrderRefund {
  id        String @id @default(uuid())
  refundId  String
  orderId   String
  amount    Int    // Amount refunded for this specific order (in cents)

  refund Refund @relation(fields: [refundId], references: [id])
  order  Order  @relation(fields: [orderId], references: [id])

  @@map("order_refunds")
}
```

Update `Refund` model:
```prisma
model Refund {
  id            String  @id @default(uuid())
  transactionId String
  refundNumber  String  @unique
  amount        Int
  reason        String?

  // NEW: Refund breakdown
  refundType    String  @default("FULL") // "FULL", "PARTIAL"
  itemBreakdown Json?   // Item-level refund details
  taxRefunded   Int     @default(0) // Tax portion of refund
  deliveryFeeRefunded Int @default(0) // Delivery fee portion

  refundMethods RefundMethod[]
  orderRefunds  OrderRefund[]  // NEW: Link to specific orders

  employeeId  String?
  processedAt DateTime @default(now())

  transaction PaymentTransaction @relation(fields: [transactionId], references: [id])
  employee    Employee?          @relation("EmployeeRefunds", fields: [employeeId], references: [id])

  @@map("refunds")
}
```

Update `Order` model (add relation):
```prisma
model Order {
  // ... existing fields
  orderPayments OrderPayment[]
  orderRefunds  OrderRefund[]  // NEW
  // ... rest of model
}
```

### 1.4 Migration Commands
```bash
# Create migration
npx prisma migrate dev --name add_refund_system_and_external_providers

# Apply to staging
npx prisma migrate deploy
```

---

## Phase 2: Backend Services

### 2.1 External Provider Service
**File:** `back/src/services/externalProviderService.ts`

```typescript
import prisma from '../lib/prisma';

class ExternalProviderService {
  async getAllProviders() {
    return await prisma.externalProvider.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' }
    });
  }

  async createProvider(data: { name: string; code: string }) {
    return await prisma.externalProvider.create({ data });
  }

  async updateProvider(id: string, data: Partial<{ name: string; code: string; isActive: boolean; sortOrder: number }>) {
    return await prisma.externalProvider.update({
      where: { id },
      data
    });
  }

  async deleteProvider(id: string) {
    return await prisma.externalProvider.delete({ where: { id } });
  }
}

export default new ExternalProviderService();
```

### 2.2 Enhanced Refund Service
**File:** `back/src/services/refundService.ts`

```typescript
import prisma from '../lib/prisma';
import { Prisma } from '@prisma/client';

interface RefundItemBreakdown {
  orderItemId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  refundAmount: number;
}

interface ProcessRefundData {
  transactionId: string;
  refundType: 'FULL' | 'PARTIAL';
  totalAmount: number;
  reason?: string;
  employeeId?: string;

  // Order-specific refunds (for multi-order transactions)
  orderRefunds: {
    orderId: string;
    amount: number;
  }[];

  // Partial refund details
  itemBreakdown?: RefundItemBreakdown[];
  taxRefunded?: number;
  deliveryFeeRefunded?: number;

  // Refund methods
  refundMethods: {
    paymentMethodType: 'CASH' | 'CARD' | 'GIFT_CARD' | 'STORE_CREDIT' | 'CHECK' | 'COD' | 'EXTERNAL';
    provider: 'STRIPE' | 'SQUARE' | 'INTERNAL';
    amount: number;
    providerRefundId?: string;
    status?: string; // 'completed', 'pending', 'manual'
  }[];
}

class RefundService {
  async processRefund(data: ProcessRefundData) {
    return await prisma.$transaction(async (tx) => {
      // Generate refund number
      const refundNumber = await this.generateRefundNumber(tx);

      // Create refund record
      const refund = await tx.refund.create({
        data: {
          transactionId: data.transactionId,
          refundNumber,
          amount: data.totalAmount,
          reason: data.reason,
          employeeId: data.employeeId,
          refundType: data.refundType,
          itemBreakdown: data.itemBreakdown || [],
          taxRefunded: data.taxRefunded || 0,
          deliveryFeeRefunded: data.deliveryFeeRefunded || 0
        }
      });

      // Create refund methods
      await Promise.all(
        data.refundMethods.map(method =>
          tx.refundMethod.create({
            data: {
              refundId: refund.id,
              paymentMethodType: method.paymentMethodType,
              provider: method.provider,
              amount: method.amount,
              providerRefundId: method.providerRefundId,
              status: method.status || 'completed'
            }
          })
        )
      );

      // Create order-level refund records
      await Promise.all(
        data.orderRefunds.map(orderRefund =>
          tx.orderRefund.create({
            data: {
              refundId: refund.id,
              orderId: orderRefund.orderId,
              amount: orderRefund.amount
            }
          })
        )
      );

      // Update order statuses
      await Promise.all(
        data.orderRefunds.map(async (orderRefund) => {
          const order = await tx.order.findUnique({
            where: { id: orderRefund.orderId },
            include: { orderRefunds: true }
          });

          if (order) {
            // Calculate total refunded for this order
            const totalRefunded = order.orderRefunds.reduce((sum, r) => sum + r.amount, 0);

            // Determine new status
            let newStatus = order.status;
            if (totalRefunded >= order.paymentAmount) {
              newStatus = 'REFUNDED';
            } else if (totalRefunded > 0) {
              newStatus = 'PARTIALLY_REFUNDED';
            }

            await tx.order.update({
              where: { id: orderRefund.orderId },
              data: { status: newStatus }
            });
          }
        })
      );

      // Update transaction status
      const transaction = await tx.paymentTransaction.findUnique({
        where: { id: data.transactionId },
        include: { refunds: true }
      });

      if (transaction) {
        const totalRefunded = transaction.refunds.reduce((sum, r) => sum + r.amount, 0);
        const newStatus = totalRefunded >= transaction.totalAmount ? 'REFUNDED' : 'PARTIALLY_REFUNDED';

        await tx.paymentTransaction.update({
          where: { id: data.transactionId },
          data: { status: newStatus }
        });
      }

      return refund;
    });
  }

  async getRefundDetails(refundNumber: string) {
    return await prisma.refund.findUnique({
      where: { refundNumber },
      include: {
        refundMethods: true,
        orderRefunds: {
          include: {
            order: {
              include: {
                orderItems: true
              }
            }
          }
        },
        employee: true,
        transaction: {
          include: {
            customer: true,
            paymentMethods: true,
            orderPayments: {
              include: {
                order: true
              }
            }
          }
        }
      }
    });
  }

  private async generateRefundNumber(tx: any): Promise<string> {
    const count = await tx.refund.count();
    const paddedNumber = (count + 1).toString().padStart(5, '0');
    return `RF-${paddedNumber}`;
  }
}

export default new RefundService();
```

### 2.3 API Endpoints
**File:** `back/src/routes/refunds.ts` (NEW)

```typescript
import express from 'express';
import refundService from '../services/refundService';
import externalProviderService from '../services/externalProviderService';

const router = express.Router();

// Process refund
router.post('/refunds', async (req, res) => {
  try {
    const refund = await refundService.processRefund(req.body);
    res.json(refund);
  } catch (error) {
    console.error('Refund processing failed:', error);
    res.status(500).json({ error: 'Failed to process refund' });
  }
});

// Get refund details
router.get('/refunds/:refundNumber', async (req, res) => {
  try {
    const refund = await refundService.getRefundDetails(req.params.refundNumber);
    if (!refund) {
      return res.status(404).json({ error: 'Refund not found' });
    }
    res.json(refund);
  } catch (error) {
    console.error('Failed to fetch refund:', error);
    res.status(500).json({ error: 'Failed to fetch refund' });
  }
});

// External providers CRUD
router.get('/external-providers', async (req, res) => {
  try {
    const providers = await externalProviderService.getAllProviders();
    res.json(providers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch providers' });
  }
});

router.post('/external-providers', async (req, res) => {
  try {
    const provider = await externalProviderService.createProvider(req.body);
    res.json(provider);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create provider' });
  }
});

router.put('/external-providers/:id', async (req, res) => {
  try {
    const provider = await externalProviderService.updateProvider(req.params.id, req.body);
    res.json(provider);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update provider' });
  }
});

router.delete('/external-providers/:id', async (req, res) => {
  try {
    await externalProviderService.deleteProvider(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete provider' });
  }
});

export default router;
```

---

## Phase 3: Frontend Refund UI

### 3.1 Refund Modal Component
**File:** `admin/src/app/components/refunds/RefundModal.tsx` (NEW)

**Features:**
- Step 1: Full vs Partial refund selection
- Full refund: Choose refund method (original methods + Cash + Store Credit)
- Partial refund: Item list with editable refund amounts
- Auto-prorate tax based on selected items
- Delivery fee as separate editable line item
- Confirm screen with reason/notes (required)
- Multi-order transaction support (select which orders to refund)

**Props:**
```typescript
interface RefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: PaymentTransactionDetails;
  onRefundComplete: () => void;
}
```

### 3.2 Frontend Status Updates
**File:** `admin/src/domains/orders/entities/Order.ts`

Add to OrderStatus enum:
```typescript
export enum OrderStatus {
  // ... existing statuses
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
}
```

**File:** `admin/src/shared/utils/statusColors.ts`

Add colors:
```typescript
case 'REFUNDED':
  return 'text-purple-600';
case 'PARTIALLY_REFUNDED':
  return 'text-orange-600';
```

**File:** `admin/src/shared/utils/orderStatusHelpers.ts`

Add labels:
```typescript
case 'REFUNDED':
  return 'Refunded';
case 'PARTIALLY_REFUNDED':
  return 'Partially Refunded';
```

### 3.3 Integration Points
- Orders list page: Add "Refund" button for PAID/COMPLETED orders
- Order detail page: Show refund history
- Transaction detail page: Trigger refund modal

---

## Phase 4: External Provider UI

### 4.1 Settings Page
**File:** `admin/src/app/pages/settings/ExternalProvidersPage.tsx` (NEW)

- List of external providers
- Add/Edit/Delete functionality
- Reorder (sortOrder)
- Active/Inactive toggle

### 4.2 Order Source Updates
- Rename "FTD Orders" → "External Orders" in navigation
- Update filters to show all external providers
- Display provider name in order lists/details

---

## Implementation Checklist

### Database & Backend
- [ ] 1.1 Add REFUNDED/PARTIALLY_REFUNDED to OrderStatus enum
- [ ] 1.2 Rename WIREIN → EXTERNAL in OrderSource
- [ ] 1.2 Expand OrderExternalSource enum
- [ ] 1.2 Update PaymentMethodType (FTD → EXTERNAL)
- [ ] 1.2 Create ExternalProvider table
- [ ] 1.3 Create OrderRefund junction table
- [ ] 1.3 Update Refund model with new fields
- [ ] 1.4 Run migration
- [ ] 2.1 Create externalProviderService
- [ ] 2.2 Create refundService
- [ ] 2.3 Create /api/refunds endpoints
- [ ] 2.3 Create /api/external-providers endpoints

### Frontend
- [ ] 3.1 Create RefundModal component
- [ ] 3.1 Implement full refund flow
- [ ] 3.1 Implement partial refund flow
- [ ] 3.1 Add multi-order transaction support
- [ ] 3.2 Update OrderStatus enum
- [ ] 3.2 Add status colors
- [ ] 3.2 Add status labels
- [ ] 3.3 Add refund button to orders list
- [ ] 3.3 Add refund history to order detail
- [ ] 4.1 Create ExternalProvidersPage
- [ ] 4.2 Rename "FTD Orders" → "External Orders"
- [ ] 4.2 Update order source filters/displays

### Testing
- [ ] Test full refund for single order
- [ ] Test full refund for multi-order transaction
- [ ] Test partial refund (item-level)
- [ ] Test refunding one order from multi-order transaction
- [ ] Test external provider CRUD
- [ ] Test status updates (order + transaction)
- [ ] Test external order creation with new provider system

---

## Data Migration Notes

### Existing Data Cleanup
```sql
-- Update existing WIREIN orders to EXTERNAL
UPDATE "Order" SET "orderSource" = 'EXTERNAL' WHERE "orderSource" = 'WIREIN';

-- Update existing FTD payment methods
UPDATE "PaymentMethod" SET "type" = 'EXTERNAL' WHERE "type" = 'FTD';

-- Seed initial external providers
INSERT INTO "external_providers" (id, name, code, "isActive", "sortOrder", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'FTD', 'FTD', true, 1, NOW(), NOW()),
  (gen_random_uuid(), 'Other', 'OTHER', true, 99, NOW(), NOW());
```

---

---

## Phase 5: Payment Source Tracking & Refund Routing

### 5.1 Payment Method Source Tracking

**Problem:** Card-present (terminal) payments require customer with card to process refund. Saved card payments can be refunded via API automatically.

#### Schema Update
**File:** `back/prisma/schema.prisma`

```prisma
model PaymentMethod {
  id              String            @id @default(uuid())
  transactionId   String
  type            PaymentMethodType
  provider        PaymentProvider
  amount          Int
  offlineMethodId String?

  // NEW: Track payment source for refund routing
  paymentSource   String?           @default("MANUAL") // "TERMINAL", "SAVED_CARD", "MANUAL_ENTRY", "ONLINE"
  isCardPresent   Boolean           @default(false)    // TRUE = requires customer present for refund

  // Provider-specific data
  providerTransactionId String?
  providerMetadata      Json?

  cardLast4      String?
  cardBrand      String?
  giftCardNumber String?
  checkNumber    String?

  status      String   @default("completed")
  processedAt DateTime @default(now())

  transaction   PaymentTransaction    @relation(fields: [transactionId], references: [id])
  offlineMethod OfflinePaymentMethod? @relation(fields: [offlineMethodId], references: [id])

  @@map("payment_methods")
}
```

#### Migration
```bash
npx prisma migrate dev --name add_payment_source_tracking
```

#### Data Backfill
```sql
-- Assume existing card payments were terminal (card-present) if no metadata suggests otherwise
UPDATE "PaymentMethod"
SET
  "paymentSource" = 'TERMINAL',
  "isCardPresent" = true
WHERE
  type = 'CARD'
  AND provider = 'STRIPE'
  AND "createdAt" < NOW();
```

### 5.2 Payment Analysis Utility

**File:** `admin/src/domains/payments/utils/paymentAnalysis.ts` (NEW)

```typescript
export interface PaymentAnalysis {
  canAutoRefund: boolean;           // All payments can be auto-refunded via API
  requiresCustomerPresent: boolean; // At least one payment needs customer present
  hasTerminal: boolean;             // Has card-present terminal payments
  hasSavedCard: boolean;            // Has saved card payments
  hasExternal: boolean;             // Has external provider payments
  hasOffline: boolean;              // Has cash/check/offline payments

  totalAmount: number;
  refundableAmount: number;         // Total - already refunded

  breakdown: {
    methodType: string;
    provider: string;
    amount: number;
    isCardPresent: boolean;
    canAutoRefund: boolean;
    label: string;
  }[];
}

export function analyzePaymentMethods(
  transaction: PaymentTransaction
): PaymentAnalysis {
  const methods = transaction.paymentMethods || [];
  const totalRefunded = transaction.refunds?.reduce((sum, r) => sum + r.amount, 0) || 0;

  const breakdown = methods.map(m => ({
    methodType: m.type,
    provider: m.provider,
    amount: m.amount,
    isCardPresent: m.isCardPresent || false,
    canAutoRefund:
      m.type === 'CARD' && m.paymentSource === 'SAVED_CARD' ||
      m.type === 'GIFT_CARD' ||
      m.type === 'STORE_CREDIT',
    label: formatPaymentMethodLabel(m.type, m.provider)
  }));

  return {
    canAutoRefund: breakdown.every(b => b.canAutoRefund),
    requiresCustomerPresent: breakdown.some(b => b.isCardPresent),
    hasTerminal: breakdown.some(b => b.isCardPresent),
    hasSavedCard: methods.some(m =>
      m.type === 'CARD' && m.paymentSource === 'SAVED_CARD'
    ),
    hasExternal: methods.some(m => m.type === 'EXTERNAL'),
    hasOffline: methods.some(m =>
      ['CASH', 'CHECK', 'OFFLINE'].includes(m.type)
    ),
    totalAmount: transaction.totalAmount,
    refundableAmount: transaction.totalAmount - totalRefunded,
    breakdown
  };
}
```

### 5.3 Refund Method Selection Logic

**Simplified Approach (per user requirements):**
- **No mixed refund distribution** - Single refund method per refund transaction
- **External orders:**
  - ONLY allow "External Manual Refund" option
  - NO cash or store credit alternatives
  - Provider handles actual refund, we just mark status
  - Use same REFUNDED/PARTIALLY_REFUNDED status tracking
- **Manual/Offline payments (Cash/Check/Offline):**
  - Offer Store Credit OR Cash refund
  - Original payment method option also available
- **Card payments:**
  - Terminal: Offer terminal refund, store credit, or cash
  - Saved Card: Offer auto-refund, store credit, or cash
  - 120-day expired: Only store credit or cash
- **No check refunds** - Store Credit or Cash only
- **Stripe only** (no Square implementation)

#### Refund Method Options

```typescript
// RefundModal.tsx
function getRefundMethodOptions(analysis: PaymentAnalysis): RefundMethodOption[] {
  const options: RefundMethodOption[] = [];

  // EXTERNAL PAYMENTS: Only allow external manual refund (no cash/credit alternatives)
  if (analysis.hasExternal) {
    const provider = analysis.breakdown.find(b => b.methodType === 'EXTERNAL');
    return [{
      value: 'external_manual',
      label: `${getProviderName(provider)} - Manual Refund`,
      description: 'Mark as refunded. Provider processes refund separately.',
      requiresCustomer: false,
      icon: '📞',
      isManual: true
    }];
  }

  // 1. AUTO-REFUND: Only if all payments can be auto-refunded
  if (analysis.canAutoRefund) {
    options.push({
      value: 'original_auto',
      label: 'Original Payment Methods (Automatic)',
      description: 'Automatic refund via Stripe API',
      requiresCustomer: false,
      icon: '🔄'
    });
  }

  // 2. TERMINAL REFUND: If has card-present payments
  if (analysis.hasTerminal) {
    options.push({
      value: 'terminal',
      label: 'Card Terminal Refund',
      description: 'Customer must be present with original card',
      requiresCustomer: true,
      icon: '💳',
      warning: 'Requires customer present with card'
    });
  }

  // 3. MANUAL/OFFLINE PAYMENT: Original payment method
  if (analysis.hasOffline) {
    const offlineMethod = analysis.breakdown.find(b =>
      ['CASH', 'CHECK', 'OFFLINE'].includes(b.methodType)
    );
    options.push({
      value: 'original_manual',
      label: `${offlineMethod?.label || 'Manual'} Refund`,
      description: 'Refund via original payment method',
      requiresCustomer: true,
      icon: '📝'
    });
  }

  // 4. STORE CREDIT (available for card/manual payments, NOT external)
  options.push({
    value: 'store_credit',
    label: 'Store Credit',
    description: 'Issue store credit / gift card',
    requiresCustomer: false,
    icon: '🎁'
  });

  // 5. CASH (available for card/manual payments, NOT external)
  options.push({
    value: 'cash',
    label: 'Cash Refund',
    description: 'Cash from register',
    requiresCustomer: true,
    icon: '💵'
  });

  return options;
}
```

### 5.4 Stripe Refund Service

**File:** `back/src/services/paymentProviders/PaymentProviderFactory.ts` (Stripe client access)

Add refund methods:

```typescript
/**
 * Auto-refund for saved card payments
 */
async refundSavedCardPayment(
  paymentIntentId: string,
  amount: number,
  reason?: string
): Promise<{ refundId: string; status: string }> {
  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amount, // in cents
      reason: reason || 'requested_by_customer'
    });

    return {
      refundId: refund.id,
      status: refund.status // 'succeeded', 'pending', 'failed'
    };
  } catch (error) {
    console.error('Stripe refund failed:', error);
    throw new Error(`Stripe refund failed: ${error.message}`);
  }
}

/**
 * Terminal refund (requires customer present with card)
 */
async refundTerminalPayment(
  paymentIntentId: string,
  amount: number,
  terminalId: string
): Promise<{ refundId: string; status: string }> {
  try {
    // Initiate terminal refund
    const refund = await stripe.terminal.readers.processPaymentIntent(
      terminalId,
      {
        payment_intent: paymentIntentId,
        amount: amount,
        refund: true
      }
    );

    return {
      refundId: refund.id,
      status: refund.status // 'processing', 'succeeded', 'failed'
    };
  } catch (error) {
    console.error('Terminal refund failed:', error);
    throw new Error(`Terminal refund failed: ${error.message}`);
  }
}

/**
 * Check if payment can be refunded (within 120 days)
 */
async canRefundPayment(paymentIntentId: string): Promise<{
  canRefund: boolean;
  reason?: string;
}> {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    const chargeDate = new Date(paymentIntent.created * 1000);
    const now = new Date();
    const daysSinceCharge = Math.floor((now.getTime() - chargeDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSinceCharge > 120) {
      return {
        canRefund: false,
        reason: 'Payment is older than 120 days. Use manual refund method (cash/store credit).'
      };
    }

    if (paymentIntent.status !== 'succeeded') {
      return {
        canRefund: false,
        reason: `Payment status is ${paymentIntent.status}. Cannot refund.`
      };
    }

    return { canRefund: true };
  } catch (error) {
    return {
      canRefund: false,
      reason: `Unable to verify payment: ${error.message}`
    };
  }
}
```

### 5.5 RefundModal UX Updates

**File:** `admin/src/app/components/refunds/RefundModal.tsx`

#### Step Flow

```
┌─────────────────────────────────────┐
│ Step 1: Analyze Payment             │
│ - Run payment analysis              │
│ - Check Stripe refund eligibility   │
│ - Show warnings if needed           │
└─────────────────────────────────────┘
            ↓
┌─────────────────────────────────────┐
│ Step 2: Full vs Partial             │
│ [Full Refund] [Partial Refund]      │
└─────────────────────────────────────┘
            ↓
┌─────────────────────────────────────┐
│ Step 3A: Select Refund Method       │
│ (Full Refund)                        │
│                                      │
│ ○ Original Payment (Auto)            │
│   ✓ Saved Card: $80.00              │
│                                      │
│ ○ Card Terminal Refund               │
│   ⚠️ Customer must be present        │
│                                      │
│ ○ Store Credit                       │
│ ○ Cash                               │
└─────────────────────────────────────┘
            ↓
┌─────────────────────────────────────┐
│ Step 3B: Select Items               │
│ (Partial Refund)                     │
│                                      │
│ [x] Rose Bouquet   $45.00   [Qty: 1]│
│ [ ] Vase           $15.00            │
│ [x] Delivery       $10.00   [Edit]   │
│                                      │
│ Subtotal: $55.00                    │
│ Tax (auto): $7.70                   │
│ Total Refund: $62.70                │
│                                      │
│ Then choose refund method (Step 3A) │
└─────────────────────────────────────┘
            ↓
┌─────────────────────────────────────┐
│ Step 4: Confirm & Reason            │
│                                      │
│ Refunding: $62.70                   │
│ Method: Store Credit                │
│ Orders: #1234, #1235                │
│                                      │
│ Reason: [Required]                  │
│ [Customer changed mind        ]     │
│                                      │
│ Notes: [Optional]                   │
│                                      │
│ [Cancel] [Process Refund]           │
└─────────────────────────────────────┘
```

#### Warning Banners

```typescript
// Card-present warning
{analysis.requiresCustomerPresent && selectedMethod !== 'terminal' && (
  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
    <div className="flex items-start gap-3">
      <div className="text-2xl">⚠️</div>
      <div>
        <p className="font-medium text-yellow-900">
          Customer Must Be Present for Card Refund
        </p>
        <p className="text-sm text-yellow-700 mt-1">
          This transaction was paid with a card terminal.
          To refund to the original card, select "Card Terminal Refund"
          and have customer present with their card.
        </p>
        <p className="text-sm text-yellow-700 mt-2">
          Alternative: Issue Store Credit or Cash refund without customer present.
        </p>
      </div>
    </div>
  </div>
)}

// External provider warning
{analysis.hasExternal && (
  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
    <div className="flex items-start gap-3">
      <div className="text-2xl">📞</div>
      <div>
        <p className="font-medium text-blue-900">
          External Provider Payment
        </p>
        <p className="text-sm text-blue-700 mt-1">
          This order was paid through {providerName} (external provider).
          The provider is responsible for processing the actual refund to the sender.
        </p>
        <p className="text-sm text-blue-700 mt-2">
          <strong>Action:</strong> Mark this order as refunded in our system.
          The external provider handles all payment adjustments.
        </p>
        <p className="text-sm text-blue-600 mt-2 italic">
          Note: Cash and Store Credit options are not available for external orders.
        </p>
      </div>
    </div>
  </div>
)}

// Stripe 120-day limit warning
{stripeRefundCheck.canRefund === false && (
  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
    <div className="flex items-start gap-3">
      <div className="text-2xl">🚫</div>
      <div>
        <p className="font-medium text-red-900">
          Cannot Auto-Refund to Card
        </p>
        <p className="text-sm text-red-700 mt-1">
          {stripeRefundCheck.reason}
        </p>
        <p className="text-sm text-red-700 mt-2">
          Please use Store Credit or Cash refund method.
        </p>
      </div>
    </div>
  </div>
)}
```

---

## Updated Implementation Checklist

### Phase 5: Payment Source Tracking
- [ ] 5.1 Add `paymentSource` and `isCardPresent` to PaymentMethod schema
- [ ] 5.1 Run migration
- [ ] 5.1 Backfill existing data (assume TERMINAL for old payments)
- [ ] 5.2 Create `paymentAnalysis.ts` utility
- [ ] 5.3 Implement refund method selection logic
- [ ] 5.4 Add Stripe refund methods via PaymentProviderFactory Stripe client
- [ ] 5.4 Add 120-day eligibility check
- [ ] 5.5 Update RefundModal with payment analysis
- [ ] 5.5 Add warning banners
- [ ] 5.5 Implement single-method refund flow (no mixed distribution)

### Testing Scenarios
- [ ] Auto-refund: Saved card payment (API refund)
- [ ] Terminal refund: Customer present with card
- [ ] External refund: Only show external manual option (no cash/credit)
- [ ] Manual payment refund: Cash originally → offer cash/store credit
- [ ] Store credit: No customer needed (not available for external)
- [ ] Cash: Customer present (not available for external)
- [ ] 120-day limit: Show error, force manual methods
- [ ] Mixed payment: Terminal + Saved Card → Force single method selection

### Refund Method Matrix

| Original Payment | Refund Options Available |
|-----------------|---------------------------|
| **External (FTD/DoorDash)** | ✅ External Manual ONLY<br>❌ No Cash/Store Credit |
| **Card - Terminal** | ✅ Terminal Refund<br>✅ Store Credit<br>✅ Cash |
| **Card - Saved** | ✅ Auto Refund<br>✅ Store Credit<br>✅ Cash |
| **Card - Saved (>120 days)** | ❌ Auto Refund (expired)<br>✅ Store Credit<br>✅ Cash |
| **Cash** | ✅ Cash<br>✅ Store Credit |
| **Check** | ✅ Cash<br>✅ Store Credit |
| **Offline Payment** | ✅ Original Method<br>✅ Store Credit<br>✅ Cash |
| **Gift Card** | ✅ Store Credit<br>✅ Cash |

### Refund Decision Tree

```
Payment Type?
│
├─ EXTERNAL (FTD/DoorDash/etc)
│  └─ External Manual Refund ONLY
│     └─ Mark as REFUNDED/PARTIALLY_REFUNDED
│        Provider handles actual money movement
│
├─ CARD (Stripe)
│  ├─ Card Present (Terminal)?
│  │  ├─ YES → Options:
│  │  │  ├─ Terminal Refund (customer present)
│  │  │  ├─ Store Credit
│  │  │  └─ Cash
│  │  │
│  │  └─ NO (Saved Card) → Check 120-day limit:
│  │     ├─ Within 120 days → Options:
│  │     │  ├─ Auto Refund (Stripe API)
│  │     │  ├─ Store Credit
│  │     │  └─ Cash
│  │     │
│  │     └─ Over 120 days → Options:
│  │        ├─ Store Credit
│  │        └─ Cash
│  │
└─ MANUAL/OFFLINE (Cash/Check/Offline)
   └─ Options:
      ├─ Original Method (e.g., Cash if paid cash)
      ├─ Store Credit
      └─ Cash
```

---

## Future Enhancements
- Refund approval workflow (manager approval for large refunds)
- Refund analytics/reporting
- Email notifications for refunds
- Store credit auto-email delivery

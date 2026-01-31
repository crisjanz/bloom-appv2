# Floranext Customer Migration with Stripe Integration

> **ARCHIVED:** 2025-12-30 - Superseded by JSON import tool + ProviderCustomer model + duplicate detection system. Implementation complete via different approach.

**Status:** ✅ Completed (via JSON import tool, not this plan)
**Created:** 2024-12-20
**Priority:** High

---

## Overview

Migrate all existing customers from Floranext to Bloom POS while preserving Stripe customer IDs and saved payment methods. This allows customers to continue using their saved credit cards without re-entering them. The migration handles duplicate customers in Floranext by merging them into single Bloom customers while linking ALL their Stripe IDs, giving access to all payment methods.

**Key Features:**
- Remove Square payment processor completely (keep as offline method only)
- Extract Stripe customer IDs from Floranext customer records
- Import with manual merge review for duplicate customers
- Link multiple Stripe customer IDs to single Bloom customer (handles Floranext duplicates)
- Lazy Stripe customer creation (only on first payment, not on customer creation)
- Two-phase Stripe account strategy (use test account during development, switch to real account on go-live)

---

## 🎯 Goals

1. **Simplify Payment Processing:** Remove Square from POS flow, use Stripe exclusively
2. **Preserve Payment Methods:** Import all Stripe customer IDs so saved cards remain accessible
3. **Merge Duplicate Customers:** Consolidate Floranext duplicates with manual review
4. **Multi-Stripe Support:** Link multiple Stripe IDs per customer for access to all saved cards
5. **Lazy Customer Creation:** Create Stripe customers only when payment is processed
6. **Safe Migration Path:** Import Stripe IDs now, connect to real Stripe account later

---

## Current State

### ✅ Already Implemented

- `ProviderCustomer` table in database schema (prisma/schema.prisma:1173-1198)
- `providerCustomerService` with Stripe linking methods (back/src/services/providerCustomerService.ts)
- `stripeService` with customer and payment methods (back/src/services/stripeService.ts)
- Customer import Python script foundation (scripts/export/export_all_customers_batched.py)
- Square integration fully working (to be removed)

### 🛠️ Needs Implementation

- Remove all Square code from backend and frontend
- Update payment flow to create Stripe customers lazily (on first payment)
- Enhance Python script to extract `stripe_customer_id` from Floranext
- Create staging import API with duplicate detection
- Build manual merge review UI for approving customer consolidation
- Update payment method fetching to aggregate from multiple Stripe customer IDs
- Handle two Stripe accounts (test during dev, real on go-live)

---

## Architecture Overview

### The Duplicate Customer Problem

**Floranext has:**
- Customer A: "John Doe" (john@gmail.com, 604-555-1234) → Stripe: cus_AAA (Visa ending 4242)
- Customer B: "J. Doe" (jane@gmail.com, 604-555-1234) → Stripe: cus_BBB (Mastercard ending 5555)

**These are duplicates** (same phone) created by poor Floranext matching between POS and website sales.

**After import to Bloom:**
- Customer: John Doe (phone: 604-555-1234, email: john@gmail.com)
  - ProviderCustomer #1: Stripe cus_AAA
  - ProviderCustomer #2: Stripe cus_BBB

**When customer pays:**
- System fetches payment methods from BOTH cus_AAA and cus_BBB
- Shows: "Visa ••••4242", "Mastercard ••••5555"
- Customer selects card, payment processed with correct Stripe customer ID

### Two Stripe Accounts Strategy

**Current:**
- Bloom POS → Connected to TEST Stripe account (sk_test_xxx)
- Floranext → Connected to REAL Stripe account (sk_live_xxx) with all customer data

**Migration Approach:**
1. **Phase 1 (Now):** Import Stripe customer IDs as strings into `ProviderCustomer` table
   - IDs stored dormant (not validated since we're on test account)
   - Can't fetch payment methods yet (wrong account)
2. **Phase 2 (Go-Live):** Switch `.env` to real Stripe keys
   - Update `STRIPE_SECRET_KEY` from test to live
   - All `ProviderCustomer` links become active instantly
   - Payment methods appear automatically

This allows us to:
- Build and test migration logic on test Stripe account
- Import all customer data and Stripe IDs safely
- Switch accounts on go-live day without re-importing

---

## Database Schema

### No Changes Needed

Existing schema already supports this feature:

```prisma
// Already exists at prisma/schema.prisma:1173-1198
model ProviderCustomer {
  id                 String          @id @default(uuid())
  customerId         String          // Bloom customer ID
  provider           PaymentProvider // STRIPE
  providerCustomerId String          // Stripe customer ID (cus_xxx)
  providerEmail      String?
  providerMetadata   Json?
  isActive           Boolean         @default(true)
  lastSyncAt         DateTime?
  createdAt          DateTime        @default(now())
  updatedAt          DateTime        @updatedAt

  customer Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)

  @@unique([customerId, provider])           // One link per provider per customer
  @@unique([provider, providerCustomerId])   // Each Stripe ID linked once
}
```

**Key Constraint:**
- `@@unique([provider, providerCustomerId])` ensures each Stripe customer ID is linked to exactly ONE Bloom customer
- This prevents accidentally linking the same Stripe ID to multiple merged customers

### New Staging Table (Temporary)

For manual merge review:

```prisma
model CustomerImportStaging {
  id              String   @id @default(uuid())

  // Floranext data
  floranextId     String   // Original Floranext customer ID
  firstName       String
  lastName        String
  email           String?
  phone           String?
  stripeCustomerId String? // Extracted from Floranext

  // Merge detection
  potentialDuplicates String[] @default([]) // Array of other staging IDs with same phone
  mergeApproved       Boolean  @default(false)
  mergeIntoId         String?  // If approved, which staging ID to merge into

  // Import status
  importStatus    String   @default("PENDING") // PENDING, APPROVED, MERGED, SKIPPED

  rawData         Json     // Full Floranext customer data
  createdAt       DateTime @default(now())

  @@index([phone])
  @@index([email])
  @@index([importStatus])
}
```

**Migration:**
```bash
cd back
npx prisma migrate dev --name add_customer_import_staging
```

---

## Implementation Phases

### Phase 1: Remove Square (1-2 hours)

**Goal:** Simplify payment processing to Stripe-only

#### Backend Changes

**Files to Modify:**
- `/back/src/services/transactionService.ts` - Remove Square payment processing logic
- `/back/src/routes/stripe.ts` - Keep as-is (Stripe only)
- `/back/src/index.ts` - Remove Square route mounting

**Files to Delete:**
- `/back/src/services/squareService.ts` (if exists)
- `/back/src/routes/square.ts` (if exists)

**Keep in Database:**
- Square settings in `PaymentSettings` (historical reference)
- Square as offline payment method in `OfflinePaymentMethod`

#### Frontend Changes

**Files to Modify:**
- `/admin/src/app/pages/settings/PaymentSettingsPage.tsx`
  - Remove Square configuration section
  - Show note: "Square available as offline payment method only"

- `/admin/src/app/pages/pos/PaymentModal.tsx` (or wherever payment methods shown)
  - Remove "Square Card" from payment method selection
  - Keep only: Stripe Card, Cash, Gift Card, Offline Methods

**Add Offline Method:**
- Code: `SQUARE_MANUAL`
- Name: "Square (Manual Entry)"
- Description: "Process through Square dashboard, enter transaction ID"
- `requiresReference: true`

---

### Phase 2: Lazy Stripe Customer Creation (2-3 hours)

**Goal:** Create Stripe customers only when first payment is processed, not when customer record is created

#### Current Behavior
```typescript
// When customer created in Bloom:
const customer = await prisma.customer.create({ data });
await providerCustomerService.getOrCreateStripeCustomer(customer.id, options);
// ^ Creates Stripe customer immediately
```

#### New Behavior
```typescript
// When customer created:
const customer = await prisma.customer.create({ data });
// No Stripe customer created yet

// Later, when processing first payment:
async function processPayment(customerId, amount) {
  // Check if customer has Stripe ID
  let stripeId = await getFirstStripeCustomerId(customerId);

  if (!stripeId) {
    // Create now
    const customer = await prisma.customer.findUnique({ where: { id: customerId }});
    const stripe = await stripeService.createCustomer({
      email: customer.email,
      name: `${customer.firstName} ${customer.lastName}`,
      phone: customer.phone
    });

    // Link it
    await providerCustomerService.linkCustomerToProvider({
      customerId,
      provider: 'STRIPE',
      providerCustomerId: stripe.id
    });

    stripeId = stripe.id;
  }

  // Process payment
  return await stripeService.createPaymentIntent({ customerId: stripeId, amount });
}
```

#### Files to Modify
- `/back/src/services/transactionService.ts`
  - Update `processStripePayment()` method
  - Add lazy Stripe customer creation before payment intent

- `/back/src/services/providerCustomerService.ts`
  - Add helper: `getFirstStripeCustomerId(bloomCustomerId)` → returns first active Stripe ID or null

---

### Phase 3: Enhanced Python Script (2-3 hours)

**Goal:** Extract Stripe customer IDs from Floranext customer records

#### New Script: `/scripts/floranext_stripe_migration.py`

**Based on:** `export_all_customers_batched.py` (already working)

**Key Addition:** Fetch customer detail page to get `stripe_customer_id`

```python
def fetch_customer_detail(key, cookie, customer_id):
    """
    Fetch customer detail to extract Stripe ID

    Floranext exposes stripe_customer_id in the customer edit page JSON response.
    Example from user's finding:
    {
      "stripe_customer_id": "cus_xxxx",
      "billing_firstname": "John",
      "billing_lastname": "Doe",
      ...
    }
    """
    url = f"https://app.floranext.com/inyourvase_ca/admin/customer/index/edit/id/{customer_id}/key/{key}/"

    headers = {
        "Accept": "application/json, text/javascript, */*; q=0.01",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        "X-Requested-With": "XMLHttpRequest",
        "Cookie": cookie,
    }

    try:
        r = requests.get(url, headers=headers, timeout=30)
        r.raise_for_status()
        data = r.json()

        stripe_id = data.get('stripe_customer_id')

        return {
            'stripe_customer_id': stripe_id,
            'full_data': data  # Keep for debugging
        }
    except Exception as e:
        print(f"  ⚠️  Error fetching detail: {e}")
        return {'stripe_customer_id': None}


def process_batch_with_stripe(customers, key, cookie, start_idx, batch_size):
    """Enhanced batch processing with Stripe ID extraction"""
    batch = customers[start_idx:start_idx + batch_size]
    results = []

    for idx, customer in enumerate(batch, start=start_idx + 1):
        customer_id = customer.get('entity_id')
        customer_name = f"{customer.get('firstname', '')} {customer.get('lastname', '')}".strip()

        print(f"  [{idx}/{len(customers)}] {customer_name} (ID: {customer_id})...")

        # Fetch customer detail for Stripe ID
        detail = fetch_customer_detail(key, cookie, customer_id)
        stripe_id = detail.get('stripe_customer_id')

        if stripe_id:
            print(f"     ↳ Stripe: {stripe_id}")
        else:
            print(f"     ↳ No Stripe ID")

        # Fetch recipients (existing code)
        recipients = fetch_recipients_for_customer(key, cookie, customer_id)
        filtered_recipients, skipped = filter_self_addresses(customer, recipients)

        # Store with Stripe ID
        results.append({
            'customer': clean_customer_data(customer),
            'stripe_customer_id': stripe_id,  # NEW FIELD
            'recipients': filtered_recipients
        })

        # Rate limit
        rate_limit_delay()

    return results
```

**Output Format:**
```json
{
  "customers": [
    {
      "customer": {
        "entity_id": "942",
        "billing_firstname": "John",
        "billing_lastname": "Doe",
        "email": "john@example.com",
        "billing_telephone": "+16045551234"
      },
      "stripe_customer_id": "cus_ABC123XYZ",
      "recipients": [...]
    }
  ],
  "metadata": {
    "total_customers": 500,
    "customers_with_stripe": 350,
    "customers_without_stripe": 150
  }
}
```

---

### Phase 4: Staging Import API (3-4 hours)

**Goal:** Import to staging table, detect duplicates, prepare for manual review

#### Endpoint 1: Import to Staging

**POST `/api/customers/import-staging`**

**Request:**
```json
{
  "customers": [
    {
      "customer": { /* Floranext data */ },
      "stripe_customer_id": "cus_ABC123",
      "recipients": [...]
    }
  ]
}
```

**Logic:**
```typescript
// /back/src/routes/customers/import-staging.ts

router.post('/import-staging', async (req, res) => {
  const { customers } = req.body;

  const imported = [];
  const duplicateGroups = new Map<string, string[]>(); // phone -> [stagingId, stagingId]

  for (const item of customers) {
    const fn = item.customer;

    // Create staging record
    const staging = await prisma.customerImportStaging.create({
      data: {
        floranextId: fn.entity_id,
        firstName: fn.billing_firstname || fn.firstname,
        lastName: fn.billing_lastname || fn.lastname,
        email: fn.email,
        phone: fn.billing_telephone || fn.telephone,
        stripeCustomerId: item.stripe_customer_id,
        rawData: fn
      }
    });

    imported.push(staging);

    // Group by phone for duplicate detection
    if (staging.phone) {
      if (!duplicateGroups.has(staging.phone)) {
        duplicateGroups.set(staging.phone, []);
      }
      duplicateGroups.get(staging.phone)!.push(staging.id);
    }
  }

  // Update records with duplicate information
  for (const [phone, ids] of duplicateGroups.entries()) {
    if (ids.length > 1) {
      // Mark these as potential duplicates
      await prisma.customerImportStaging.updateMany({
        where: { id: { in: ids } },
        data: { potentialDuplicates: ids }
      });
    }
  }

  // Count duplicates
  const duplicates = await prisma.customerImportStaging.findMany({
    where: { potentialDuplicates: { isEmpty: false } }
  });

  res.json({
    success: true,
    imported: imported.length,
    duplicates: duplicates.length,
    requiresReview: duplicates.length > 0
  });
});
```

#### Endpoint 2: Get Duplicate Groups

**GET `/api/customers/import-staging/duplicates`**

**Response:**
```json
{
  "groups": [
    {
      "phone": "604-555-1234",
      "customers": [
        {
          "id": "stage_1",
          "name": "John Doe",
          "email": "john@gmail.com",
          "stripeCustomerId": "cus_AAA"
        },
        {
          "id": "stage_2",
          "name": "J. Doe",
          "email": "jane@gmail.com",
          "stripeCustomerId": "cus_BBB"
        }
      ]
    }
  ]
}
```

#### Endpoint 3: Approve Merge

**POST `/api/customers/import-staging/approve-merge`**

**Request:**
```json
{
  "stagingIds": ["stage_1", "stage_2"],
  "mergeIntoId": "stage_1",  // Keep this customer's data
  "finalData": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@gmail.com",
    "phone": "604-555-1234"
  }
}
```

**Logic:**
- Mark all staging records as `importStatus: "APPROVED"`
- Set `mergeIntoId` to point to primary record
- Store `finalData` for what the merged customer should look like

#### Endpoint 4: Execute Import

**POST `/api/customers/import-staging/execute`**

**Logic:**
```typescript
router.post('/import-staging/execute', async (req, res) => {
  // Get all approved staging records
  const approved = await prisma.customerImportStaging.findMany({
    where: { importStatus: 'APPROVED' }
  });

  // Group by mergeIntoId
  const mergeGroups = new Map<string, CustomerImportStaging[]>();
  for (const record of approved) {
    const key = record.mergeIntoId || record.id; // Self if not merging
    if (!mergeGroups.has(key)) {
      mergeGroups.set(key, []);
    }
    mergeGroups.get(key)!.push(record);
  }

  // Create final customers
  for (const [primaryId, group] of mergeGroups.entries()) {
    const primary = group.find(r => r.id === primaryId)!;

    // Create Bloom customer
    const customer = await prisma.customer.create({
      data: {
        firstName: primary.firstName,
        lastName: primary.lastName,
        email: primary.email,
        phone: primary.phone
      }
    });

    // Link ALL Stripe customer IDs from merged records
    for (const record of group) {
      if (record.stripeCustomerId) {
        await prisma.providerCustomer.create({
          data: {
            customerId: customer.id,
            provider: 'STRIPE',
            providerCustomerId: record.stripeCustomerId,
            providerEmail: record.email
          }
        });
      }
    }

    // Mark as merged
    await prisma.customerImportStaging.updateMany({
      where: { id: { in: group.map(r => r.id) } },
      data: { importStatus: 'MERGED' }
    });
  }

  res.json({ success: true });
});
```

---

### Phase 5: Manual Merge Review UI (4-5 hours)

**Goal:** Page for reviewing and approving customer merges

#### New Page: `/admin/src/app/pages/import/MergeReviewPage.tsx`

**URL:** `/import/merge-review`

**Features:**
- Shows duplicate groups (customers with same phone)
- For each group:
  - Display all duplicate records side-by-side
  - Radio buttons to select which data to keep for each field
  - List all Stripe IDs that will be linked
  - "Merge" or "Keep Separate" buttons
- Approve all button at top
- Execute import button when all reviewed

**UI Mockup:**
```
┌────────────────────────────────────────────────────────────┐
│ Customer Import - Merge Review                             │
├────────────────────────────────────────────────────────────┤
│ 15 duplicate groups found                                  │
│ [Approve All] [Execute Import]                             │
├────────────────────────────────────────────────────────────┤
│                                                             │
│ Duplicate Group #1 - Phone: 604-555-1234                  │
│                                                             │
│ ┌──────────────────┬──────────────────┐                   │
│ │ Customer A       │ Customer B       │                   │
│ ├──────────────────┼──────────────────┤                   │
│ │ ○ John Doe       │ ● J. Doe         │ First/Last Name  │
│ │ ● john@gmail.com │ ○ jane@gmail.com │ Email            │
│ │ Stripe: cus_AAA  │ Stripe: cus_BBB  │                   │
│ └──────────────────┴──────────────────┘                   │
│                                                             │
│ Merged Result:                                              │
│ Name: J. Doe                                                │
│ Email: john@gmail.com                                       │
│ Phone: 604-555-1234                                         │
│ Stripe IDs: cus_AAA, cus_BBB (both linked)                 │
│                                                             │
│ [Merge These Customers] [Keep Separate]                   │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

**Component Structure:**
```typescript
export default function MergeReviewPage() {
  const { groups, loading, approveGroup, executeImport } = useMergeReview();

  return (
    <div>
      <h1>Customer Import - Merge Review</h1>

      {groups.map(group => (
        <DuplicateGroupCard
          key={group.phone}
          group={group}
          onApprove={(mergeData) => approveGroup(group, mergeData)}
        />
      ))}

      <button onClick={executeImport}>Execute Import</button>
    </div>
  );
}
```

---

### Phase 6: Aggregate Payment Methods (2-3 hours)

**Goal:** Fetch payment methods from all Stripe customer IDs linked to one Bloom customer

#### Service Method

**File:** `/back/src/services/providerCustomerService.ts`

**New Method:**
```typescript
async getAllCustomerPaymentMethods(bloomCustomerId: string) {
  // Get all Stripe customer IDs for this customer
  const providerCustomers = await prisma.providerCustomer.findMany({
    where: {
      customerId: bloomCustomerId,
      provider: 'STRIPE',
      isActive: true
    }
  });

  const allPaymentMethods: Array<{
    id: string;
    card: { brand: string; last4: string; };
    stripeCustomerId: string;  // Important: needed for charging
  }> = [];

  // Fetch from each Stripe customer
  for (const pc of providerCustomers) {
    try {
      const methods = await stripeService.getCustomerPaymentMethods(pc.providerCustomerId);

      // Tag each method with source Stripe customer ID
      methods.forEach(method => {
        allPaymentMethods.push({
          ...method,
          stripeCustomerId: pc.providerCustomerId
        });
      });
    } catch (error) {
      console.error(`Failed to fetch methods for ${pc.providerCustomerId}:`, error);
      // Continue with others even if one fails
    }
  }

  return allPaymentMethods;
}
```

#### API Endpoint

**File:** `/back/src/routes/customers/payment-methods.ts`

```typescript
router.get('/:customerId/payment-methods', async (req, res) => {
  const { customerId } = req.params;

  const methods = await providerCustomerService.getAllCustomerPaymentMethods(customerId);

  res.json({
    paymentMethods: methods,
    count: methods.length
  });
});
```

#### Payment Processing Update

**File:** `/back/src/services/transactionService.ts`

```typescript
async processPaymentWithSavedCard(bloomCustomerId: string, paymentMethodId: string, amount: number) {
  // Find which Stripe customer this payment method belongs to
  const allMethods = await providerCustomerService.getAllCustomerPaymentMethods(bloomCustomerId);
  const method = allMethods.find(m => m.id === paymentMethodId);

  if (!method) {
    throw new Error('Payment method not found');
  }

  // Use the correct Stripe customer ID
  const stripeCustomerId = method.stripeCustomerId;

  // Create payment intent with correct customer
  return await stripeService.createPaymentIntent({
    amount,
    customerId: stripeCustomerId,
    paymentMethod: paymentMethodId
  });
}
```

---

## Migration Workflow

### Step 1: Preparation
```bash
# 1. Remove Square code (Phase 1)
# - Delete Square service files
# - Update payment settings UI
# - Add Square to offline methods

# 2. Update payment flow (Phase 2)
# - Lazy Stripe customer creation
# - Test with new customer payment
```

### Step 2: Extract from Floranext
```bash
cd ~/bloom-app/scripts
python3 floranext_stripe_migration.py

# Runs batched export with Stripe ID extraction
# Output: floranext_stripe_export.json
```

**Expected Results:**
- ~500 total customers
- ~350 with Stripe customer IDs (70%)
- ~150 without Stripe IDs (30%)

### Step 3: Import to Staging
```bash
curl -X POST http://localhost:4000/api/customers/import-staging \
  -H "Content-Type: application/json" \
  -d @floranext_stripe_export.json
```

**Response:**
```json
{
  "success": true,
  "imported": 500,
  "duplicates": 87,
  "requiresReview": true
}
```

### Step 4: Manual Merge Review
1. Open `/import/merge-review` in admin UI
2. Review 87 duplicate groups
3. For each group:
   - Choose which name to keep
   - Choose which email to keep
   - Approve merge or keep separate
4. Click "Execute Import"

### Step 5: Verify Import
```sql
-- Count imported customers
SELECT COUNT(*) FROM "Customer";

-- Count Stripe links
SELECT COUNT(*) FROM "ProviderCustomer" WHERE provider = 'STRIPE';

-- Find customers with multiple Stripe IDs
SELECT "customerId", COUNT(*) as stripe_count
FROM "ProviderCustomer"
WHERE provider = 'STRIPE'
GROUP BY "customerId"
HAVING COUNT(*) > 1;
```

### Step 6: Switch Stripe Accounts (Go-Live Day)
```bash
# Update .env
STRIPE_SECRET_KEY=sk_live_YOUR_REAL_KEY  # Change from test to live
STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_REAL_KEY

# Restart backend
cd back && npm run dev
```

All `ProviderCustomer` links become active instantly!

---

## Important Notes

### Why This Approach Works

**Multiple Stripe IDs per Customer:**
- Floranext duplicates mean same person has multiple Stripe customer IDs
- Each Stripe ID has different payment methods attached
- By linking ALL IDs, we give access to ALL cards
- User sees: "Visa ••••4242 (from cus_AAA)", "Mastercard ••••5555 (from cus_BBB)"

**Lazy Customer Creation:**
- Reduces Stripe API calls
- Only creates when actually needed (payment)
- Allows importing customers without Stripe connection

**Two Stripe Accounts:**
- Can't connect to live Stripe until migration complete (Floranext still using it)
- Import IDs as strings now (dormant)
- Switch on go-live day → everything activates

### Constraints

**Unique Constraint:**
```prisma
@@unique([provider, providerCustomerId])
```
Each Stripe customer ID can only be linked to ONE Bloom customer. This prevents:
- Linking cus_AAA to both Customer 1 and Customer 2
- Must be careful during merge approval

**Import Order:**
- Must merge duplicates before creating `ProviderCustomer` links
- Can't merge after Stripe IDs are linked (unique constraint violation)

---

## Testing Plan

### Phase 1 Tests (Square Removal)
- [ ] Square does not appear in POS payment methods
- [ ] Stripe card payment works
- [ ] Square appears as offline payment method
- [ ] Can enter Square transaction ID manually

### Phase 2 Tests (Lazy Creation)
- [ ] Create new customer → No Stripe customer created yet
- [ ] Process first payment → Stripe customer created automatically
- [ ] Verify ProviderCustomer link created
- [ ] Second payment uses existing Stripe customer

### Phase 3 Tests (Python Script)
- [ ] Export 10 test customers from Floranext
- [ ] Verify Stripe IDs extracted in JSON
- [ ] Check customers without Stripe IDs show as null
- [ ] Validate JSON structure

### Phase 4 Tests (Staging Import)
- [ ] Import test batch to staging table
- [ ] Verify duplicates detected correctly
- [ ] Check potentialDuplicates array populated
- [ ] Approve merge via API
- [ ] Execute import successfully

### Phase 5 Tests (Merge UI)
- [ ] Merge review page shows duplicate groups
- [ ] Can select which data to keep
- [ ] Shows all Stripe IDs that will be linked
- [ ] Approve merge updates staging records
- [ ] Execute import creates customer with multiple Stripe links

### Phase 6 Tests (Payment Methods)
- [ ] Customer with 2 Stripe IDs → Shows payment methods from both
- [ ] Select card from Stripe customer A → Payment uses correct ID
- [ ] Select card from Stripe customer B → Payment uses correct ID
- [ ] Verify charges appear in Stripe dashboard under correct customer

### Integration Tests
- [ ] Full workflow: Import → Review → Execute → Payment
- [ ] Customer with merged Stripe IDs can pay with any saved card
- [ ] New customer gets Stripe ID on first payment only

---

## Files to Create/Modify

### Backend - New Files
- `/back/src/routes/customers/import-staging.ts` - Staging import API
- `/back/src/routes/customers/payment-methods.ts` - Aggregate payment methods
- `/scripts/floranext_stripe_migration.py` - Enhanced export script

### Backend - Modified Files
- `/back/src/services/transactionService.ts` - Remove Square, add lazy Stripe creation
- `/back/src/services/providerCustomerService.ts` - Add `getAllCustomerPaymentMethods()`
- `/back/src/index.ts` - Mount new routes, remove Square routes
- `/back/prisma/schema.prisma` - Add CustomerImportStaging model

### Frontend - New Files
- `/admin/src/app/pages/import/MergeReviewPage.tsx` - Manual merge UI
- `/admin/src/shared/hooks/useMergeReview.ts` - Hook for merge review

### Frontend - Modified Files
- `/admin/src/app/pages/settings/PaymentSettingsPage.tsx` - Remove Square config
- `/admin/src/app/pages/pos/PaymentModal.tsx` - Remove Square from payment methods
- `/admin/src/app/App.tsx` - Add merge review route

### Documentation
- `/docs/API_Endpoints.md` - Document new import/staging endpoints
- `/docs/Progress_Tracker.markdown` - Mark feature as complete

---

## Success Criteria

Feature is complete when:

- ✅ Square completely removed from POS payment flow
- ✅ Stripe customers created lazily (only on first payment)
- ✅ Python script extracts Stripe IDs from Floranext
- ✅ Import to staging detects duplicates by phone
- ✅ Manual merge UI allows reviewing and approving merges
- ✅ Execute import creates customers with multiple Stripe IDs
- ✅ Payment method aggregation fetches from all linked Stripe customers
- ✅ Payments work with saved cards from any linked Stripe ID
- ✅ Can import now with test Stripe, switch to live Stripe later

---

## Open Questions (User Input Needed)

### 1. Primary Matching Field
**Question:** Merge customers by phone or email?
**Options:**
- **Phone** (recommended) - More reliable, less likely to change
- Email - May have multiple emails, changes more often
**Decision:** _____________

### 2. Name Conflicts
**Question:** If merging "John Doe" and "J. Doe", which name to keep?
**Options:**
- Most complete (longest name)
- First imported
- Let user choose in UI (recommended)
**Decision:** _____________

### 3. Email Conflicts
**Question:** If merging customers with different emails (john@gmail.com vs jane@gmail.com)?
**Options:**
- Keep first email
- Keep email from primary Stripe customer
- Let user choose in UI (recommended)
**Decision:** _____________

### 4. Auto-Create Stripe for Missing IDs
**Question:** For customers without Stripe IDs in Floranext, auto-create on first payment?
**Options:**
- Yes (recommended) - Seamless experience
- No - Require manual Stripe creation
**Decision:** _____________

### 5. Payment Method Display
**Question:** Should we show which Stripe customer each card belongs to?
**Options:**
- Yes - "Visa ••••4242 (Account 1)"
- No - Just "Visa ••••4242" (simpler UI)
**Decision:** _____________

---

## Estimated Effort

**Total:** 18-24 hours

- Phase 1 (Remove Square): 1-2 hours
- Phase 2 (Lazy Creation): 2-3 hours
- Phase 3 (Python Script): 2-3 hours
- Phase 4 (Staging API): 3-4 hours
- Phase 5 (Merge UI): 4-5 hours
- Phase 6 (Payment Methods): 2-3 hours
- Testing & Documentation: 3-4 hours

---

**Status:** 🛠️ In Planning - Awaiting user decisions on open questions

**Next Step:** User provides answers to open questions, then begin Phase 1 implementation

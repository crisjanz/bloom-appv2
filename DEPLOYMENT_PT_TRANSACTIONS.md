# PT-Transaction Fixes - Deployment Guide

## Summary of Changes

### ✅ What Was Fixed
1. **FTD orders now create PT-transactions** - Previously, FTD wire-in orders created Bloom orders but no payment transactions for reporting
2. **Standardized all amounts to cents** - Fixed inconsistency where PT-transactions used dollars but Orders used cents
3. **Fixed frontend display** - Currency formatter now converts cents to dollars for display

### 📝 Files Modified

#### Backend
- `back/src/services/ftdMonitor.ts` - Added PT-transaction creation to FTD order flow
- `back/src/services/transactionService.ts` - (already storing in cents, no changes needed)

#### Frontend
- `admin/src/app/pages/reports/TransactionsReportPage.tsx` - Fixed currency formatter to divide by 100

#### Scripts Created
- `back/src/scripts/backfill-ftd-transactions.ts` - Backfills PT-transactions for existing FTD orders
- `back/src/scripts/cleanup-ftd-transactions.ts` - Cleanup script (used during development)

---

## 🚀 Deployment Steps for Live Server

### Step 1: Deploy Code Changes

```bash
# On your local machine, commit and push changes
git add .
git commit -m "Fix PT-transactions: standardize to cents, add FTD support, fix display"
git push origin main

# Deploy backend (your hosting process)
# Deploy frontend (your hosting process)
```

### Step 2: Migrate Existing PT-Transactions to Cents

**⚠️ IMPORTANT:** Run this BEFORE the backfill to convert old transactions to cents.

SSH into your live server and run:

```bash
cd /path/to/bloom-app/back

# This converts PT-transactions that were stored in dollars to cents
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  // Find all PT-transactions that appear to be in dollars (< 10000)
  const oldTransactions = await prisma.paymentTransaction.findMany({
    where: {
      totalAmount: {
        lt: 10000  // Likely in dollars if less than $100
      },
      notes: {
        not: {
          contains: 'FTD'  // Skip FTD transactions
        }
      }
    },
    include: {
      paymentMethods: true
    }
  });

  console.log('Found', oldTransactions.length, 'transactions potentially in dollars');
  console.log('Converting to cents...\n');

  for (const transaction of oldTransactions) {
    const newTotalAmount = transaction.totalAmount * 100;
    const newTaxAmount = transaction.taxAmount * 100;
    const newTipAmount = transaction.tipAmount * 100;

    await prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        totalAmount: newTotalAmount,
        taxAmount: newTaxAmount,
        tipAmount: newTipAmount
      }
    });

    // Update payment methods
    for (const method of transaction.paymentMethods) {
      await prisma.paymentMethod.update({
        where: { id: method.id },
        data: {
          amount: method.amount * 100
        }
      });
    }

    console.log(\`✅ \${transaction.transactionNumber}: \${transaction.totalAmount} → \${newTotalAmount} cents\`);
  }

  console.log(\`\\n✅ Migrated \${oldTransactions.length} transactions to cents\`);
  await prisma.\$disconnect();
})();
"
```

### Step 3: Backfill FTD PT-Transactions

```bash
cd /path/to/bloom-app/back

# Run the backfill script
npx tsx src/scripts/backfill-ftd-transactions.ts
```

Expected output:
```
🔄 Starting FTD payment transaction backfill...
📦 Found X FTD orders with linked Bloom orders
✅ FTD D0428P-9015 → Order #1: Created PT-00XXX ($80.00)
...
📊 Backfill Summary:
   ✅ Created: X
   ⏭️  Skipped: Y
   ❌ Errors: 0
```

### Step 4: Verify on Live

1. **Check Admin Dashboard**: Navigate to Reports → Payment Transactions
2. **Verify amounts display correctly**: Should show $80.00, not 8000 or $8000.00
3. **Verify FTD transactions appear**: Search for "FTD" or filter by COD payment method
4. **Check totals match**: FTD transaction totals should match the order amounts

---

## 🧪 Testing Checklist

- [ ] Old PT-transactions (created before fix) display correct dollar amounts
- [ ] New PT-transactions (created after deploy) display correct dollar amounts
- [ ] FTD PT-transactions appear in report with correct amounts
- [ ] Can filter by date range and see FTD transactions
- [ ] Can search for FTD order numbers
- [ ] CSV export includes FTD transactions with correct amounts
- [ ] Summary totals are accurate

---

## 📊 What Data Format to Expect

### Database (all in cents)
- PT-transaction totalAmount: `14900` = $149.00
- Order paymentAmount: `14900` = $149.00
- Payment method amount: `14900` = $149.00

### API Response (returns cents)
```json
{
  "totalAmount": 14900,
  "taxAmount": 1440,
  "tipAmount": 0
}
```

### Frontend Display (converts to dollars)
```
Total: $149.00
Tax: $14.40
Tips: $0.00
```

---

## 🔄 Future FTD Orders

After deployment, new FTD orders will automatically:
1. Create a Bloom Order (existing behavior)
2. **Create a PT-transaction** (new behavior) with:
   - Channel: WEBSITE
   - Payment Method: COD (used as proxy for pre-paid wire-in)
   - Amount: FTD order total (in cents)
   - Notes: "FTD Wire-In Order {externalId}"
   - Metadata includes FTD order ID and sending florist code

---

## ⚠️ Rollback Plan

If issues occur:

1. **Revert code changes**:
```bash
git revert HEAD
git push origin main
# Redeploy
```

2. **Delete backfilled FTD transactions** (if needed):
```bash
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const result = await prisma.paymentTransaction.deleteMany({
    where: {
      notes: {
        contains: 'FTD Wire-In Order'
      }
    }
  });
  console.log('Deleted', result.count, 'FTD PT-transactions');
  await prisma.\$disconnect();
})();
"
```

3. **Revert cent conversion** (convert back to dollars):
```bash
# Divide amounts by 100 to go back to dollars
# (Not recommended - better to fix forward)
```

---

## 📞 Support

If you encounter issues:
1. Check backend logs for PT-transaction creation errors
2. Verify database values are in cents (not dollars)
3. Check frontend console for API errors
4. Ensure CORS allows frontend domain

---

## ✅ Success Criteria

- ✅ All PT-transactions display correct dollar amounts
- ✅ FTD orders create PT-transactions automatically
- ✅ Historical FTD orders have backfilled PT-transactions
- ✅ Reports show accurate totals including FTD revenue
- ✅ No display issues with currency formatting

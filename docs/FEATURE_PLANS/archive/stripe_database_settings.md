# Stripe Database Settings Migration

**Status:** 📜 Ready for Implementation
**Priority:** HIGH
**Effort:** 1-2 hours
**Created:** 2026-01-17

---

## 🎯 Problem Statement

**Current Issue:** Stripe credentials are duplicated and inconsistent:
- Settings UI saves Stripe keys to **database** (encrypted)
- `stripeService.ts` reads keys from **`.env`** (hardcoded)
- Database settings are **completely ignored**
- Cannot remove `.env` keys without breaking Stripe

**Root Cause:**
```typescript
// back/src/services/stripeService.ts - Line 28
constructor() {
  const secretKey = process.env.STRIPE_SECRET_KEY; // ❌ Hardcoded
  this.stripe = new Stripe(secretKey, { apiVersion: '2025-05-28.basil' });
}
```

**Impact:**
- Users change settings in UI → nothing happens
- All payment providers still use `.env` fallback
- Cannot switch providers dynamically
- Security risk: credentials in plaintext `.env`

---

## 🎯 Goals

1. **Use database settings** as single source of truth for payment credentials
2. **Remove hardcoded `.env` credentials** (keep only encryption key)
3. **Support runtime provider switching** (Stripe/Square/PayPal)
4. **Lazy initialization** of payment providers when needed
5. **Backward compatibility** with existing orders

---

## 📋 Current State

### Environment Variables (`.env`)
```bash
# ❌ These should be removed after migration
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=we_...

# ✅ Keep this - needed for encryption
CONFIG_ENCRYPTION_KEY=<your-key>
```

### Database Storage (PaymentSettings table)
```prisma
model PaymentSettings {
  stripeEnabled      Boolean @default(false)
  stripeMode         PaymentProviderMode @default(TERMINAL)
  stripePublicKey    String?
  stripeSecretKey    String? // Encrypted
  stripeTerminalId   String?
  stripeAccountId    String?
  // ... same for Square, PayPal
}
```

### Current Service (Singleton Pattern - BROKEN)
```typescript
// back/src/services/stripeService.ts
class StripeService {
  private stripe: Stripe;

  constructor() {
    // ❌ Reads from .env on app startup
    const secretKey = process.env.STRIPE_SECRET_KEY;
    this.stripe = new Stripe(secretKey, { ... });
  }
}

export default new StripeService(); // ❌ Instantiated immediately
```

### Affected Files
1. `back/src/services/stripeService.ts` - Stripe API wrapper (NEEDS REFACTOR)
2. `back/src/services/paymentSettingsService.ts` - Database CRUD (✅ Good)
3. `back/src/utils/crypto.ts` - Encryption utils (✅ Good)
4. `back/src/routes/stripe.ts` - Stripe endpoints (NEEDS UPDATE)
5. `back/src/routes/orders/status.ts` - Refund processing (NEEDS UPDATE)
6. `back/src/services/providerCustomerService.ts` - Customer sync (NEEDS UPDATE)

---

## 🏗️ Implementation Plan

### Phase 1: Create Payment Provider Factory (30 min)

**File:** `back/src/services/paymentProviders/PaymentProviderFactory.ts`

```typescript
import Stripe from 'stripe';
import { PaymentProvider } from '@prisma/client';
import paymentSettingsService from '../paymentSettingsService';
import { decryptSecret } from '../../utils/crypto';

class PaymentProviderFactory {
  private stripeInstance: Stripe | null = null;
  private squareInstance: any | null = null;
  private lastSettingsCheck: number = 0;
  private CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Get Stripe client instance (lazy initialization)
   * Reads credentials from database settings
   */
  async getStripeClient(): Promise<Stripe> {
    // Refresh settings every 5 minutes
    const now = Date.now();
    if (this.stripeInstance && now - this.lastSettingsCheck < this.CACHE_DURATION) {
      return this.stripeInstance;
    }

    // Load settings from database
    const settings = await paymentSettingsService.getSettings();
    const stripeConfig = settings.providers.stripe;

    if (!stripeConfig.enabled) {
      throw new Error('Stripe is not enabled in payment settings');
    }

    if (!stripeConfig.hasSecret) {
      throw new Error('Stripe secret key not configured');
    }

    // Get encrypted secret from database
    const encryptedSecret = await this.getEncryptedStripeSecret();
    if (!encryptedSecret) {
      throw new Error('Stripe secret key not found in database');
    }

    // Decrypt secret key
    const secretKey = decryptSecret(encryptedSecret);
    if (!secretKey) {
      throw new Error('Failed to decrypt Stripe secret key');
    }

    // Create Stripe instance
    this.stripeInstance = new Stripe(secretKey, {
      apiVersion: '2025-05-28.basil',
    });

    this.lastSettingsCheck = now;

    console.log(`✅ Stripe client initialized (mode: ${stripeConfig.mode})`);
    return this.stripeInstance;
  }

  /**
   * Get encrypted Stripe secret from database
   */
  private async getEncryptedStripeSecret(): Promise<string | null> {
    const settings = await paymentSettingsService.getSettingsRecord();
    return settings?.stripeSecretKey || null;
  }

  /**
   * Invalidate cache (call after settings update)
   */
  invalidateCache(): void {
    this.stripeInstance = null;
    this.squareInstance = null;
    this.lastSettingsCheck = 0;
    console.log('💨 Payment provider cache invalidated');
  }

  /**
   * Get Square client (future implementation)
   */
  async getSquareClient(): Promise<any> {
    throw new Error('Square client not yet implemented');
  }

  /**
   * Get active card payment provider
   */
  async getActiveCardProvider(): Promise<{ provider: PaymentProvider; client: any }> {
    const settings = await paymentSettingsService.getSettings();
    const defaultProvider = settings.defaultCardProvider || PaymentProvider.STRIPE;

    switch (defaultProvider) {
      case PaymentProvider.STRIPE:
        return {
          provider: PaymentProvider.STRIPE,
          client: await this.getStripeClient(),
        };
      case PaymentProvider.SQUARE:
        return {
          provider: PaymentProvider.SQUARE,
          client: await this.getSquareClient(),
        };
      default:
        throw new Error(`Unsupported payment provider: ${defaultProvider}`);
    }
  }
}

export default new PaymentProviderFactory();
```

### Phase 2: Add Helper to paymentSettingsService (15 min)

**File:** `back/src/services/paymentSettingsService.ts`

Add method to get raw settings record (not just response):

```typescript
/**
 * Get the raw PaymentSettings record from database
 * Used by PaymentProviderFactory to access encrypted secrets
 */
export async function getSettingsRecord() {
  const settings = await prisma.paymentSettings.findUnique({
    where: { id: PAYMENT_SETTINGS_SINGLETON_ID },
  });

  if (!settings) {
    return await ensureSettings();
  }

  return settings;
}
```

### Phase 3: Update Stripe Routes (20 min)

**File:** `back/src/routes/stripe.ts`

Replace singleton usage with factory:

```typescript
import express from 'express';
import paymentProviderFactory from '../services/paymentProviders/PaymentProviderFactory';

const router = express.Router();

/**
 * Create a payment intent
 * POST /api/stripe/payment-intent
 */
router.post('/payment-intent', async (req, res) => {
  try {
    const {
      amount,
      currency = 'cad',
      customerId,
      customerEmail,
      description,
      metadata = {},
      orderIds = []
    } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        error: 'Amount is required and must be greater than 0'
      });
    }

    // Get Stripe client from factory (reads from database)
    const stripe = await paymentProviderFactory.getStripeClient();

    // Add order IDs to metadata
    if (orderIds.length > 0) {
      metadata.orderIds = orderIds.join(',');
      metadata.source = 'bloom-flower-shop';
    }

    // Create payment intent directly
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      customer: customerId,
      description: description || `Bloom Flower Shop - Order${orderIds.length > 1 ? 's' : ''} ${orderIds.join(', ')}`,
      metadata,
      automatic_payment_methods: { enabled: true },
      receipt_email: customerEmail,
      setup_future_usage: customerId ? 'off_session' : undefined,
    });

    console.log(`✅ Stripe PaymentIntent created: ${paymentIntent.id} for $${amount}`);

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount / 100,
    });

  } catch (error) {
    console.error('❌ Payment intent creation failed:', error);
    res.status(500).json({
      error: 'Failed to create payment intent',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ... repeat for other endpoints (confirm, refund, etc.)
```

### Phase 4: Update Refund Processing (10 min)

**File:** `back/src/routes/orders/status.ts`

Replace stripeService with factory:

```typescript
import paymentProviderFactory from '../../services/paymentProviders/PaymentProviderFactory';

// In the refund endpoint
try {
  const stripe = await paymentProviderFactory.getStripeClient();

  const refundData: any = {
    payment_intent: paymentIntentId,
  };

  if (amount) {
    refundData.amount = Math.round(amount * 100);
  }

  const stripeRefund = await stripe.refunds.create(refundData);

  console.log(`✅ Stripe refund processed: ${stripeRefund.id}`);
} catch (error) {
  console.error('❌ Stripe refund failed:', error);
  throw error;
}
```

### Phase 5: Update Provider Customer Service (10 min)

**File:** `back/src/services/providerCustomerService.ts`

Replace stripeService with factory:

```typescript
import paymentProviderFactory from './paymentProviders/PaymentProviderFactory';

// In createProviderCustomer function
try {
  const stripe = await paymentProviderFactory.getStripeClient();

  const stripeCustomer = await stripe.customers.create({
    email: customer.email || undefined,
    name: `${customer.firstName} ${customer.lastName}`,
    phone: customer.phone || undefined,
    metadata: {
      bloomCustomerId: customer.id,
    },
  });

  console.log(`✅ Created Stripe customer: ${stripeCustomer.id}`);
} catch (error) {
  console.error('❌ Stripe customer creation failed:', error);
  throw error;
}
```

### Phase 6: Invalidate Cache on Settings Update (5 min)

**File:** `back/src/routes/settings/payments.ts`

Add cache invalidation after saving settings:

```typescript
import paymentProviderFactory from '../../services/paymentProviders/PaymentProviderFactory';

router.put('/providers/:provider', async (req, res) => {
  try {
    const provider = parseProvider(req.params.provider);
    const payload: ProviderUpdatePayload = req.body;

    await paymentSettingsService.updateProvider(provider, payload);

    // ✅ Invalidate payment provider cache so new settings are loaded
    paymentProviderFactory.invalidateCache();

    const updated = await paymentSettingsService.getSettings();
    res.json(updated);
  } catch (error) {
    // ... error handling
  }
});
```

### Phase 7: Remove Old stripeService.ts (5 min)

**Actions:**
1. Delete `back/src/services/stripeService.ts`
2. Remove any remaining imports of `stripeService`
3. Verify no compilation errors

**Search for remaining imports:**
```bash
grep -r "stripeService" back/src --include="*.ts"
```

### Phase 8: Update Environment Variables (5 min)

**File:** `back/.env`

**BEFORE:**
```bash
# Stripe Payment Configuration
STRIPE_PUBLISHABLE_KEY=pk_test_...  # ❌ Remove
STRIPE_SECRET_KEY=sk_test_...       # ❌ Remove
STRIPE_WEBHOOK_SECRET=we_...         # ❌ Remove

# Encryption
CONFIG_ENCRYPTION_KEY=<your-key>     # ✅ Keep
```

**AFTER:**
```bash
# Payment Settings Encryption (REQUIRED)
CONFIG_ENCRYPTION_KEY=<your-key>

# Note: Stripe keys are now managed via Settings UI at /settings/payments
```

---

## 🧪 Testing Plan

### Unit Tests (Future)
- [ ] PaymentProviderFactory returns valid Stripe client
- [ ] Factory caches client for 5 minutes
- [ ] Factory invalidates cache on demand
- [ ] Factory throws error when Stripe disabled
- [ ] Factory throws error when secret missing

### Integration Tests

1. **Settings Management:**
   - [ ] Go to `/settings/payments`
   - [ ] Enable Stripe
   - [ ] Enter test keys (pk_test_..., sk_test_...)
   - [ ] Save settings
   - [ ] Verify saved successfully

2. **Payment Intent Creation:**
   - [ ] TakeOrder → Add products → Complete Order → Card
   - [ ] Manual entry → Enter test card (4242 4242 4242 4242)
   - [ ] Verify payment intent created with database keys
   - [ ] Check backend logs for "Stripe client initialized"

3. **Settings Update:**
   - [ ] Change Stripe secret key in settings
   - [ ] Wait 5+ minutes or restart server
   - [ ] Process another payment
   - [ ] Verify new key is used

4. **Provider Switching:**
   - [ ] Enable Square in settings
   - [ ] Set Square as default provider
   - [ ] Process payment
   - [ ] Verify Square client used (will fail until implemented, but factory should attempt)

5. **Refund Processing:**
   - [ ] Create order with Stripe payment
   - [ ] Cancel order and refund
   - [ ] Verify refund processed via database settings

### Manual Verification Checklist
- [ ] Remove Stripe keys from `.env`
- [ ] Restart backend server
- [ ] Verify server starts without errors
- [ ] Process payment via TakeOrder
- [ ] Check payment appears in Stripe dashboard
- [ ] Verify refund works
- [ ] Change keys in UI, process another payment

---

## 🚨 Breaking Changes & Migration

### Database Migration
**NOT NEEDED** - PaymentSettings table already exists with encrypted fields.

### Environment Variables
**BREAKING:** Removing `STRIPE_SECRET_KEY` from `.env`

**Migration Path:**
1. Add keys to Settings UI BEFORE removing from `.env`
2. Verify keys work via test payment
3. Remove `.env` keys
4. Restart server
5. Verify still works

### Deployment Checklist
1. **Staging:**
   - [ ] Deploy new code
   - [ ] Add keys via Settings UI
   - [ ] Test payment flow
   - [ ] Remove `.env` keys
   - [ ] Restart, verify works

2. **Production:**
   - [ ] Deploy new code
   - [ ] Add PRODUCTION keys via Settings UI (pk_live_..., sk_live_...)
   - [ ] Test with $1 test charge
   - [ ] Remove `.env` keys from production server
   - [ ] Restart, verify works

---

## 🔒 Security Improvements

### Before (Insecure)
- ❌ Plaintext keys in `.env`
- ❌ Keys in version control (if accidentally committed)
- ❌ No encryption at rest
- ❌ Cannot rotate keys without redeploying

### After (Secure)
- ✅ Encrypted keys in database
- ✅ Only encryption key in `.env`
- ✅ Encrypted at rest in database
- ✅ Rotate keys via UI without redeploy
- ✅ Audit trail of settings changes (via updated_at)

---

## 📊 Success Metrics

- [ ] Zero references to `stripeService` singleton
- [ ] All Stripe calls use `paymentProviderFactory.getStripeClient()`
- [ ] No Stripe credentials in `.env`
- [ ] Can process payment after removing `.env` keys
- [ ] Can change keys in UI and see immediate effect (within cache TTL)
- [ ] Backend logs show "Stripe client initialized" with database keys

---

## 🔄 Rollout Plan

1. **Create PaymentProviderFactory** - New code, no breaking changes
2. **Update routes to use factory** - Gradual replacement
3. **Test with both .env and database** - Parallel operation
4. **Remove stripeService** - Clean up old code
5. **Remove .env keys** - Final migration
6. **Production deployment** - Use Settings UI only

**Estimated Time:** 1-2 hours total

**Rollback Plan:**
- Keep `.env` keys for 1 week after deployment
- If issues arise, can restore `.env` and revert factory

---

## ✅ Definition of Done

- [ ] PaymentProviderFactory created and working
- [ ] All Stripe API calls use factory (not singleton)
- [ ] Settings update invalidates cache
- [ ] Can process payment without `.env` keys
- [ ] Can refund order without `.env` keys
- [ ] Old stripeService.ts deleted
- [ ] No compilation errors
- [ ] Can switch providers via Settings UI
- [ ] Backend logs show database settings used
- [ ] Documentation updated in CLAUDE.md

---

## 📝 Future Enhancements

- [ ] Add Square client to factory
- [ ] Add PayPal client to factory
- [ ] Implement Helcim support
- [ ] Add settings version tracking
- [ ] Add webhook secret to database
- [ ] Implement Stripe Terminal support (Terminal mode)
- [ ] Add provider health checks
- [ ] Monitoring/alerts for failed provider initialization

---

## 🔗 Related Files

- `back/src/services/paymentProviders/PaymentProviderFactory.ts` (NEW)
- `back/src/services/stripeService.ts` (DELETE)
- `back/src/services/paymentSettingsService.ts` (UPDATE)
- `back/src/routes/stripe.ts` (UPDATE)
- `back/src/routes/orders/status.ts` (UPDATE)
- `back/src/services/providerCustomerService.ts` (UPDATE)
- `back/src/routes/settings/payments.ts` (UPDATE)
- `back/.env` (UPDATE - remove keys)

---

## 📚 Documentation Updates

Add to CLAUDE.md after implementation:

```markdown
### Payment Provider Settings

**CRITICAL - Payment credentials are stored in database, not .env**

**Configuration:**
- All payment provider keys managed via Settings UI (`/settings/payments`)
- Keys encrypted with `CONFIG_ENCRYPTION_KEY` from `.env`
- Only encryption key should be in `.env` file

**Usage:**
```typescript
import paymentProviderFactory from '@services/paymentProviders/PaymentProviderFactory';

// Get Stripe client (lazy loaded from database)
const stripe = await paymentProviderFactory.getStripeClient();

// Use Stripe as normal
const paymentIntent = await stripe.paymentIntents.create({ ... });
```

**Cache:**
- Provider clients cached for 5 minutes
- Cache invalidated automatically after settings update
- Manual invalidation: `paymentProviderFactory.invalidateCache()`

**DO NOT:**
- ❌ Use `process.env.STRIPE_SECRET_KEY` directly
- ❌ Create new Stripe instances manually
- ❌ Store credentials in `.env` (except encryption key)
```

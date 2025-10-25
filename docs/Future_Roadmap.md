# Future Roadmap

**Last Updated:** October 2025
**Status:** Living Document

---

## 📝 Ideas & Feature Requests

> **Add your ideas and thoughts here - this section is for quick brainstorming!**
1. Image upload for product images takes a long time. it is successfull, just takes a min to upload one simple image.

### Quick Wins & User Requests

1. **System-wide Recipient Search**
   - Search all saved recipients across all customers
   - Enable recipient reuse when customer doesn't have complete info
   - Implementation idea: Global search endpoint that returns recipients with customer context
   - Use case: Customer calls to send to "John Smith on Main St" but can't remember exact address

2. **Auto-delete Draft Orders After Checkout**
   - Currently: Draft orders persist after being loaded and checked out
   - Desired: Automatically delete draft once it's successfully checked out
   - Location: TakeOrderPage draft loading/checkout flow
   - Prevents clutter in draft order list

3. **Remember Employee Name in Browser Session**
   - Save employee name for 24 hours in browser session
   - Location: TakeOrderPage employee input field
   - Reduces repetitive data entry for staff
   - Implementation: Use `sessionStorage` with timestamp check

4. **Fix POS Guest Customer Duplication** ✅ FIXED (Jan 2025)
   - Problem: POS creates "Walk-in Customer" for each walk-in transaction
   - Result: Multiple duplicate "Walk-in Customer" entries in customer database
   - Solution: Check for existing guest customer before creating new one
   - Alternative: Use single shared guest customer ID for all walk-ins
   - **Status:** Fixed in `customerHelpers.ts` using singleton pattern

5. **Complete Recipient Data Model Migration** ✅ COMPLETED (Oct 19, 2025)
   - **Background:** Schema had BOTH old (recipientId) and new (recipientCustomerId + deliveryAddressId) fields
   - **Completed Actions:**
     - Phase 1: Display components updated to read from NEW fields
     - Phase 2: Removed old `recipientId` and `pickupPersonId` fields from schema
     - Updated backend search queries to use NEW fields
     - Updated frontend display components (OrdersListPage, OrderEditPage, OrderSections)
     - Created backup in `/backup/recipient-migration-2025-10/`
   - **Status:** Migration in progress (schema updated, running Prisma migration next)

---

## 🚧 Planned Implementations

### TakeOrder Prototype Integration

**Status:** Ready for Implementation
**Estimated Time:** 8-12 hours
**Priority:** High
**Related Commit:** `a6ed4be` (Prototype baseline)

#### Overview
Create new **TakeOrderFlowPage** that combines the prototype's clean stepwise UX with existing domain architecture and full database integration.

#### Key Benefits
- Clean, stepwise user experience
- Reduced cognitive load with progressive disclosure
- Better multi-order management
- Improved customer and recipient workflows
- Full feature parity with current TakeOrderPage

#### Implementation Phases

**Phase 1: Foundation Setup (1-2 hours)**
- Create `/admin/src/app/pages/orders/TakeOrderFlowPage.tsx`
- Create `/admin/src/app/pages/orders/flow/` component folder
- Add route: `/orders/take-order-flow`
- Integrate domain hooks (useOrderState, useCustomerSearch, etc.)

**Phase 2: Customer & Order Type Integration (1 hour)**
- Replace mock data with real customer search API
- Integrate customer creation endpoint
- Map prototype terminology to production terms
  - `orderType: "PHONE"|"WALKIN"|"WIREIN"` → `orderSource`
  - `orderMethod: "DELIVERY"|"PICKUP"` → `orderType`

**Phase 3: Recipient Integration (1-2 hours)**
- Phone-first recipient lookup
- Customer-based recipients system
- Saved recipients from customer
- "Use Customer's Information" option
- Address validation

**Phase 4: Delivery & Products (1 hour)**
- Real delivery date picker with business hours
- Automatic delivery fee calculation
- Product catalog search integration
- Custom product entry
- Tax calculation integration

**Phase 5: Payment & Completion (2-3 hours)**
- Multi-payment method support
- Order creation flow with all validations
- Recipient customer/address creation
- Payment transaction (PT-XXXX) creation
- Gift card activation
- Email/SMS receipt sending
- POS transfer support (draft orders)

**Phase 6: Discount & Tax Integration (1 hour)**
- Coupon validation
- Manual discount ($ and %)
- Gift card redemption
- Automatic discount application
- Dynamic tax rate calculation

**Phase 7: Multi-Order Enhancements (30 min)**
- Order progress tracking
- Multi-order display in summary panel
- Order switching and removal
- Add another order functionality

**Phase 8: Testing & Polish (1 hour)**
- Single order test scenarios
- Multi-order test scenarios
- POS transfer testing
- Error handling validation

#### Migration Strategy

1. **Parallel Deployment:** Both pages accessible simultaneously
2. **Feature Flag:** Toggle between old/new flow via localStorage
3. **A/B Testing:** Roll out to 10% → 50% → 100%
4. **Full Rollout:** Monitor metrics and user feedback
5. **Deprecation:** Archive old implementation after success validation

#### Success Metrics
- Order completion time (target: < current average)
- Error rate (target: < 2%)
- Multi-order usage adoption
- User satisfaction scores
- Reduced support tickets

**Documentation:** See `/docs/TakeOrder_Prototype_Integration_Plan.md` for complete technical details

---

### Sales & Tax Reporting System

**Status:** Phase 1 in Development
**Estimated Time:** 2-3 days (Phase 1)
**Priority:** High

#### Overview
Build a practical sales and tax reporting system that works with the current schema, focusing on real operational needs without over-engineering.

#### Phased Approach

**Phase 1: MVP Reports (2-3 days) - IN PROGRESS**
- Sales Dashboard: Total Sales, Order Count, Average Order Value KPIs
- Date range filtering (Today, This Week, This Month, Custom)
- Payment method and status filters
- Simple daily sales trend chart
- Tax export to CSV (Order #, Date, Subtotal, GST, PST, Total, Payment Method)
- Real-time queries (no caching yet)
- Works with existing schema

**Phase 2: Production Features (2-3 days) - FUTURE**
- Monthly caching with watermarking
- PDF exports
- Soft-close workflow for periods
- Month-to-month comparisons
- Performance optimizations

**Phase 3: Advanced Accounting (3-4 days) - FUTURE**
- Hard-close with adjustment entries
- Cash drawer reconciliation
- Petty cash tracking
- Full audit log
- Revision history

**Phase 4: Product & Inventory (Requires New Tables) - FUTURE**
- Product catalog table
- Product performance reports
- Category analytics
- Inventory tracking
- Customer lifetime value analytics

#### Database Changes (Phase 1)

**Indexes for Performance:**
```sql
CREATE INDEX idx_orders_created_at ON "Order"(created_at);
CREATE INDEX idx_orders_status ON "Order"(status);
CREATE INDEX idx_payment_transactions_created_at ON "PaymentTransaction"(created_at);
```

**Optional Field (for easier reporting):**
```prisma
reportingMonth String? // "YYYY-MM" - populated on order creation
```

#### API Endpoints (Phase 1)

- `GET /api/reports/sales/summary` - Aggregated sales data with filters
- `GET /api/reports/sales/orders` - Filtered order list for detailed view
- `GET /api/reports/tax/export` - Generate tax CSV export

#### Key Design Decisions

**No Period Locking (Phase 1):**
- Admins can edit any order anytime
- Reports always show current state
- Simpler to implement and understand

**No Caching (Phase 1):**
- Real-time queries fast enough for <10k orders/month
- Add caching only if performance becomes an issue

**CSV Only (Phase 1):**
- Excel/Google Sheets compatible
- Easy to implement
- Add PDF in Phase 2 if needed

**Limitations Accepted:**
- No product-specific reports (requires Product catalog table)
- Payment breakdown approximate (links via customerId)
- No month comparison (add in Phase 2)

#### Why Not Product Reports Yet?

Current system uses `OrderItem.customName` (freeform text) instead of linking to a Product catalog. This means:
- "Red Roses Bouquet" and "red roses bouquet" are different entries
- Can't aggregate "How many Red Rose Bouquets sold this month?"
- Product reports require a `Product` table first (future enhancement)

Sales total reports work fine without this!

---

### FTD Wire Order Integration

**Status:** ✅ COMPLETED (October 2025)
**Implementation Time:** 16 hours
**Priority:** Medium
**API Type:** Read-only (unofficial Mercury HQ API)

#### Overview
Automated FTD wire order monitoring system that polls the FTD Mercury API, stores orders locally, sends notifications, and auto-creates Bloom orders when you accept them in Mercury HQ.

#### Key Features
- **Automated Polling:** Background service fetches new FTD orders every 4 minutes
- **Smart Notifications:** SMS/Email alerts via existing Twilio/SendGrid integration
- **Auto Token Refresh:** Puppeteer-based headless browser refreshes auth tokens every 6 hours
- **Automated Order Creation:** When you accept an FTD order in Mercury HQ, Bloom automatically creates a corresponding POS order
- **Status Sync:** When you mark as delivered in FTD, Bloom auto-updates the linked order to COMPLETED

#### Workflow

```
1. FTD Order Arrives
   → Polling service detects new order
   → Creates FtdOrder with status: NEEDS_ACTION
   → Sends SMS/Email notification

2. Review & Accept in Mercury HQ
   → Click "FTD Live" in Bloom sidebar
   → Opens Mercury HQ dashboard (iframe or popup)
   → Accept or Reject order in FTD system

3. Bloom Auto-Creates Order
   → Next poll detects status: ACCEPTED
   → Automatically creates Bloom Order:
     • orderSource: WIREIN
     • Pre-filled recipient/delivery info
     • Links to FTD order for reference
   → Shows in Orders list with "WIRE-IN" badge

4. Fulfill & Sync Status
   → Mark as "Delivered" in Mercury HQ
   → Bloom auto-updates linked order to COMPLETED
```

#### Menu Structure

**Navigation:**
```
📦 FTD - Wire Orders
   ├─ FTD Orders (Main view - API data, stats, manual update)
   └─ FTD Live (Mercury HQ iframe/popup for accept/reject)
```

#### Database Schema

**New Models:**
- `FtdOrder` - Stores FTD wire orders with status tracking
- `FtdSettings` - Configuration (API key, polling interval, notifications)

**Key Fields:**
- Status tracking (NEEDS_ACTION, ACCEPTED, DELIVERED, etc.)
- Full recipient information
- `linkedOrderId` - Links to created Bloom order
- `ftdRawData` - JSON storage of full FTD API response

#### Technical Implementation

**Backend Services:**
- `ftdMonitor.ts` - Polling service (4-minute intervals)
- `ftdAuthService.ts` - Auto token refresh with Puppeteer
- `ftdNotification.ts` - Notification integration

**API Routes:**
- `GET /api/ftd/orders` - List FTD orders with filters
- `POST /api/ftd/orders/update` - Force manual refresh
- `GET /api/ftd/settings` - Configuration management

**Frontend Pages:**
- `/ftd-orders` - Main dashboard with order list, stats, and manual update button
- `/ftd-live` - Mercury HQ dashboard (iframe with popup fallback)

#### Auto-Creation Logic

**Status Change: NEEDS_ACTION → ACCEPTED**
- Automatically creates Bloom Order
- Pre-fills recipient address
- Sets orderSource: WIREIN
- Links FtdOrder.linkedOrderId to new Order

**Status Change: ACCEPTED → DELIVERED**
- Updates linked Bloom Order status to COMPLETED
- Maintains sync between systems

#### Security & Performance

**Respectful API Usage:**
- 4-minute polling interval (not exploitative)
- Unofficial API monitoring only (no write operations)
- Exponential backoff on errors

**Data Architecture:**
- PostgreSQL/Prisma (NOT JSON files)
- Relational integrity for linked orders
- Concurrent access safety
- Fast indexed queries (<20ms)
- Automatic backups with existing DB

**Token Management:**
- Auto-refresh every 6 hours via Puppeteer
- Graceful degradation if refresh fails
- Manual refresh option in settings

#### Implementation Phases

**Phase 1: Database & Backend (4-6 hours)**
- Prisma schema migration
- FTD monitor polling service
- Notification integration
- Auto-creation logic

**Phase 2: Frontend Dashboard (4-6 hours)**
- FTD Orders page (table, filters, stats)
- FTD Live page (Mercury HQ iframe)
- Manual update button
- Status badges and indicators

**Phase 3: Auth & Polish (2-3 hours)**
- Puppeteer token refresh automation
- Error handling and logging
- Settings configuration UI

**Phase 4: Testing & Deployment (2-3 hours)**
- End-to-end workflow testing
- Production deployment
- Monitoring and validation

#### Benefits

✅ **Zero Manual Data Entry** - Orders auto-created when accepted
✅ **Real-time Notifications** - Never miss an FTD order
✅ **Unified Dashboard** - Manage all orders in one place
✅ **Automatic Status Sync** - No duplicate status updates
✅ **Respectful Integration** - Minimal server load (4-min intervals)

#### Limitations

⚠️ **Read-Only API** - Must use Mercury HQ to accept/reject orders
⚠️ **Unofficial Integration** - Using observed API, not official documentation
⚠️ **Token Dependency** - Requires periodic auth token refresh

#### Implemented Features

✅ **Background Polling Service** - Delta sync every 4 minutes for efficiency
✅ **Puppeteer Token Auto-Refresh** - Headless browser extracts tokens every 6 hours
✅ **Smart Token Reuse** - Only refreshes when token is missing or >5 hours old
✅ **Auto-Create Bloom Orders** - When FTD status → ACCEPTED
✅ **Auto-Update Status** - When FTD status → DELIVERED
✅ **SMS/Email Notifications** - Alerts on new FTD orders
✅ **FTD Orders Dashboard** - View all orders with status/date filters
✅ **FTD Approve Queue** - Review and adjust auto-created orders before production
✅ **FTD Live Integration** - Mercury HQ iframe for accepting/rejecting orders
✅ **Manual Full Sync** - "Update Orders" button for complete refresh after downtime
✅ **Production-Ready** - Efficient, respectful API usage with proper error handling

#### Future Enhancements (If FTD Provides Official API)

- Two-way status sync (accept/reject from Bloom)
- Real-time webhooks instead of polling
- Product code mapping to inventory
- Automated pricing validation
- Delivery confirmation back to FTD

---

### DoorDash Marketplace Integration

**Status:** 🔶 READY TO IMPLEMENT - Pending API Discovery
**Estimated Time:** 15-19 hours
**Priority:** Medium
**API Type:** Read-only (unofficial Merchant Portal API)
**Volume:** ~1 order per week (low volume)

#### Overview
Lightweight integration that automatically fetches DoorDash marketplace orders, displays them for approval, and creates Bloom orders for fulfillment tracking. Unlike FTD, DoorDash handles all customer interaction and delivery - you only prepare items for driver pickup.

#### Key Differences from FTD
- **No Delivery Address** - Customer orders via DoorDash app, driver picks up from your store
- **No Notifications Needed** - DoorDash's built-in notifications are solid
- **All Orders Auto-Accepted** - No accept/reject workflow needed
- **Simpler UI** - Single page with "To Approve" and "History" tables
- **Low Volume** - ~1 order/week, so no complex stats needed

#### How DoorDash Orders Work

**Order Flow:**
```
1. Customer places order on DoorDash app
   → Customer enters their own delivery address
   → DoorDash handles payment

2. Bloom polling service detects order (5 min)
   → Fetches from DoorDash Merchant Portal API
   → Stores in database (status: PENDING)
   → Shows in "To Approve" table

3. You review and approve in Bloom
   → Click row to expand order details
   → View items, modifiers, special requests
   → Click "Approve" button

4. Bloom creates Order automatically
   → orderType: PICKUP (driver picks up)
   → orderSource: DOORDASH
   → status: PAID (DoorDash already collected)
   → Pre-fills items with modifiers
   → Total: Net payout (after DoorDash commission)

5. You prepare the order
   → Use Bloom's order system to track prep
   → Mark as ready when complete

6. DoorDash driver picks up
   → Driver arrives at estimated pickup time
   → You hand order to driver
   → Driver delivers to customer (you never see address)
```

#### What You Get from DoorDash API

**Available Data:**
- ✅ Customer first name only (e.g., "Laurie", "Dylan")
- ✅ Order items with modifiers ("Sweetest Joy", "Chocolates - Medium")
- ✅ Estimated pickup time (when driver will arrive)
- ✅ Special instructions (rare, usually empty)
- ✅ Pricing breakdown (subtotal, tax, commission, net payout)
- ✅ Order ID and display number
- ✅ Dasher (driver) info when assigned

**NOT Available:**
- ❌ Customer delivery address
- ❌ Customer phone number
- ❌ Customer email
- ❌ Gift message or recipient name (unless customer uses gift option)

#### API Endpoints Discovered

**1. Get Orders List**
- URL: `https://merchant-portal.doordash.com/merchant-analytics-service/api/v1/get_orders`
- Returns: Summary list with order ID, customer name, total, status, times
- Use: Polling endpoint to detect new orders

**2. Get Order Details**
- URL: `https://merchant-portal.doordash.com/merchant-analytics-service/api/v1/orders_details/`
- Returns: Complete order with items, modifiers, pricing, dasher info
- Use: Get full details for approval display

**Authentication:**
- Cookie-based JWT: `ddweb_mx_portal_token`
- Token lifespan: ~3 days
- Auto-refresh: Every 6 hours via Puppeteer

#### Database Schema

**DoorDashOrder Model:**
- `orderId`, `deliveryUuid` - DoorDash identifiers
- `customerName` - First name only (e.g., "Laurie")
- `items` (JSON) - Array of items with modifiers
- `estimatedPickupTime`, `actualPickupTime`
- `preTaxTotal`, `tax`, `commission`, `netPayout`
- `dasherId`, `dasherName` - Driver info
- `status` - PENDING, CONFIRMED, READY, PICKED_UP, DELIVERED, CANCELLED
- `linkedOrderId` - Link to Bloom Order
- `approvedAt`, `approvedBy` - Approval tracking
- `doorDashRawData` (JSON) - Full API response

**DoorDashSettings Model:**
- `authToken` - Current session token
- `tokenRefreshedAt`
- `pollingEnabled` - Default true
- `pollingInterval` - Default 300 seconds (5 min)
- `lastSyncTime` - For delta sync

#### Frontend - Single Page UI

**DoorDash Orders Page** (`/doordash-orders`)

**Layout:**
```
┌─────────────────────────────────────────┐
│ Header: "DoorDash Orders"               │
│ [Manual Sync] [Settings]                │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 📋 TO APPROVE (2)              [Collapse]│
├─────────────────────────────────────────┤
│ Order#  Customer  Items   Pickup   Total│
│ b9eb    Laurie    2 items 1:05pm  $120  │
│   ▼ Sweetest Joy x1 ($100)              │
│     Chocolates - Medium x1 ($25)        │
│     [Approve Order]                     │
│                                         │
│ 5765    Dylan     1 item  5:30pm  $140  │
│   > Premium Bouquet x1 ($140)           │
│     [Approve Order]                     │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 📜 HISTORY (18)                [Collapse]│
├─────────────────────────────────────────┤
│ Date    Customer  Items   Status  Bloom#│
│ Sep 25  Laurie    2 items Deliv.  #1234 │
│ Sep 23  Fenton    1 item  Deliv.  #1232 │
│ [Load More]                             │
└─────────────────────────────────────────┘
```

**Features:**
- Expandable rows show full item details
- One-click approval creates Bloom order
- History tracks all past orders
- Links to Bloom orders for fulfillment

#### Backend Services

**1. doorDashMonitor.ts - Polling Service**
- Runs every 5 minutes automatically
- Delta sync: Only orders since last check
- Full sync: Manual button fetches last 7 days
- Stores new orders with status: PENDING

**2. doorDashAuthService.ts - Token Management**
- Puppeteer-based token extraction
- Auto-refresh every 6 hours
- Prevents token expiration
- Manual refresh option available

**3. Approval Service**
- Creates customer: "{Name} (DoorDash)" with phone "doordash-{consumerId}"
- Creates Bloom Order: PICKUP, DOORDASH, PAID
- Maps items with modifiers: "Chocolates - Medium"
- Links via linkedOrderId
- Total = netPayout (what you receive after commission)

#### API Routes

- `GET /api/doordash/orders` - List orders with filters
- `POST /api/doordash/orders/sync` - Force full sync
- `POST /api/doordash/orders/:id/approve` - Approve and create Bloom order
- `GET /api/doordash/settings` - Get settings
- `PUT /api/doordash/settings` - Update polling config
- `POST /api/doordash/token/refresh` - Manual token refresh

#### Implementation Phases

**Phase 1: API Discovery & Testing (1-2 hours)** ⚠️ **NEEDED BEFORE START**
- [ ] Capture complete request body from `get_orders` API
- [ ] Document request parameters (date range, filters, pagination)
- [ ] Verify all order fields in response
- [ ] Test API with Postman/curl
- [ ] Check rate limits

**Phase 2: Database Setup (1 hour)**
- [ ] Create Prisma models (DoorDashOrder, DoorDashSettings)
- [ ] Add relation to Order model
- [ ] Run migration
- [ ] Seed settings

**Phase 3: Backend Services (4-5 hours)**
- [ ] Implement doorDashMonitor.ts (polling)
- [ ] Implement doorDashAuthService.ts (Puppeteer token refresh)
- [ ] Implement approval service (create Bloom order)
- [ ] Add error handling

**Phase 4: API Routes (2 hours)**
- [ ] Create /back/src/routes/doordash/
- [ ] Implement all endpoints
- [ ] Test with Postman

**Phase 5: Frontend UI (4-5 hours)**
- [ ] Create DoorDashOrdersPage.tsx
- [ ] Build "To Approve" table
- [ ] Build "History" table
- [ ] Add approval modal
- [ ] Create useDoorDashOrders hook
- [ ] Add to router and sidebar

**Phase 6: Integration & Testing (2 hours)**
- [ ] Start monitor on server boot
- [ ] Test token refresh
- [ ] Test approval flow
- [ ] Verify with real order

**Phase 7: Deployment (1 hour)**
- [ ] Add environment variables
- [ ] Update documentation
- [ ] Deploy and monitor

#### Benefits

✅ **Unified System** - All orders (walk-in, phone, FTD, DoorDash) in one place
✅ **Automatic Detection** - New orders appear within 5 minutes
✅ **One-Click Approval** - Quick workflow to add to Bloom
✅ **Kitchen Tracking** - Use Bloom's order system for prep
✅ **Historical Record** - Track DoorDash sales alongside other channels
✅ **Commission Tracking** - See what DoorDash takes vs. what you receive

#### Limitations

⚠️ **No Delivery Address** - DoorDash handles delivery (marketplace model)
⚠️ **Customer Info Limited** - First name only, no phone/email
⚠️ **Unofficial API** - Based on observed API behavior
⚠️ **Token Dependency** - Requires periodic refresh via Puppeteer

#### Next Steps to Begin Implementation

**🔴 REQUIRED: API Discovery**

Before implementation can begin, need to capture:

1. **Request Parameters for `get_orders`:**
   - What parameters does the API accept?
   - Date range format?
   - Pagination method?
   - Status filters?

2. **Verify Order Details API:**
   - Confirm `orders_details/` endpoint structure
   - Test with multiple order types
   - Verify all fields are consistent

**How to Capture:**
```
1. Open DoorDash Merchant Portal
2. Open DevTools → Network tab
3. Find get_orders request
4. Click → Payload tab
5. Copy request body JSON
6. Share for documentation
```

Once API is documented, implementation can begin immediately.

#### Status Summary

🟢 **API Endpoints:** Identified and tested
🟢 **Authentication:** Token method confirmed
🟢 **Response Structure:** Sample data captured
🔴 **Request Parameters:** Still needed
🟢 **Architecture:** Designed and documented
🟢 **Timeline:** Estimated 15-19 hours

**Ready to implement once API request parameters are captured.**

---

## ⚠️ Known Limitations & Issues to Address

### Critical: Timezone Handling

**Current Status:** Production-ready for Vancouver-based stores only

**How It Works:**
- Database: All dates stored as UTC DateTime in PostgreSQL
- Backend: Assumes server runs in Pacific timezone
- Frontend: Uses `useBusinessTimezone` hook for consistent display

**Deployment Requirements:**
Server MUST be configured for Pacific timezone:
```bash
# Option A: Set server timezone
sudo timedatectl set-timezone America/Vancouver

# Option B: Environment variable
export TZ=America/Vancouver
```

**Production Checklist:**
- [ ] Verify server timezone: `date +%Z` (should show PST or PDT)
- [ ] Set `TZ=America/Vancouver` if not Pacific
- [ ] Test order creation and verify dates in database
- [ ] Check Delivery Page shows orders on correct dates
- [ ] Verify Order List displays dates correctly

**System Works For:**
- Single store in Vancouver
- Multiple stores in same timezone (Pacific)
- All Canadian West Coast locations

**System Needs Upgrade For:**
- Stores in different timezones (Toronto, Calgary, etc.)
- Multi-timezone SaaS product
- International expansion

**When to Implement Full Timezone System:**
1. First out-of-timezone customer signs up
2. Preparing for SaaS launch
3. After 3+ months of stable operation

**Implementation Required:**
- Install `date-fns-tz` package
- Create timezone utilities in `/back/src/utils/dateHelpers.ts`
- Update 10+ backend files for timezone-aware date conversion
- Add business timezone fetching with caching
- Estimated effort: 8-12 hours

**Documentation:** Complete implementation guide in `/docs/Timezone_Issues_and_Fixes.md`

---

### Payment Processing

**Current Status:** Integrated with Stripe and Square

**Limitations:**
- No automatic reconciliation between providers
- Manual verification required for refunds
- Split payments across providers not supported in reports

**Future Improvements:**
- Automated payment reconciliation
- Unified refund workflow
- Cross-provider reporting

---

### Inventory Management

**Current Status:** Basic product availability tracking

**Limitations:**
- No real-time inventory deduction
- No low-stock alerts
- No automatic reordering
- No multi-location inventory tracking

**Future Improvements:**
- Real-time stock levels
- Low inventory notifications
- Purchase order system
- Multi-location inventory sync

---

### Reporting & Analytics

**Current Status:** Basic sales and transaction reports

**Limitations:**
- No advanced analytics dashboard
- No export to accounting software
- No automated tax reporting
- Reports assume single timezone

**Future Improvements:**
- Advanced analytics dashboard
- QuickBooks/Xero integration
- Automated tax reports
- Custom report builder

---

### Multi-Location Support

**Current Status:** Single store per deployment

**Limitations:**
- No multi-store management
- No store-specific inventory
- No inter-store transfers
- No consolidated reporting across stores

**Future Improvements:**
- Multi-tenant architecture
- Store-specific settings and inventory
- Transfer orders between locations
- Consolidated multi-store reporting

---

## 💡 Future Enhancements

### Short-Term Enhancements (1-3 months)

**Post-Launch TakeOrder Flow Features:**
1. **Order Templates** - Save common orders for quick reorder
2. **Order Duplication** - Copy existing order as template
3. **Delivery Scheduling** - Visual calendar picker for delivery dates
4. **Customer Insights** - Show order history during order creation
5. **Advanced Product Search** - Filter by multiple criteria (category, price, tags)
6. **Product Recommendations** - Suggest related/complementary products

**Operational Improvements:**
1. **Bulk Operations** - Batch update order statuses
2. **Bulk Recipient Import** - CSV upload for multiple recipients
3. **Quick Actions Menu** - Common tasks accessible from order list
4. **Keyboard Shortcuts** - Power user efficiency improvements
5. **Email Templates** - Customizable customer communication templates

---

### Medium-Term Enhancements (3-6 months)

**Business Intelligence:**
1. **Sales Dashboard** - Visual charts for daily/weekly/monthly trends
2. **Customer Analytics** - Lifetime value, frequency, retention metrics
3. **Product Performance** - Best sellers, seasonal trends, margin analysis
4. **Delivery Optimization** - Route planning, efficiency metrics
5. **Revenue Forecasting** - Predictive analytics based on historical data

**Customer Experience:**
1. **Customer Portal** - Self-service order tracking and history
2. **Loyalty Program** - Points, rewards, tiered benefits
3. **Subscription Orders** - Recurring delivery setup
4. **Gift Registries** - Wedding, corporate, event registries
5. **Review System** - Customer feedback and ratings

**Operational Efficiency:**
1. **Mobile Driver App** - Delivery driver interface with GPS
2. **Automated Routing** - Optimized delivery route generation
3. **Warehouse Management** - Receiving, picking, packing workflows
4. **Supplier Integration** - Automated ordering from suppliers
5. **Staff Scheduling** - Employee shift management

---

### Long-Term Vision (6+ months)

**Platform Expansion:**
1. **Multi-Timezone Architecture** - Full timezone support for national expansion
2. **Multi-Tenant SaaS** - White-label solution for other florists
3. **API Platform** - Public API for third-party integrations
4. **Mobile Apps** - Native iOS/Android customer apps
5. **Marketplace Integration** - List products on Google Shopping, Facebook, etc.

**Advanced Features:**
1. **AI-Powered Recommendations** - Machine learning for product suggestions
2. **Chatbot Support** - Automated customer service
3. **Augmented Reality** - Visualize arrangements in space
4. **Video Consultations** - Virtual design consultations
5. **Blockchain Tracking** - Supply chain transparency

**Business Growth:**
1. **Franchise Management** - Multi-location franchise system
2. **B2B Platform** - Corporate/wholesale portal
3. **Event Management** - Full event planning integration
4. **Design Studio** - Custom arrangement builder
5. **Educational Platform** - Floral design courses and certification

---

## 📊 Priority Matrix

### Implementation Priority Levels

**P0 - Critical (Do Now):**
- Fix POS guest customer duplication
- Auto-delete draft orders after checkout

**P1 - High (Next Sprint):**
- TakeOrder Prototype Integration
- Remember employee name in session
- System-wide recipient search

**P2 - Medium (Next Quarter):**
- Full timezone system implementation
- Advanced reporting dashboard
- Customer portal

**P3 - Low (Future):**
- Multi-tenant architecture
- Mobile apps
- AI-powered features

---

## 🎯 Success Metrics

### Key Performance Indicators

**User Efficiency:**
- Average order completion time
- Clicks per order
- Error rate
- Training time for new staff

**Business Metrics:**
- Order volume
- Average order value
- Customer retention rate
- Revenue growth

**Technical Metrics:**
- System uptime
- API response time
- Error rate
- Page load speed

---

## 📚 Related Documentation

- [Progress Tracker](./Progress_Tracker.markdown) - Feature implementation status
- [TakeOrder Integration Plan](./TakeOrder_Prototype_Integration_Plan.md) - Detailed technical plan
- [Timezone Implementation Guide](./Timezone_Issues_and_Fixes.md) - Multi-timezone system
- [Project Summary](./Project_Summary.markdown) - Business context & architecture
- [Known Limitations](./KNOWN_LIMITATIONS.md) - Current system constraints

---

## 🤝 Contributing Ideas

Have a feature idea? Add it to the "Ideas & Feature Requests" section at the top of this document!

**Guidelines:**
- Be specific about the problem you're solving
- Include use cases or examples
- Note any implementation ideas if you have them
- Don't worry about technical details - just capture the idea!

---

**Document Version:** 1.0
**Created:** October 2025
**Status:** Living Document - Updated Regularly
**Maintained By:** Development Team

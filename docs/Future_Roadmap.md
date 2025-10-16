# Future Roadmap

**Last Updated:** October 2025
**Status:** Living Document

---

## 📝 Ideas & Feature Requests

> **Add your ideas and thoughts here - this section is for quick brainstorming!**

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

4. **Fix POS Guest Customer Duplication**
   - Problem: POS creates "Walk-in Customer" for each walk-in transaction
   - Result: Multiple duplicate "Walk-in Customer" entries in customer database
   - Solution: Check for existing guest customer before creating new one
   - Alternative: Use single shared guest customer ID for all walk-ins

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

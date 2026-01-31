# Bloom Launch Roadmap
## From "Working Prototype" to "Launch Ready for IYV" (with Future-Proof Architecture)

**Last Updated:** 2025-01-01
**Status:** Active Development

---

## Current State Assessment

### What's Working
- ✅ POS with payment processing (Stripe)
- ✅ Order management (delivery, pickup, FTD)
- ✅ Product catalog with variants
- ✅ Customer management
- ✅ Event system
- ✅ Gift cards
- ✅ Reports and analytics
- ✅ Basic website (TailGrids-based)

### What Needs Work
- 🔧 UI consistency (standardization in progress)
- 🔧 Hardcoded shop-specific values everywhere
- 🔧 Website is hardcoded, not composable
- 🔧 Some technical debt in older code
- 🔧 Missing production workflows (driver routes, production board)

### Vision Alignment Gaps
- No ShopProfile (multi-tenant blocker)
- Provider pattern incomplete
- Website not section-based
- Some domain logic scattered

---

## The Strategy: Three Parallel Tracks

### Track 1: Launch Essentials (Must-Have for IYV)
Critical path to go live with your shop.

### Track 2: Foundation Work (Quiet Architecture)
Prepare for multi-tenant without blocking launch.

### Track 3: Future Capabilities (Post-Launch)
Features that make Bloom compelling as a product.

---

## Phase 1: Launch Ready (4-6 Weeks)
**Goal:** IYV can run on Bloom in production

### Track 1: Launch Essentials

#### Week 1-2: UI Standardization (Continue Current Work)
- ✅ Complete POS modal standardization (almost done)
- ✅ Standardize all list pages with new table components
- ✅ Fix mobile responsiveness issues
- ✅ Dark mode consistency
- ✅ Remove all emoji icons from UI
- **Deliverable:** Admin UI feels professional and consistent

#### Week 3-4: Critical Workflows
- [ ] Driver route management (QR scanning, route optimization)
- [ ] Production board (daily flower prep view)
- [ ] Delivery time slot management
- [ ] Order status notifications (SMS/Email)
- **Deliverable:** Daily operations run smoothly

#### Week 5-6: Website Polish
- [ ] Complete IYV website with TailGrids
- [ ] Product catalog with checkout
- [ ] Order tracking for customers
- [ ] Contact/about pages
- **Deliverable:** Public-facing website ready

### Track 2: Foundation Work (In Parallel)

#### Week 1-6: ShopProfile Migration (Gradual)
- [ ] Create `ShopProfile` entity in database
- [ ] Migrate constants as you touch features:
  - Timezone, currency, locale
  - Tax rates
  - Delivery rules (radius, fees, cutoffs)
  - Order defaults
  - Payment settings
- [ ] **Rule:** Every feature touched during Phase 1 gets its constants moved to ShopProfile
- **Deliverable:** 60-80% of hardcoded values centralized

#### Week 3-6: Website Section Extraction (Background)
- [ ] Create `/shared/website/sections/` folder
- [ ] Extract TailGrids components as section types
- [ ] Define section schema (JSON structure)
- [ ] **Don't build UI yet** - just extract patterns
- **Deliverable:** 8-10 section types ready for future composer

### Track 3: Future Capabilities
- **Deferred to Phase 2**

---

## Phase 2: Product Foundation (6-8 Weeks Post-Launch)
**Goal:** Bloom can support 2-3 pilot shops

### Track 1: Multi-Tenant Prep

#### Weeks 1-2: Complete ShopProfile
- [ ] Migrate remaining hardcoded values (100%)
- [ ] Add ShopProfile UI in settings
- [ ] Create shop onboarding flow (internal only)
- **Deliverable:** All shop-specific config in one place

#### Weeks 3-4: Provider Registry
- [ ] Formalize `PaymentProvider` interface
- [ ] Refactor Stripe/Square to implement interface
- [ ] Build provider discovery in settings
- [ ] Remove `if (provider === 'stripe')` logic
- **Deliverable:** New providers can drop in easily

#### Weeks 5-6: Multi-Tenant Database
- [ ] Add `shopId` to all relevant tables
- [ ] Add row-level security policies
- [ ] Create tenant isolation middleware
- [ ] Test with 2 shops in staging
- **Deliverable:** Database ready for multiple shops

#### Weeks 7-8: Authentication & Isolation
- [ ] Shop-scoped user authentication
- [ ] Subdomain routing (`shop1.bloom.com`)
- [ ] Data isolation verification
- [ ] Shop switching for support users
- **Deliverable:** True multi-tenant capability

### Track 2: Website Composer

#### Weeks 1-3: Section System
- [ ] Build section renderer (`<PageRenderer />`)
- [ ] Create `pages` table in database
- [ ] Build `/api/pages` CRUD endpoints
- [ ] Test with one JSON-driven page
- **Deliverable:** Section-based rendering works

#### Weeks 4-6: Page Composer UI
- [ ] Build page list in admin
- [ ] Build section selector UI
- [ ] Build section editor (content only)
- [ ] Section reordering (drag/drop)
- **Deliverable:** Pages can be composed without code

#### Weeks 7-8: Migration & Polish
- [ ] Migrate IYV hardcoded pages to sections
- [ ] Add global site config (nav, footer)
- [ ] Test with pilot shop
- **Deliverable:** Website system ready for pilots

### Track 3: Future Capabilities

#### Weeks 1-8: Production Workflows
- [ ] Advanced production board (stem tracking)
- [ ] Recipe builder (arrangements)
- [ ] Inventory management
- [ ] Supplier management
- **Deliverable:** Operations features ready

---

## Phase 3: Pilot Launch (8-12 Weeks After Phase 2)
**Goal:** 3-5 aligned florists using Bloom

### Track 1: Pilot Onboarding
- [ ] Shop onboarding wizard
- [ ] Data import tools (products, customers)
- [ ] Training materials (videos, docs)
- [ ] Support system (ticketing)
- **Deliverable:** Shops can self-onboard with light support

### Track 2: Capability Surfaces
- [ ] Advanced pricing editor
- [ ] Promotion builder
- [ ] Analytics dashboard
- [ ] Mobile driver app
- **Deliverable:** Feature parity with competitors

### Track 3: Polish & Scale
- [ ] Performance optimization
- [ ] Advanced reporting
- [ ] Integration marketplace (accounting, email)
- [ ] Billing system
- **Deliverable:** Production-ready product

---

## Immediate Next Steps (This Week)

### High Priority - Start Now
1. **Complete POS standardization** (we're 80% done)
   - Finish discount modal tabs
   - Test split payment fixes
   - Fix any remaining modal issues

2. **Create ShopProfile entity**
   - Add to Prisma schema
   - Create migration
   - Add basic CRUD endpoints
   - **Don't build UI yet**

3. **Document current constants**
   - List all hardcoded values
   - Categorize by domain
   - Prioritize migration order

### Medium Priority - This Month
4. **Standardize remaining admin pages**
   - Create StandardTable component
   - Migrate orders, products, customers lists
   - Create Pagination component
   - Create EmptyState component

5. **Extract website sections**
   - Create section schema types
   - Extract hero, features, products sections
   - Define section variants

### Low Priority - Next Month
6. **Driver route management**
   - QR code generation
   - Route optimization
   - Mobile scanning view

7. **Production board**
   - Daily order view
   - Arrangement assignment
   - Completion tracking

---

## Decision Framework: When to Build vs When to Wait

### Build Now If:
- ✅ Blocks IYV launch
- ✅ Takes <2 days to implement
- ✅ Fits "touch it, move it" pattern
- ✅ Aligns with vision

### Build Later If:
- ❌ Nice to have, not critical
- ❌ Requires >1 week
- ❌ Only benefits future shops
- ❌ Unclear requirements

### Never Build:
- 🚫 Feature that breaks domain model
- 🚫 One-off customization
- 🚫 Plugin/module marketplace
- 🚫 Visual website editor

---

## Success Metrics

### Phase 1 Complete When:
- [ ] IYV runs all daily operations on Bloom
- [ ] Zero critical bugs in production
- [ ] UI feels professional and consistent
- [ ] Website handles customer orders
- [ ] ShopProfile exists and captures 60%+ of constants

### Phase 2 Complete When:
- [ ] 2 pilot shops using Bloom in production
- [ ] ShopProfile at 100%
- [ ] Website composer works for both shops
- [ ] Provider pattern formalized
- [ ] Multi-tenant database ready

### Phase 3 Complete When:
- [ ] 5 shops paying for Bloom
- [ ] Onboarding is self-service
- [ ] Feature requests are patterns, not one-offs
- [ ] Architecture supports 50+ shops

---

## Risk Mitigation

### Risk: Over-engineering before launch
**Mitigation:** Strict "launch essentials only" discipline. Defer anything that doesn't block IYV.

### Risk: Technical debt accumulation
**Mitigation:** "Touch it, move it" pattern. Every feature touched gets cleaned up.

### Risk: Losing sight of vision
**Mitigation:** Weekly check: "Does this fit the vision?" If unclear, default to no.

### Risk: Support burden from pilot shops
**Mitigation:** Only invite aligned florists. Charge enough to filter seriousness.

---

## Guiding Principles

### From Architecture Vision
1. **Bloom should feel inevitable to users and modular only to the developer**
2. **Freedom of narrative, not freedom of structure** (for websites)
3. **Internal modularity, external cohesion**
4. **Progressive capability reveal**
5. **Defaults first, flexibility later**

### Launch Philosophy
- **Launch as IYV → fast, focused, real**
- **Architecture → multi-tenant ready**
- **No compromise → both goals achieved**

---

## What You Should Work On Next

### Tomorrow:
1. Finish discount modal (almost done)
2. Create ShopProfile schema in Prisma
3. List all hardcoded constants in `/docs/CONSTANTS_AUDIT.md`

### This Week:
4. Complete POS standardization
5. Start StandardTable component
6. Migrate one list page to test pattern

### This Month:
7. Complete admin UI standardization
8. Migrate 50% of constants to ShopProfile
9. Extract website sections (no UI, just types)

### This Quarter:
10. Launch IYV on Bloom (Phase 1 complete)
11. Onboard first pilot shop
12. Start Phase 2 work

---

## Progress Tracking

**Phase 1 Progress:** 15% (UI standardization in progress)
**Phase 2 Progress:** 0% (Not started)
**Phase 3 Progress:** 0% (Not started)

**Next Milestone:** Complete POS standardization (ETA: This week)

---

## Notes

- The UI standardization work happening RIGHT NOW is exactly the right work
- It's making IYV launch-ready AND building reusable components
- Architecture decisions (ShopProfile, sections) don't block progress
- "Touch it, move it" pattern keeps refactoring gradual and safe

**You're not building a startup product yet. You're building your shop's system, designed to become a product.**

The difference is crucial.

# Remove FTD API Integration (Mercury HQ Polling)

**Status:** 🔜 Ready for Implementation
**Created:** 2026-01-02
**Priority:** Medium
**Type:** Deprecation & Cleanup

---

## Overview

Remove the legacy FTD API integration system that automatically polls Mercury HQ's unofficial API to fetch wire orders. This system has been replaced by a more flexible Gemini OCR-based scanning approach that:
- Works with any wire service provider (FTD, Teleflora, Doordash, etc.)
- Uses official, sustainable integration methods (image/PDF scanning)
- Avoids unofficial API dependencies prone to breaking

**What stays:** The NEW scanning system (`/scan` endpoints, Gemini OCR service)
**What goes:** The OLD polling system (Mercury HQ API, Puppeteer auth, FTD-specific models)

---

## Goals

1. **Remove 31 FTD-specific files** (routes, services, pages, scripts, hooks)
2. **Clean up database schema** (remove FtdOrder, FtdSettings models)
3. **Simplify codebase** by removing 2,000+ lines of complex polling/auth code
4. **Eliminate external dependencies** (Puppeteer, unofficial FTD API, token refresh scheduling)

---

## Files to Remove

### Backend Files (16 files)

**Routes:**
- `/back/src/routes/ftd/orders.ts` (235 lines)
- `/back/src/routes/ftd/settings.ts` (143 lines)

**Services:**
- `/back/src/services/ftdMonitor.ts` (845 lines - CORE polling engine)
- `/back/src/services/ftdAuthService.ts` (356 lines - Puppeteer token extraction)
- `/back/src/services/ftdNotification.ts` (105 lines - SMS/email notifications)

**Scripts:**
- `/back/src/scripts/backfill-ftd-transactions.ts`
- `/back/src/scripts/cleanup-ftd-transactions.ts`
- `/back/scripts/refresh-ftd-token.ts` (production token refresh)
- `/back/scripts/check-ftd-order.ts` (debug utility)

**Remove directory if empty:**
- `/back/src/routes/ftd/` (entire directory)

### Frontend Files (6 files)

**Pages:**
- `/admin/src/app/pages/ftd/FtdOrdersPage.tsx` (315 lines)
- `/admin/src/app/pages/ftd/FtdLivePage.tsx` (130 lines)

**Hooks & Types:**
- `/admin/src/domains/ftd/useFtdOrders.ts` (95 lines)
- `/admin/src/domains/ftd/ftdTypes.ts` (60 lines)

**Remove directories if empty:**
- `/admin/src/app/pages/ftd/` (entire directory)
- `/admin/src/domains/ftd/` (entire directory)

### Documentation Files (3 files)

- `/docs/guide/ftd-token-refresh-quick.md`
- `/docs/guide/ftd-token-refresh-technical.md` (if exists)
- `/back/scripts/README-FTD-TOKEN-REFRESH.md`

---

## Files to Modify

### Backend

**`/back/src/index.ts`** - Remove FTD route registration and service initialization:
```typescript
// REMOVE these imports:
import ftdOrdersRouter from './routes/ftd/orders';
import ftdSettingsRouter from './routes/ftd/settings';
import { startFtdMonitor } from './services/ftdMonitor';
import { startTokenRefreshSchedule } from './services/ftdAuthService';

// REMOVE these route registrations:
app.use('/api/ftd/orders', ftdOrdersRouter);
app.use('/api/ftd/settings', ftdSettingsRouter);

// REMOVE these service startups:
startFtdMonitor().catch(err => console.error(err.message));
startTokenRefreshSchedule();
```

**`/back/prisma/schema.prisma`** - Remove FTD models and enum:
```prisma
// REMOVE entire models:
model FtdSettings { ... }
model FtdOrder { ... }

// REMOVE enum:
enum FtdOrderStatus { ... }
```

**`/back/package.json`** - Remove npm script:
```json
// REMOVE:
"refresh-ftd-token": "npx tsx scripts/refresh-ftd-token.ts"
```

**Check if Puppeteer can be removed:**
- Search codebase for other Puppeteer usage
- If only used for FTD, remove from `package.json` dependencies

### Frontend

**`/admin/src/app/App.tsx`** - Remove FTD routes:
```typescript
// REMOVE:
<Route path="ftd-orders" element={<FtdOrdersPage />} />
<Route path="ftd-live" element={<FtdLivePage />} />
```

**`/admin/src/shared/ui/layout/AppSidebar.tsx`** - Remove FTD menu items:
```typescript
// REMOVE "External Orders" section with:
// - Orders (path: /ftd-orders)
// - External Live (path: /ftd-live)
```

### Documentation

**`/docs/API_Endpoints.md`** - Remove FTD API documentation:
- Remove all `/api/ftd/*` endpoint documentation

**`/docs/Progress_Tracker.markdown`** - Remove FTD integration references:
- Remove any FTD integration status entries

---

## Database Migration Plan

### Step 1: Create Migration to Remove FTD Tables

```bash
npx prisma migrate dev --name remove_ftd_integration
```

This will:
1. Drop `FtdOrder` table
2. Drop `FtdSettings` table
3. Drop `FtdOrderStatus` enum

### Step 2: Data Preservation (Optional)

**Before running migration, decide:**

**Option A: Keep linked Bloom orders, delete FTD metadata**
- All Bloom orders created from FTD orders will remain intact
- Only FTD-specific metadata (FtdOrder records) will be deleted
- **Recommended** - preserves business data

**Option B: Export FTD data before deletion**
```sql
-- Export to CSV (run before migration)
COPY (SELECT * FROM "FtdOrder") TO '/tmp/ftd_orders_backup.csv' CSV HEADER;
COPY (SELECT * FROM "FtdSettings") TO '/tmp/ftd_settings_backup.csv' CSV HEADER;
```

**Option C: Delete everything**
- Just run migration, all FTD data is deleted
- Linked Bloom orders remain (they're independent records)

### Step 3: Verify Foreign Keys

Check if any other tables reference FtdOrder:
```bash
# Search for FtdOrder references in schema
grep -r "FtdOrder" back/prisma/schema.prisma
```

**Expected:** Only `Order.linkedFtdOrder` relation (can be safely removed)

---

## Environment Variables to Remove

### Backend `.env` (Development)
```bash
# REMOVE:
FTD_API_KEY=
FTD_SHOP_ID=
FTD_MERCURY_USERNAME=
FTD_MERCURY_PASSWORD=
DISABLE_FTD_AUTO_REFRESH=
PROD_DATABASE_URL=  # Only if not used elsewhere
```

### Render.com (Staging/Production)
Remove these environment variables from Render dashboard:
- `FTD_API_KEY`
- `FTD_SHOP_ID`
- `FTD_MERCURY_USERNAME`
- `FTD_MERCURY_PASSWORD`
- `DISABLE_FTD_AUTO_REFRESH`

**Note:** Check if `TWILIO_*` and `SENDGRID_*` are ONLY used for FTD notifications:
- If yes → can be removed
- If used for other notifications → keep them

---

## Implementation Checklist

### Phase 1: Backup & Preparation
- [ ] Verify no active FTD orders in production
- [ ] Export FTD data if preservation needed (see "Data Preservation" above)
- [ ] Search codebase for unexpected FTD references: `grep -r "ftd" --include="*.ts" --include="*.tsx"`
- [ ] Check if Puppeteer used elsewhere: `grep -r "puppeteer" back/src/`

### Phase 2: Backend Cleanup
- [ ] Remove FTD route files: `routes/ftd/orders.ts`, `routes/ftd/settings.ts`
- [ ] Remove FTD services: `ftdMonitor.ts`, `ftdAuthService.ts`, `ftdNotification.ts`
- [ ] Remove FTD scripts: `backfill-ftd-transactions.ts`, `cleanup-ftd-transactions.ts`, etc.
- [ ] Update `/back/src/index.ts` (remove route registrations, service startups)
- [ ] Update `/back/package.json` (remove `refresh-ftd-token` script)
- [ ] Check Puppeteer dependency removal
- [ ] Update Prisma schema: remove `FtdSettings`, `FtdOrder`, `FtdOrderStatus`
- [ ] Run migration: `npx prisma migrate dev --name remove_ftd_integration`
- [ ] Verify backend starts without errors: `npm run dev`

### Phase 3: Frontend Cleanup
- [ ] Remove FTD pages: `pages/ftd/FtdOrdersPage.tsx`, `FtdLivePage.tsx`
- [ ] Remove FTD hooks/types: `domains/ftd/useFtdOrders.ts`, `ftdTypes.ts`
- [ ] Remove empty directories: `pages/ftd/`, `domains/ftd/`
- [ ] Update `/admin/src/app/App.tsx` (remove FTD routes)
- [ ] Update `/admin/src/shared/ui/layout/AppSidebar.tsx` (remove menu items)
- [ ] Verify frontend builds: `npm run build`
- [ ] Verify no broken imports: `npx tsc --noEmit`

### Phase 4: Documentation & Environment
- [ ] Remove docs: `docs/guide/ftd-token-refresh-*.md`, `back/scripts/README-FTD-TOKEN-REFRESH.md`
- [ ] Update `/docs/API_Endpoints.md` (remove `/api/ftd/*` endpoints)
- [ ] Update `/docs/Progress_Tracker.markdown` (remove FTD references)
- [ ] Remove FTD environment variables from local `.env`
- [ ] Remove FTD environment variables from Render dashboard
- [ ] Decide on TWILIO/SENDGRID variables (keep if used elsewhere)

### Phase 5: Testing & Verification
- [ ] Backend starts cleanly: `cd back && npm run dev`
- [ ] Frontend builds cleanly: `cd admin && npm run build`
- [ ] TypeScript compiles: `cd admin && npx tsc --noEmit`
- [ ] No FTD references in codebase: `grep -ri "ftd" --include="*.ts" --include="*.tsx" | grep -v "node_modules"`
- [ ] Verify scanning approach still works (Gemini OCR)
- [ ] Test creating order from scan in dev environment

### Phase 6: Deployment
- [ ] Commit changes: `git add . && git commit -m "Remove legacy FTD API integration system"`
- [ ] **DO NOT PUSH YET** - wait for user confirmation
- [ ] User reviews changes
- [ ] User pushes to trigger deployment
- [ ] Migration runs automatically on Render
- [ ] Verify staging environment after deploy

---

## Potential Conflicts with Codex's Refund Work

### Low Risk Areas
- Different routes (`/api/ftd/*` vs `/api/refunds`)
- Different services (FTD polling vs refund processing)
- Different frontend pages (FTD orders vs refund management)

### Medium Risk Areas
**`/back/src/services/transactionService.ts`**
- Codex may be modifying this for refund transactions
- FTD cleanup touched this in backfill script
- **Mitigation:** Only delete FTD-specific scripts, don't modify transactionService

**`/back/prisma/schema.prisma`**
- Codex may be adding refund-related models
- This plan removes FTD models
- **Mitigation:** Coordinate migrations - either:
  - Wait for Codex to finish refund schema changes
  - OR run FTD removal first, let Codex rebase

### Recommendation
**Safe to proceed in parallel IF:**
- You avoid modifying `transactionService.ts` (just delete scripts)
- You coordinate schema.prisma changes with Codex
- You let user decide when to push (don't auto-push)

**Better approach:**
- Implement FTD removal locally
- Don't commit until Codex finishes refund work
- Then merge both changes together

---

## Files Preserved (NEW Scanning System)

**These files are part of the NEW approach and MUST BE KEPT:**

### Backend (Gemini Scanning)
- `/back/src/routes/orders/scan.ts` - Scan endpoint (OCR analysis)
- `/back/src/routes/orders/create-from-scan.ts` - Create order from scan results
- `/back/src/services/gemini-ocr.ts` - Google Gemini Vision integration
- `/back/src/services/externalProviderService.ts` - External provider handling

### Frontend (Scanning UI)
- `/admin/src/app/components/orders/ScanOrderModal.tsx` - Scan order modal
- `/admin/src/app/pages/mobile/MobileScanPage.tsx` - Mobile scanning interface
- Any components that use the scanning functionality

### Database
- `ShopProfile.googleMapsApiKey` - Used for Gemini API (keep)
- No FTD-specific models in scanning approach

---

## Success Criteria

- [ ] All 31 FTD files removed
- [ ] FTD routes removed from backend router
- [ ] FTD menu items removed from sidebar
- [ ] FTD models removed from Prisma schema
- [ ] Migration successful (tables dropped)
- [ ] Backend starts without errors
- [ ] Frontend builds without errors
- [ ] No FTD references in codebase (except comments explaining removal)
- [ ] Scanning system still works (Gemini OCR)
- [ ] Environment variables cleaned up
- [ ] Documentation updated

---

## Rollback Plan

If issues arise after deployment:

### Immediate Rollback (Revert Git Commit)
```bash
git revert HEAD
git push
```

### Database Rollback (Restore FTD Tables)
- Prisma doesn't support automatic rollback
- Would need to manually restore from backup
- **Prevention:** Test thoroughly in dev before deploying

### Alternative: Keep FTD Code Disabled
If unsure about deleting everything:
1. Comment out route registrations in `index.ts`
2. Comment out service startups
3. Keep files but don't use them
4. Delete later once confident

---

## Post-Implementation

After completing:

1. **Verify:**
   - All success criteria met
   - No broken references
   - Scanning system works

2. **Update:**
   - Mark as ✅ Completed in Progress_Tracker
   - Delete this plan file

3. **Monitor:**
   - Watch for any FTD-related errors in logs
   - Ensure scanning approach handles all use cases

---

## Estimated Effort

**Time:** 1-2 hours (mostly deletions, low complexity)

**Complexity:** Low
- Mostly file deletions
- No new features to build
- Database migration is straightforward (DROP TABLE)

**Risk:** Low
- FTD system is isolated (no deep dependencies)
- Bloom orders created by FTD remain intact
- Scanning system is independent

---

## Notes

- This is a **cleanup task**, not a new feature
- The replacement system (Gemini scanning) is already built and working
- No functionality is lost - scanning approach is more flexible
- Removes 2,000+ lines of complex, fragile code
- Eliminates dependency on unofficial FTD API
- Reduces maintenance burden significantly

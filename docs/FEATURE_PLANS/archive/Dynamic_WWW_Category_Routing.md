# Dynamic WWW Category Routing (Data-Driven Shop Categories)

**Status:** 🔜 Ready for Implementation
**Created:** 2026-01-26
**Priority:** High

---

## Overview
Make the www storefront fully data-driven from the Category tree. Top-level categories (e.g. Holidays) come from the DB, child categories become pages, and routes are dynamic (`/shop/:topSlug/:childSlug`). No hardcoded UUIDs or manual mapping after DB resets.

---

## 🤖 Implementation Constraints for AI

**CRITICAL - Read Before Implementing:**

> **⚠️ FOR AI ASSISTANTS: You MUST read the required documentation before writing code. Follow existing patterns exactly.**

### Required Reading (IN ORDER)
1. `/docs/AI_IMPLEMENTATION_GUIDE.md` ← **READ THIS FIRST** (all patterns: API routes, hooks, WebSocket, R2, batch ops)
2. `/docs/System_Reference.md` (architecture context)
3. `/docs/API_Endpoints.md` (existing endpoints)
4. `/CLAUDE.md` (project conventions)

### Pattern Reference Files
**Study these files for implementation patterns:**
- **Frontend route pattern:** `/www/src/routes/root.jsx`
- **Category layout pattern:** `/www/src/layouts/CategoryLayout.jsx`
- **Category service pattern:** `/www/src/services/categoryService.js`

**DO NOT write from scratch. COPY patterns from these files.**

### Pre-Implementation Quiz (Answer Before Coding)

**Question 1: API Client**
- What hook do you use for all frontend API calls?
- Answer: `useApiClient` (not fetch)

**Question 2: Price Storage**
- How are monetary values stored in the database?
- Answer: As `Int` in `cents`

**Question 3: Validation**
- What library validates backend requests?
- Answer: `Zod` with `.parse()` method

### Critical Don'ts
❌ Use `fetch()` directly → Use `useApiClient` hook
❌ Store prices as floats → Use integers in cents
❌ Skip cascade deletes → Add `onDelete: Cascade`
❌ Forget route registration → Register in `/back/src/index.ts`
❌ Skip migrations → Run `npx prisma migrate dev --name feature_name`

---

## Goals

1. Replace hardcoded category UUIDs with dynamic slug-based routing.
2. Reflect top-level categories from DB on www automatically (add/remove without code).
3. Show top-level category pages with products aggregated from all active child categories.
4. Only show active categories and active products (respect `isActive` and visibility).

---

## Architecture & Endpoints

### Backend API Routes (Already available)
- `GET /api/categories?tree=true` — load category tree (use to build nav + slug resolution)
- `GET /api/categories/by-slug/:slug` — load specific category by slug
- `GET /api/categories/:id/products` — optional (single category)

**No backend changes required** for initial implementation.

### Frontend Routing
- Add dynamic routes in `www/src/routes/root.jsx`:
  - `/shop/:topSlug` (top-level page)
  - `/shop/:topSlug/:childSlug` (child category page)
- Remove or bypass hardcoded occasion/holiday pages.

### Data Flow
- Load category tree → filter `isActive` → resolve slugs.
- Top-level page (`/shop/:topSlug`): collect all descendant category IDs → filter products.
- Child page (`/shop/:topSlug/:childSlug`): resolve child category ID → filter products.

---

## UI Requirements

### Frontend Components

**New Page:**
- `/www/src/pages/CategoryPage.jsx` — dynamic category page

**Update Components:**
- `/www/src/layouts/CategoryLayout.jsx` — accept slug/IDs and show dynamic title/description
- `/www/src/components/Filters/ProductGrid.jsx` — accept `selectedCategoryIds` (array) instead of single `selectedCategory`
- `/www/src/components/Navbar/*` (or menu component) — load top-level categories dynamically for navigation

### User Flow
1. User clicks a top-level category in www nav.
2. Route loads `/shop/:topSlug` and aggregates all child products.
3. User clicks a child category from nav or sidebar → `/shop/:topSlug/:childSlug`.
4. Product grid filters to the child category only.

### Mobile Responsiveness
- Ensure nav and category pages render correctly on <768px.
- Use existing TailGrids patterns; no new layout system.

---

## Implementation Checklist

### Phase 1: Frontend Data Layer
- [ ] Add `getCategoriesTree()` usage in www (existing service)
- [ ] Normalize categories to only active items
- [ ] Add helpers to resolve `topSlug`/`childSlug`
- [ ] Add helper to collect descendant category IDs

### Phase 2: Routing + Page
- [ ] Add dynamic routes in `www/src/routes/root.jsx`
- [ ] Add new `CategoryPage.jsx` to handle slugs + data loading
- [ ] Remove/stop using hardcoded occasion/holiday pages

### Phase 3: Product Grid Filtering
- [ ] Update `ProductGrid` to accept `selectedCategoryIds: string[] | null`
- [ ] Filter products using `categoryId` in that list
- [ ] Ensure add-ons hidden when no category filter (same behavior as today)

### Phase 4: Navigation
- [ ] Load top-level categories into nav/menu
- [ ] Use slugs for URLs (no UUIDs)
- [ ] Ensure only active categories are shown

### Phase 5: Testing
- [ ] Verify DB reset still shows correct categories
- [ ] Verify top-level page shows aggregated products
- [ ] Verify child page shows only that category
- [ ] Verify inactive categories/products do not appear

---

## Edge Cases & Validation

- Missing slug → show 404 or fallback to `/shop`.
- Top slug exists but child slug doesn’t → show top-level page or 404 (decide in implementation).
- Category without products → show empty state.
- Category with nested grandchildren → ensure aggregation includes all descendants.

---

## Files to Create/Modify

### New Files
```
/www/src/pages/CategoryPage.jsx
```

### Modified Files
```
/www/src/routes/root.jsx
/www/src/layouts/CategoryLayout.jsx
/www/src/components/Filters/ProductGrid.jsx
/www/src/components/Navbar/* (nav menu component)
```

---

## Success Criteria

- [ ] No hardcoded UUIDs remain in www category pages
- [ ] DB reset does not break category mapping
- [ ] `/shop/:topSlug` shows all products in child categories
- [ ] `/shop/:topSlug/:childSlug` shows only that child category
- [ ] Only active categories/products appear
- [ ] No console errors

---

## Implementation Notes

**Estimated Effort:** 0.5–1 day

**Dependencies:**
- Existing categories API endpoints
- Slugs must be stable for categories shown on www

**Testing Strategy:**
- Manual click-through of top and child categories
- Verify filters + price ranges still apply

**Deployment Notes:**
- No migrations required
- No backend changes required

---

## Post-Implementation

After completing implementation:
1. Update `/docs/Progress_Tracker.markdown` with completion entry.
2. Archive this plan under `/docs/FEATURE_PLANS/archive/`.

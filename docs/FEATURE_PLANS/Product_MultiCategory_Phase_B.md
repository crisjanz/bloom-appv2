# Product Multi-Category (Phase B: Remove Primary Category)

**Status:** 💡 Planned
**Created:** 2026-01-26
**Priority:** Medium

---

## Overview
Remove the single `Product.categoryId` field and rely entirely on the `ProductCategory` join table. All category-driven logic uses the join table (full multi-category model). This is the long-term clean design once Phase A is stable.

---

## 🤖 Implementation Constraints for AI

**CRITICAL - Read Before Implementing:**

> **⚠️ FOR AI ASSISTANTS: You MUST read the required documentation before writing code. Follow existing patterns exactly.**

### Required Reading (IN ORDER)
1. `/docs/AI_IMPLEMENTATION_GUIDE.md`
2. `/docs/System_Reference.md`
3. `/docs/API_Endpoints.md`
4. `/CLAUDE.md`

### Pattern Reference Files
- **Backend route pattern:** `/back/src/routes/products.ts`
- **Discount logic:** `/back/src/routes/discounts.ts`
- **Website filtering:** `/www/src/components/Filters/ProductGrid.jsx`
- **Admin product form:** `/admin/src/app/components/products/ProductForm.tsx`

### Critical Don'ts
❌ Skip migrations
❌ Use `fetch()` directly (admin)

---

## Goals
1. Remove `Product.categoryId` from schema.
2. All category logic uses join table only.
3. Eliminate primary/secondary category ambiguity.

---

## Architecture & Endpoints

### Database Schema
- Drop `Product.categoryId` + `Product.category` relation.
- Keep `ProductCategory` join table as the only source of product-category links.
- Update any indices/relations referencing `Product.categoryId`.

**Migration:**
```bash
npx prisma migrate dev --name remove_product_category_primary
```

### Backend API
- Products endpoints read/write `categoryIds` only.
- Any query that used `categoryId` must join through `ProductCategory`.
- Discounts/category filters updated to use join table.

---

## UI Requirements

### Admin
- Product form shows multi-select only (no primary concept).
- Validation: require at least one category.

### Website
- Category filters already use `categoryIds` (from Phase A).

---

## Implementation Checklist

### Phase 1: DB + Data Migration
- [ ] Ensure all products have at least one `ProductCategory` link
- [ ] Remove `categoryId` field and relation
- [ ] Migration

### Phase 2: Backend Refactor
- [ ] Update all category queries to join table
- [ ] Update discounts logic if category-based
- [ ] Update any reports or related-products logic

### Phase 3: Frontend Updates
- [ ] Remove primary category handling in admin UI
- [ ] Verify www still filters correctly

### Phase 4: Docs
- [ ] Update `/docs/API_Endpoints.md`
- [ ] Update `/docs/Progress_Tracker.markdown`

---

## Edge Cases
- Products with zero categories → block save.
- Reports/discounts that assume one category must be redefined.

---

## Files to Create/Modify

### Modified Files
```
/back/prisma/schema.prisma
/back/src/routes/products.ts
/back/src/routes/categories.ts
/back/src/routes/discounts.ts
/admin/src/app/components/products/ProductForm.tsx
/www/src/components/Filters/ProductGrid.jsx
/docs/API_Endpoints.md
/docs/Progress_Tracker.markdown
```

---

## Success Criteria
- [ ] No references to `Product.categoryId` remain
- [ ] All category filtering uses join table
- [ ] No data loss after migration

---

## Implementation Notes

**Estimated Effort:** 1–2 days

**Dependencies:**
- Phase A must be completed and stable
- All products must have join table links

---

## Post-Implementation
1. Update docs + archive plan.

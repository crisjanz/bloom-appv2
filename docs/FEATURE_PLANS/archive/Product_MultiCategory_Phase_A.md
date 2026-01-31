# Product Multi-Category (Phase A: Join Table + Primary Category)

**Status:** 🔜 Ready for Implementation
**Created:** 2026-01-26
**Priority:** High

---

## Overview
Add multi-category support while keeping a primary `categoryId` on Product for backward compatibility. Introduce a `ProductCategory` join table, update APIs to read/write `categoryIds`, and update admin/website to use multi-category lists. This is a stepping stone to a future full multi-category model.

---

## 🤖 Implementation Constraints for AI

**CRITICAL - Read Before Implementing:**

> **⚠️ FOR AI ASSISTANTS: You MUST read the required documentation before writing code. Follow existing patterns exactly.**

### Required Reading (IN ORDER)
1. `/docs/AI_IMPLEMENTATION_GUIDE.md` ← **READ THIS FIRST**
2. `/docs/System_Reference.md`
3. `/docs/API_Endpoints.md`
4. `/CLAUDE.md`

### Pattern Reference Files
- **Backend route pattern:** `/back/src/routes/products.ts`
- **Admin product form pattern:** `/admin/src/app/components/products/ProductForm.tsx`
- **Admin category list pattern:** `/admin/src/app/pages/products/CategoriesPage.tsx`
- **Website category filtering:** `/www/src/components/Filters/ProductGrid.jsx`

### Pre-Implementation Quiz
**Q1:** What hook do you use for frontend API calls? → `useApiClient`
**Q2:** How are money values stored? → `Int` cents
**Q3:** What validates backend requests? → `Zod` with `.parse()`

### Critical Don'ts
❌ Use `fetch()` directly (admin)
❌ Skip Zod validation
❌ Skip migrations

---

## Goals
1. Products can be assigned to multiple categories.
2. Primary category still exists for POS/legacy compatibility.
3. Website category filtering matches any assigned category.
4. Admin product editor can select multiple categories.

---

## Architecture & Endpoints

### Database Schema
Add join table while keeping `Product.categoryId`:

```prisma
model ProductCategory {
  id         String   @id @default(uuid())
  productId  String
  categoryId String
  product    Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  category   Category @relation(fields: [categoryId], references: [id], onDelete: Cascade)

  @@unique([productId, categoryId])
  @@index([categoryId])
}

model Product {
  // existing fields...
  categoryId  String
  category    Category  @relation("ProductCategory", fields: [categoryId], references: [id])
  categories  ProductCategory[]
}

model Category {
  // existing fields...
  products     Product[]
  productLinks ProductCategory[]
}
```

**Migration:**
```bash
npx prisma migrate dev --name add_product_categories
```

### Backend API Changes
**File:** `/back/src/routes/products.ts`
- Accept `categoryIds: string[]` in create/update (default to `[categoryId]`).
- Ensure primary `categoryId` is always included in join table.
- Return `categoryIds` in responses.

**File:** `/back/src/routes/categories.ts`
- Update `GET /api/categories/:id/products` to return products where category exists in join table.

**File:** `/back/src/routes/products/search` (if applicable)
- Include `categoryIds` in results.

### Frontend (Admin)
- Update `ProductForm` to allow multi-select categories.
- Preserve primary category selection (first selected or explicit primary).
- Send `categoryIds` to backend.

### Frontend (WWW)
- Update product filtering to use `categoryIds` (any match).
- Ensure category-based listing uses join table data.

---

## UI Requirements

### Admin Product Form
- Keep existing single category selector (primary category).
- Add multi-select control below it for additional categories.
- Primary category still required.
- Validation: at least one category.

### Website
- Category pages show products where `categoryIds` includes the selected category.

---

## Implementation Checklist

### Phase 1: DB + Backend
- [ ] Add `ProductCategory` join table + relations
- [ ] Migration
- [ ] Update product create/update to write join table
- [ ] Update product read to include `categoryIds`
- [ ] Update category products endpoint to use join table

### Phase 2: Admin UI
- [ ] Product form multi-select
- [ ] Persist `categoryIds`
- [ ] Ensure primary category preserved

### Phase 3: Website
- [ ] Product grid filtering uses `categoryIds`
- [ ] Product search/results include `categoryIds`

### Phase 4: Docs
- [ ] Update `/docs/API_Endpoints.md`
- [ ] Update `/docs/Progress_Tracker.markdown`
- [ ] Archive this plan

---

## Edge Cases & Validation
- Product created with only primary category → join table should still include it.
- If category removed from list, ensure primary category is still present.
- Empty category list should be rejected.

---

## Files to Create/Modify

### New Files
```
/back/prisma/migrations/*
```

### Modified Files
```
/back/prisma/schema.prisma
/back/src/routes/products.ts
/back/src/routes/categories.ts
/admin/src/app/components/products/ProductForm.tsx
/admin/src/app/pages/products/EditProductPage.tsx
/www/src/components/Filters/ProductGrid.jsx
/www/src/services/productService.js (if mapping output)
/docs/API_Endpoints.md
/docs/Progress_Tracker.markdown
```

---

## Success Criteria
- [ ] Product supports multiple categories (admin + API)
- [ ] Website category pages show all products from any assigned category
- [ ] Primary category still works for POS/legacy
- [ ] No console errors

---

## Implementation Notes

**Estimated Effort:** 1–2 days

**Dependencies:**
- Category data already present
- ProductForm supports additional field

**Testing Strategy:**
- Create product with 2+ categories
- Verify admin edit persists
- Verify www category page shows product

---

## Post-Implementation
1. Update docs + archive plan.

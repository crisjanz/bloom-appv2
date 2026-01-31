# Fulfillment Photos → Order Images Refactor

**Status:** 🔜 Ready for Implementation
**Created:** 2026-01-29
**Priority:** High

---

## Overview

Fulfillment photos (taken on mobile when completing arrangements) are currently stored as communication records with string-encoded URLs (`Fulfillment photo | url:...`). This means the desktop Order Edit page's "Order Photos" section never shows them because it reads from `order.images` (which is always empty).

This refactor saves fulfillment photos to `order.images[]` (the existing Prisma `String[]` field on the Order model) so they display correctly on the desktop order page. Communication records remain for reference notes only.

---

## 🤖 Implementation Constraints for AI

**CRITICAL - Read Before Implementing:**

> **⚠️ FOR AI ASSISTANTS: You MUST read the required documentation before writing code. Follow existing patterns exactly.**

### Required Reading (IN ORDER)
1. `/docs/AI_IMPLEMENTATION_GUIDE.md` ← **READ THIS FIRST**
2. `/docs/System_Reference.md` (architecture context)
3. `/docs/API_Endpoints.md` (existing endpoints)
4. `/CLAUDE.md` (project conventions)

### Pattern Reference Files
- **Backend route pattern:** `/back/src/routes/orders/index.ts` (existing order update/images routes)
- **Frontend fulfillment:** `/admin/src/app/pages/FulfillmentPage.tsx` (current fulfillment flow)
- **Frontend order edit:** `/admin/src/app/pages/orders/OrderEditPage.tsx` (order display + image mapping)
- **Domain entity:** `/admin/src/domains/orders/entities/Order.ts`
- **Repository mapper:** `/admin/src/domains/orders/repositories/OrderRepository.ts`

**DO NOT write from scratch. COPY patterns from these files.**

### Critical Don'ts
❌ Use `fetch()` directly → Use `useApiClient` hook (except FulfillmentPage which already uses raw fetch — match existing pattern there)
❌ Remove communication records for fulfillment notes — notes with text should still go to communications
❌ Break the existing `order.images` upload/edit flow on desktop (ImagesEditModal)
❌ Remove the fulfillment note text feature — only change where PHOTOS are stored

---

## Goals

1. Fulfillment photos appear in the "Order Photos" section on the desktop Order Edit page
2. `order.images` is the single source of truth for all order photos (fulfillment + manually uploaded)
3. Communication records are used only for text notes, not as photo storage
4. Existing fulfillment photos (in communications) are migrated to `order.images`

---

## Architecture & Changes

### No Schema Changes Required
The `Order` model already has `images String[] @default([])` in Prisma (schema.prisma:259). No migration needed.

### Change 1: FulfillmentPage — Save photos to order.images

**File:** `/admin/src/app/pages/FulfillmentPage.tsx`

**Current behavior (lines 571-573):**
```ts
// Fulfillment photos are tracked via communications only,
// NOT added to order.images (which is for product/design images)
```

**New behavior:**
After uploading images to R2 (the existing upload-images endpoint), ALSO append the returned URLs to `order.images` by calling the order update endpoint:

```ts
// After upload, add URLs to order.images
if (uploadedImageUrls.length > 0) {
  const currentImages = order.images || [];
  const updatedImages = [...currentImages, ...uploadedImageUrls];

  await fetch(`${import.meta.env.VITE_API_URL}/api/orders/${order.id}/update`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ images: updatedImages })
  });

  // Update local order state
  setOrder({ ...order, images: updatedImages });
}
```

**Communication records change:**
- Photo-only saves (no note text): Do NOT create a communication record. The photo is stored in `order.images`.
- Photo + note text: Still create a communication record for the note text, but change the format to just `Fulfillment note: {noteText}` (no URL embedding needed since photo is in order.images).
- Note-only saves (no photo): No change, keep as `Fulfillment note: {noteText}`.

### Change 2: Domain Entity — Add images field

**File:** `/admin/src/domains/orders/entities/Order.ts`

Add `images` field to the `Order` interface (after line 63, before `// Metadata`):

```ts
// Media
images?: string[]
```

### Change 3: Repository — Map images from backend

**File:** `/admin/src/domains/orders/repositories/OrderRepository.ts`

In the `transformOrder` method's return object (around line 201), add:

```ts
images: backendOrder.images || [],
```

### Change 4: OrderEditPage — Map domain images to frontend

**File:** `/admin/src/app/pages/orders/OrderEditPage.tsx`

Change line 116 from:
```ts
images: [], // TODO: Map domain images
```
To:
```ts
images: domainOrder.images || [],
```

### Change 5: FulfillmentPage — Remove image from order.images on delete

**File:** `/admin/src/app/pages/FulfillmentPage.tsx`

The existing `removeImageFromOrder` function (around line 500-532) removes images from `order.images` via API. Verify this works correctly for fulfillment photos now that they'll be stored there. The function already calls the order update endpoint to filter out the removed URL — this should work as-is.

### Change 6: FulfillmentPage — Stop reading fulfillment photos from communications

**File:** `/admin/src/app/pages/FulfillmentPage.tsx`

The `loadFulfillmentNotes` function (line 117) currently loads communications and parses URLs from message strings to build `fulfillmentNotesByImage`. After this refactor:
- Fulfillment photos come from `order.images` (already loaded with the order)
- Notes are still loaded from communications, but keyed differently since URLs won't be in the message format anymore
- The `determineProductImage` function (line 162) filters `order.images` by known fulfillment URLs — review this logic since fulfillment photos will now be in `order.images` directly

**Important:** The `determineProductImage` function currently filters OUT fulfillment photos from `order.images` to find product reference images. After this change, ALL photos will be in `order.images`. Consider: should fulfillment photos be distinguishable from product/design reference images? If yes, you may need a simple convention (e.g., fulfillment photos are always at the end of the array, or add a prefix). If no, simplify `determineProductImage` to just use the first image.

### Change 7: Data Migration Script

**File:** Create `/back/src/scripts/migrate-fulfillment-photos.ts`

One-time script to migrate existing fulfillment photos from communications to order.images:

```ts
// Pseudocode:
// 1. Query all communications where message matches 'Fulfillment photo' patterns
// 2. Extract URLs from message strings
// 3. Group by orderId
// 4. For each order, append extracted URLs to order.images (avoiding duplicates)
// 5. Optionally: update communication messages to remove URL (keep note text only)
```

Run manually: `npx ts-node src/scripts/migrate-fulfillment-photos.ts`

---

## Implementation Checklist

### Phase 1: Domain & Data Layer (no visible changes yet)
- [ ] Add `images?: string[]` to Order entity (`/admin/src/domains/orders/entities/Order.ts`)
- [ ] Map `images` in `transformOrder` (`/admin/src/domains/orders/repositories/OrderRepository.ts`)
- [ ] Map `images` in `mapDomainOrderToFrontend` (`/admin/src/app/pages/orders/OrderEditPage.tsx` line 116)

### Phase 2: FulfillmentPage — Write photos to order.images
- [ ] After R2 upload, also PUT to order update endpoint to append URLs to `order.images`
- [ ] Update local order state after save
- [ ] Stop creating communication records for photo-only saves
- [ ] For photo+note saves, create communication with note text only (no URL in message)
- [ ] Verify `removeImageFromOrder` works correctly for fulfillment photos

### Phase 3: FulfillmentPage — Read photos from order.images
- [ ] Refactor fulfillment photo display to read from `order.images` instead of parsing communications
- [ ] Keep `loadFulfillmentNotes` for loading note text, but decouple from photo URLs
- [ ] Review and simplify `determineProductImage` logic

### Phase 4: Migration Script
- [ ] Create migration script to move existing fulfillment photo URLs from communications → order.images
- [ ] Test on a few orders manually
- [ ] Run on full dataset

### Phase 5: Cleanup & Testing
- [ ] Test: take photo on mobile fulfillment → verify it shows on desktop Order Photos
- [ ] Test: add photo + note → verify note in communications, photo in order.images
- [ ] Test: remove photo from fulfillment → verify removed from order.images
- [ ] Test: existing ImagesEditModal on desktop still works
- [ ] Test: orders with no photos still show "No photos uploaded yet"
- [ ] Update `/docs/Progress_Tracker.markdown`

---

## Files to Create/Modify

### New Files
```
/back/src/scripts/migrate-fulfillment-photos.ts    (~50 lines)
```

### Modified Files
```
/admin/src/domains/orders/entities/Order.ts                    (add images field)
/admin/src/domains/orders/repositories/OrderRepository.ts      (map images in transformOrder)
/admin/src/app/pages/orders/OrderEditPage.tsx                  (map domain images, line 116)
/admin/src/app/pages/FulfillmentPage.tsx                       (save to order.images, refactor reads)
```

---

## Edge Cases & Validation

- **Duplicate URLs:** When appending to `order.images`, deduplicate to prevent the same URL appearing twice
- **Race condition:** If two fulfillment saves happen quickly, the second PUT could overwrite the first. Use the latest `order.images` from state, not a stale copy
- **Old communication format:** Migration script must handle both `Fulfillment photo | url:...` and `Fulfillment photo note | url:... | note:...` patterns
- **Orders with mixed sources:** Some orders may already have manually uploaded images in `order.images` AND fulfillment photos in communications. Migration must append, not replace

---

## Success Criteria

- [ ] Fulfillment photos taken on mobile appear in desktop Order Photos section
- [ ] Communication records contain only text notes, not photo URLs (for new saves)
- [ ] Existing fulfillment photos migrated to order.images
- [ ] ImagesEditModal on desktop continues to work
- [ ] No duplicate photos after migration
- [ ] `determineProductImage` still works correctly on fulfillment page

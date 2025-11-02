# Add-On Products Integration Plan

**Status:** ✅ Completed
**Created:** 2025-11-02
**Priority:** Medium
**Completed:** 2025-11-02 (Codex)

---

## Overview
Wire up the placeholder add-on products UI to the actual database implementation. The database schema already supports add-on products via `ProductType.ADDON` and add-on group relationships, but the frontend and API endpoints need to be implemented.

---

## Current State

### ✅ Already Implemented
- Database schema with `ProductType` enum (`MAIN`, `ADDON`, `SERVICE`)
- Add-on group tables (`AddOnGroup`, `AddOnProduct`, `ProductAddOnGroup`)
- Product form toggle to mark products as add-ons (`admin/src/app/components/products/cards/SettingsCard.tsx:88-96`)
- Placeholder UI component (`admin/src/app/components/settings/orders/AddOnGroupsCard.tsx`)

### 🛠️ Needs Implementation
- API endpoints for add-on group CRUD operations
- Frontend form to create and manage add-on groups
- UI to assign products to add-on groups
- Integration with order creation flow to select add-ons

---

## Goals

1. **Backend:** Create API endpoints for managing add-on groups
2. **Frontend:** Build UI for creating/editing add-on groups and assigning products
3. **Integration:** Enable add-on selection during order creation/editing
4. **UX:** Provide intuitive grouping and assignment workflow

---

## Architecture & Endpoints

### Backend API Routes (`/back/src/routes/addon-groups.ts`)

#### Add-On Group Management
- `GET /api/addon-groups` - List all add-on groups
  - Query params: `includeProducts=true` to include associated products
  - Returns: Array of groups with optional product relationships

- `GET /api/addon-groups/:id` - Get single add-on group details
  - Returns: Group with associated products and add-ons

- `POST /api/addon-groups` - Create new add-on group
  - Body: `{ name: string, isDefault: boolean, productIds: string[] }`
  - Returns: Created group with ID

- `PUT /api/addon-groups/:id` - Update add-on group
  - Body: `{ name: string, isDefault: boolean }`
  - Returns: Updated group

- `DELETE /api/addon-groups/:id` - Delete add-on group
  - Validates: Cannot delete if assigned to products
  - Returns: Success/error message

#### Product Assignment
- `POST /api/addon-groups/:id/products` - Assign products to group
  - Body: `{ productIds: string[] }`
  - Creates `ProductAddOnGroup` records
  - Returns: Updated group with products

- `DELETE /api/addon-groups/:id/products/:productId` - Remove product from group
  - Returns: Success message

#### Add-On Product Assignment
- `POST /api/addon-groups/:id/addons` - Assign add-on products to group
  - Body: `{ addonProductIds: string[] }`
  - Creates `AddOnProduct` records
  - Returns: Updated group with add-ons

- `DELETE /api/addon-groups/:id/addons/:addonId` - Remove add-on from group
  - Returns: Success message

### Database Queries

**Fetch add-on products for group selection:**
```typescript
const addonProducts = await prisma.product.findMany({
  where: { productType: 'ADDON' },
  select: { id: true, name: true, description: true }
});
```

**Fetch groups with relationships:**
```typescript
const groups = await prisma.addOnGroup.findMany({
  include: {
    addOns: {
      include: { /* product details */ }
    },
    products: {
      include: { product: { select: { id: true, name: true } } }
    }
  }
});
```

---

## UI Requirements

### 1. Add-On Groups Management Card
**Location:** `admin/src/app/components/settings/orders/AddOnGroupsCard.tsx`

**Features:**
- List all add-on groups in a table
- "Create Group" button opens modal/drawer
- Edit/Delete actions for each group
- Display associated product count

**Table Columns:**
- Group Name
- Is Default (badge)
- # of Main Products assigned
- # of Add-on Products in group
- Actions (Edit, Delete)

### 2. Add-On Group Form Modal
**Component:** `admin/src/app/components/settings/orders/AddOnGroupForm.tsx` (new)

**Fields:**
- **Group Name** (text input, required)
- **Is Default** (toggle switch)
- **Add-on Products** (multi-select dropdown)
  - Fetches products where `productType = 'ADDON'`
  - Shows product name + description
  - Allows multiple selections
- **Assign to Products** (multi-select dropdown)
  - Fetches products where `productType = 'MAIN'`
  - Shows which main products will have this group available

**Actions:**
- Save (POST or PUT)
- Cancel

### 3. Integration with Product Form
**Location:** `admin/src/app/components/products/ProductForm.tsx`

**Add new section:** "Add-On Groups"
- Only visible when `productType = 'MAIN'`
- Multi-select dropdown of available add-on groups
- Saves relationships via `ProductAddOnGroup`

### 4. Order Creation Integration
**Location:** `admin/src/app/pages/orders/OrdersPage.tsx`

**Enhancement:**
- When adding a product to an order, fetch its assigned add-on groups
- Display add-on groups below the product selection
- Allow selecting one or more add-ons from each group
- Add selected add-ons as separate line items in the order

---

## Implementation Steps

### Phase 1: Backend API (Priority: High)
1. ✅ Create `/back/src/routes/addon-groups.ts`
2. ✅ Implement all CRUD endpoints for groups
3. ✅ Implement product and add-on assignment endpoints
4. ✅ Add route to Express app in `/back/src/app.ts`
5. ✅ Test endpoints with Postman/Insomnia

### Phase 2: Frontend - Settings UI (Priority: High)
1. ✅ Create `useAddOnGroups` hook for data fetching
2. ✅ Build `AddOnGroupForm` modal component
3. ✅ Implement `AddOnGroupsCard` table with CRUD actions
4. ✅ Add toast notifications for success/error states
5. ✅ Test creating, editing, and deleting groups

### Phase 3: Product Form Integration (Priority: Medium)
1. ✅ Add "Add-On Groups" section to `ProductForm`
2. ✅ Fetch and display available groups
3. ✅ Save group assignments on product create/update
4. ✅ Display currently assigned groups when editing

### Phase 4: Order Creation Integration (Priority: Medium)
1. ✅ Modify order creation flow to fetch product add-on groups
2. ✅ Display add-on selection UI
3. ✅ Add selected add-ons as line items
4. ✅ Update order total calculations

### Phase 5: Testing & Polish (Priority: Low)
1. ✅ Test full workflow: create group → assign products → create order
2. ✅ Add loading states and error handling
3. ✅ Verify database constraints and cascade deletes
4. ✅ Update `Progress_Tracker.markdown`

---

## Data Flow Example

1. **Admin creates add-on group:**
   - Name: "Extras", isDefault: true
   - Add-ons: ["Balloon Add-on", "Card Message", "Vase"]
   - Assigned to: ["Dozen Roses", "Mixed Bouquet"]

2. **Database records created:**
   - `AddOnGroup` record
   - 3 × `AddOnProduct` records linking to add-on products
   - 2 × `ProductAddOnGroup` records linking to main products

3. **POS creates order:**
   - Adds "Dozen Roses" to cart
   - UI shows "Extras" group with 3 add-ons
   - Selects "Balloon Add-on" and "Card Message"
   - Order line items: Dozen Roses + 2 add-ons

---

## Notes

- **Default Groups:** If `isDefault = true`, the group should appear for all main products unless explicitly overridden
- **Validation:** Ensure only products with `productType = 'ADDON'` can be added to groups
- **Order Display:** Add-ons should appear as sub-items under the main product in order views
- **Pricing:** Add-on pricing is handled via existing product pricing system

---

## Files to Create/Modify

### New Files
- `/back/src/routes/addon-groups.ts`
- `/admin/src/app/components/settings/orders/AddOnGroupForm.tsx`
- `/admin/src/hooks/useAddOnGroups.ts`

### Modified Files
- `/back/src/app.ts` (register route)
- `/admin/src/app/components/settings/orders/AddOnGroupsCard.tsx`
- `/admin/src/app/components/products/ProductForm.tsx`
- `/admin/src/app/pages/orders/OrdersPage.tsx`
- `/docs/API_Endpoints.md` (documentation)
- `/docs/Progress_Tracker.markdown` (status update)

---

## Success Criteria

✅ Add-on groups can be created, edited, and deleted via UI
✅ Add-on products (where `productType = 'ADDON'`) can be assigned to groups
✅ Main products can be assigned to add-on groups
✅ Order creation flow displays relevant add-on groups
✅ Selected add-ons appear as line items in orders
✅ API endpoints are documented in `API_Endpoints.md`

---

**Ready for Implementation:** Yes
**Estimated Effort:** 8-12 hours
**Dependencies:** None (schema already exists)

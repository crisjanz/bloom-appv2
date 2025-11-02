# [Feature Name]

**Status:** 🔜 Ready for Implementation
**Created:** YYYY-MM-DD
**Priority:** High | Medium | Low

---

## Overview
[Brief description of what this feature does and why it's needed]

---

## 🤖 Implementation Constraints for AI

**CRITICAL - Read Before Implementing:**

### 1. Required Reading (IN ORDER)
- [ ] `/docs/AI_IMPLEMENTATION_GUIDE.md` ← **READ THIS FIRST**
- [ ] `/docs/System_Reference.md` (architecture context)
- [ ] `/docs/API_Endpoints.md` (existing endpoints)
- [ ] `/CLAUDE.md` (project conventions)

### 2. Pattern Reference Files
Study these files for implementation patterns:
- **Backend route pattern:** `/back/src/routes/[specify-similar-route].ts`
- **Frontend component pattern:** `/admin/src/app/components/[specify-similar-component].tsx`
- **Custom hook pattern:** `/admin/src/shared/hooks/use[SpecifySimilarHook].ts`

### 3. Required Utilities (DO NOT SKIP)
- **Frontend API calls:** MUST use `useApiClient` hook (never `fetch()`)
- **Data fetching:** Create custom hook in `/admin/src/shared/hooks/`
- **Validation:** Use Zod on backend
- **Styling:** Match TailAdmin patterns exactly (see guide)
- **Database:** Use Prisma with proper constraints and cascade deletes

### 4. Testing Requirements
Before marking as complete:
- [ ] All CRUD operations tested
- [ ] Loading states display correctly
- [ ] Error states show user-friendly messages
- [ ] Empty states have helpful text
- [ ] Dark mode works (`dark:` classes included)
- [ ] Price handling correct (cents in DB, dollars in UI)
- [ ] Both servers running without errors

### 5. Documentation Updates Required
- [ ] Add endpoints to `/docs/API_Endpoints.md`
- [ ] Update `/docs/Progress_Tracker.markdown`
- [ ] Archive or delete this feature plan file

### 6. FORBIDDEN Actions
- ❌ Using `fetch()` instead of `useApiClient`
- ❌ Creating new design patterns (use TailAdmin)
- ❌ Skipping input validation or error handling
- ❌ Forgetting to register routes in `/back/src/index.ts`
- ❌ Missing unique constraints in database schema
- ❌ Using wrong data types (float for prices, int for IDs, etc.)

---

## Current State

### ✅ Already Implemented
- [List existing related features or infrastructure]

### 🛠️ Needs Implementation
- [List what needs to be built]

---

## Goals

1. **Goal 1:** [Specific measurable outcome]
2. **Goal 2:** [Another specific outcome]
3. **Goal 3:** [etc.]

---

## Architecture & Endpoints

### Backend API Routes

**File to Create:** `/back/src/routes/[resource-name].ts`

**Pattern Reference:** `/back/src/routes/[specify-similar-file].ts`

#### Endpoints Specification

**List all endpoints with this format:**

---

**GET `/api/resources`**
- **Purpose:** Fetch all resources
- **Query Params:** `?include=relations` (optional)
- **Response:** `200 OK`
  ```typescript
  {
    resources: Array<{
      id: string;
      name: string;
      // ... other fields
    }>
  }
  ```
- **Error:** `500` if database error

---

**POST `/api/resources`**
- **Purpose:** Create new resource
- **Body:**
  ```typescript
  {
    name: string;           // Required
    description?: string;   // Optional
  }
  ```
- **Validation:** Use Zod schema
- **Response:** `201 Created` with created resource
- **Error:** `400` if validation fails, `500` if database error

---

**PUT `/api/resources/:id`**
- **Purpose:** Update existing resource
- **Params:** `id` (UUID)
- **Body:** Same as POST
- **Response:** `200 OK` with updated resource
- **Error:** `404` if not found, `400` if validation fails

---

**DELETE `/api/resources/:id`**
- **Purpose:** Delete resource
- **Params:** `id` (UUID)
- **Validation:** Check for dependent records if applicable
- **Response:** `200 OK` with success message
- **Error:** `404` if not found, `400` if has dependencies

---

### Database Schema

**File to Modify:** `/back/prisma/schema.prisma`

**Required Schema:**

```prisma
model Resource {
  id          String   @id @default(uuid())
  name        String
  description String?

  // Timestamps (REQUIRED)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations (if any)
  categoryId  String
  category    Category @relation(fields: [categoryId], references: [id], onDelete: Cascade)

  // For many-to-many, create join table
  tags        ResourceTag[]
}

// Join table pattern (if many-to-many needed)
model ResourceTag {
  id         String   @id @default(uuid())
  resourceId String
  tagId      String

  resource   Resource @relation(fields: [resourceId], references: [id], onDelete: Cascade)
  tag        Tag      @relation(fields: [tagId], references: [id], onDelete: Cascade)

  // CRITICAL: Prevent duplicates
  @@unique([resourceId, tagId])
}
```

**Migration Commands:**
```bash
npx prisma migrate dev --name add_resource_feature
npx prisma generate
```

---

## UI Requirements

### 1. Main Management Component

**File to Create:** `/admin/src/app/components/[category]/ResourceCard.tsx`

**Pattern Reference:** `/admin/src/app/components/[specify-similar-component].tsx`

**Features Required:**
- Table displaying all resources
- "Create" button opening modal/drawer
- Edit/Delete actions for each row
- Loading spinner during async operations
- Error message display in red text
- Empty state with helpful message
- Dark mode support with `dark:` classes

**Example Structure:**
```typescript
export default function ResourceCard() {
  const { resources, loading, error, refresh } = useResources();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Loading state
  if (loading) return <LoadingSpinner />;

  // Error state
  if (error) return <ErrorMessage message={error} />;

  // Empty state
  if (resources.length === 0) return <EmptyState />;

  return (
    <ComponentCard title="Resources">
      <button onClick={() => setIsModalOpen(true)}>Create Resource</button>
      <table>{/* TailAdmin styled table */}</table>
      {isModalOpen && <ResourceForm onClose={() => setIsModalOpen(false)} />}
    </ComponentCard>
  );
}
```

### 2. Form Component

**File to Create:** `/admin/src/app/components/[category]/ResourceForm.tsx`

**Features Required:**
- Controlled inputs with React state
- Client-side validation
- Loading state during submission
- Error display below form
- Submit/Cancel buttons
- Works for both create and edit modes
- Uses TailAdmin form styling

**Props Interface:**
```typescript
interface ResourceFormProps {
  initialValues?: Resource;  // For edit mode
  onClose: () => void;
  onSuccess?: () => void;
}
```

### 3. Custom Hook

**File to Create:** `/admin/src/shared/hooks/useResources.ts`

**Pattern Reference:** `/admin/src/shared/hooks/useProducts.ts`

**Required Exports:**
```typescript
export interface Resource {
  id: string;
  name: string;
  // ... other fields
}

export function useResources() {
  // State
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // CRITICAL: Use useApiClient, not fetch()
  const apiClient = useApiClient();

  // Fetch function
  const fetchResources = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<Resource[]>('/api/resources');
      setResources(data);
    } catch (err) {
      setError('Failed to load resources');
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  // Auto-fetch on mount
  useEffect(() => { fetchResources(); }, [fetchResources]);

  // CRUD operations
  const createResource = useCallback(async (data: Partial<Resource>) => {
    const created = await apiClient.post<Resource>('/api/resources', data);
    setResources(prev => [...prev, created]);
    return created;
  }, [apiClient]);

  return {
    resources,
    loading,
    error,
    refresh: fetchResources,
    createResource,
    // ... other CRUD methods
  };
}
```

---

## Integration Points

### [Specify Where This Feature Integrates]

**Example:** Product Form Integration

**File to Modify:** `/admin/src/app/components/products/ProductForm.tsx`

**Changes Needed:**
1. Import `useResources` hook
2. Add new section to form UI
3. Save resource IDs on submit
4. Load initial values when editing

**Code Location:** Around line [XXX] in the form component

---

## Implementation Steps (Recommended Order)

### Phase 1: Backend API ⚙️
**Estimated Time:** [X hours]

1. [ ] Create `/back/src/routes/[resource].ts`
   - [ ] Import required dependencies (Router, Zod, Prisma)
   - [ ] Define Zod validation schemas
   - [ ] Implement GET all endpoint
   - [ ] Implement POST create endpoint
   - [ ] Implement PUT update endpoint
   - [ ] Implement DELETE endpoint
   - [ ] Add try-catch error handling to all routes
   - [ ] Test responses with proper status codes

2. [ ] Update database schema (`/back/prisma/schema.prisma`)
   - [ ] Add new model with UUID id
   - [ ] Include createdAt/updatedAt timestamps
   - [ ] Add relations with cascade deletes
   - [ ] Add unique constraints where needed
   - [ ] Run migration: `npx prisma migrate dev --name [name]`
   - [ ] Run: `npx prisma generate`

3. [ ] Register route in `/back/src/index.ts`
   - [ ] Import router at top
   - [ ] Add `app.use(resourceRouter)` after other routes

4. [ ] Test all endpoints
   - [ ] Start backend: `cd back && npm run dev`
   - [ ] Test with curl or Postman
   - [ ] Verify database records created

### Phase 2: Frontend - Custom Hook 🪝
**Estimated Time:** [X hours]

1. [ ] Create `/admin/src/shared/hooks/useResources.ts`
   - [ ] Define TypeScript interface for Resource
   - [ ] Set up state (data, loading, error)
   - [ ] Import and use `useApiClient` ← CRITICAL
   - [ ] Implement fetchResources with useCallback
   - [ ] Auto-fetch on mount with useEffect
   - [ ] Implement create function
   - [ ] Implement update function
   - [ ] Implement delete function
   - [ ] Return all state and functions

2. [ ] Test hook in isolation
   - [ ] Start admin: `cd admin && npm run dev`
   - [ ] Create temporary test component
   - [ ] Verify data loads correctly

### Phase 3: Frontend - UI Components 🎨
**Estimated Time:** [X hours]

1. [ ] Create form component (`/admin/src/app/components/.../ResourceForm.tsx`)
   - [ ] Define props interface
   - [ ] Set up form state with useState
   - [ ] Use useResources hook for CRUD operations
   - [ ] Build form fields with TailAdmin styling
   - [ ] Add validation and error display
   - [ ] Add loading state to submit button
   - [ ] Test create mode
   - [ ] Test edit mode with initialValues

2. [ ] Create management card (`/admin/src/app/components/.../ResourceCard.tsx`)
   - [ ] Use ComponentCard wrapper
   - [ ] Call useResources hook
   - [ ] Show loading spinner when loading=true
   - [ ] Show error message when error is set
   - [ ] Show empty state when no resources
   - [ ] Build TailAdmin styled table
   - [ ] Add "Create" button opening modal
   - [ ] Add Edit/Delete actions per row
   - [ ] Refresh after mutations

3. [ ] Add to appropriate page
   - [ ] Import ResourceCard
   - [ ] Add to page layout
   - [ ] Test navigation

4. [ ] Test complete UI flow
   - [ ] Create new resource
   - [ ] Edit existing resource
   - [ ] Delete resource
   - [ ] Verify loading states
   - [ ] Verify error handling
   - [ ] Test dark mode (toggle in UI)
   - [ ] Check responsive layout

### Phase 4: Integration (if needed) 🔗
**Estimated Time:** [X hours]

1. [ ] Modify [related component file]
   - [ ] Add new section/field
   - [ ] Fetch related data
   - [ ] Save relationships on submit
   - [ ] Display in UI

2. [ ] Test integrated workflow
   - [ ] Verify data flows correctly
   - [ ] Test edge cases

### Phase 5: Documentation & Cleanup 📝
**Estimated Time:** [0.5 hours]

1. [ ] Update `/docs/API_Endpoints.md`
   - [ ] Add new section for your endpoints
   - [ ] Document all routes with request/response formats

2. [ ] Update `/docs/Progress_Tracker.markdown`
   - [ ] Add feature to "Recently Completed" section
   - [ ] List all files created/modified

3. [ ] Archive this feature plan
   - [ ] Move to `/docs/FEATURE_PLANS/archive/` OR
   - [ ] Delete file (if Progress Tracker has details)

4. [ ] Final verification
   - [ ] Restart both servers (backend + admin)
   - [ ] Test complete workflow one more time
   - [ ] Check browser console for errors
   - [ ] Check terminal logs for backend errors

---

## Data Flow Example

**User Story:** [Describe a typical user workflow]

1. **Step 1:** User navigates to [page]
2. **Step 2:** UI calls GET `/api/resources`
3. **Step 3:** Backend queries database with Prisma
4. **Step 4:** Resources displayed in table
5. **Step 5:** User clicks "Create Resource"
6. **Step 6:** Form modal opens with empty fields
7. **Step 7:** User fills form and clicks "Save"
8. **Step 8:** Frontend calls POST `/api/resources`
9. **Step 9:** Backend validates with Zod, creates record
10. **Step 10:** UI refreshes, new resource appears in table

---

## Edge Cases & Validation

### Input Validation
- [ ] [Field name] cannot be empty
- [ ] [Field name] must be valid format
- [ ] [Field name] must be unique
- [ ] [Relationship] must exist before assignment

### Business Rules
- [ ] Cannot delete resource if [condition]
- [ ] Cannot update resource if [condition]
- [ ] [Specific rule for your feature]

### Error Scenarios
- [ ] Network timeout - show retry option
- [ ] Validation failure - show field-specific errors
- [ ] Database constraint violation - show user-friendly message
- [ ] Not found (404) - show "Resource not found"

---

## Notes

- **Performance:** If fetching large datasets, consider pagination
- **Security:** Validate all inputs on backend, not just frontend
- **Accessibility:** Ensure form inputs have proper labels
- **Mobile:** Test on smaller screens
- **Dark Mode:** Always include `dark:` variants in Tailwind classes

---

## Files to Create/Modify

### New Files
- `/back/src/routes/[resource].ts`
- `/admin/src/app/components/[category]/ResourceCard.tsx`
- `/admin/src/app/components/[category]/ResourceForm.tsx`
- `/admin/src/shared/hooks/useResources.ts`

### Modified Files
- `/back/src/index.ts` (register route)
- `/back/prisma/schema.prisma` (database schema)
- `/admin/src/app/pages/[relevant-page].tsx` (add component)
- `/docs/API_Endpoints.md` (documentation)
- `/docs/Progress_Tracker.markdown` (status update)

---

## Success Criteria

**Feature is complete when:**

- ✅ All API endpoints return correct responses
- ✅ Database schema has proper constraints and cascade deletes
- ✅ UI displays all resources with loading/error/empty states
- ✅ Create/Edit/Delete operations work without errors
- ✅ Form validation prevents invalid inputs
- ✅ Dark mode works correctly
- ✅ useApiClient hook is used (not fetch)
- ✅ TailAdmin styling matches existing UI
- ✅ Both servers run without console errors
- ✅ Documentation files updated
- ✅ Feature plan archived/deleted

---

## Estimated Total Effort

**Total:** [X-Y] hours

- Backend: [X] hours
- Frontend Hook: [X] hours
- Frontend UI: [X] hours
- Integration: [X] hours
- Documentation: 0.5 hours

---

**Ready for Implementation:** Yes | No (explain why)

**Dependencies:** [List any blockers or prerequisites]

**Assigned To:** [AI Assistant Name or Human Developer]

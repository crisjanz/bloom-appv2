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

> **⚠️ FOR CODEX/AI ASSISTANTS: You MUST complete the Pre-Implementation Quiz below BEFORE writing any code. Failure to do so will result in implementation that violates repo patterns.**

### 0. Behavior Contract (READ FIRST)

**If You're Tempted To...**
- **"I'll just use `fetch()` because it's faster"** → ❌ **STOP.** Use `useApiClient` hook. No exceptions.
- **"I'll create a new utility function for this"** → ❌ **STOP.** Use existing patterns from reference files.
- **"I'll skip reading that file, I know what to do"** → ❌ **STOP.** Answer quiz questions to prove you read it.
- **"I'll write the backend from scratch"** → ❌ **STOP.** Copy the starter boilerplate provided.
- **"I'll test everything at the end"** → ❌ **STOP.** Follow micro-steps with validation checkpoints.

**Expected Response Format After Implementation:**
```markdown
### Implementation Summary
- [ ] Files created: (list with line counts)
- [ ] Files modified: (list with specific changes)
- [ ] Routes registered: (list endpoints)
- [ ] Quiz answers: (show you completed section 1)
- [ ] Tests performed: (list what you tested)
```

---

### 1. Pre-Implementation Quiz (MANDATORY)

**🚨 YOU MUST ANSWER THESE BEFORE WRITING CODE 🚨**

#### Question 1: API Client Pattern
**Read:** `/admin/src/shared/hooks/useApiClient.ts` (entire file)
**Question:** What hook MUST you use for all API calls in the frontend?
**Answer:** `_____________`
**What you should answer:** `useApiClient` - returns `{ data, status }` format

#### Question 2: Response Format
**Read:** `/admin/src/shared/hooks/useApiClient.ts` (lines 20-40)
**Question:** When you call `apiClient.get('/api/resources')`, what shape does the response have?
**Answer:** `{ data: ___, status: ___ }`
**What you should answer:** `{ data: T, status: number }` where T is your type

#### Question 3: Database Money Pattern
**Read:** `/back/prisma/schema.prisma` (search for "Int" fields related to price/amount)
**Question:** How are monetary values stored in the database?
**Answer:** As `_______` in `_______` (type and units)
**What you should answer:** As `Int` in `cents`

#### Question 4: Route Registration
**Read:** `/back/src/index.ts` (lines where routers are registered)
**Question:** After creating a route file, where do you register it?
**Answer:** File: `___________` Pattern: `app.use(___________)`
**What you should answer:** File: `/back/src/index.ts`, Pattern: `app.use('/api/[resource]', [resource]Router)`

#### Question 5: Validation Pattern
**Read:** Any `/back/src/routes/*.ts` file with a POST endpoint
**Question:** What library is used for backend validation?
**Answer:** `_______`
**What you should answer:** `Zod` with `.parse()` method

**✅ CHECKPOINT:** Before proceeding, write your answers to all 5 questions. Show them in your response.

---

### 2. Required Reading (IN ORDER)
- [ ] `/docs/AI_IMPLEMENTATION_GUIDE.md` ← **READ THIS FIRST**
- [ ] `/docs/System_Reference.md` (architecture context)
- [ ] `/docs/API_Endpoints.md` (existing endpoints)
- [ ] `/CLAUDE.md` (project conventions)

### 3. Pattern Reference Files
**Study these files for implementation patterns:**
- **Backend route pattern:** `/back/src/routes/[specify-similar-route].ts`
- **Frontend component pattern:** `/admin/src/app/components/[specify-similar-component].tsx`
- **Custom hook pattern:** `/admin/src/shared/hooks/use[SpecifySimilarHook].ts`

**DO NOT write from scratch. COPY patterns from these files.**

### 4. Anti-Pattern Examples (NEVER DO THIS)

#### ❌ WRONG: Using fetch() directly
```typescript
// NEVER DO THIS
const response = await fetch('/api/resources');
const data = await response.json();
```

#### ✅ CORRECT: Using useApiClient hook
```typescript
// ALWAYS DO THIS
const apiClient = useApiClient();
const response = await apiClient.get('/api/resources');
const data = response.data;
```

---

#### ❌ WRONG: Float for prices
```prisma
model Product {
  price Float  // WRONG
}
```

#### ✅ CORRECT: Int in cents
```prisma
model Product {
  priceInCents Int  // CORRECT
}
```

---

#### ❌ WRONG: Not using cascade deletes
```prisma
model Product {
  categoryId String
  category   Category @relation(fields: [categoryId], references: [id])
  // Missing onDelete: Cascade
}
```

#### ✅ CORRECT: With cascade delete
```prisma
model Product {
  categoryId String
  category   Category @relation(fields: [categoryId], references: [id], onDelete: Cascade)
}
```

---

### 5. Required Utilities (DO NOT SKIP)
- **Frontend API calls:** MUST use `useApiClient` hook (never `fetch()`)
- **Data fetching:** Create custom hook in `/admin/src/shared/hooks/`
- **Validation:** Use Zod on backend
- **Styling:** Match TailAdmin patterns exactly (see guide)
- **Database:** Use Prisma with proper constraints and cascade deletes

### 6. Testing Requirements
Before marking as complete:
- [ ] All CRUD operations tested
- [ ] Loading states display correctly
- [ ] Error states show user-friendly messages
- [ ] Empty states have helpful text
- [ ] Dark mode works (`dark:` classes included)
- [ ] Price handling correct (cents in DB, dollars in UI)
- [ ] Both servers running without errors

### 7. Documentation Updates Required
- [ ] Add endpoints to `/docs/API_Endpoints.md`
- [ ] Update `/docs/Progress_Tracker.markdown`
- [ ] Archive or delete this feature plan file

### 8. FORBIDDEN Actions
- ❌ Using `fetch()` instead of `useApiClient`
- ❌ Creating new design patterns (use TailAdmin)
- ❌ Skipping input validation or error handling
- ❌ Forgetting to register routes in `/back/src/index.ts`
- ❌ Missing unique constraints in database schema
- ❌ Using wrong data types (float for prices, int for IDs, etc.)
- ❌ Writing code without answering the quiz first
- ❌ Implementing everything at once without checkpoints

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

## Copy-Paste Starter Code

### Backend Route Boilerplate
**DO NOT write from scratch. Copy this template:**

```typescript
import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';

const router = Router();

// Validation schema
const resourceSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  // Add other fields here
});

// GET /api/resources - Fetch all
router.get('/', async (req, res) => {
  try {
    const resources = await prisma.resource.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(resources);
  } catch (error) {
    console.error('Error fetching resources:', error);
    res.status(500).json({ error: 'Failed to fetch resources' });
  }
});

// POST /api/resources - Create new
router.post('/', async (req, res) => {
  try {
    const validatedData = resourceSchema.parse(req.body);
    const resource = await prisma.resource.create({
      data: validatedData
    });
    res.status(201).json(resource);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error creating resource:', error);
    res.status(500).json({ error: 'Failed to create resource' });
  }
});

// PUT /api/resources/:id - Update
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = resourceSchema.parse(req.body);
    const resource = await prisma.resource.update({
      where: { id },
      data: validatedData
    });
    res.json(resource);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error updating resource:', error);
    res.status(500).json({ error: 'Failed to update resource' });
  }
});

// DELETE /api/resources/:id - Delete
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.resource.delete({ where: { id } });
    res.json({ message: 'Resource deleted successfully' });
  } catch (error) {
    console.error('Error deleting resource:', error);
    res.status(500).json({ error: 'Failed to delete resource' });
  }
});

export default router;
```

---

## Implementation Steps (Recommended Order)

### Phase 1: Backend API ⚙️
**Estimated Time:** [X hours]

#### Step 1.1: Create Route File (5-10 min)
1. [ ] Create `/back/src/routes/[resource].ts`
2. [ ] **COPY** the starter boilerplate from above (DO NOT write from scratch)
3. [ ] Replace `resource` with your actual model name
4. [ ] Update validation schema with your fields
5. [ ] **CHECKPOINT:** Run `cd back && npx tsc --noEmit`
6. [ ] **MUST SEE:** 0 TypeScript errors
7. [ ] **🛑 STOP:** Show me the file before continuing

#### Step 1.2: Update Database Schema (5-10 min)
1. [ ] Open `/back/prisma/schema.prisma`
2. [ ] Add your model (use UUID, timestamps, cascade deletes)
3. [ ] Add unique constraints where needed
4. [ ] **CHECKPOINT:** Run `npx prisma format`
5. [ ] **MUST SEE:** File formatted without errors
6. [ ] Run migration: `npx prisma migrate dev --name add_[resource]_feature`
7. [ ] Run: `npx prisma generate`
8. [ ] **CHECKPOINT:** Both commands succeed
9. [ ] **🛑 STOP:** Show me the schema model before continuing

#### Step 1.3: Register Route (2 min)
1. [ ] Open `/back/src/index.ts`
2. [ ] Import router: `import resourceRouter from './routes/[resource]';`
3. [ ] Register BEFORE the wildcard route: `app.use('/api/resources', resourceRouter);`
4. [ ] **CHECKPOINT:** Run `cd back && npm run dev`
5. [ ] **MUST SEE:** Server starts on port 4000 without errors
6. [ ] **🛑 STOP:** Show me the index.ts changes before continuing

#### Step 1.4: Test Backend Endpoints (10 min)
1. [ ] Start backend: `cd back && npm run dev`
2. [ ] Test GET: `curl http://localhost:4000/api/resources`
3. [ ] Test POST: `curl -X POST http://localhost:4000/api/resources -H "Content-Type: application/json" -d '{"name":"Test"}'`
4. [ ] Test PUT: `curl -X PUT http://localhost:4000/api/resources/[id] -H "Content-Type: application/json" -d '{"name":"Updated"}'`
5. [ ] Test DELETE: `curl -X DELETE http://localhost:4000/api/resources/[id]`
6. [ ] **CHECKPOINT:** All endpoints return correct status codes
7. [ ] **MUST SEE:** 200/201 responses, data in database
8. [ ] **🛑 STOP:** Show me test results before continuing to frontend

### Custom Hook Boilerplate
**Pattern Reference:** Copy from `/admin/src/shared/hooks/useProducts.ts`

```typescript
import { useState, useEffect, useCallback } from 'react';
import { useApiClient } from './useApiClient';

export interface Resource {
  id: string;
  name: string;
  // Add other fields
  createdAt: string;
  updatedAt: string;
}

export function useResources() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // CRITICAL: Use useApiClient, not fetch()
  const apiClient = useApiClient();

  const fetchResources = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/api/resources');
      setResources(response.data);
    } catch (err) {
      setError('Failed to load resources');
      console.error('Error fetching resources:', err);
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  const createResource = useCallback(async (data: Partial<Resource>) => {
    const response = await apiClient.post('/api/resources', data);
    setResources(prev => [...prev, response.data]);
    return response.data;
  }, [apiClient]);

  const updateResource = useCallback(async (id: string, data: Partial<Resource>) => {
    const response = await apiClient.put(`/api/resources/${id}`, data);
    setResources(prev => prev.map(r => r.id === id ? response.data : r));
    return response.data;
  }, [apiClient]);

  const deleteResource = useCallback(async (id: string) => {
    await apiClient.delete(`/api/resources/${id}`);
    setResources(prev => prev.filter(r => r.id !== id));
  }, [apiClient]);

  return {
    resources,
    loading,
    error,
    refresh: fetchResources,
    createResource,
    updateResource,
    deleteResource,
  };
}
```

---

### Phase 2: Frontend - Custom Hook 🪝
**Estimated Time:** [X hours]

#### Step 2.1: Create Custom Hook (10-15 min)
1. [ ] Create `/admin/src/shared/hooks/useResources.ts`
2. [ ] **COPY** the custom hook boilerplate from above
3. [ ] Update `Resource` interface with your fields
4. [ ] Update all API paths to match your backend
5. [ ] **CHECKPOINT:** Run `cd admin && npx tsc --noEmit`
6. [ ] **MUST SEE:** 0 TypeScript errors
7. [ ] **🛑 STOP:** Show me the hook file before continuing

#### Step 2.2: Test Hook (5 min)
1. [ ] Start both servers: `cd back && npm run dev` and `cd admin && npm run dev`
2. [ ] Open browser to http://localhost:5173
3. [ ] Open browser console (F12)
4. [ ] Temporarily test hook by importing in an existing component
5. [ ] **CHECKPOINT:** Check network tab for API calls
6. [ ] **MUST SEE:** GET request to `/api/resources` succeeds
7. [ ] **🛑 STOP:** Show me the test results before continuing

---

### Phase 3: Frontend - UI Components 🎨
**Estimated Time:** [X hours]

#### Step 3.1: Create Management Card Component (20-30 min)
1. [ ] Create `/admin/src/app/components/[category]/ResourceCard.tsx`
2. [ ] **COPY** pattern from similar component (e.g., `/admin/src/app/components/products/ProductCard.tsx`)
3. [ ] Import your `useResources` hook
4. [ ] Implement loading state (show spinner)
5. [ ] Implement error state (show error message)
6. [ ] Implement empty state (show helpful message)
7. [ ] Build table with TailAdmin classes
8. [ ] Add "Create" button
9. [ ] Add Edit/Delete buttons per row
10. [ ] **CHECKPOINT:** Run `cd admin && npx tsc --noEmit`
11. [ ] **MUST SEE:** 0 TypeScript errors
12. [ ] **🛑 STOP:** Show me the component before continuing

#### Step 3.2: Create Form Component (20-30 min)
1. [ ] Create `/admin/src/app/components/[category]/ResourceForm.tsx`
2. [ ] **COPY** pattern from similar form (e.g., `/admin/src/app/components/products/ProductForm.tsx`)
3. [ ] Define props interface (with `initialValues?` for edit mode)
4. [ ] Set up form state with `useState`
5. [ ] Use your `useResources` hook
6. [ ] Build form fields with TailAdmin classes
7. [ ] Add validation and error display
8. [ ] Add loading state to submit button
9. [ ] Handle both create and edit modes
10. [ ] **CHECKPOINT:** Run `cd admin && npx tsc --noEmit`
11. [ ] **MUST SEE:** 0 TypeScript errors
12. [ ] **🛑 STOP:** Show me the form component before continuing

#### Step 3.3: Integrate into Page (5-10 min)
1. [ ] Open the appropriate page file (e.g., `/admin/src/app/pages/settings/SettingsPage.tsx`)
2. [ ] Import your `ResourceCard` component
3. [ ] Add to page layout
4. [ ] **CHECKPOINT:** Save and check browser at http://localhost:5173
5. [ ] **MUST SEE:** Component renders without errors
6. [ ] **🛑 STOP:** Show me the page integration before continuing

#### Step 3.4: Test Complete UI Flow (15-20 min)
1. [ ] Test creating a new resource
   - [ ] Click "Create" button
   - [ ] Fill form
   - [ ] Submit
   - [ ] Verify appears in table
2. [ ] Test editing a resource
   - [ ] Click edit button
   - [ ] Modify fields
   - [ ] Submit
   - [ ] Verify updates in table
3. [ ] Test deleting a resource
   - [ ] Click delete button
   - [ ] Verify removes from table
4. [ ] Test loading states
   - [ ] Check spinner appears while loading
5. [ ] Test error handling
   - [ ] Stop backend server
   - [ ] Try to fetch data
   - [ ] Verify error message displays
6. [ ] Test dark mode
   - [ ] Toggle dark mode in UI
   - [ ] Verify component looks correct
7. [ ] Test empty state
   - [ ] Delete all resources
   - [ ] Verify empty state message shows
8. [ ] **CHECKPOINT:** All tests pass
9. [ ] **🛑 STOP:** Show me test results summary

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

#### Step 5.1: Update API Documentation (10 min)
1. [ ] Open `/docs/API_Endpoints.md`
2. [ ] Add new section for your feature
3. [ ] Document all endpoints with:
   - [ ] Method and path
   - [ ] Request body format
   - [ ] Response format
   - [ ] Error cases
4. [ ] **🛑 STOP:** Show me the documentation additions

#### Step 5.2: Update Progress Tracker (5 min)
1. [ ] Open `/docs/Progress_Tracker.markdown`
2. [ ] Add feature to "Recently Completed" section
3. [ ] List all files created
4. [ ] List all files modified
5. [ ] **🛑 STOP:** Show me the progress tracker update

#### Step 5.3: Archive Feature Plan (2 min)
1. [ ] Move this file to `/docs/FEATURE_PLANS/archive/` OR
2. [ ] Delete file (if Progress Tracker has sufficient details)

#### Step 5.4: Final Verification (10 min)
1. [ ] Stop both servers
2. [ ] Restart backend: `cd back && npm run dev`
3. [ ] Restart admin: `cd admin && npm run dev`
4. [ ] Test complete workflow one more time
5. [ ] Check browser console (F12) for errors
6. [ ] Check terminal logs for backend errors
7. [ ] **CHECKPOINT:** No errors in console or terminal
8. [ ] **MUST SEE:** Feature works end-to-end

---

## Required Response Format After Implementation

**You MUST provide this summary when implementation is complete:**

```markdown
### Implementation Summary

#### Quiz Answers (Proof of Reading)
- Q1: `useApiClient`
- Q2: `{ data: T, status: number }`
- Q3: `Int` in `cents`
- Q4: `/back/src/index.ts` with `app.use('/api/[resource]', router)`
- Q5: `Zod` with `.parse()`

#### Files Created
- `/back/src/routes/[resource].ts` (150 lines)
- `/admin/src/shared/hooks/useResources.ts` (80 lines)
- `/admin/src/app/components/[category]/ResourceCard.tsx` (120 lines)
- `/admin/src/app/components/[category]/ResourceForm.tsx` (100 lines)

#### Files Modified
- `/back/src/index.ts` - Added route registration
- `/back/prisma/schema.prisma` - Added Resource model
- `/admin/src/app/pages/[page].tsx` - Integrated ResourceCard
- `/docs/API_Endpoints.md` - Added endpoint documentation
- `/docs/Progress_Tracker.markdown` - Added feature to completed section

#### Routes Registered
- `GET /api/resources` - Fetch all
- `POST /api/resources` - Create new
- `PUT /api/resources/:id` - Update existing
- `DELETE /api/resources/:id` - Delete

#### Tests Performed
- [x] Backend TypeScript compiles without errors
- [x] All CRUD endpoints tested with curl
- [x] Frontend TypeScript compiles without errors
- [x] Create resource works in UI
- [x] Edit resource works in UI
- [x] Delete resource works in UI
- [x] Loading states display correctly
- [x] Error states display correctly
- [x] Empty state displays correctly
- [x] Dark mode works correctly
- [x] Both servers run without errors

#### Migration Commands Run
```bash
npx prisma migrate dev --name add_[resource]_feature
npx prisma generate
```

#### Known Issues
[List any issues or limitations, or write "None"]

#### Next Steps
[List any follow-up work needed, or write "Feature complete"]
```

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

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

> **⚠️ FOR AI ASSISTANTS: You MUST read the required documentation before writing code. Follow existing patterns exactly.**

### Required Reading (IN ORDER)
1. `/docs/AI_IMPLEMENTATION_GUIDE.md` ← **READ THIS FIRST** (all patterns: API routes, hooks, WebSocket, R2, batch ops)
2. `/docs/System_Reference.md` (architecture context)
3. `/docs/API_Endpoints.md` (existing endpoints)
4. `/CLAUDE.md` (project conventions)

### Pattern Reference Files
**Study these files for implementation patterns:**
- **Backend route pattern:** `/back/src/routes/[specify-similar-route].ts`
- **Frontend component pattern:** `/admin/src/app/components/[specify-similar-component].tsx`
- **Custom hook pattern:** `/admin/src/shared/hooks/use[SpecifySimilarHook].ts`

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

### Pre-Implementation Contract (Required — Answer Before Coding)

Provide a short implementation contract (bullets):
- **Goals → Changes mapping**: Map each Goal to the specific code changes/files.
- **Files to touch (exact paths)**: List every file you will create/modify.
- **Backend surface area**: Endpoints to add/modify + where they are registered.
- **DB/migrations**: Prisma schema changes + migration name you will run.
- **UI standards confirmation**: Confirm you will follow shared UI patterns (StandardTable/DatePicker/shared Modal + form components) and `value={x || ''}`.
- **Unknowns / questions**: If anything is ambiguous, ask now — do not start coding.

### Critical Don'ts
❌ Use `fetch()` directly → Use `useApiClient` hook
❌ Store prices as floats → Use integers in cents
❌ Skip cascade deletes → Add `onDelete: Cascade`
❌ Forget route registration → Register in `/back/src/index.ts`
❌ Skip migrations → Run `npx prisma migrate dev --name feature_name`

### Frontend/UI Critical Don'ts (Project Standards)
❌ Build custom tables / table HTML → Use `StandardTable`
❌ Use `<input type="date">` → Use `DatePicker` from `@shared/ui/forms/date-picker`
❌ Use raw `<input>`, `<select>`, `<textarea>` → Use shared form components (`InputField`, `Select`, `Label`, etc.)
❌ Create custom modals/overlays (`fixed inset-0 ...`) → Use shared `Modal` from `@shared/ui/components/ui/modal`
❌ Allow null/undefined input values → Always use `value={x || ''}`
❌ Use emojis in user-facing UI → Use Heroicons / existing icon library from `@shared/assets/icons`

---

## Goals
[List 2-4 specific, measurable outcomes this feature achieves]

1. [Goal 1]
2. [Goal 2]
3. [Goal 3]

---

## Architecture & Endpoints

### Backend API Routes

**File:** `/back/src/routes/[resource-name].ts`

**Endpoints:**
- `GET /api/[resource]` — List all
- `GET /api/[resource]/:id` — Get single
- `POST /api/[resource]` — Create new
- `PATCH /api/[resource]/:id` — Update existing
- `DELETE /api/[resource]/:id` — Delete

### Database Schema

**Models to create/modify:**

```prisma
model ResourceName {
  id        String   @id @default(uuid())
  name      String
  // Add fields here

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([field]) // Add indexes as needed
}
```

**Migration command:**
```bash
npx prisma migrate dev --name add_resource_name
```

---

## UI Requirements

### Frontend Components

**Location:** `/admin/src/app/components/[feature]/`

**Components needed:**
1. **[Resource]Card.tsx** — Main container component
2. **[Resource]Form.tsx** — Form for create/edit
3. **[Resource]List.tsx** — Display list of items
4. **[Resource]Modal.tsx** — Modal for actions (if needed)

**Custom Hook:**
- **File:** `/admin/src/shared/hooks/use[Resource].ts`
- **Exports:** `{ resources, loading, error, createResource, updateResource, deleteResource, refresh }`

### User Flow
1. [Step 1 of user interaction]
2. [Step 2]
3. [Step 3]

### Mobile Responsiveness
- Ensure responsive on screens 375px+
- Use TailAdmin responsive utilities (`sm:`, `md:`, `lg:`)
- Test on mobile breakpoints

---

## Implementation Checklist

### Phase 1: Backend
- [ ] Create Prisma schema changes
- [ ] Run migration: `npx prisma migrate dev --name feature_name`
- [ ] Create route file `/back/src/routes/[resource].ts`
- [ ] Add Zod validation schemas
- [ ] Implement CRUD endpoints
- [ ] Register route in `/back/src/index.ts`
- [ ] Test endpoints with curl/Postman

### Phase 2: Frontend Data Layer
- [ ] Create custom hook `/admin/src/shared/hooks/use[Resource].ts`
- [ ] Add TypeScript interfaces
- [ ] Implement useApiClient integration
- [ ] Add loading/error states

### Phase 3: UI Components
- [ ] Create component files
- [ ] Build forms with validation
- [ ] Add loading/error/empty states
- [ ] Implement responsive layout
- [ ] Test user flows

### Phase 4: Integration & Testing
- [ ] Test all CRUD operations
- [ ] Verify dark mode support
- [ ] Check mobile responsiveness
- [ ] Validate error handling
- [ ] Test edge cases

### Phase 5: Documentation
- [ ] Update `/docs/API_Endpoints.md`
- [ ] Update `/docs/Progress_Tracker.markdown`
- [ ] Archive this feature plan
- [ ] Verify no broken references

---

## Data Flow

**Create Flow:**
```
User Input → Form Validation → useResource.create()
  → apiClient.post('/api/resource')
  → Zod validation
  → Prisma.create()
  → Response
```

**Read Flow:**
```
Component Mount → useResource()
  → apiClient.get('/api/resources')
  → Prisma.findMany()
  → setState(resources)
```

---

## Edge Cases & Validation

### Input Validation
- [Required field validations]
- [Format validations (email, phone, etc.)]
- [Range validations]

### Business Rules
- [Any business logic constraints]
- [Relationships that must be maintained]

### Error Scenarios
- Empty state handling
- Network errors
- Validation errors
- 404 handling for not found

---

## Files to Create/Modify

### New Files
```
/back/src/routes/[resource].ts              (~200 lines)
/admin/src/shared/hooks/use[Resource].ts    (~150 lines)
/admin/src/app/components/[feature]/[Resource]Card.tsx  (~100 lines)
/admin/src/app/components/[feature]/[Resource]Form.tsx  (~150 lines)
```

### Modified Files
```
/back/src/index.ts                  (add route registration)
/back/prisma/schema.prisma          (add models)
/docs/API_Endpoints.md             (add endpoint documentation)
/docs/Progress_Tracker.markdown    (mark as completed)
```

---

## Success Criteria

- [ ] All CRUD operations work correctly
- [ ] Data persists to database
- [ ] Loading states display during API calls
- [ ] Error messages show on failures
- [ ] Empty state displays when no data
- [ ] Mobile responsive (375px+)
- [ ] Dark mode supported
- [ ] No console errors
- [ ] Documentation updated

---

## Implementation Notes

**Estimated Effort:** [X hours/days]

**Dependencies:**
- [List any features this depends on]
- [List any blockers]

**Testing Strategy:**
- Manual testing in dev environment
- Verify all user flows
- Test edge cases and error scenarios

**Deployment Notes:**
- Migration will run automatically on Render deploy
- No environment variable changes needed (or list if needed)

---

## Post-Implementation

After completing implementation:

### Plan-to-Diff Verification (Required)

Before claiming the feature is done, provide:
- **Success Criteria → Evidence mapping**: For each Success Criterion, point to the exact file/component/route where it is satisfied.
- **Tests run**: List the exact commands you ran and the results.
- **Checklist audit**: Note any checklist items you skipped and why.
- **Git push**: Do **NOT** run `git push` automatically — ask Cris for confirmation.

1. **Verify:**
   - All success criteria met
   - Documentation updated
   - No broken references

2. **Update:**
   - Mark feature as ✅ Completed in Progress_Tracker
   - **REQUIRED**: Move this file to `/docs/FEATURE_PLANS/archive/` after all checklist items are verified.

3. **Deploy:**
   - Commit with message: "feat: [feature description]"
   - Push to trigger deployment (ask for confirmation first)
   - Verify in staging environment

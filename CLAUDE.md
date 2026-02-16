# Bloom App - Claude Code Instructions

## 👤 Working with Cristian
- **Communication style**: Concise, technical, no filler. Show code, explain only if asked.
- **Decision-making**: When changing established patterns or architecture, ASK first with 2 options briefly presented.
- **Context continuity**: If uncertain about past decisions, search episodic memory before suggesting alternatives.
- **Session transitions**: Before major refactors or pattern changes, suggest: "Should I note this change for future sessions?"
- **Git workflow**: ALWAYS ask before `git push`. User may have additional changes pending.
- **No apologies or preambles** unless something actually went wrong.
- **Background**: 15+ years cabinetry, self-taught developer, owns flower shop (In Your Vase Flowers). Prefers learning by doing.
- **"Create a plan"**: When asked to create a plan, write a feature plan file to `/docs/FEATURE_PLANS/` using the template at `/docs/FEATURE_PLANS/_TEMPLATE.md`. Do NOT implement it — Codex handles implementation. Only implement if explicitly asked.

---

## 🏷️ Naming Convention
- **"Bloom"** = the POS software name ("Bloom POS"), NOT the flower shop.
- **The flower shop** = "In Your Vase Flowers" (stored in `ShopSettings` in the database).
- All user-facing UI should pull the shop name from `ShopSettings`, never hardcode "Bloom" as the shop name.
- If you encounter hardcoded "Bloom" referring to the shop (not the POS), replace it with a dynamic `ShopSettings` lookup or the correct shop name.
- Acceptable: "Bloom POS", "Bloom App" (referring to the software). Not acceptable: "Bloom Flower Shop", "Bloom" as the business name in UI.

---

## 💰 Cost Optimization - CRITICAL
**Context accumulation is EXPENSIVE. Minimize token usage aggressively.**

### NEVER Do These (High Token Cost):
- ❌ **NEVER run servers** (`npm run dev`, `npm start`, etc.) - Ask user to run them
- ❌ **NEVER use background tasks** unless absolutely critical - They accumulate output tokens
- ❌ **NEVER read large files** (>500 lines) unless explicitly needed for the task
- ❌ **NEVER search episodic memory** unless user asks or you're truly stuck
- ❌ **NEVER read multiple files speculatively** - Only read what you need RIGHT NOW
- ❌ **NEVER re-read files** you've already seen in this conversation
- ❌ **NEVER use Task/Agent tools** for simple searches - Use Grep/Glob directly

### ALWAYS Do These (Low Token Cost):
- ✅ **ASK user to run commands** instead of using Bash tool when possible
- ✅ **Use Grep/Glob** for searches instead of reading entire files
- ✅ **Read only specific line ranges** when files are large (use offset/limit)
- ✅ **Keep responses SHORT** - Code + 1 sentence explanation maximum
- ✅ **Suggest user compact conversation** when context grows (every 50+ messages)

### Cost Awareness:
- Each message re-sends ENTIRE conversation context (~$0.15-0.30 per interaction at current context size)
- Large file reads add to EVERY future request in this conversation
- Background tasks accumulate output that gets sent with EVERY request
- Episodic memory searches load entire past conversations

**User prefers: Fast, cheap, direct answers over thorough exploration.**

---

## 🔧 Behavior Rules
- Be concise and technical. Avoid filler text or long explanations.
- When asked to **edit**, directly modify code or Markdown.
- When asked to **analyze**, summarize findings in ≤150 words.
- Never repeat entire files unless explicitly requested.
- Treat all `/docs/*.md` paths as live documentation – fetch them only when relevant.
- Assume the working timezone is `America/Vancouver`.
- Default stack: **React 19 + Vite 6 (admin)**, **Express + Prisma + PostgreSQL (back)**.
- Language: TypeScript for both front- and backend.
- **UI Icons**: NEVER use emojis (📷 🔗 ✅ etc.) in user-facing UI. Always use Heroicons or existing icon library from `@shared/assets/icons`.
- **Git Workflow**: ALWAYS ask user before running `git push`. Wait for confirmation. User may have additional changes.
- **Opportunistic refactoring**: When working on a large file (500+ lines), if the section being modified can be easily extracted into its own file/component/hook without breaking anything, do it. Don't refactor unrelated sections — only what you're already touching.

---

## 🗂️ Repository Overview
| Area | Path | Description |
|------|------|-------------|
| **Admin (frontend)** | `admin/src/` | TailAdmin-based React SPA for POS & operations. |
| **Backend (API)** | `back/src/` | Express + Prisma API under `/api/*`. |
| **Customer website** | `www/` | TailGrids-based React SPA storefront, wired to live APIs (auth, catalog, cart, checkout, gift cards, profiles). |
| **Docs** | `/docs/` | All technical + planning documentation. |

---

## 🚀 Deployment & Environments
- **Local development**: `npm run dev` in respective directories (back/:4000, admin/:5173, www/:5175)
- **Staging/Testing**: Render.com (backend) + Cloudflare Pages (frontend) - **NOT production, just another test environment**
- **Production (future)**: Will be separate domain, deployed only when fully ready for customers
- **Current phase**: All development is pre-production testing. No live customers yet.

---

## 🎨 Standard UI Patterns for List Pages

**ALL list/table pages MUST follow this standardized layout:**

```tsx
<div className="p-6">
  <PageBreadcrumb />

  {/* Header - OUTSIDE card */}
  <div className="flex items-center justify-between mb-6">
    <div>
      <h1 className="text-2xl font-semibold">Title</h1>
      <p className="text-sm text-gray-500">Description</p>
    </div>
    <Link to="..." className="bg-brand-500 hover:bg-brand-600 ...">
      + Add Item
    </Link>
  </div>

  {/* Card with Filters + Table - INSIDE card */}
  <ComponentCard>
    <Filters /> {/* if needed */}
    <StandardTable columns={...} data={...} pagination={...} />
  </ComponentCard>
</div>
```

**Required components:**
- `StandardTable` for all tables (no custom table HTML)
- `DatePicker` from `@shared/ui/forms/date-picker` (NEVER `<input type="date">`)
- Status with colored dots: `<span className="text-2xl ${color}">•</span> <span>{text}</span>`
- Actions with icons (Eye, Pencil, Trash) - NO text links
- Pagination always visible (even "Page 1 of 1")
- `getOrderStatusColor()` from `@shared/utils/statusColors` for consistent status colors

---

## 📝 Standard Form & Modal Patterns

**ALL forms and modals MUST use shared components:**

### Shared Components

**Input Components:**
- `InputField` from `@shared/ui/forms/input/InputField` - Use for ALL text/number/email inputs
- `PhoneInput` from `@shared/ui/forms/PhoneInput` - **Use for ALL phone number inputs** (auto-formats display, saves digits only)
- `Select` from `@shared/ui/forms/Select` - Use for dropdowns
- `DatePicker` from `@shared/ui/forms/date-picker` - Use for date selection
- `Label` from `@shared/ui/forms/Label` - Use for textarea labels (InputField/Select have built-in labels)
- NEVER use raw `<input>`, `<select>`, or `<input type="date">`
- NEVER use `InputField` with `type="tel"` - always use `PhoneInput` instead

**IMPORTANT - Null/Undefined Values:**
- **ALWAYS** use `|| ''` for all input values to prevent null/undefined errors
- Example: `value={formData.firstName || ''}` NOT `value={formData.firstName}`
- React throws warnings when input values are null/undefined
- This applies to InputField, textarea, and all form inputs

**Button Components:**
- `LoadingButton` from `@shared/ui/components/ui/button/LoadingButton` - Buttons with loading states
- `FormFooter` from `@shared/ui/components/ui/form/FormFooter` - Standard Cancel/Save button layout

**Inline Dismiss/Delete Buttons (X icon on list items):**
- Standard class: `p-1 rounded-full text-red-400 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors`
- Icon: `<svg className="w-4 h-4">` with X path `d="M6 18L18 6M6 6l12 12"`
- Use for: removing items from lists, dismissing notifications, deleting inline entries
- Do NOT use for modal close buttons (those use the shared Modal component)

**Error Display:**
- `FormError` from `@shared/ui/components/ui/form/FormError` - Standardized error messages

**Success Feedback (Toast Notifications):**
- `import { toast } from 'sonner'` - **Use for ALL save/submit success feedback**
- **EVERY save/submit handler MUST show a toast on success**: `toast.success('Customer saved')`
- **EVERY save/submit handler MUST show a toast on error**: `toast.error('Failed to save customer')`
- Keep messages short and specific (e.g., "Settings saved", "Order updated", "Address deleted")
- NEVER use `alert()` for success/error feedback
- NEVER leave save handlers without user-visible success confirmation
- `<Toaster />` is already mounted in `App.tsx` - do not add it again

**Modal Components:**
- `Modal` from `@shared/ui/components/ui/modal` - **Use for ALL modals**
- NEVER create custom modal wrappers with `fixed inset-0` divs
- NEVER use `bg-black/50` or `bg-gray-900/50` - Modal component handles background

### Modal Pattern

**IMPORTANT - ALL modals MUST use the shared Modal component**

```tsx
import { Modal } from '@shared/ui/components/ui/modal';

<Modal
  isOpen={isModalOpen}
  onClose={handleClose}
  className="max-w-2xl"  // optional: customize width/height
>
  <div className="p-6">
    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
      Modal Title
    </h2>
    {/* Modal content */}
  </div>
</Modal>
```

**What Modal component provides:**
- **Background overlay**: `bg-black/40 backdrop-blur-[3px]` (dark transparent with subtle blur)
- **Large close button**: Top-right corner with hover effects
- **Responsive**: Centers on screen, handles overflow
- **Dark mode**: Automatic dark mode support
- **Keyboard**: ESC key closes modal
- **Body scroll lock**: Prevents background scrolling

**DO NOT:**
- ❌ Create custom `<div className="fixed inset-0 bg-black/50">` wrappers
- ❌ Build custom close buttons (use Modal's built-in)
- ❌ Use different background opacities across modals
- ❌ Handle ESC key or click-outside manually

### Form Footer Pattern

```tsx
<FormFooter
  onCancel={handleCancel}
  onSubmit={handleSubmit}
  submitting={isSubmitting}
  submitText="Save Changes"
  submitIcon={<SaveIcon className="w-4 h-4" />}
  variant="primary" // or "danger" for delete actions
/>
```

### LoadingButton Pattern

```tsx
<LoadingButton
  onClick={handleAction}
  loading={isLoading}
  loadingText="Saving..."
  variant="primary" // primary | secondary | danger
  icon={<SaveIcon className="w-4 h-4" />}
>
  Save Changes
</LoadingButton>
```

### FormError Pattern

```tsx
<FormError error={errorMessage} />
// or
<FormError errors={['Error 1', 'Error 2']} />
```

### PhoneInput Pattern

**IMPORTANT - ALL phone number fields MUST use PhoneInput component**

```tsx
<PhoneInput
  label="Phone"
  value={customer.phone || ''}
  onChange={(value) => setCustomer({ ...customer, phone: value })}
/>
```

**How it works:**
- **Display**: Auto-formats as `(###) ###-####` while typing
- **Database**: Saves as digits only (e.g., `2503015062`)
- **Handles**:
  - 10-digit numbers: `2503015062`
  - 11-digit with leading 1: `12503015062` → strips to `2503015062`
  - International numbers: `+441234567890` (kept as-is with +)
  - Any formatting input: `250-301-5062`, `(250) 301-5062`, etc.

**Why this matters:**
- Database stores digits only for consistency
- UI always shows formatted for readability
- Users can paste any format
- Handles North American country code (leading 1) automatically

### Currency Handling Pattern

**CRITICAL - ALWAYS follow this unified pattern**

**Single Source of Truth:**
- **ALL monetary values are in CENTS** (integers) throughout the application
- **Database**: cents (Int)
- **Backend API**: cents (Int)
- **Frontend State**: cents (numbers)
- **Display ONLY**: dollars via `formatCurrency()`

**Utility Functions:**
```tsx
import { formatCurrency, dollarsToCents, parseUserCurrency } from '@shared/utils/currency';

// Display cents as dollars
<div>Total: {formatCurrency(totalCents)}</div>  // "$25.00"

// Convert user input to cents
const cents = parseUserCurrency(userInput);  // "25.00" → 2500

// Convert dollars to cents
const cents = dollarsToCents(25.00);  // 2500
```

**Common Patterns:**

```tsx
// ✅ CORRECT - Everything in cents
const { itemTotal, gst, pst, grandTotal } = usePaymentCalculations(
  orders,
  deliveryFeeCents,
  discountCents,
  "$"
);
// Returns: ALL values in cents

// Display
<span>{formatCurrency(itemTotal)}</span>
<span>{formatCurrency(gst)}</span>
<span>{formatCurrency(grandTotal)}</span>

// ❌ WRONG - Manual conversions
<span>${(itemTotal / 100).toFixed(2)}</span>  // Never do this!
```

**Input Fields:**
```tsx
// Product price input (user enters dollars, we store as cents)
<InputField
  label="Price"
  value={(priceCents / 100).toFixed(2)}  // Display as dollars
  onChange={(e) => {
    const cents = dollarsToCents(e.target.value);
    updatePrice(cents);  // Store as cents
  }}
/>
```

**Why This Matters:**
- Prevents $1400.00 vs $14.00 bugs completely
- Single conversion point = impossible to miss
- No floating-point errors (integers only)
- Matches industry standard (Stripe, Shopify, Square)

### Brand Colors

- **Primary button**: `bg-brand-500 hover:bg-brand-600`
- **Secondary button**: `bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600`
- **Danger button**: `bg-red-500 hover:bg-red-600`
- **NEVER use** `#597485` or `#4e6575` (old colors)

### Grid Layouts

- 2-column forms: `grid grid-cols-1 sm:grid-cols-2 gap-4`
- 3-column forms: `grid grid-cols-1 sm:grid-cols-3 gap-4`
- Spacing: `space-y-4` for form fields

---

## 📚 Documentation Map
| Topic | File | Summary |
|-------|------|----------|
| **System architecture & stack** | `docs/System_Reference.md` | Full architecture, data models, services, and dev workflow. |
| **API reference** | `docs/API_Endpoints.md` | Complete Express route list. |
| **Coding patterns & conventions** | `docs/AI_IMPLEMENTATION_GUIDE.md` | Required patterns for AI implementers: useApiClient, Zod validation, Prisma, TailAdmin, WebSocket, R2 uploads, batch operations. |
| **Auth & security** | `docs/Auth_Security_Critical_Fixes.md` | Hardening status and test checklist. |
| **Mobile UX & responsive design** | `docs/Mobile_UX_Guidelines.md` | Tailwind responsive patterns, breakpoints, and mobile-first design. |
| **Current progress** | `docs/Progress_Tracker.markdown` | Implemented vs active work. |
| **Future roadmap** | `docs/Future_Roadmap.md` | Next 3 / 6 / 12-month objectives. |

---

## ⚙️ Recommended Workflow for Claude
1. **At startup**, use this file for context.
2. When asked to **implement** a feature (write code):
   - Read `AI_IMPLEMENTATION_GUIDE.md` for required patterns and conventions.
   - Read `System_Reference.md` for technical background.
   - Read `Progress_Tracker.markdown` for current implementation state.
   - Read `API_Endpoints.md` for endpoint details.
   - Read `Mobile_UX_Guidelines.md` for any mobile/responsive design work.
3. When asked to **design or plan** a feature:
   - Read `System_Reference.md` for technical background.
   - Read `Progress_Tracker.markdown` for current implementation state.
   - Read `API_Endpoints.md` for endpoint details.
4. When writing documentation or plans, follow existing Markdown formatting and emoji status keys (✅, 🛠️, 📜, 💡).

---

## 🧠 Optional Knowledge Preload
If deeper reasoning is needed (architecture, planning, multi-file analysis), also read:
> `docs/PROJECT_RECAP_FOR_CLAUDE.md`

---

## Feature Proposal Workflow
New feature plans are stored under `/docs/FEATURE_PLANS/` as Markdown files.

Each plan includes:
- Overview
- Goals
- Architecture & endpoints
- UI requirements
- Implementation readiness flag

Claude may create or edit these plans.
Codex implements them once marked ready, then updates `Progress_Tracker.markdown` and archives or deletes the plan file.

---

## 🗄️ Database Changes
**IMPORTANT: Always use Prisma migrations for schema changes**

```bash
# Create a new migration (REQUIRED for all DB changes)
npx prisma migrate dev --name descriptive_name

# NEVER use db push in development
# db push = no migration history = production sync issues
```

**Why migrations matter:**
- Staging uses `prisma migrate deploy` (auto-runs on Render)
- `db push` bypasses migration history → requires manual `migrate resolve` on staging
- Migrations = trackable, reversible, production-safe

---

## 🧪 Testing
```bash
# Start servers
cd back && npm run dev:back   # Backend on :4000
cd admin && npm run dev        # Admin Frontend on :5173
cd www && npm run dev          # Customer frontend on :5175
```

---

## 📝 Changelog Notes

### 2026-02-05: Major Cleanup (pre-launch)
Removed ~65 unused files and 15 npm packages across all three apps using `knip`.

**Deleted:**
- `back/`: coupons routes, test files, duplicate prisma.ts, addresses.ts, 8 packages
- `admin/`: ~40 unused components (ecommerce, settings-old, unused DDD boilerplate, payment modals), 3 packages
- `www/`: 16 template components (Blog, CustomerReview, old Checkouts), 4 packages

**If something breaks**, check this commit for accidentally deleted files.

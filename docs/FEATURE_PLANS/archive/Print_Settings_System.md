# Print Settings & Flexible Print Routing System

**Status:** 🔜 Ready for Implementation
**Created:** 2026-01-17
**Priority:** High

---

## Overview

Create a flexible print routing system that allows configuring where different print types (Receipts, Order Tickets, Documents) are printed. Each print type can be sent to browser print dialog or connected print agents (Electron or .NET), with configurable printer names, paper trays, and copy counts. This provides fallback options when agents fail and allows granular control over the printing workflow.

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
- **Backend route pattern:** `/back/src/routes/customers/index.ts`
- **Frontend settings pattern:** `/admin/src/app/pages/settings/business.tsx`
- **Custom hook pattern:** `/admin/src/shared/hooks/useApiClient.ts`
- **Service pattern:** `/back/src/services/printService.ts` (ALREADY EXISTS - modify this)

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
❌ Skip migrations → Run `npx prisma migrate dev --name print_settings`

---

## Goals

1. **Flexible Print Routing:** Allow each print type to be sent to browser, Electron agent (Mac), or Receipt agent (Windows)
2. **Fallback Support:** Enable browser printing as fallback when print agents are offline or malfunctioning
3. **Granular Control:** Configure printer names, paper trays, and copy counts per print type
4. **Agent Filtering:** Each agent only processes jobs intended for it based on `agentType` field

---

## Architecture & Endpoints

### Backend API Routes

**File:** `/back/src/routes/print-settings/index.ts` (NEW)

**Endpoints:**
- `GET /api/print-settings` — Get current print settings (auto-creates if missing)
- `PUT /api/print-settings` — Update print settings

**File:** `/back/src/services/printSettingsService.ts` (NEW)
- Service layer for print settings logic
- `getSettings()` — Get or create default settings
- `updateSettings(data)` — Update settings
- `getConfigForType(type)` — Get config for specific print job type

**File:** `/back/src/services/printService.ts` (MODIFY)
- Update `queuePrintJob()` to check settings before routing
- Return `{ action: 'browser-print', template }` for browser destination
- Add `agentType`, `printerName`, `printerTray`, `copies` to print job creation

### Database Schema

**Models to create:**

```prisma
model PrintSettings {
  id        String   @id @default(cuid())
  storeId   String?  @unique // Future multi-store support

  // Receipts (Thermal/POS - in-person sales)
  receiptsEnabled       Boolean @default(true)
  receiptsDestination   String  @default("browser")    // 'browser' | 'receipt-agent' | 'electron-agent'
  receiptsCopies        Int     @default(1)            // 1-3
  receiptsPrinterName   String?
  receiptsPrinterTray   Int?

  // Order Tickets (Delivery tags - flower orders)
  ticketsEnabled        Boolean @default(true)
  ticketsDestination    String  @default("electron-agent")
  ticketsPrinterName    String?
  ticketsPrinterTray    Int?    @default(1)           // Default tray 1 for ticket paper

  // Documents (Invoices + Reports - general printing)
  documentsEnabled      Boolean @default(true)
  documentsDestination  String  @default("browser")
  documentsPrinterName  String?
  documentsPrinterTray  Int?    @default(2)           // Default tray 2 for regular paper

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("print_settings")
}
```

**Models to modify:**

```prisma
model PrintJob {
  id          String   @id @default(cuid())
  type        PrintJobType
  agentType   String?              // NEW: 'receipt-agent' | 'electron-agent' | null (browser)
  printerName String?              // NEW: Target printer name
  printerTray Int?                 // NEW: Paper tray number
  copies      Int      @default(1) // NEW: Number of copies

  // ... existing fields remain unchanged
  orderId     String?
  data        Json
  template    String
  priority    Int      @default(0)
  status      PrintJobStatus
  agentId     String?
  errorMessage String?
  printedAt   DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  order       Order?   @relation(fields: [orderId], references: [id])

  @@map("print_jobs")
}
```

**Migration command:**
```bash
npx prisma migrate dev --name print_settings
```

---

## UI Requirements

### Frontend Components

**Location:** `/admin/src/app/pages/settings/print.tsx` (NEW)

**Components needed:**
1. **PrintSettingsPage.tsx** — Main settings page with all print type cards
2. **PrintTypeCard** (inline component) — Reusable card for each print type configuration

**No custom hook needed** — Use `useApiClient` directly for GET/PUT operations.

### User Flow
1. User navigates to Settings > Print
2. Page loads current print settings via `GET /api/print-settings`
3. User toggles enable/disable for each print type
4. User selects destination (Browser, Electron Agent, Receipt Agent)
5. If agent selected, user can optionally configure printer name and tray
6. For receipts, user sets number of copies (1-3)
7. User clicks "Save Settings"
8. Settings saved via `PUT /api/print-settings`
9. Success notification shown

### Settings Page Layout

```
Settings > Print
  ├─ Receipts Card
  │  ├─ ☑ Enable receipt printing
  │  ├─ Destination: [Receipt Agent ▼]
  │  ├─ Copies: [2]
  │  ├─ Printer Name: [Star TSP143IIIU]
  │  └─ Tray: [Default]
  │
  ├─ Order Tickets Card
  │  ├─ ☑ Enable order ticket printing
  │  ├─ Destination: [Electron Agent ▼]
  │  ├─ Printer Name: [HP LaserJet M402N]
  │  └─ Tray: [Tray 1 - Ticket Paper ▼]
  │
  └─ Documents Card (Invoices & Reports)
     ├─ ☑ Enable document printing
     ├─ Destination: [Browser ▼]
     ├─ Printer Name: [Optional]
     └─ Tray: [Tray 2 - Regular Paper ▼]
```

### Mobile Responsiveness
- Full width cards on mobile (<640px)
- Stack form fields vertically on mobile
- Use standard ComponentCard responsive patterns
- Test on 375px viewport

---

## Implementation Checklist

### Phase 1: Backend Schema & Migration
- [ ] Add `PrintSettings` model to `/back/prisma/schema.prisma`
- [ ] Add new fields to `PrintJob` model
- [ ] Run migration: `npx prisma migrate dev --name print_settings`
- [ ] Verify migration applied successfully

### Phase 2: Backend Services
- [ ] Create `/back/src/services/printSettingsService.ts`
- [ ] Implement `getSettings()` — auto-create if missing
- [ ] Implement `updateSettings(data)` — update existing
- [ ] Implement `getConfigForType(type)` — map PrintJobType to config
- [ ] Export `printSettingsService` instance

### Phase 3: Backend API Routes
- [ ] Create `/back/src/routes/print-settings/index.ts`
- [ ] Add `GET /api/print-settings` endpoint
- [ ] Add `PUT /api/print-settings` endpoint with Zod validation
- [ ] Register route in `/back/src/index.ts`: `app.use('/api/print-settings', printSettingsRoutes)`
- [ ] Test endpoints with curl/Postman

### Phase 4: Modify PrintService
- [ ] Update `printService.queuePrintJob()` to call `printSettingsService.getConfigForType()`
- [ ] Check if print type is enabled, return `{ action: 'skipped' }` if disabled
- [ ] If destination is 'browser', return `{ action: 'browser-print', template: '...' }`
- [ ] If destination is agent, create print job with `agentType`, `printerName`, `printerTray`, `copies`
- [ ] Update WebSocket broadcast message to include new fields
- [ ] Test print job creation with different settings

### Phase 5: Frontend Settings Page
- [ ] Create `/admin/src/app/pages/settings/print.tsx`
- [ ] Add page route to router
- [ ] Implement settings loading via `useApiClient().get('/print-settings')`
- [ ] Create form with ComponentCard for each print type:
  - [ ] Receipts card (enable, destination, copies, printer, tray)
  - [ ] Order Tickets card (enable, destination, printer, tray)
  - [ ] Documents card (enable, destination, printer, tray)
- [ ] Add destination dropdown with options: Browser, Electron Agent, Receipt Agent
- [ ] Show printer/tray fields only when destination !== 'browser'
- [ ] Implement save via `useApiClient().put('/print-settings', settings)`
- [ ] Add loading/error/success states

### Phase 6: Agent Updates
- [ ] Update `bloom-print-agent/src/job-processor.ts`:
  - [ ] Filter jobs by `job.agentType === 'electron-agent'`
  - [ ] Use `job.printerName` if provided
  - [ ] Use `job.printerTray` if provided
- [ ] Test Electron agent with new job format

### Phase 7: Navigation & Polish
- [ ] Add "Print Settings" link to Settings menu/sidebar
- [ ] Test all user flows
- [ ] Verify dark mode support
- [ ] Check mobile responsiveness (375px+)
- [ ] Test error handling (network errors, validation errors)

### Phase 8: Documentation
- [ ] Update `/docs/API_Endpoints.md` with new endpoints
- [ ] Update `/docs/Progress_Tracker.markdown` — mark as completed
- [ ] Archive this feature plan
- [ ] Update README if needed

---

## Data Flow

### Settings Update Flow
```
User Input → Form Validation → apiClient.put('/print-settings')
  → Zod validation (backend)
  → printSettingsService.updateSettings()
  → Prisma.update()
  → Response
  → Success notification
```

### Print Job Creation Flow (with Settings)
```
Order Created → printService.queuePrintJob(type, order)
  → printSettingsService.getConfigForType(type)
  → Check config.enabled
    → If disabled: return { action: 'skipped' }
    → If browser: return { action: 'browser-print', template }
    → If agent: Create PrintJob with agentType, printerName, printerTray, copies
      → Broadcast via WebSocket to agents
      → Agent filters by agentType
      → Agent prints with specified config
```

### Agent Processing Flow
```
Agent receives WebSocket message
  → Parse job
  → Check job.agentType === 'electron-agent' (or 'receipt-agent')
    → If no match: Ignore job
    → If match: Process job
      → Print to job.printerName (or default)
      → Use job.printerTray (or default)
      → Print job.copies times (receipts only)
      → Report status back to backend
```

---

## Edge Cases & Validation

### Input Validation
- `receiptsDestination`, `ticketsDestination`, `documentsDestination`: Must be one of: 'browser', 'receipt-agent', 'electron-agent'
- `receiptsCopies`: Must be integer between 1-3
- `printerTray`: Optional integer, null or 1-3
- All boolean flags: Must be true/false

### Business Rules
- Settings auto-created on first GET if not exists
- Only one PrintSettings record per store (enforced by `storeId` unique constraint)
- Print jobs with destination='browser' are NOT stored in database (returned directly to client)
- Agents ignore jobs not intended for them (based on `agentType`)

### Error Scenarios
- **Settings not found:** Auto-create with defaults
- **Print type disabled:** Skip job, log message
- **Agent offline:** Job stays PENDING, will process when agent reconnects
- **Browser destination:** Frontend shows print dialog, no agent needed
- **Invalid destination:** Zod validation rejects request
- **Network error:** Show error message, allow retry

---

## Files to Create/Modify

### New Files
```
/back/src/services/printSettingsService.ts           (~120 lines)
/back/src/routes/print-settings/index.ts             (~50 lines)
/admin/src/app/pages/settings/print.tsx              (~300 lines)
```

### Modified Files
```
/back/src/index.ts                              (add route registration)
/back/src/services/printService.ts              (update queuePrintJob logic)
/back/prisma/schema.prisma                      (add PrintSettings, modify PrintJob)
/bloom-print-agent/src/job-processor.ts         (add agentType filtering)
/docs/API_Endpoints.md                          (add endpoint documentation)
/docs/Progress_Tracker.markdown                 (mark as completed)
```

---

## Success Criteria

- [ ] All print types can be enabled/disabled independently
- [ ] Each print type can be routed to browser or agent
- [ ] Printer name and tray can be configured for agent destinations
- [ ] Receipt copy count can be set (1-3)
- [ ] Settings persist to database correctly
- [ ] Print jobs include `agentType`, `printerName`, `printerTray`, `copies`
- [ ] Agents filter jobs by `agentType` correctly
- [ ] Browser printing returns template when destination='browser'
- [ ] Loading states display during API calls
- [ ] Error messages show on failures
- [ ] Mobile responsive (375px+)
- [ ] Dark mode supported
- [ ] No console errors
- [ ] Documentation updated

---

## Implementation Notes

**Estimated Effort:** 4-6 hours

**Dependencies:**
- Existing `printService.ts` and `PrintJob` model
- Existing `bloom-print-agent` (will be modified)
- Future `.NET receipt-print-agent` (separate implementation)

**Testing Strategy:**
1. Test settings CRUD operations via API
2. Test each print type with all destination options
3. Test enable/disable toggles
4. Test multiple receipt copies
5. Test agent filtering (mock jobs with different agentTypes)
6. Test browser fallback scenario
7. Test mobile responsiveness
8. Test dark mode

**Deployment Notes:**
- Migration will run automatically on Render deploy
- No environment variable changes needed
- Existing print jobs will have `null` for new fields (handled gracefully)
- Agents must be updated to handle new job format (backward compatible)

---

## Post-Implementation

After completing implementation:

1. **Verify:**
   - All success criteria met
   - Documentation updated
   - No broken references
   - Settings page accessible from navigation

2. **Update:**
   - Mark feature as ✅ Completed in Progress_Tracker
   - Archive or delete this plan

3. **Deploy:**
   - Commit with message: "feat: add flexible print routing and settings system"
   - Push to trigger deployment
   - Verify in staging environment
   - Test with real print agents

---

## Future Enhancements (Out of Scope)

- .NET Receipt Agent implementation (separate feature plan)
- Print job history viewer in admin dashboard
- Print job retry/cancel from dashboard
- Agent status monitoring in settings page
- Multi-store support (different settings per location)
- Print templates customization UI

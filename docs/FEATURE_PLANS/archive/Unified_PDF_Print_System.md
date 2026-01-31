# Unified PDF Print System with QR Codes

**Status:** 🔜 Ready for Implementation
**Created:** 2026-01-18
**Priority:** High

---

## Overview

Consolidate browser and Electron print templates into a single PDF-based system to ensure consistent output across all print destinations and eliminate browser rendering inconsistencies. Currently, browser prints use basic PDFKit templates while Electron uses sophisticated HTML templates with QR codes. This creates maintenance overhead (two templates) and inconsistent output quality.

The unified system will generate professional PDF tickets in the backend using PDFKit, including embedded QR codes for driver routes, and deliver the same PDF to both browser and Electron print destinations.

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
- **Current PDFKit template:** `/back/src/templates/order-ticket-pdf.ts` (basic version to enhance)
- **Target design reference:** `/bloom-print-agent/src/templates/order-ticket-template.ts` (Electron HTML template with layout to replicate)
- **QR generation:** `/back/src/utils/qrCodeGenerator.ts` (existing utility)
- **Print service:** `/back/src/services/printService.ts` (WebSocket job dispatch)
- **PDF generation:** `/back/src/utils/pdfGenerator.ts` (PDFKit wrapper)
- **Electron print handler:** `/bloom-print-agent/src/job-processor.ts` (existing `printPdfBuffer()` function)

**DO NOT write from scratch. COPY patterns from these files.**

### Pre-Implementation Quiz (Answer Before Coding)

**Question 1: PDF Library**
- What library generates PDFs in the backend?
- Answer: `pdfkit` (already in package.json)

**Question 2: QR Code Library**
- What library generates QR codes?
- Answer: `qrcode` (already in both backend and Electron)

**Question 3: Print Job Delivery**
- How does backend send print jobs to Electron?
- Answer: WebSocket broadcast via `printService.ts`

**Question 4: Electron PDF Printing**
- What function does Electron use to print received PDFs?
- Answer: `printPdfBuffer()` (lines 146-181 in `job-processor.ts`)

### Critical Don'ts
❌ Use HTML templates → Use PDFKit programmatic generation
❌ Generate QR in Electron → Generate in backend before PDF creation
❌ Create new print endpoints → Use existing `/api/print/{type}/{orderId}` routes
❌ Modify WebSocket protocol → Use existing job data structure (add `pdfBase64` field)
❌ Remove Electron HTML templates immediately → Keep as fallback during transition

---

## Goals

1. **Single source of truth**: One sophisticated PDFKit template generates consistent output for both browser and Electron printing
2. **QR codes in all prints**: Backend-generated QR codes embedded in PDFs work in both browser and Electron contexts
3. **Simplified maintenance**: Eliminate dual template system, reducing code duplication and drift
4. **Cross-browser consistency**: PDFs eliminate HTML/CSS rendering differences between browsers

---

## Architecture & Endpoints

### Backend Changes

**No new endpoints required** - existing print system handles this:
- `POST /api/print/{type}/{orderId}` (already exists)
  - Type: `order-ticket`, `receipt`, `invoice`
  - Returns: `{ action: 'browser-print', pdfUrl }` OR `{ action: 'agent-print' }`

**File:** `/back/src/templates/order-ticket-pdf.ts`

**Enhancement needed:**
- Upgrade from basic 60-line text layout to sophisticated 11×8.5" landscape design
- Match Electron HTML template features:
  - 3 tearoff sections (Customer/Office/Delivery Driver)
  - QR code embedded in Delivery Driver section
  - Fold lines and cut markers
  - Comprehensive order details (items, pricing, delivery info)
  - Barcode or order number for scanning

**File:** `/back/src/services/printService.ts`

**Modification:**
- Generate QR code before creating print job
- Generate PDF buffer using enhanced template
- Add `pdfBase64` field to WebSocket job data
- Existing code already handles browser vs agent routing

### Electron Changes

**File:** `/bloom-print-agent/src/job-processor.ts`

**Modification:**
- Check for `pdfBase64` in job data first
- If present, use existing `printPdfBuffer()` (lines 146-181)
- If absent (fallback), use current HTML template flow
- Remove HTML template generation once verified working

### Database Schema

**No database changes required** - existing schema supports this.

---

## UI Requirements

### Frontend Components

**No frontend changes required** - existing print buttons and flows work as-is.

**Location:** `/admin/src/app/components/orders/` (already implemented)

**Current flow (unchanged):**
1. User clicks print button → triggers `POST /api/print/order-ticket/{orderId}`
2. Backend determines destination (`browser` or `agent`)
3. Browser: Opens PDF URL in new tab → user prints
4. Agent: WebSocket delivers job → Electron prints automatically

### Mobile Responsiveness

Not applicable - print output is fixed to letter size (11×8.5" landscape).

---

## Implementation Checklist

### Phase 1: Backend PDF Template Enhancement
- [ ] Study `/bloom-print-agent/src/templates/order-ticket-template.ts` (HTML reference)
- [ ] Study PDFKit documentation for layout capabilities
- [ ] Enhance `/back/src/templates/order-ticket-pdf.ts`:
  - [ ] Set page to letter landscape (792×612 points)
  - [ ] Create 3-column grid layout (Customer/Office/Delivery Driver sections)
  - [ ] Add fold lines and cut markers
  - [ ] Add order details section (items, pricing, customer info)
  - [ ] Add delivery information section
  - [ ] Reserve space for QR code (220×220 points)
- [ ] Test PDF generation locally with sample order data
- [ ] Verify visual match to Electron HTML output

### Phase 2: Backend QR Code Integration
- [ ] Import existing `generateOrderQRCode()` from `/back/src/utils/qrCodeGenerator.ts`
- [ ] Modify `printService.ts`:
  - [ ] Generate driver route URL (already exists, lines 52-66)
  - [ ] Generate QR code as PNG buffer using `qrcode.toBuffer()`
  - [ ] Embed QR image in PDF during generation
- [ ] Test QR code scanning with mobile device
- [ ] Verify QR opens correct driver route

### Phase 3: Backend PDF Delivery via WebSocket
- [ ] Modify `printService.ts` to generate PDF for agent jobs:
  - [ ] Call enhanced `generateOrderTicketPdf()` function
  - [ ] Convert PDF buffer to base64 string
  - [ ] Add `pdfBase64: string` to job data
  - [ ] Keep existing fields for backwards compatibility
- [ ] Add preview endpoint `/api/print/preview/ticket` (GET):
  - [ ] Fetch most recent completed order
  - [ ] Generate enhanced order ticket PDF
  - [ ] Store to R2/local and return `{ pdfUrl }`
  - [ ] Follow pattern from existing `/api/print/preview/receipt` endpoint
- [ ] Add "Preview Order Ticket" button to settings page:
  - [ ] File: `/admin/src/app/pages/settings/print.tsx` (lines 300-353)
  - [ ] Add button after "Preview Invoice" button (line 351)
  - [ ] Follows same pattern: `apiClient.get()` → `window.open(pdfUrl)`
- [ ] Test WebSocket message size (PDFs ~50-100kb base64 = ~70-140kb)
- [ ] Verify existing browser print flow still works

### Phase 4: Electron PDF Print Handler
- [ ] Modify `/bloom-print-agent/src/job-processor.ts`:
  - [ ] Check `if (job.data.pdfBase64)` before HTML template
  - [ ] Decode base64 to buffer: `Buffer.from(pdfBase64, 'base64')`
  - [ ] Call existing `printPdfBuffer(buffer, printerName, copies)`
  - [ ] Keep HTML template code as fallback (commented)
- [ ] Test with real Electron app connected via WebSocket
- [ ] Verify print output matches enhanced PDF design

### Phase 5: Integration & Testing
- [ ] Test browser print: Click print → PDF opens → user prints → output correct
- [ ] Test Electron print: Click print → WebSocket delivers → auto-prints → output correct
- [ ] Compare browser and Electron output side-by-side (should be identical)
- [ ] Test QR code scanning from printed output
- [ ] Test with various order data (long item lists, multiple recipients, etc.)
- [ ] Test error scenarios (printer offline, WebSocket disconnected)

### Phase 6: Cleanup & Documentation
- [ ] Remove or comment Electron HTML template code
- [ ] Remove QR generation from Electron (`job-processor.ts` lines 106-114)
- [ ] Update `/docs/API_Endpoints.md` (document `pdfBase64` field in WebSocket jobs)
- [ ] Update `/docs/Progress_Tracker.markdown`
- [ ] Archive this feature plan

---

## Data Flow

**Browser Print Flow:**
```
User clicks print
  → POST /api/print/order-ticket/{orderId} (destination: browser)
  → printService.generateOrderTicketPdf() (enhanced template + QR)
  → pdfStorage.savePdf() (R2 or local)
  → Response: { action: 'browser-print', pdfUrl }
  → Frontend: window.open(pdfUrl, '_blank')
  → User prints from browser
```

**Electron Print Flow:**
```
User clicks print
  → POST /api/print/order-ticket/{orderId} (destination: agent)
  → printService.generateOrderTicketPdf() (enhanced template + QR)
  → PDF buffer → base64
  → WebSocket.broadcast({ type: 'order-ticket', data: { pdfBase64, ... } })
  → Electron receives job
  → job-processor checks pdfBase64
  → Decodes to buffer
  → printPdfBuffer(buffer, printerName, copies)
  → macOS lpr command → physical printer
```

**Preview Flow (Settings Page):**
```
User clicks "Preview Order Ticket"
  → GET /api/print/preview/ticket
  → Fetch most recent completed order
  → printService.generateOrderTicketPdf() (enhanced template + QR)
  → pdfStorage.savePdf() (R2 or local)
  → Response: { pdfUrl }
  → Frontend: window.open(pdfUrl, '_blank')
  → User sees PDF in new tab
```

---

## Edge Cases & Validation

### PDF Generation
- **Long item lists**: Ensure pagination if items exceed single page
- **Missing data**: Handle null values gracefully (e.g., no delivery instructions)
- **Unicode characters**: Test special characters in customer names, addresses
- **QR generation failure**: Log error, generate PDF without QR rather than failing entirely

### Print Job Delivery
- **Large PDFs**: Monitor WebSocket message size (base64 encoding increases size ~33%)
- **Network interruption**: Existing retry logic in Electron should handle
- **Electron offline**: Print job queued in database (existing behavior)

### Error Scenarios
- QR code generation fails → Log error, print without QR
- PDF generation fails → Return 500 error, show user message
- Printer offline → Electron shows error notification (existing behavior)
- WebSocket disconnected → Job queued for retry (existing behavior)
- **Preview: No completed orders** → Return 404 with helpful error message
- **Preview: PDF generation fails** → Show alert to user (existing pattern in settings page)

---

## Files to Create/Modify

### Modified Files
```
/back/src/templates/order-ticket-pdf.ts        (~300 lines, enhanced from 60)
/back/src/services/printService.ts             (add PDF generation + base64 encoding)
/back/src/routes/print/index.ts                (add GET /api/print/preview/ticket endpoint)
/admin/src/app/pages/settings/print.tsx        (add "Preview Order Ticket" button, ~15 lines)
/bloom-print-agent/src/job-processor.ts        (add pdfBase64 handling, ~20 lines)
/docs/API_Endpoints.md                         (document preview endpoint + WebSocket job format)
/docs/Progress_Tracker.markdown                (mark as completed)
```

### No New Files Required

---

## Success Criteria

- [ ] Browser-printed tickets match Electron-printed tickets (identical PDFs)
- [ ] QR codes embedded in all order ticket PDFs
- [ ] QR codes scannable with mobile device, open correct driver route
- [ ] PDFs render consistently across Chrome, Firefox, Safari
- [ ] Electron receives and prints PDFs from backend without HTML template
- [ ] Existing browser print flow works unchanged (backwards compatible)
- [ ] Existing Electron print flow works with new PDF delivery
- [ ] "Preview Order Ticket" button added to Settings → Print page
- [ ] Preview button opens enhanced PDF with QR code in new tab
- [ ] Print output quality matches or exceeds current Electron HTML template
- [ ] No console errors in backend or Electron app
- [ ] Documentation updated

---

## Implementation Notes

**Estimated Effort:** 4-6 hours

**Dependencies:**
- Existing PDFKit setup (`pdfkit` v0.17.2)
- Existing QR code library (`qrcode` v1.5.4)
- Existing WebSocket infrastructure
- Existing Electron print handler

**Testing Strategy:**
1. **Phase 1-2 testing**: Generate PDF locally, open in browser, verify layout and QR
2. **Phase 3 testing**: Print via browser, verify PDF downloads and prints correctly
3. **Phase 4-5 testing**: Print with Electron connected, verify auto-print and output quality
4. **Comparison testing**: Print same order via browser and Electron, compare physical outputs

**Deployment Notes:**
- No database migrations required
- No environment variable changes needed
- Backend changes deploy automatically to Render
- Electron app may need rebuild/redistribution if dependency changes (not expected)
- **Backwards compatible**: Old Electron app will fall back to HTML template if `pdfBase64` missing

**Rollback Plan:**
- If issues arise, remove `pdfBase64` from WebSocket jobs
- Electron automatically falls back to HTML template generation
- Browser print unaffected (already using PDFs)

---

## Post-Implementation

After completing implementation:

1. **Verify:**
   - Print several test orders via both browser and Electron
   - Scan QR codes from physical prints to verify driver routes work
   - Compare outputs side-by-side for consistency
   - Test error scenarios (missing data, printer offline, etc.)
   - All success criteria met
   - Documentation updated

2. **Update:**
   - Mark feature as ✅ Completed in Progress_Tracker
   - Archive or delete this plan
   - Update team on new unified print system

3. **Deploy:**
   - Commit with message: "feat: unified PDF print system with embedded QR codes"
   - Push to trigger Render deployment
   - Verify in staging environment
   - If Electron app rebuilt, distribute to users

4. **Future Cleanup:**
   - After 2-4 weeks of stable operation, remove HTML template code from Electron entirely
   - Remove `order-ticket-template.ts` from Electron app
   - Remove HTML-to-PDF conversion code from `job-processor.ts`

---

## Technical Reference

### PDFKit Layout Tips

**11×8.5" Landscape Setup:**
```typescript
const doc = new PDFDocument({
  size: 'letter',
  layout: 'landscape', // 792×612 points
  margin: 36 // 0.5 inch margins
});
```

**3-Column Grid (264 points each):**
```typescript
const pageWidth = 792;
const margin = 36;
const contentWidth = pageWidth - (margin * 2); // 720
const columnWidth = contentWidth / 3; // 240 points each
const gutter = 12; // space between columns

// Column positions
const col1X = margin;
const col2X = margin + columnWidth + gutter;
const col3X = margin + (columnWidth + gutter) * 2;
```

**Embedding QR Code Image:**
```typescript
import QRCode from 'qrcode';

// Generate QR as PNG buffer
const qrBuffer = await QRCode.toBuffer(driverRouteUrl, {
  width: 220,
  margin: 1,
  type: 'png'
});

// Embed in PDF
doc.image(qrBuffer, x, y, {
  width: 220,
  height: 220
});
```

**Fold Lines:**
```typescript
// Vertical dashed lines between columns
doc.dash(5, { space: 3 })
   .moveTo(col2X - gutter/2, margin)
   .lineTo(col2X - gutter/2, 612 - margin)
   .stroke();

doc.undash(); // Reset for solid lines
```

### WebSocket Job Data Format

**Current format:**
```typescript
{
  type: 'order-ticket',
  data: {
    orderId: 'uuid',
    driverRouteUrl: 'https://...',
    driverRouteToken: 'token',
    // ... order data
  }
}
```

**Enhanced format (backwards compatible):**
```typescript
{
  type: 'order-ticket',
  data: {
    pdfBase64: 'JVBERi0xLjMKJcfs...', // NEW FIELD
    orderId: 'uuid',
    driverRouteUrl: 'https://...', // kept for backwards compat
    driverRouteToken: 'token',
    // ... order data (kept for fallback HTML template)
  }
}
```

**Electron handler logic:**
```typescript
async function processOrderTicketJob(job: PrintJob) {
  // NEW: Check for PDF first
  if (job.data.pdfBase64) {
    const pdfBuffer = Buffer.from(job.data.pdfBase64, 'base64');
    await printPdfBuffer(pdfBuffer, printerName, copies);
    return;
  }

  // FALLBACK: Use HTML template (existing code)
  const html = generateOrderTicketHtml(job.data);
  // ... existing PDF conversion and print
}
```

### Preview Endpoint Pattern

**Backend route (follow existing pattern):**
```typescript
// File: /back/src/routes/print/index.ts
// Add this route alongside existing /api/print/preview/receipt

router.get('/preview/ticket', async (req: Request, res: Response) => {
  try {
    // 1. Fetch most recent completed order
    const recentOrder = await prisma.order.findFirst({
      where: { status: 'Completed' },
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true,
        recipient: true,
        items: { include: { product: true } }
      }
    });

    if (!recentOrder) {
      return res.status(404).json({
        error: 'No completed orders found. Create a completed order first.'
      });
    }

    // 2. Generate PDF using enhanced template (with QR)
    const pdfBuffer = await generateOrderTicketPdf(recentOrder);

    // 3. Store PDF and return URL
    const pdfUrl = await pdfStorage.savePdf(
      pdfBuffer,
      `preview-ticket-${Date.now()}.pdf`
    );

    res.json({ pdfUrl });
  } catch (error) {
    console.error('Error generating ticket preview:', error);
    res.status(500).json({ error: 'Failed to generate preview' });
  }
});
```

**Frontend button (follows existing pattern):**
```tsx
// File: /admin/src/app/pages/settings/print.tsx
// Add after "Preview Invoice" button (line 351)

<button
  onClick={async () => {
    try {
      const response = await apiClient.get("/api/print/preview/ticket");
      if (response.data?.pdfUrl) {
        window.open(response.data.pdfUrl, "_blank");
      }
    } catch (err) {
      console.error("Error previewing ticket:", err);
      alert("Failed to generate ticket preview. Make sure you have at least one completed order.");
    }
  }}
  className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition"
>
  Preview Order Ticket
</button>
```

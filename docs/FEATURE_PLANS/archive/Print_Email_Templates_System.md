# Print & Email Templates System

**Status:** 🔜 Ready for Implementation
**Created:** 2026-01-17
**Priority:** High

---

## Overview

Implement complete print and email functionality for receipts, invoices, and reports. This includes:
1. PDF generation for invoices/reports (browser-independent)
2. ESC/POS templates for thermal receipt printing
3. Email settings moved from .env to database with admin UI
4. Email sending with PDF attachments
5. Wire up all print/email buttons in POS and order pages

**Builds on:** Print Settings System (already implemented - see archived plan)

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
- **Backend route pattern:** `/back/src/routes/customers/index.ts`
- **Email service:** `/back/src/services/emailService.ts` (ALREADY EXISTS - extend this)
- **Print service:** `/back/src/services/printService.ts` (ALREADY EXISTS - extend this)
- **Frontend settings:** `/admin/src/app/pages/settings/business.tsx`

### Critical Don'ts
❌ Use `fetch()` directly → Use `useApiClient` hook
❌ Store API keys in plain text → Encrypt in database
❌ Generate HTML for printing → Use PDF (pdfkit/puppeteer)
❌ Skip migrations → Run `npx prisma migrate dev`

---

## Goals

1. **PDF Generation:** Generate pixel-perfect, browser-independent receipts/invoices/reports as PDFs
2. **Thermal Printing:** ESC/POS commands for reliable thermal receipt printing
3. **Email Settings:** Move email configuration from .env to database with admin UI
4. **Email Functionality:** Send receipts/invoices as email with PDF attachments
5. **Complete Integration:** Wire up all print/email buttons in POS and order pages

---

## Architecture & Endpoints

### Backend API Routes

**File:** `/back/src/routes/email-settings/index.ts` (NEW)

**Endpoints:**
- `GET /api/email-settings` — Get email configuration
- `PUT /api/email-settings` — Update email settings
- `POST /api/email-settings/test` — Send test email

**File:** `/back/src/routes/print/index.ts` (NEW)

**Endpoints:**
- `POST /api/print/receipt/:orderId` — Generate receipt (PDF or ESC/POS)
- `POST /api/print/invoice/:orderId` — Generate invoice PDF
- `POST /api/print/order-ticket/:orderId` — Generate order ticket PDF

**File:** `/back/src/routes/email/send.ts` (NEW)

**Endpoints:**
- `POST /api/email/receipt/:orderId` — Email receipt with PDF
- `POST /api/email/invoice/:orderId` — Email invoice with PDF

### Database Schema

**New model:**

```prisma
model EmailSettings {
  id           String   @id @default(cuid())

  // SMTP Configuration
  provider     String   @default("sendgrid") // sendgrid, smtp, etc
  apiKey       String?  // Encrypted SendGrid API key
  smtpHost     String?
  smtpPort     Int?
  smtpUser     String?
  smtpPassword String?  // Encrypted

  // From Settings
  fromEmail    String   @default("noreply@hellobloom.ca")
  fromName     String   @default("Bloom Flowers")

  // Behavior
  enabled      Boolean  @default(true)

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@map("email_settings")
}
```

**Migration command:**
```bash
npx prisma migrate dev --name email_settings
```

---

## Template Generation Strategy

### 1. Receipt Template (Thermal - 58mm)

**Library:** `node-thermal-printer`
**Location:** `/back/src/templates/receipt-thermal.ts`

**Approach:**
- ESC/POS commands for Star TSP143IIIU
- Text-based, optimized for thermal printers
- 32 characters wide (58mm)
- Logo at top (if supported)
- Line items, totals, taxes
- Thank you message

**Output:** ESC/POS command buffer → send to receipt-agent

### 2. Invoice Template (Laser/Browser - PDF)

**Library:** `pdfkit`
**Location:** `/back/src/templates/invoice-pdf.ts`

**Approach:**
- Professional invoice layout
- Company logo, address, contact
- Customer/recipient info
- Line items table
- Tax breakdown, totals
- Payment information
- Footer with terms

**Output:** PDF buffer → browser opens or agent prints

### 3. Receipt Template (Browser - PDF)

**Library:** `pdfkit`
**Location:** `/back/src/templates/receipt-pdf.ts`

**Approach:**
- Simple receipt layout (for browser printing)
- Similar to thermal but prettier
- 8.5" × 11" or smaller

**Output:** PDF buffer → browser print dialog

### 4. Order Ticket Template (Already Exists)

**Location:** `/bloom-print-agent/src/templates/order-ticket-template.ts`

**Status:** Already implemented (HTML → PDF in Electron agent)
**Keep as-is** for now, migrate to backend PDF generation later

---

## Email Templates

**Library:** Simple HTML with inline CSS
**Location:** `/back/src/templates/email/`

**Templates needed:**
1. `receipt-email.ts` — Receipt email body
2. `invoice-email.ts` — Invoice email body

**Structure:**
```
Subject: Your Receipt from Bloom Flowers
Body: Simple HTML with:
  - Thank you message
  - Order summary (plain text)
  - "See attached PDF for details"
Attachment: receipt.pdf (generated via pdfkit)
```

---

## UI Requirements

### 1. Email Settings Page

**Location:** `/admin/src/app/pages/settings/email.tsx`

**Components:**
```
Email Settings
  ├─ Provider Selection
  │  └─ [SendGrid ▼] (SendGrid, SMTP, Disabled)
  │
  ├─ SendGrid Settings (if selected)
  │  ├─ API Key: [sk_••••••••1234] (masked input)
  │  ├─ From Email: [orders@hellobloom.ca]
  │  └─ From Name: [Bloom Flowers]
  │
  ├─ SMTP Settings (if selected)
  │  ├─ Host: [smtp.gmail.com]
  │  ├─ Port: [587]
  │  ├─ Username: [user@domain.com]
  │  └─ Password: [••••••••] (masked input)
  │
  └─ Actions
     ├─ [Send Test Email] button
     └─ [Save Settings] button
```

### 2. Receipt/Invoice Modal Updates

**Location:** `/admin/src/app/components/orders/ReceiptInvoiceModal.tsx`

**Wire up buttons:**
- Print Receipt → `POST /api/print/receipt/:orderId`
- Email Receipt → `POST /api/email/receipt/:orderId`
- Print Invoice → `POST /api/print/invoice/:orderId`
- Email Invoice → `POST /api/email/invoice/:orderId`

**Handle responses:**
- If `action: 'browser-print'` → open PDF in new tab
- If `action: 'queued'` → show success message
- If `action: 'skipped'` → show error/disabled message

### 3. POS Print Receipt

**Location:** `/admin/src/app/components/pos/payment/PaymentController.tsx`

**Update line 414:**
```typescript
if (paymentState.quickActions.printReceipt) {
  // Call print receipt API
  const result = await apiClient.post(`/print/receipt/${orderId}`);
  if (result.action === 'browser-print') {
    window.open(result.pdfUrl, '_blank');
  }
}
```

---

## Implementation Checklist

### Phase 1: Email Settings Infrastructure
- [ ] Add `EmailSettings` model to Prisma schema
- [ ] Run migration: `npx prisma migrate dev --name email_settings`
- [ ] Create encryption utility for API keys (`/back/src/utils/encryption.ts`)
- [ ] Create `/back/src/services/emailSettingsService.ts`
  - [ ] `getSettings()` — Get or create email settings
  - [ ] `updateSettings(data)` — Update settings (encrypt sensitive fields)
  - [ ] `testConnection()` — Send test email
- [ ] Create `/back/src/routes/email-settings/index.ts`
  - [ ] `GET /api/email-settings` (mask sensitive fields)
  - [ ] `PUT /api/email-settings`
  - [ ] `POST /api/email-settings/test`
- [ ] Register route in `/back/src/index.ts`
- [ ] Update `emailService.ts` to load settings from DB instead of .env

### Phase 2: Email Settings Admin UI
- [ ] Create `/admin/src/app/pages/settings/email.tsx`
- [ ] Add route to router
- [ ] Add "Email Settings" link to settings navigation
- [ ] Implement provider selection (SendGrid, SMTP, Disabled)
- [ ] Masked input fields for API keys/passwords
- [ ] Test email functionality
- [ ] Loading/error states

### Phase 3: PDF Generation Templates
- [ ] Install dependencies: `npm install pdfkit @types/pdfkit`
- [ ] Create `/back/src/templates/receipt-pdf.ts`
  - [ ] Company header with logo
  - [ ] Order details table
  - [ ] Tax breakdown
  - [ ] Payment information
  - [ ] Footer with thank you message
- [ ] Create `/back/src/templates/invoice-pdf.ts`
  - [ ] Professional invoice layout
  - [ ] Customer/recipient sections
  - [ ] Line items table
  - [ ] Tax breakdown, totals
  - [ ] Payment terms/notes
- [ ] Create utility: `/back/src/utils/pdf-generator.ts`
  - [ ] Helper functions for common PDF elements
  - [ ] Formatting utilities (currency, dates)

### Phase 4: Thermal Receipt Template
- [ ] Install dependency: `npm install node-thermal-printer`
- [ ] Create `/back/src/templates/receipt-thermal.ts`
  - [ ] ESC/POS command generation
  - [ ] 32-character width formatting
  - [ ] Header with logo (if available)
  - [ ] Line items
  - [ ] Totals and taxes
  - [ ] Thank you message
- [ ] Test output with Star TSP143IIIU printer

### Phase 5: Print API Endpoints
- [ ] Create `/back/src/routes/print/index.ts`
- [ ] Implement `POST /api/print/receipt/:orderId`
  - [ ] Load order data
  - [ ] Check print settings (thermal vs PDF)
  - [ ] Generate template (ESC/POS or PDF)
  - [ ] Route via printService
  - [ ] Return result (browser-print with PDF URL or queued)
- [ ] Implement `POST /api/print/invoice/:orderId`
  - [ ] Load order data
  - [ ] Generate PDF invoice
  - [ ] Route via printService
  - [ ] Return result
- [ ] Upload PDFs to temporary storage (R2 or temp folder)
- [ ] Return signed URLs for browser access
- [ ] Register route in `/back/src/index.ts`

### Phase 6: Email API Endpoints
- [ ] Create `/back/src/templates/email/receipt-email.ts`
  - [ ] Simple HTML template
  - [ ] Order summary
  - [ ] Link to PDF attachment
- [ ] Create `/back/src/templates/email/invoice-email.ts`
  - [ ] Professional HTML template
  - [ ] Invoice details
  - [ ] Link to PDF attachment
- [ ] Create `/back/src/routes/email/send.ts`
- [ ] Implement `POST /api/email/receipt/:orderId`
  - [ ] Load order and customer data
  - [ ] Generate receipt PDF
  - [ ] Generate email HTML
  - [ ] Send via emailService with PDF attachment
  - [ ] Return success/error
- [ ] Implement `POST /api/email/invoice/:orderId`
  - [ ] Load order and customer data
  - [ ] Generate invoice PDF
  - [ ] Generate email HTML
  - [ ] Send via emailService with PDF attachment
  - [ ] Return success/error
- [ ] Register route in `/back/src/index.ts`

### Phase 7: Frontend Integration
- [ ] Update `/admin/src/app/components/orders/ReceiptInvoiceModal.tsx`
  - [ ] Wire up Print Receipt button → call print API
  - [ ] Handle browser-print response → open PDF
  - [ ] Wire up Email Receipt button → call email API
  - [ ] Wire up Print Invoice button → call print API
  - [ ] Wire up Email Invoice button → call email API
  - [ ] Add loading states
  - [ ] Add success/error notifications
- [ ] Update `/admin/src/app/components/pos/payment/PaymentController.tsx`
  - [ ] Replace alert with actual print API call
  - [ ] Handle browser-print response
  - [ ] Show success message

### Phase 8: Testing
- [ ] Test receipt printing (thermal)
- [ ] Test receipt printing (PDF browser)
- [ ] Test invoice printing (PDF)
- [ ] Test email receipt (with PDF attachment)
- [ ] Test email invoice (with PDF attachment)
- [ ] Test print settings routing (browser vs agent)
- [ ] Test email settings (SendGrid)
- [ ] Test email settings (SMTP if needed)
- [ ] Test on mobile (responsive)
- [ ] Test dark mode

### Phase 9: Documentation
- [ ] Update `/docs/API_Endpoints.md`
- [ ] Update `/docs/Progress_Tracker.markdown`
- [ ] Archive this feature plan
- [ ] Document email template customization process

---

## Data Flow

### Print Receipt Flow (POS)
```
User completes payment with "Print Receipt" checked
  ↓
Frontend: POST /api/print/receipt/:orderId
  ↓
Backend: Load order data
  ↓
Backend: Check print settings
  ↓
If destination = browser:
  ↓
  Generate PDF → Upload to temp storage
  ↓
  Return { action: 'browser-print', pdfUrl: 'https://...' }
  ↓
  Frontend: window.open(pdfUrl, '_blank')
  ↓
  User: Browser print dialog

If destination = receipt-agent:
  ↓
  Generate ESC/POS commands
  ↓
  Queue print job in database
  ↓
  Broadcast to agent via WebSocket
  ↓
  Agent: Print to thermal printer
```

### Email Invoice Flow
```
User clicks "Email Invoice"
  ↓
Frontend: POST /api/email/invoice/:orderId
  ↓
Backend: Load order, customer data
  ↓
Backend: Load email settings from DB
  ↓
Backend: Generate invoice PDF
  ↓
Backend: Generate email HTML
  ↓
Backend: Send via emailService (SendGrid)
  ↓
  Subject: "Your Invoice from Bloom Flowers"
  Body: HTML with order summary
  Attachment: invoice.pdf
  ↓
Customer receives email with PDF
```

---

## Security Considerations

### API Key Encryption

**Use crypto for encryption:**
```typescript
// utils/encryption.ts
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 32 bytes
const ALGORITHM = 'aes-256-gcm';

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decrypt(encrypted: string): string {
  const parts = encrypted.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encryptedText = parts[2];
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

**Add to .env:**
```
ENCRYPTION_KEY=<32-byte-hex-string>
```

### Masking in API Responses

```typescript
// emailSettingsService.ts
async getSettings() {
  const settings = await prisma.emailSettings.findFirst();
  return {
    ...settings,
    apiKey: settings.apiKey ? maskApiKey(settings.apiKey) : null,
    smtpPassword: settings.smtpPassword ? '••••••••' : null,
  };
}

function maskApiKey(key: string): string {
  if (key.length < 8) return '••••••••';
  return `${key.substring(0, 4)}••••••••${key.substring(key.length - 4)}`;
}
```

---

## File Storage for PDFs

### Temporary PDF Storage

**Option 1: Cloudflare R2 (Recommended)**
- Upload PDFs to R2 bucket
- Generate signed URL (expires in 1 hour)
- Return URL to frontend
- Auto-delete after 24 hours

**Option 2: Server Temp Folder**
- Save to `/tmp/receipts/`
- Serve via Express static route
- Cleanup cron job (delete after 1 hour)

**Implementation:**
```typescript
// utils/pdf-storage.ts
import { R2Client } from '@aws-sdk/client-s3';

export async function uploadPDF(buffer: Buffer, filename: string): Promise<string> {
  // Upload to R2
  // Return signed URL
}

export async function cleanupOldPDFs() {
  // Delete PDFs older than 24 hours
}
```

---

## Dependencies to Install

### Backend
```bash
npm install pdfkit @types/pdfkit
npm install node-thermal-printer
npm install @aws-sdk/client-s3  # If using R2
```

### No frontend dependencies needed
- Use existing `useApiClient` hook
- Use existing Modal components

---

## Success Criteria

- [ ] Email settings stored in database (not .env)
- [ ] Email settings page works with SendGrid
- [ ] Receipt prints correctly (thermal or PDF)
- [ ] Invoice prints correctly (PDF)
- [ ] Receipt emails with PDF attachment
- [ ] Invoice emails with PDF attachment
- [ ] POS print receipt button works
- [ ] Order page print/email buttons work
- [ ] Print routing works (browser vs agent)
- [ ] API keys encrypted in database
- [ ] API keys masked in UI
- [ ] Test email functionality works
- [ ] PDFs are browser-independent
- [ ] Mobile responsive
- [ ] Dark mode supported
- [ ] No console errors
- [ ] Documentation updated

---

## Implementation Notes

**Estimated Effort:** 12-16 hours

**Dependencies:**
- Print Settings System (already implemented ✅)
- Email service (already exists ✅)
- Print service (already exists ✅)

**Testing Strategy:**
1. Test each template independently
2. Test print routing (browser vs agent)
3. Test email delivery
4. Test PDF generation quality
5. Test on real hardware (Star TSP143IIIU)

**Deployment Notes:**
- Migration will run automatically on Render
- Add `ENCRYPTION_KEY` to Render environment variables
- Migrate SendGrid settings from .env to database via admin UI
- Configure R2 bucket for PDF storage (if using)

---

## Post-Implementation

1. **Verify:**
   - All success criteria met
   - Documentation updated
   - Email settings migrated from .env

2. **Update:**
   - Mark as ✅ Completed in Progress_Tracker
   - Archive this plan

3. **Deploy:**
   - Commit: "feat: implement print/email templates and settings system"
   - Push to trigger deployment
   - Test in staging
   - Migrate email settings via admin UI

---

## Future Enhancements (Out of Scope)

- Custom email template editor
- Multiple email template designs
- SMS receipts/invoices (Twilio)
- Receipt customization (logo, footer text)
- Invoice customization (terms, notes)
- Automated email receipts on payment
- Scheduled reports via email

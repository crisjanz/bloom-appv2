# Remote Print System (Auto-Print Orders)

> **ARCHIVED:** 2025-12-30 - Fully implemented (backend + Electron agent). Documented in System_Reference.md and Progress_Tracker.markdown

**Status:** ✅ Completed (was marked 🔜 Ready but actually fully implemented Dec 13-15)
**Created:** 2025-12-12
**Priority:** High

---

## Overview

Implement remote auto-printing system that allows orders created from ANY device (Mac, PC, online, mobile) to automatically print to printers connected to a Windows PC. This is a **two-part system**: (1) Backend API for print job management, and (2) Electron desktop app that runs on Windows PC and handles actual printing.

**This feature plan covers BACKEND ONLY (Phase 1).** The Electron print agent will be a separate project built after backend is complete.

**Key Concept:** Backend creates "print jobs" when orders are placed. Windows Electron agent polls/subscribes for jobs and prints them locally.

---

## 🤖 Implementation Constraints for AI

**CRITICAL - Read Before Implementing:**

> **⚠️ FOR CODEX: This is a BACKEND-ONLY implementation. The Electron app is separate. Focus on creating the print job API and database model.**

### 0. Behavior Contract (READ FIRST)

**Special Notes for This Feature:**
- **WebSocket Implementation:** You'll need to add WebSocket support to Express. Use `ws` library.
- **Background Jobs:** Print jobs should be fire-and-forget (non-blocking) like notifications
- **No Frontend UI (Yet):** This phase has NO admin UI. Just backend API + order integration.
- **Separate Electron Project:** The print agent is NOT part of `/admin` or `/back`. It's a standalone app.

**Expected Response Format After Implementation:**
```markdown
### Implementation Summary
- [ ] Files created: (list with line counts)
- [ ] Files modified: (list with specific changes)
- [ ] Routes registered: (list endpoints)
- [ ] WebSocket endpoint tested: (show connection works)
- [ ] Migration run: (show PrintJob table created)
- [ ] Integration tested: (show order creation triggers print job)
```

---

### 1. Pre-Implementation Quiz (MANDATORY)

**🚨 YOU MUST ANSWER THESE BEFORE WRITING CODE 🚨**

#### Question 1: API Client Pattern
**Read:** `/admin/src/shared/hooks/useApiClient.ts` (entire file)
**Question:** What hook MUST you use for all API calls in the frontend?
**Answer:** `useApiClient` - returns `{ data, status }` format
**(Note: This feature has NO frontend in Phase 1, but you still need to know this)**

#### Question 2: Database Money Pattern
**Read:** `/back/prisma/schema.prisma` (search for "Int" fields related to price/amount)
**Question:** How are monetary values stored in the database?
**Answer:** As `Int` in `cents`

#### Question 3: Route Registration
**Read:** `/back/src/index.ts` (lines where routers are registered)
**Question:** After creating a route file, where do you register it?
**Answer:** File: `/back/src/index.ts` Pattern: `app.use('/api/print-jobs', printJobRouter)`

#### Question 4: Validation Pattern
**Read:** Any `/back/src/routes/*.ts` file with a POST endpoint
**Question:** What library is used for backend validation?
**Answer:** `Zod` with `.parse()` method

#### Question 5: Order Creation Integration
**Read:** `/back/src/routes/orders/create.ts` (lines 138-145)
**Question:** Where are notifications triggered after order creation?
**Answer:** After order status updated to PAID, using `triggerStatusNotifications()`
**(You'll add print job creation in the same place)**

**✅ CHECKPOINT:** Before proceeding, write your answers to all 5 questions.

---

### 2. Required Reading (IN ORDER)
- [ ] `/docs/System_Reference.md` (architecture context)
- [ ] `/docs/API_Endpoints.md` (existing endpoints)
- [ ] `/CLAUDE.md` (project conventions)
- [ ] `/back/src/routes/orders/create.ts` (CRITICAL - this is your integration point)
- [ ] `/back/src/services/notificationService.ts` (pattern to follow for background jobs)

### 3. Pattern Reference Files
**Study these files for implementation patterns:**
- **Backend route pattern:** `/back/src/routes/orders/create.ts` - Order creation with background triggers
- **Service pattern:** `/back/src/services/notificationService.ts` - Background job processing
- **WebSocket example:** You'll need to research Express + ws library integration

**DO NOT write from scratch. COPY patterns from these files.**

### 4. Anti-Pattern Examples (NEVER DO THIS)

#### ❌ WRONG: Blocking order creation while printing
```typescript
// NEVER DO THIS - order creation should not wait for print
const printJob = await printService.queuePrintJob(order);
await printJob.waitForCompletion(); // ❌ BLOCKS
res.json({ orders });
```

#### ✅ CORRECT: Fire-and-forget print job
```typescript
// ALWAYS DO THIS - non-blocking
printService.queuePrintJob(order).catch(error => {
  console.error('Failed to queue print job:', error);
  // Order creation continues regardless
});
res.json({ orders });
```

---

#### ❌ WRONG: Storing print data as string
```typescript
model PrintJob {
  data String  // WRONG - can't query fields
}
```

#### ✅ CORRECT: Using Json type
```typescript
model PrintJob {
  data Json  // CORRECT - stores full order object
}
```

---

### 5. Required Utilities (DO NOT SKIP)
- **WebSocket:** Use `ws` library for WebSocket server
- **Validation:** Use Zod for API endpoint validation
- **Database:** Use Prisma with proper indexes
- **Background Jobs:** Follow notification pattern (fire-and-forget, error logging)

### 6. Testing Requirements
Before marking as complete:
- [ ] Print job created when delivery order placed
- [ ] Print job created when POS order placed
- [ ] WebSocket endpoint accepts connections
- [ ] GET /api/print-jobs/pending returns jobs
- [ ] PATCH /api/print-jobs/:id/status updates status
- [ ] Print jobs visible in database
- [ ] Order creation not blocked by print job
- [ ] Both servers running without errors

### 7. Documentation Updates Required
- [ ] Add endpoints to `/docs/API_Endpoints.md`
- [ ] Update `/docs/Progress_Tracker.markdown`
- [ ] Keep this feature plan (Electron app phase still needed)

### 8. FORBIDDEN Actions
- ❌ Creating admin UI (Phase 2 only)
- ❌ Blocking order creation with print jobs
- ❌ Storing images/PDFs in database (just order data)
- ❌ Missing indexes on status and createdAt
- ❌ Not handling JSON serialization for order data
- ❌ Forgetting to register routes in `/back/src/index.ts`

---

## Current State

### ✅ Already Implemented
- Order creation system (`/back/src/routes/orders/create.ts`)
- Notification trigger pattern (background, non-blocking)
- Customer and order data models (full order details available)
- Express API infrastructure on Render

### 🛠️ Needs Implementation
- PrintJob database model
- PrintService class for job management
- REST API endpoints for print jobs
- WebSocket endpoint for real-time job delivery
- Integration with order creation flow
- Print job queueing when orders are placed

### 🔜 Future (Not This Phase)
- Electron print agent (Windows app)
- Admin UI for print job history
- Manual print job retry
- Print agent status dashboard

---

## Goals

1. **Goal 1:** Create print job database model and REST API for managing print jobs
2. **Goal 2:** Integrate print job creation into order placement flow (delivery orders and POS receipts)
3. **Goal 3:** Implement WebSocket endpoint for real-time job delivery to print agent
4. **Goal 4:** Ensure print jobs are fire-and-forget (don't block order creation)

---

## Architecture & Endpoints

### Backend API Routes

**File to Create:** `/back/src/routes/print-jobs/index.ts`

**Pattern Reference:** `/back/src/routes/orders/create.ts` (for background job pattern)

#### Endpoints Specification

---

**GET `/api/print-jobs/pending`**
- **Purpose:** Fetch pending print jobs for an agent (polling endpoint)
- **Query Params:**
  - `agentId` (string, required) - Identifies which print agent is requesting
  - `limit` (number, optional, default 10) - Max jobs to return
- **Response:** `200 OK`
  ```typescript
  {
    jobs: Array<{
      id: string;
      type: 'RECEIPT' | 'ORDER_TICKET' | 'REPORT';
      orderId: string;
      data: Json;  // Full order object
      template: string;
      priority: number;
      createdAt: string;
    }>
  }
  ```
- **Error:** `400` if agentId missing, `500` if database error

---

**PATCH `/api/print-jobs/:id/status`**
- **Purpose:** Update print job status (agent reports completion/failure)
- **Params:** `id` (string, job ID)
- **Body:**
  ```typescript
  {
    status: 'PRINTING' | 'COMPLETED' | 'FAILED';
    agentId?: string;          // Which agent processed it
    errorMessage?: string;     // If failed
    printedAt?: string;        // ISO timestamp
  }
  ```
- **Validation:** Use Zod schema
- **Response:** `200 OK` with updated job
- **Error:** `404` if not found, `400` if validation fails

---

**GET `/api/print-jobs/history`**
- **Purpose:** Fetch print job history (for future admin UI)
- **Query Params:**
  - `status` (optional) - Filter by status
  - `limit` (number, default 50)
  - `offset` (number, default 0)
- **Response:** `200 OK` with array of jobs
- **Error:** `500` if database error

---

**POST `/api/print-jobs`** (Manual job creation - optional)
- **Purpose:** Manually create a print job
- **Body:**
  ```typescript
  {
    type: 'RECEIPT' | 'ORDER_TICKET' | 'REPORT';
    orderId: string;
    template: string;
    priority?: number;  // Default 0
  }
  ```
- **Validation:** Use Zod, verify order exists
- **Response:** `201 Created` with created job
- **Error:** `400` if validation fails, `404` if order not found

---

**POST `/api/print-jobs/:id/retry`** (For future admin UI)
- **Purpose:** Retry a failed print job
- **Params:** `id` (string, job ID)
- **Response:** `200 OK` - Resets status to PENDING
- **Error:** `404` if not found, `400` if not failed

---

**WebSocket `/print-agent`**
- **Purpose:** Real-time connection for print agents
- **Protocol:** WebSocket (ws library)
- **Authentication:** JWT token in connection headers or first message
- **Messages (Server → Agent):**
  ```typescript
  {
    type: 'PRINT_JOB',
    job: { /* full job object */ }
  }
  {
    type: 'HEARTBEAT_ACK',
    timestamp: string
  }
  ```
- **Messages (Agent → Server):**
  ```typescript
  {
    type: 'JOB_STATUS',
    jobId: string,
    status: 'COMPLETED' | 'FAILED',
    errorMessage?: string
  }
  {
    type: 'HEARTBEAT',
    agentId: string,
    timestamp: string
  }
  ```

---

### Database Schema

**File to Modify:** `/back/prisma/schema.prisma`

**Required Schema:**

```prisma
model PrintJob {
  id            String          @id @default(cuid())
  type          PrintJobType
  status        PrintJobStatus  @default(PENDING)

  // Link to order
  orderId       String?
  order         Order?          @relation(fields: [orderId], references: [id], onDelete: Cascade)

  // Order data snapshot (full JSON)
  data          Json

  // Template identifier (e.g., "delivery-ticket-v1", "receipt-v1")
  template      String

  // Priority (higher = more urgent)
  priority      Int             @default(0)

  // Agent tracking
  agentId       String?
  errorMessage  String?

  // Timestamps
  createdAt     DateTime        @default(now())
  printedAt     DateTime?
  updatedAt     DateTime        @updatedAt

  // Indexes for performance
  @@index([status])
  @@index([createdAt])
  @@index([orderId])
  @@index([agentId])
}

enum PrintJobType {
  RECEIPT
  ORDER_TICKET
  REPORT
}

enum PrintJobStatus {
  PENDING
  PRINTING
  COMPLETED
  FAILED
}
```

**Important Notes:**
- `data` field stores FULL order object as JSON (with customer, items, delivery info, etc.)
- `orderId` is optional - can be null for manual test prints
- Cascade delete: if order deleted, print jobs also deleted
- Indexes on `status` and `createdAt` for efficient polling queries

**Migration Commands:**
```bash
cd back
npx prisma migrate dev --name add_print_jobs
npx prisma generate
```

---

## Service Layer

**File to Create:** `/back/src/services/printService.ts`

**Pattern Reference:** `/back/src/services/notificationService.ts`

**Class Structure:**

```typescript
import { PrismaClient, PrintJobType, PrintJobStatus, Order } from '@prisma/client';

const prisma = new PrismaClient();

export class PrintService {
  /**
   * Queue a print job for an order (non-blocking)
   */
  async queuePrintJob(params: {
    type: PrintJobType;
    orderId: string;
    order: Order;  // Full order object
    template: string;
    priority?: number;
  }): Promise<void> {
    try {
      await prisma.printJob.create({
        data: {
          type: params.type,
          orderId: params.orderId,
          data: params.order as any, // Full order JSON
          template: params.template,
          priority: params.priority || 0,
          status: PrintJobStatus.PENDING
        }
      });
      console.log(`🖨️ Print job queued: ${params.type} for order #${params.orderId}`);
    } catch (error) {
      console.error('Failed to queue print job:', error);
      throw error; // Propagate for error handling
    }
  }

  /**
   * Get pending print jobs (for agent polling)
   */
  async getPendingJobs(agentId: string, limit: number = 10) {
    return prisma.printJob.findMany({
      where: { status: PrintJobStatus.PENDING },
      orderBy: [
        { priority: 'desc' },  // Higher priority first
        { createdAt: 'asc' }   // Older jobs first
      ],
      take: limit,
      include: {
        order: {
          include: {
            customer: true,
            recipientCustomer: {
              include: { addresses: true }
            },
            deliveryAddress: true,
            orderItems: true
          }
        }
      }
    });
  }

  /**
   * Update job status (agent reports completion)
   */
  async updateJobStatus(
    jobId: string,
    status: PrintJobStatus,
    agentId?: string,
    errorMessage?: string
  ) {
    return prisma.printJob.update({
      where: { id: jobId },
      data: {
        status,
        agentId,
        errorMessage,
        printedAt: status === PrintJobStatus.COMPLETED ? new Date() : undefined,
        updatedAt: new Date()
      }
    });
  }

  /**
   * Get job history (for admin UI in future)
   */
  async getJobHistory(filters: {
    status?: PrintJobStatus;
    limit?: number;
    offset?: number;
  }) {
    return prisma.printJob.findMany({
      where: filters.status ? { status: filters.status } : undefined,
      orderBy: { createdAt: 'desc' },
      take: filters.limit || 50,
      skip: filters.offset || 0,
      include: {
        order: {
          select: {
            orderNumber: true,
            type: true,
            createdAt: true
          }
        }
      }
    });
  }

  /**
   * Retry failed job
   */
  async retryJob(jobId: string) {
    return prisma.printJob.update({
      where: { id: jobId },
      data: {
        status: PrintJobStatus.PENDING,
        errorMessage: null,
        agentId: null,
        updatedAt: new Date()
      }
    });
  }
}

export const printService = new PrintService();
```

---

## Integration Points

### Order Creation Integration

**File to Modify:** `/back/src/routes/orders/create.ts`

**Location:** After line 145 (after notification trigger)

**Changes Needed:**

1. Import print service at top of file:
```typescript
import { printService } from '../../services/printService';
import { PrintJobType } from '@prisma/client';
```

2. Add print job trigger after notification trigger (around line 145):
```typescript
// Existing notification trigger (line 138-145)
triggerStatusNotifications(updatedOrder, 'PAID', 'DRAFT')
  .then(() => {
    console.log(`✅ Order confirmation notifications sent for order #${updatedOrder.orderNumber}`);
  })
  .catch((error) => {
    console.error(`❌ Order confirmation notification failed for order #${updatedOrder.orderNumber}:`, error);
  });

// NEW: Queue print job for delivery orders
if (updatedOrder.type === 'DELIVERY') {
  printService.queuePrintJob({
    type: PrintJobType.ORDER_TICKET,
    orderId: updatedOrder.id,
    order: updatedOrder as any,
    template: 'delivery-ticket-v1',
    priority: 10  // High priority for new orders
  }).catch(error => {
    console.error(`❌ Failed to queue print job for order #${updatedOrder.orderNumber}:`, error);
    // Don't block order creation - just log error
  });
}

// NEW: Queue receipt print for POS/walk-in orders
if (updatedOrder.orderSource === 'POS' || updatedOrder.orderSource === 'WALKIN') {
  printService.queuePrintJob({
    type: PrintJobType.RECEIPT,
    orderId: updatedOrder.id,
    order: updatedOrder as any,
    template: 'receipt-v1',
    priority: 10
  }).catch(error => {
    console.error(`❌ Failed to queue receipt print for order #${updatedOrder.orderNumber}:`, error);
  });
}
```

**CRITICAL:** Print job creation is fire-and-forget. Use `.catch()` to handle errors without blocking order creation.

---

## Copy-Paste Starter Code

### Backend Route Boilerplate

**File to Create:** `/back/src/routes/print-jobs/index.ts`

**DO NOT write from scratch. Copy this template:**

```typescript
import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient, PrintJobStatus } from '@prisma/client';
import { printService } from '../../services/printService';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const updateStatusSchema = z.object({
  status: z.enum(['PRINTING', 'COMPLETED', 'FAILED']),
  agentId: z.string().optional(),
  errorMessage: z.string().optional(),
  printedAt: z.string().datetime().optional()
});

// GET /api/print-jobs/pending - Fetch pending jobs (for polling)
router.get('/pending', async (req, res) => {
  try {
    const { agentId, limit } = req.query;

    if (!agentId || typeof agentId !== 'string') {
      return res.status(400).json({ error: 'agentId query parameter required' });
    }

    const limitNum = limit ? parseInt(limit as string) : 10;
    const jobs = await printService.getPendingJobs(agentId, limitNum);

    res.json({ jobs });
  } catch (error) {
    console.error('Error fetching pending print jobs:', error);
    res.status(500).json({ error: 'Failed to fetch print jobs' });
  }
});

// PATCH /api/print-jobs/:id/status - Update job status
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = updateStatusSchema.parse(req.body);

    const updatedJob = await printService.updateJobStatus(
      id,
      validatedData.status as PrintJobStatus,
      validatedData.agentId,
      validatedData.errorMessage
    );

    console.log(`🖨️ Print job ${id} status updated: ${validatedData.status}`);
    res.json(updatedJob);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error updating print job status:', error);
    res.status(500).json({ error: 'Failed to update print job' });
  }
});

// GET /api/print-jobs/history - Fetch job history
router.get('/history', async (req, res) => {
  try {
    const { status, limit, offset } = req.query;

    const jobs = await printService.getJobHistory({
      status: status as PrintJobStatus | undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined
    });

    res.json({ jobs });
  } catch (error) {
    console.error('Error fetching print job history:', error);
    res.status(500).json({ error: 'Failed to fetch job history' });
  }
});

// POST /api/print-jobs/:id/retry - Retry failed job
router.post('/:id/retry', async (req, res) => {
  try {
    const { id } = req.params;
    const job = await printService.retryJob(id);

    console.log(`🔄 Print job ${id} queued for retry`);
    res.json(job);
  } catch (error) {
    console.error('Error retrying print job:', error);
    res.status(500).json({ error: 'Failed to retry print job' });
  }
});

export default router;
```

---

### WebSocket Implementation

**File to Modify:** `/back/src/index.ts`

**Add WebSocket support:**

```typescript
// Add imports at top
import { WebSocketServer } from 'ws';
import { Server } from 'http';

// After Express app is created, wrap it in HTTP server
const server = new Server(app);

// Create WebSocket server
const wss = new WebSocketServer({
  server,
  path: '/print-agent'
});

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  console.log('📡 Print agent connected');

  // TODO: Implement authentication (check JWT token in headers)

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('📥 Received from agent:', message.type);

      if (message.type === 'JOB_STATUS') {
        // Agent reporting job completion/failure
        printService.updateJobStatus(
          message.jobId,
          message.status,
          message.agentId,
          message.errorMessage
        ).catch(error => {
          console.error('Failed to update job status:', error);
        });

        // Send acknowledgment
        ws.send(JSON.stringify({
          type: 'ACK',
          jobId: message.jobId
        }));
      } else if (message.type === 'HEARTBEAT') {
        // Agent heartbeat - respond with ACK
        ws.send(JSON.stringify({
          type: 'HEARTBEAT_ACK',
          timestamp: new Date().toISOString()
        }));
      }
    } catch (error) {
      console.error('Error processing agent message:', error);
    }
  });

  ws.on('close', () => {
    console.log('📡 Print agent disconnected');
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Listen on server instead of app
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🖨️ Print agent WebSocket available at /print-agent`);
});
```

---

## Implementation Steps (Recommended Order)

### Phase 1: Backend Database & Service ⚙️
**Estimated Time:** 2 hours

#### Step 1.1: Create Database Schema (15 min)
1. [ ] Open `/back/prisma/schema.prisma`
2. [ ] Add `PrintJob` model at the end of the file
3. [ ] Add `PrintJobType` enum
4. [ ] Add `PrintJobStatus` enum
5. [ ] Add relation to Order model: `printJobs PrintJob[]`
6. [ ] **CHECKPOINT:** Run `npx prisma format`
7. [ ] **MUST SEE:** File formatted without errors
8. [ ] Run: `npx prisma migrate dev --name add_print_jobs`
9. [ ] Run: `npx prisma generate`
10. [ ] **CHECKPOINT:** Both commands succeed
11. [ ] **🛑 STOP:** Show me the schema before continuing

#### Step 1.2: Create PrintService Class (30 min)
1. [ ] Create `/back/src/services/printService.ts`
2. [ ] **COPY** the PrintService boilerplate from above
3. [ ] Implement all methods (queuePrintJob, getPendingJobs, updateJobStatus, etc.)
4. [ ] Export singleton instance
5. [ ] **CHECKPOINT:** Run `cd back && npx tsc --noEmit`
6. [ ] **MUST SEE:** 0 TypeScript errors
7. [ ] **🛑 STOP:** Show me the service before continuing

#### Step 1.3: Create API Routes (30 min)
1. [ ] Create `/back/src/routes/print-jobs/index.ts`
2. [ ] **COPY** the route boilerplate from above
3. [ ] Import printService
4. [ ] Implement all endpoints (GET pending, PATCH status, GET history, POST retry)
5. [ ] Add Zod validation schemas
6. [ ] **CHECKPOINT:** Run `cd back && npx tsc --noEmit`
7. [ ] **MUST SEE:** 0 TypeScript errors
8. [ ] **🛑 STOP:** Show me the routes before continuing

#### Step 1.4: Register Routes (5 min)
1. [ ] Open `/back/src/index.ts`
2. [ ] Import router: `import printJobRouter from './routes/print-jobs';`
3. [ ] Register route: `app.use('/api/print-jobs', printJobRouter);`
4. [ ] **CHECKPOINT:** Run `cd back && npm run dev`
5. [ ] **MUST SEE:** Server starts on port 4000 without errors
6. [ ] **🛑 STOP:** Show me the index.ts changes before continuing

### Phase 2: WebSocket Implementation ⚙️
**Estimated Time:** 1 hour

#### Step 2.1: Add WebSocket Server (30 min)
1. [ ] Install ws library: `cd back && npm install ws @types/ws`
2. [ ] Open `/back/src/index.ts`
3. [ ] **COPY** WebSocket implementation from above
4. [ ] Wrap Express app in HTTP server
5. [ ] Create WebSocketServer with `/print-agent` path
6. [ ] Implement message handlers (JOB_STATUS, HEARTBEAT)
7. [ ] Update `server.listen()` instead of `app.listen()`
8. [ ] **CHECKPOINT:** Run `cd back && npm run dev`
9. [ ] **MUST SEE:** Server starts with "Print agent WebSocket available" message
10. [ ] **🛑 STOP:** Show me the WebSocket code before continuing

#### Step 2.2: Test WebSocket Connection (20 min)
1. [ ] Use a WebSocket testing tool (e.g., websocat, wscat, or browser console)
2. [ ] Connect to `ws://localhost:4000/print-agent`
3. [ ] Send heartbeat: `{"type":"HEARTBEAT","agentId":"test","timestamp":"2025-12-12T10:00:00Z"}`
4. [ ] **CHECKPOINT:** Verify HEARTBEAT_ACK received
5. [ ] **MUST SEE:** Connection works, messages received
6. [ ] **🛑 STOP:** Show me test results before continuing

### Phase 3: Order Integration ⚙️
**Estimated Time:** 30 min

#### Step 3.1: Integrate with Order Creation (20 min)
1. [ ] Open `/back/src/routes/orders/create.ts`
2. [ ] Add imports: `printService`, `PrintJobType`
3. [ ] After line 145 (notification trigger), add print job triggers
4. [ ] Add for delivery orders: `type: ORDER_TICKET`
5. [ ] Add for POS orders: `type: RECEIPT`
6. [ ] **CRITICAL:** Use `.catch()` for error handling (non-blocking)
7. [ ] **CHECKPOINT:** Run `cd back && npx tsc --noEmit`
8. [ ] **MUST SEE:** 0 TypeScript errors
9. [ ] **🛑 STOP:** Show me the integration before continuing

#### Step 3.2: Test End-to-End (10 min)
1. [ ] Start backend: `cd back && npm run dev`
2. [ ] Create a test delivery order via API or admin
3. [ ] Check console for "🖨️ Print job queued" message
4. [ ] Query database: `SELECT * FROM "PrintJob";`
5. [ ] **CHECKPOINT:** Print job created with PENDING status
6. [ ] **MUST SEE:** Job has full order data in `data` field
7. [ ] Test GET `/api/print-jobs/pending?agentId=test`
8. [ ] **MUST SEE:** Returns the pending job
9. [ ] **🛑 STOP:** Show me test results

### Phase 4: Testing & Validation ⚙️
**Estimated Time:** 30 min

#### Step 4.1: Test All Endpoints (20 min)
1. [ ] Test GET `/api/print-jobs/pending?agentId=test&limit=5`
   - **MUST SEE:** Returns pending jobs
2. [ ] Test PATCH `/api/print-jobs/:id/status` with `{"status":"COMPLETED","agentId":"test"}`
   - **MUST SEE:** Job status updated, `printedAt` timestamp set
3. [ ] Test GET `/api/print-jobs/history?limit=10`
   - **MUST SEE:** Returns completed job
4. [ ] Test POST `/api/print-jobs/:id/retry` on failed job
   - **MUST SEE:** Status reset to PENDING
5. [ ] **CHECKPOINT:** All endpoints work correctly
6. [ ] **🛑 STOP:** Show me test results summary

#### Step 4.2: Test Error Scenarios (10 min)
1. [ ] Test with missing agentId: GET `/api/print-jobs/pending`
   - **MUST SEE:** 400 Bad Request
2. [ ] Test invalid status: PATCH with `{"status":"INVALID"}`
   - **MUST SEE:** 400 Validation Error
3. [ ] Test non-existent job ID: PATCH `/api/print-jobs/fake-id/status`
   - **MUST SEE:** 500 or 404 error
4. [ ] **CHECKPOINT:** Error handling works correctly

### Phase 5: Documentation & Cleanup 📝
**Estimated Time:** 30 min

#### Step 5.1: Update API Documentation (15 min)
1. [ ] Open `/docs/API_Endpoints.md`
2. [ ] Add new section: "## Print Jobs"
3. [ ] Document all endpoints:
   - GET `/api/print-jobs/pending`
   - PATCH `/api/print-jobs/:id/status`
   - GET `/api/print-jobs/history`
   - POST `/api/print-jobs/:id/retry`
   - WebSocket `/print-agent`
4. [ ] Include request/response formats
5. [ ] Include query parameters and validation
6. [ ] **🛑 STOP:** Show me the documentation

#### Step 5.2: Update Progress Tracker (10 min)
1. [ ] Open `/docs/Progress_Tracker.markdown`
2. [ ] Add to "Recently Completed" section
3. [ ] List all files created and modified
4. [ ] Note that Electron app is next phase
5. [ ] **🛑 STOP:** Show me the progress tracker update

#### Step 5.3: Final Verification (5 min)
1. [ ] Stop backend server
2. [ ] Restart: `cd back && npm run dev`
3. [ ] Check for startup errors
4. [ ] Test create order → print job created
5. [ ] Check print job appears in database
6. [ ] **CHECKPOINT:** Everything works end-to-end

---

## Required Response Format After Implementation

**You MUST provide this summary when implementation is complete:**

```markdown
### Implementation Summary

#### Quiz Answers (Proof of Reading)
- Q1: `useApiClient` (N/A for backend-only phase)
- Q2: `Int` in `cents`
- Q3: `/back/src/index.ts` with `app.use('/api/print-jobs', router)`
- Q4: `Zod` with `.parse()`
- Q5: After PAID status update, line 138-145 in create.ts

#### Files Created
- `/back/src/routes/print-jobs/index.ts` (XXX lines)
- `/back/src/services/printService.ts` (XXX lines)

#### Files Modified
- `/back/src/index.ts` - Added route registration + WebSocket server
- `/back/prisma/schema.prisma` - Added PrintJob model + enums
- `/back/src/routes/orders/create.ts` - Added print job triggers
- `/docs/API_Endpoints.md` - Added print job endpoints
- `/docs/Progress_Tracker.markdown` - Added feature to completed

#### Routes Registered
- `GET /api/print-jobs/pending` - Fetch pending jobs
- `PATCH /api/print-jobs/:id/status` - Update job status
- `GET /api/print-jobs/history` - Fetch job history
- `POST /api/print-jobs/:id/retry` - Retry failed job
- `WebSocket /print-agent` - Real-time agent connection

#### WebSocket Tested
- [x] Connection established
- [x] HEARTBEAT message works
- [x] JOB_STATUS message works
- [x] ACK responses received

#### Migration Commands Run
```bash
npx prisma migrate dev --name add_print_jobs
npx prisma generate
```

#### Integration Tested
- [x] Delivery order creates ORDER_TICKET print job
- [x] POS order creates RECEIPT print job
- [x] Print jobs visible in database
- [x] Order creation not blocked by print job
- [x] Console shows "🖨️ Print job queued" messages

#### Tests Performed
- [x] Backend TypeScript compiles without errors
- [x] GET /api/print-jobs/pending works
- [x] PATCH /api/print-jobs/:id/status works
- [x] GET /api/print-jobs/history works
- [x] POST /api/print-jobs/:id/retry works
- [x] WebSocket connection works
- [x] Order creation triggers print jobs
- [x] Error handling works (fire-and-forget)
- [x] Server runs without errors

#### Known Issues
[List any issues or limitations, or write "None"]

#### Next Steps
- [ ] Build Electron print agent (separate project)
- [ ] Test with real printers (Star thermal, HP LaserJet)
- [ ] Add admin UI for print job history (Phase 2)
```

---

## Data Flow Example

**User Story:** Florist receives online order for delivery

1. **Step 1:** Customer places order online
2. **Step 2:** Order created via `POST /api/orders/create`
3. **Step 3:** Order status updated from DRAFT → PAID
4. **Step 4:** `triggerStatusNotifications()` sends email/SMS (existing)
5. **Step 5:** `printService.queuePrintJob()` creates print job (NEW)
6. **Step 6:** Print job saved to database with PENDING status
7. **Step 7:** Windows Electron agent polling `GET /api/print-jobs/pending`
8. **Step 8:** Agent receives job, generates PDF from order data
9. **Step 9:** Agent prints to HP LaserJet (ticket paper tray)
10. **Step 10:** Agent calls `PATCH /api/print-jobs/:id/status` with COMPLETED
11. **Step 11:** Job status updated in database

**Alternative (WebSocket):** Steps 7-8 use WebSocket push instead of polling

---

## Edge Cases & Validation

### Input Validation
- [ ] `agentId` cannot be empty in GET /pending
- [ ] Status must be valid enum value (PRINTING, COMPLETED, FAILED)
- [ ] Job ID must exist before updating status
- [ ] Order must exist before creating manual print job

### Business Rules
- [ ] Cannot update job status if job doesn't exist
- [ ] Can only retry jobs with FAILED status
- [ ] Print jobs deleted when parent order is deleted (cascade)
- [ ] Order creation continues even if print job fails

### Error Scenarios
- [ ] Database unavailable → log error, don't block order
- [ ] WebSocket disconnected → agent falls back to polling
- [ ] Invalid JSON in WebSocket message → log error, continue
- [ ] Agent offline → jobs queue as PENDING, process when back

---

## Notes

- **No Frontend UI:** This phase is backend only. Admin UI comes in Phase 2.
- **Electron App:** Separate project, not part of this codebase. Built after backend complete.
- **Fire-and-Forget:** Print job creation MUST NOT block order creation
- **WebSocket Optional:** Agent can use polling if WebSocket fails
- **Template IDs:** "delivery-ticket-v1", "receipt-v1" - used by Electron app to pick correct template
- **Full Order Data:** Store entire order object in `data` field so agent has all info
- **Priorities:** Higher numbers = more urgent. Default 0.

---

## Files to Create/Modify

### New Files
- `/back/src/routes/print-jobs/index.ts` - REST API endpoints
- `/back/src/services/printService.ts` - Business logic

### Modified Files
- `/back/src/index.ts` - Register route + add WebSocket server
- `/back/prisma/schema.prisma` - Add PrintJob model
- `/back/src/routes/orders/create.ts` - Add print job triggers
- `/docs/API_Endpoints.md` - Document new endpoints
- `/docs/Progress_Tracker.markdown` - Mark phase 1 complete

---

## Success Criteria

**Feature is complete when:**

- ✅ PrintJob model exists with proper indexes
- ✅ PrintService class implements all CRUD operations
- ✅ REST API endpoints work and return correct responses
- ✅ WebSocket endpoint accepts connections and handles messages
- ✅ Order creation triggers print job (delivery and POS)
- ✅ Print jobs are fire-and-forget (non-blocking)
- ✅ Print jobs queryable via GET /pending
- ✅ Job status updatable via PATCH
- ✅ No TypeScript errors
- ✅ No runtime errors on server start
- ✅ Documentation updated

---

## Estimated Total Effort

**Total:** 4-5 hours

- Database + Service: 2 hours
- WebSocket: 1 hour
- Order Integration: 0.5 hours
- Testing: 0.5 hours
- Documentation: 0.5 hours

---

**Ready for Implementation:** Yes

**Dependencies:** None - all infrastructure exists

**Assigned To:** Codex (AI Implementation Agent)

**Next Phase:** Electron print agent (Windows desktop app)

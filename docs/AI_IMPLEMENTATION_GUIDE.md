# AI Implementation Guide for Bloom App

**Purpose:** This guide ensures AI assistants (Claude Code, GPT-5 Codex, etc.) implement features consistently with the existing codebase patterns.

---

## 🎯 Implementation Checklist

When implementing a feature plan, verify each of these requirements:

- [ ] Read `CLAUDE.md` for project context
- [ ] Read `docs/System_Reference.md` for architecture
- [ ] Check `docs/API_Endpoints.md` for existing endpoints
- [ ] Review similar existing files for patterns
- [ ] Use required utilities (see below)
- [ ] Follow database conventions
- [ ] Match UI styling patterns
- [ ] Add proper TypeScript types
- [ ] Include error handling and loading states
- [ ] Update documentation files

---

## 📁 Repository Structure (DO NOT DEVIATE)

```
bloom-app/
├── admin/           # React 19 + Vite 6 admin frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/    # Feature-specific components
│   │   │   ├── pages/         # Route pages
│   │   │   └── layout/        # Layout components
│   │   └── shared/
│   │       ├── hooks/         # Reusable hooks (use these!)
│   │       ├── ui/            # Shared UI components
│   │       └── types/         # TypeScript types
├── back/            # Express + Prisma API
│   ├── src/
│   │   ├── routes/            # API route files
│   │   ├── middleware/        # Express middleware
│   │   └── index.ts           # App entry point
│   └── prisma/
│       └── schema.prisma      # Database schema
├── www/             # Customer website (TailGrids)
└── docs/            # All documentation
    └── FEATURE_PLANS/         # Feature specifications
```

---

## ⚙️ Required Utilities & Patterns

### Backend (Express + Prisma)

#### 1. API Route Structure
**Pattern to Follow:** See `/back/src/routes/products.ts` or `/back/src/routes/customers.ts`

```typescript
// Required imports
import { Router } from 'express';
import { z } from 'zod';
import prisma from '../prisma-client.js';

const router = Router();

// Validation schemas with Zod
const CreateSchema = z.object({
  name: z.string().min(1),
  // ... other fields
});

// Routes with proper error handling
router.get('/api/resource', async (req, res) => {
  try {
    const data = await prisma.resource.findMany();
    res.json(data);
  } catch (error) {
    console.error('Error fetching resource:', error);
    res.status(500).json({
      error: 'Failed to fetch resource',
      details: error.message
    });
  }
});

export default router;
```

**✅ DO:**
- Use Zod for input validation
- Wrap all routes in try-catch blocks
- Return proper HTTP status codes (200, 201, 400, 404, 500)
- Use Prisma for database queries
- Handle errors with descriptive messages

**❌ DON'T:**
- Skip input validation
- Return raw error objects to client
- Use raw SQL queries (use Prisma)
- Forget to register route in `/back/src/index.ts`

#### 2. Register Routes in `/back/src/index.ts`

```typescript
// Import at top
import resourceRouter from './routes/resource.js';

// Mount after other routes
app.use(resourceRouter);
```

#### 3. Price Handling Convention

**CRITICAL:** Bloom stores prices in **cents** (integers) in the database, displays in dollars.

```typescript
// Database → Client (cents to dollars)
const priceInDollars = priceInCents / 100;

// Client → Database (dollars to cents)
const priceInCents = Math.round(priceInDollars * 100);
```

#### 4. Prisma Query Patterns

**Use Transactions for Multi-Step Operations:**
```typescript
await prisma.$transaction(async (tx) => {
  const item = await tx.item.create({ data: { ... } });
  await tx.relatedItem.create({ data: { itemId: item.id } });
});
```

**Proper Relations:**
```typescript
// Include relations
const products = await prisma.product.findMany({
  include: {
    category: true,
    variants: true
  }
});

// Select specific fields for performance
const products = await prisma.product.findMany({
  select: {
    id: true,
    name: true,
    category: { select: { name: true } }
  }
});
```

---

### Frontend (React 19 + Vite + TailAdmin)

#### 1. API Client Hook (REQUIRED)

**✅ ALWAYS USE:** `/admin/src/shared/hooks/useApiClient.ts`

```typescript
import useApiClient from '@shared/hooks/useApiClient';

function MyComponent() {
  const apiClient = useApiClient();

  // ✅ Correct
  const data = await apiClient.get('/api/resource');

  // ❌ WRONG - Don't use fetch() directly
  const data = await fetch('/api/resource');
}
```

**Why:** Centralized error handling, authentication headers, base URL configuration.

#### 2. Custom Hook Pattern

**Pattern to Follow:** See `/admin/src/shared/hooks/useProducts.ts` or `/admin/src/shared/hooks/useCustomers.ts`

```typescript
import { useState, useCallback, useEffect } from 'react';
import useApiClient from './useApiClient';

export interface Resource {
  id: string;
  name: string;
  // ... other fields
}

export function useResources() {
  const apiClient = useApiClient();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchResources = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<Resource[]>('/api/resources');
      setResources(data);
    } catch (err) {
      setError('Failed to load resources');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  const createResource = useCallback(async (data: Partial<Resource>) => {
    try {
      const created = await apiClient.post<Resource>('/api/resources', data);
      setResources(prev => [...prev, created]);
      return created;
    } catch (err) {
      throw new Error('Failed to create resource');
    }
  }, [apiClient]);

  return { resources, loading, error, refresh: fetchResources, createResource };
}
```

**✅ DO:**
- Create custom hooks for data fetching in `/admin/src/shared/hooks/`
- Use TypeScript interfaces exported from the hook
- Include loading, error, and data states
- Use useCallback for memoization
- Return refresh function for manual refetch

#### 3. Component Structure

**Pattern to Follow:** See `/admin/src/app/components/settings/` components

```typescript
import React, { useState } from 'react';
import ComponentCard from '@shared/ui/ComponentCard';
import Modal from '@shared/ui/Modal';
import { useResources } from '@shared/hooks/useResources';

export default function ResourceCard() {
  const { resources, loading, error, refresh } = useResources();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Loading state
  if (loading) {
    return (
      <ComponentCard title="Resources">
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </ComponentCard>
    );
  }

  // Error state
  if (error) {
    return (
      <ComponentCard title="Resources">
        <div className="text-red-500 text-sm">{error}</div>
      </ComponentCard>
    );
  }

  // Empty state
  if (resources.length === 0) {
    return (
      <ComponentCard title="Resources">
        <p className="text-gray-500 text-sm">No resources found.</p>
      </ComponentCard>
    );
  }

  return (
    <ComponentCard title="Resources">
      {/* Content */}
    </ComponentCard>
  );
}
```

**✅ DO:**
- Use `ComponentCard` wrapper for settings pages
- Show loading spinner during async operations
- Display error messages in red text
- Provide empty states with helpful messages
- Use TailAdmin utility classes

#### 4. TailAdmin Styling Patterns

**✅ USE THESE CLASSES (Match existing patterns):**

```typescript
// Buttons
<button className="flex justify-center rounded bg-primary py-2 px-6 font-medium text-gray hover:bg-opacity-90">
  Primary Button
</button>

<button className="flex justify-center rounded border border-stroke py-2 px-6 font-medium text-black hover:shadow-1 dark:border-strokedark dark:text-white">
  Secondary Button
</button>

// Form Inputs
<input
  type="text"
  className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
/>

// Tables
<div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
  <table className="w-full table-auto">
    <thead>
      <tr className="bg-gray-2 text-left dark:bg-meta-4">
        <th className="py-4 px-4 font-medium text-black dark:text-white">Header</th>
      </tr>
    </thead>
    <tbody>
      <tr className="border-b border-stroke dark:border-strokedark">
        <td className="py-5 px-4">Cell</td>
      </tr>
    </tbody>
  </table>
</div>

// Cards
<div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
  <div className="border-b border-stroke py-4 px-6.5 dark:border-strokedark">
    <h3 className="font-medium text-black dark:text-white">Card Title</h3>
  </div>
  <div className="p-6.5">
    {/* Content */}
  </div>
</div>
```

**❌ DON'T:**
- Introduce new design tokens or color schemes
- Use inline styles
- Use non-TailAdmin component libraries
- Break dark mode support (always include `dark:` variants)

#### 5. React Multi-Select Pattern

**Pattern Used in Bloom:** See `/admin/src/app/components/settings/orders/AddOnGroupForm.tsx`

```typescript
import Select from 'react-select';

<Select
  isMulti
  options={options.map(opt => ({ value: opt.id, label: opt.name }))}
  value={selectedValues}
  onChange={setSelectedValues}
  className="basic-multi-select"
  classNamePrefix="select"
  placeholder="Select options..."
/>
```

---

## 🗄️ Database (Prisma) Conventions

### 1. Schema Patterns

**Follow These Conventions:**

```prisma
// Model naming: PascalCase, singular
model Product {
  // IDs: Always UUID strings
  id        String   @id @default(uuid())

  // Timestamps: Include for auditing
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Prices: Store in CENTS as integers
  priceInCents Int

  // Enums: Use for fixed value sets
  status ProductStatus @default(ACTIVE)

  // Relations: Use descriptive names
  category   Category @relation(fields: [categoryId], references: [id])
  categoryId String

  // Many-to-many: Use explicit join tables
  tags ProductTag[]
}

// Join table pattern
model ProductTag {
  id        String  @id @default(uuid())
  productId String
  tagId     String
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  tag       Tag     @relation(fields: [tagId], references: [id], onDelete: Cascade)

  // Prevent duplicates
  @@unique([productId, tagId])
}

// Enums: PascalCase
enum ProductStatus {
  ACTIVE
  INACTIVE
  ARCHIVED
}
```

**✅ DO:**
- Use UUIDs for primary keys
- Include `createdAt` and `updatedAt` timestamps
- Add `@@unique` constraints to prevent duplicates
- Add `onDelete: Cascade` for cleanup
- Store prices in cents (integers)
- Use enums for fixed value sets

**❌ DON'T:**
- Use auto-increment integers for IDs
- Forget cascade delete behavior
- Store prices as decimals/floats
- Use strings for status fields (use enums)

### 2. Required Migration Steps

After modifying `schema.prisma`:

```bash
# Generate migration
npx prisma migrate dev --name descriptive_migration_name

# Apply to database
npx prisma generate

# Verify schema
npx prisma validate
```

---

## 🚀 Advanced Integration Patterns

### 1. WebSocket Integration Pattern

**Pattern to Follow:** See `/back/src/services/printService.ts` and `/back/src/index.ts`

**Use Case:** Real-time client updates (print jobs, notifications, live status updates)

**Backend Setup:**

```typescript
// In /back/src/index.ts
import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ noServer: true });

// Upgrade HTTP connections to WebSocket
server.on('upgrade', (request, socket, head) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;

  if (pathname === '/print-agent') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

// Handle connections
wss.on('connection', (ws) => {
  console.log('✅ WebSocket client connected');

  ws.on('message', (message) => {
    const data = JSON.parse(message.toString());
    // Handle messages (HEARTBEAT, STATUS_UPDATE, etc.)
  });

  ws.on('close', () => {
    console.log('❌ WebSocket client disconnected');
  });
});
```

**Service Pattern:**

```typescript
// /back/src/services/myWebSocketService.ts
import { WebSocketServer } from 'ws';

let wss: WebSocketServer | null = null;

export function setWebSocketServer(server: WebSocketServer) {
  wss = server;
}

export function broadcastToClients(message: object) {
  if (!wss) return;

  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // OPEN
      client.send(JSON.stringify(message));
    }
  });
}
```

**Client Pattern (Electron/Browser):**

```typescript
// Electron/Node.js client
import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:4000/print-agent');

ws.on('open', () => {
  console.log('✅ Connected to backend');
  // Send heartbeat
  ws.send(JSON.stringify({ type: 'HEARTBEAT', agentId: 'agent-123' }));
});

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());
  // Handle server messages (JOB_CREATED, STATUS_UPDATE, etc.)
});

ws.on('close', () => {
  console.log('❌ Disconnected, attempting reconnect...');
  setTimeout(() => connectWebSocket(), 5000);
});
```

**✅ DO:**
- Use message types for routing (`{ type: 'JOB_CREATED', data: {...} }`)
- Implement heartbeat/ping-pong for connection health
- Handle reconnection logic on client
- Broadcast to all clients or target specific ones by ID
- Check `client.readyState === 1` before sending

**❌ DON'T:**
- Send unstructured messages (always use JSON with type field)
- Forget to handle client disconnections
- Block the main thread with WebSocket operations
- Skip error handling for malformed messages

---

### 2. Image Upload Pattern (Cloudflare R2)

**Pattern to Follow:** See `/back/src/routes/wire-products.ts` and `/back/src/utils/r2Client.ts`

**Use Case:** Upload images to Cloudflare R2 and get public URLs

**R2 Client Setup:**

```typescript
// /back/src/utils/r2Client.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const R2_ACCOUNT_ID = process.env.CLOUDFLARE_R2_ACCOUNT_ID!;
const R2_ACCESS_KEY_ID = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!;
const R2_BUCKET = process.env.CLOUDFLARE_R2_BUCKET!;
const R2_PUBLIC_URL = process.env.CLOUDFLARE_R2_PUBLIC_URL!;

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

export async function uploadToR2(
  fileBuffer: Buffer,
  fileName: string,
  contentType: string
): Promise<string> {
  const key = `${Date.now()}-${fileName}`;

  await r2Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
    })
  );

  return `${R2_PUBLIC_URL}/${key}`;
}
```

**Route Implementation:**

```typescript
// Upload from external URL
router.post('/api/resource/upload-from-url', async (req, res) => {
  try {
    const { imageUrl } = req.body;

    // Fetch image from external source
    const response = await fetch(imageUrl);
    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    // Upload to R2
    const r2Url = await uploadToR2(buffer, 'image.jpg', contentType);

    res.json({ url: r2Url });
  } catch (error) {
    console.error('Upload failed:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Upload from multipart form data
router.post('/api/resource/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const r2Url = await uploadToR2(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    res.json({ url: r2Url });
  } catch (error) {
    console.error('Upload failed:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});
```

**✅ DO:**
- Generate unique filenames (use timestamp + original name)
- Set correct Content-Type headers
- Store resulting R2 URL in database
- Handle upload errors gracefully
- Validate file types and sizes before upload

**❌ DON'T:**
- Upload files synchronously without error handling
- Store uploaded files locally (use R2 directly)
- Expose R2 credentials to frontend
- Skip file validation (size, type)

---

### 3. Batch Operations & Data Merge Pattern

**Pattern to Follow:** See `/back/src/routes/customerDuplicates.ts`

**Use Case:** Merge duplicate records, bulk updates, batch processing

**Duplicate Detection Pattern:**

```typescript
router.get('/api/resources/duplicates', async (req, res) => {
  try {
    // Fetch all records
    const resources = await prisma.resource.findMany({
      select: { id: true, name: true, email: true, phone: true }
    });

    // Group by similarity (fuzzy matching)
    const groups: Record<string, typeof resources> = {};

    for (const resource of resources) {
      // Create similarity key (lowercase, trimmed)
      const key = `${resource.name?.toLowerCase().trim()}_${resource.email?.toLowerCase().trim()}`;

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(resource);
    }

    // Filter groups with duplicates only
    const duplicates = Object.values(groups).filter(group => group.length > 1);

    res.json({ duplicates });
  } catch (error) {
    console.error('Duplicate detection failed:', error);
    res.status(500).json({ error: 'Detection failed' });
  }
});
```

**Merge Operation Pattern:**

```typescript
router.post('/api/resources/merge', async (req, res) => {
  try {
    const { masterResourceId, duplicateResourceIds } = req.body;

    // Use transaction for atomicity
    await prisma.$transaction(async (tx) => {
      // 1. Reassign all foreign key relationships
      await tx.relatedItem.updateMany({
        where: { resourceId: { in: duplicateResourceIds } },
        data: { resourceId: masterResourceId }
      });

      // 2. Consolidate unique relationships (prevent duplicates)
      const existingLinks = await tx.resourceLink.findMany({
        where: { resourceId: masterResourceId },
        select: { linkedId: true }
      });
      const existingLinkedIds = new Set(existingLinks.map(l => l.linkedId));

      const duplicateLinks = await tx.resourceLink.findMany({
        where: { resourceId: { in: duplicateResourceIds } }
      });

      // Create only non-duplicate links
      for (const link of duplicateLinks) {
        if (!existingLinkedIds.has(link.linkedId)) {
          await tx.resourceLink.create({
            data: {
              resourceId: masterResourceId,
              linkedId: link.linkedId
            }
          });
        }
      }

      // 3. Delete old links
      await tx.resourceLink.deleteMany({
        where: { resourceId: { in: duplicateResourceIds } }
      });

      // 4. Delete duplicate records
      await tx.resource.deleteMany({
        where: { id: { in: duplicateResourceIds } }
      });
    });

    res.json({ success: true, message: 'Resources merged successfully' });
  } catch (error) {
    console.error('Merge failed:', error);
    res.status(500).json({ error: 'Merge operation failed' });
  }
});
```

**Bulk Update Pattern:**

```typescript
router.post('/api/resources/bulk-update', async (req, res) => {
  try {
    const { resourceIds, updates } = req.body;

    // Validate updates
    const UpdateSchema = z.object({
      status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
      categoryId: z.string().uuid().optional()
    });

    const validatedUpdates = UpdateSchema.parse(updates);

    // Perform bulk update
    const result = await prisma.resource.updateMany({
      where: { id: { in: resourceIds } },
      data: validatedUpdates
    });

    res.json({ updated: result.count });
  } catch (error) {
    console.error('Bulk update failed:', error);
    res.status(500).json({ error: 'Bulk update failed' });
  }
});
```

**✅ DO:**
- Use transactions for multi-step merge operations
- Validate all IDs exist before merging
- Reassign foreign key relationships to master record
- Prevent duplicate relationships (check existing before creating)
- Provide detailed success/error messages
- Log merge operations for audit trail

**❌ DON'T:**
- Skip transaction wrapper (data consistency critical)
- Allow self-referential relationships (validate sender ≠ recipient)
- Delete records without reassigning relationships (data loss)
- Skip validation of input IDs
- Forget to handle cascade delete constraints

---

## 📝 Documentation Requirements

### 1. Update API Endpoints Documentation

**File:** `/docs/API_Endpoints.md`

Add your endpoints under the appropriate section:

```markdown
### Resource Management

#### Get All Resources
- **GET** `/api/resources`
- Returns array of resources with details
- Query params: `?include=relations` (optional)

#### Create Resource
- **POST** `/api/resources`
- Body: `{ name: string, description: string }`
- Returns: Created resource with ID
```

### 2. Update Progress Tracker

**File:** `/docs/Progress_Tracker.markdown`

Add completed features:

```markdown
## Recently Completed

### Resource Management (2025-11-02)
- ✅ CRUD API endpoints (`/back/src/routes/resources.ts`)
- ✅ Admin UI for managing resources (`/admin/src/app/components/settings/ResourceCard.tsx`)
- ✅ Integration with product form
```

### 3. Archive or Delete Feature Plan

After implementation, either:
- Move to `/docs/FEATURE_PLANS/archive/` directory, OR
- Delete the file if documented in Progress Tracker

---

## 🧪 Testing Requirements

### Manual Testing Checklist

For every feature, verify:

- [ ] **Create operation** - Can create new records
- [ ] **Read operation** - Can fetch and display data
- [ ] **Update operation** - Can modify existing records
- [ ] **Delete operation** - Can remove records
- [ ] **Validation** - Invalid inputs show error messages
- [ ] **Loading states** - Spinners appear during async operations
- [ ] **Error handling** - Network errors display user-friendly messages
- [ ] **Empty states** - Helpful message when no data exists
- [ ] **Dark mode** - UI works in both light and dark themes
- [ ] **Responsive** - Works on different screen sizes
- [ ] **Backend logs** - Check terminal for errors

### Test Both Servers

```bash
# Terminal 1 - Backend
cd back && npm run dev

# Terminal 2 - Admin Frontend
cd admin && npm run dev
```

**Test URLs:**
- Backend: http://localhost:4000
- Admin: http://localhost:5173

---

## 🚫 Common Mistakes to Avoid

### Backend
1. ❌ Forgetting to register routes in `/back/src/index.ts`
2. ❌ Not using Zod validation for inputs
3. ❌ Returning sensitive error details to client
4. ❌ Using raw SQL instead of Prisma
5. ❌ Not handling price conversions (cents ↔ dollars)
6. ❌ Missing try-catch error handling

### Frontend
7. ❌ Using `fetch()` instead of `useApiClient`
8. ❌ Not showing loading states
9. ❌ Forgetting dark mode classes (`dark:`)
10. ❌ Breaking TailAdmin styling patterns
11. ❌ Not creating custom hooks for data fetching
12. ❌ Missing TypeScript types

### Database
13. ❌ Not adding unique constraints on join tables
14. ❌ Forgetting cascade delete behavior
15. ❌ Using wrong data types (float for prices, etc.)
16. ❌ Not running migrations after schema changes

---

## 📋 Feature Plan Template (For AI Planners)

When creating feature plans in `/docs/FEATURE_PLANS/`, include this section:

```markdown
## Implementation Constraints for AI

**CRITICAL - Read Before Implementing:**

1. **Read these files first:**
   - `/docs/AI_IMPLEMENTATION_GUIDE.md` (this file)
   - `/docs/System_Reference.md`
   - `/docs/API_Endpoints.md`
   - `/CLAUDE.md`

2. **Required patterns:**
   - Backend: Use Zod validation, Prisma queries, proper error handling
   - Frontend: Use `useApiClient` hook, custom hooks pattern, TailAdmin styling
   - Database: UUID IDs, timestamps, unique constraints, cascade deletes

3. **Files to reference for patterns:**
   - Similar backend route: `/back/src/routes/[similar-route].ts`
   - Similar frontend component: `/admin/src/app/components/[similar-component].tsx`
   - Similar hook: `/admin/src/shared/hooks/use[SimilarHook].ts`

4. **Do NOT:**
   - Use `fetch()` directly (use `useApiClient`)
   - Create new styling patterns (use TailAdmin)
   - Skip input validation or error handling
   - Forget to register routes or update documentation

5. **Testing checklist:**
   - [ ] All CRUD operations work
   - [ ] Loading/error/empty states display correctly
   - [ ] Dark mode supported
   - [ ] Price handling correct (cents/dollars)
   - [ ] Documentation updated
```

---

## 🎓 Learning Resources

When unsure about patterns:

1. **Backend Patterns:** Study `/back/src/routes/products.ts` (most comprehensive)
2. **Frontend Components:** Study `/admin/src/app/components/settings/`
3. **Custom Hooks:** Study `/admin/src/shared/hooks/useProducts.ts`
4. **Database Schema:** Review `/back/prisma/schema.prisma` relationships
5. **TailAdmin Styling:** Browse existing components in `/admin/src/app/`

---

## 🤖 AI Assistant Guidelines

### For Planning AIs (Claude Code)
- Create detailed feature plans with specific file paths
- Include the "Implementation Constraints for AI" section
- Reference similar existing files for pattern matching
- Specify exact utilities and hooks to use

### For Implementation AIs (GPT-5 Codex)
- Read `AI_IMPLEMENTATION_GUIDE.md` BEFORE writing code
- Follow patterns from referenced similar files
- Use required utilities (useApiClient, etc.)
- Match existing styling exactly
- Test all CRUD operations before completing
- Update documentation files

### For Review AIs
- Check for deviation from patterns in this guide
- Verify required utilities are used
- Confirm documentation is updated
- Test all functionality manually

---

## 📞 Questions?

If patterns are unclear:
1. Check existing similar files in the codebase
2. Refer to `/docs/System_Reference.md`
3. Ask the user for clarification

**Remember:** Consistency > Innovation. Match existing patterns exactly.

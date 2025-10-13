# Bloom System Reference

**Version:** 1.0
**Last Updated:** January 2025
**Status:** Production-Ready (Single Timezone)

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Technical Architecture](#technical-architecture)
3. [Core Systems](#core-systems)
4. [Important Patterns](#important-patterns)
5. [API Reference](#api-reference)
6. [Database Schema](#database-schema)
7. [Business Rules](#business-rules)
8. [Development Standards](#development-standards)
9. [Deployment & Production](#deployment--production)

---

## System Overview

### Business Context

Bloom is a comprehensive flower shop management system designed to digitize and streamline operations for a full-service flower shop specializing in floral arrangements, wedding services, and events.

**Business Ecosystem:**
- In-Store Operations (POS Terminal)
- Phone Orders (TakeOrderPage)
- Customer E-commerce Website (TailGrids-based, planned)
- Wedding & Event Management (Quote system)
- Subscription Services (Recurring deliveries)
- House Account Management (Customer credit accounts)
- Gift Card System (Purchase & redemption)
- Multi-location Expansion (Future café integration)

**Owner:** Cristian Janz, self-taught developer managing all aspects of development
**Hardware:** MacBook M1
**Time Commitment:** 2-3 hours/day, 6-month timeline

### Current Production Status

**✅ Production-Ready Features:**
- POS System (Touch-optimized, card-based UX)
- Payment Processing (Stripe + Square integration)
- Order Management (Complete workflow system)
- Customer Management (Phone-first identification)
- Delivery & Logistics (Google Maps integration)
- Gift Card System (Physical & digital cards)
- Settings System (7 of 45 planned cards complete)
- Notification System (SMS + Email via Twilio/SendGrid)

**⚠️ Important Limitations:**
- **Single-Timezone Only:** Server must run in `America/Vancouver` timezone OR set `TZ=America/Vancouver` environment variable
- **Multi-Timezone Expansion:** Requires full timezone-aware implementation (see `/docs/Timezone_Issues_and_Fixes.md`)

**🔮 Planned Features:**
- Customer E-commerce Website
- Event/Wedding Manager (Designed, ready for implementation)
- Unified Discount System (Replaces traditional coupon system)
- Subscription Management Portal
- Mobile Driver App

---

## Technical Architecture

### Tech Stack

**Frontend:**
- React 19 + Vite 6 + TypeScript
- TailAdmin v4 (Admin POS/Management)
- TailGrids (Customer website, planned)
- Tailwind CSS 4.0.8
- Brand Color: `#597485` (custom flower shop green)

**Backend:**
- Node.js + Express
- Prisma ORM
- PostgreSQL database

**External Services:**
- Stripe (primary payment processor)
- Square (POS/phone order payments)
- Twilio (SMS notifications)
- SendGrid (email notifications)
- Supabase (image storage)
- Google Maps API (delivery calculations)

**Development Servers:**
- Backend: Port 4000 (`cd back && npm run dev:back`)
- Frontend: Port 5174 (`cd admin && npm run dev`)

### Project Structure

```
bloom-app/
├── admin/src/          # TailAdmin POS & Management System
│   ├── app/            # Application pages and components
│   ├── domains/        # Domain-driven design modules
│   ├── shared/         # Shared UI components and utilities
│   └── icons/          # Local icon library
├── website/src/        # TailGrids Customer E-commerce (Planned)
├── back/               # Express API & Database
│   ├── src/
│   │   ├── routes/     # API endpoints
│   │   ├── services/   # Business logic
│   │   └── utils/      # Utility functions
│   └── prisma/         # Database schema and migrations
└── docs/               # Project documentation
```

### Domain-Driven Design

**Architecture:** Modular DDD with clear domain boundaries

**Key Domains:**
- **Orders:** Order creation, status management, fulfillment
- **Customers:** Customer data, address management, preferences
- **Products:** Product catalog, pricing, availability
- **Payments:** Payment processing, transactions, refunds
- **Delivery:** Route planning, address validation, driver coordination
- **Events:** Wedding/event quotes, production tracking
- **Notifications:** Multi-channel communication system

---

## Core Systems

### 1. POS System

#### Overview
Touch-optimized point-of-sale system with 75/25 split layout (product grid left, order card right).

#### Key Features

**Layout & UX:**
- 75% product grid (left), 25% order card (right)
- Fixed split layout (no adjustable divider)
- Responsive: Desktop/tablet (two-panel), mobile (collapsible sidebar)
- Touch Optimization: Large touch targets (60px+), swipe gestures, card-based design

**Product Display:**
- Dynamic category tabs (Roses, Arrangements, etc.)
- Product cards with images, prices, and quick-add
- Responsive grid (180px buttons, 4:5 aspect ratio, 24px gaps)
- Pill-style category tabs with scrollable navigation

**Cart Functionality:**
- Add/remove/edit items
- Custom products
- Quantity adjustments
- Price editing
- Customer selection
- Displays items, quantities, prices, totals

**TakeOrderPage Integration:**
- Fullscreen overlay for delivery orders
- Persists cart between POS and TakeOrder
- "Send to POS" payment method
- Seamless data transfer without page reloads
- Card-based UX for phone orders

#### Implementation Files

**Key Components:**
- `/admin/src/app/pages/pos/POSPage.tsx` - Main POS interface
- `/admin/src/app/pages/orders/TakeOrderPage.tsx` - Phone order interface
- `/admin/src/app/components/products/ProductGrid.tsx` - Product display
- `/admin/src/app/components/orders/OrderCard.tsx` - Cart display

---

### 2. Payment System

#### Overview
Enterprise-level payment processing with PT-XXXX transaction numbering, multi-provider support, and saved payment methods.

#### Architecture

**PT-XXXX Transaction System:**
- Sequential numbering: PT-00001, PT-00002, etc.
- One PT per payment session
- Multi-order support (single PT can cover multiple orders)
- Split payment design (multiple payment methods within one PT)

**Payment Providers:**
- **Stripe:** Website sales, saved cards
- **Square:** POS/phone orders, terminal integration
- **Internal:** Gift card system, house accounts

**Channel Support:**
- POS Direct (walk-in sales)
- Phone Orders (TakeOrderPage)
- Website Sales (future)

#### Database Models

**PaymentTransaction:**
```prisma
model PaymentTransaction {
  id                String         @id
  transactionNumber String         @unique  // PT-00001
  totalAmount       Decimal
  status            TransactionStatus
  createdAt         DateTime
  paymentMethods    PaymentMethod[]
  orderPayments     OrderPayment[]
  refunds           Refund[]
}
```

**PaymentMethod:**
```prisma
model PaymentMethod {
  id            String
  transactionId String
  type          PaymentMethodType  // CASH, CARD, CHECK, GIFT_CARD, etc.
  provider      String?            // stripe, square
  amount        Decimal
  metadata      Json?
}
```

**Saved Payment Methods:**
```prisma
model SavedPaymentMethod {
  id             String
  customerId     String
  provider       String           // stripe, square
  providerCardId String          // Provider's card ID
  last4          String          // Last 4 digits
  brand          String          // visa, mastercard, etc.
  expiryMonth    Int
  expiryYear     Int
}
```

#### Key Features

**Saved Payment Methods (Enterprise-Level):**
- Phone-first customer identification
- Displays saved cards with masked numbers (•••• •••• •••• 4242)
- One-click payment with saved cards
- Dual-provider support (Stripe + Square)
- Automatic card saving on successful transactions
- Customer creation/linking across providers

**Payment Flows:**
- Terminal + Manual Entry modes
- Split payments (cash + card)
- Multi-order single payment
- Gift card purchase and redemption
- House account management

**Gift Card Rules:**
- Allowed: Phone orders, POS direct, POS combined transactions
- Forbidden: Delivery orders within POS (apply at POS checkout for security)
- Tax Compliance: Gift cards are non-taxable

#### Implementation Files

**Key Components:**
- `/admin/src/domains/payments/PaymentController.ts` - Payment orchestration
- `/admin/src/app/components/payments/CardPaymentModal.tsx` - Card payment UI
- `/admin/src/app/components/payments/SavedCardsList.tsx` - Saved cards display
- `/back/src/routes/payments/` - Payment API endpoints
- `/back/src/services/paymentService.ts` - Payment business logic

**API Endpoints:**
- `POST /api/payment-transactions` - Create new transaction
- `POST /api/payment-transactions/:id/methods` - Add payment method
- `GET /api/saved-payment-methods/:customerId` - Get customer's saved cards
- `POST /api/saved-payment-methods` - Save new payment method
- `POST /api/payments/stripe/process` - Process Stripe payment
- `POST /api/payments/square/process` - Process Square payment

---

### 3. Order Status System

#### Overview
Complete 9-status workflow system with smart display based on order type (DELIVERY vs PICKUP).

#### Status Workflow

**Core Workflow:**
```
DRAFT → PAID → IN_DESIGN → READY → OUT_FOR_DELIVERY → COMPLETED
```

**POS Walk-In Sales:**
```
DRAFT → PAID → COMPLETED
```

**Pickup Orders:**
```
DRAFT → PAID → IN_DESIGN → READY → COMPLETED (displays as "Picked Up")
```

**Delivery Orders:**
```
DRAFT → PAID → IN_DESIGN → READY → OUT_FOR_DELIVERY → COMPLETED (displays as "Delivered")
```

**Exception Handling:**
```
CANCELLED - From DRAFT, PAID, or IN_DESIGN
REJECTED - Quality control failure from IN_DESIGN
```

#### Status Definitions

**Active Statuses:**
| Status | Display Name | Color | When Used |
|--------|-------------|-------|-----------|
| DRAFT | Draft | Gray | Initial order creation |
| PAID | Paid | Blue | Payment received |
| IN_DESIGN | In Design | Yellow/Orange | Custom arrangements being prepared |
| READY | Ready for Pickup/Delivery* | Green | Ready for next step |
| OUT_FOR_DELIVERY | Out for Delivery | Green | Driver en route |

*Smart display based on order type

**Final Statuses:**
| Status | Display Name | Color | When Used |
|--------|-------------|-------|-----------|
| COMPLETED | Completed/Delivered/Picked Up* | Green | Final success state |
| CANCELLED | Cancelled | Red | Order cancelled |
| REJECTED | Rejected | Red | Quality control failure |

*Smart display based on order type

#### Visual Design - Color Scheme

**Badge Component "Light Variant" Colors:**

- **Gray** (Initial/Terminal): `bg-gray-100 text-gray-700` / `bg-white/5 text-white/80`
- **Blue** (Payment): `bg-blue-light-50 text-blue-light-500` / `bg-blue-light-500/15 text-blue-light-500`
- **Yellow/Orange** (Work In Progress): `bg-warning-50 text-warning-600` / `bg-warning-500/15 text-orange-400`
- **Green** (Ready/Success): `bg-success-50 text-success-600` / `bg-success-500/15 text-success-500`
- **Red** (Error/Cancelled): `bg-error-50 text-error-600` / `bg-error-500/15 text-error-500`

#### SMS Notification Triggers

**Automatic Notifications:**
- **PAID:** Order confirmation SMS to customer
- **READY:** "Order ready" SMS (pickup) or "Preparing for delivery" SMS
- **OUT_FOR_DELIVERY:** SMS to recipient with delivery tracking
- **COMPLETED/DELIVERED/PICKED_UP:** Final completion SMS with receipt

#### UI Components

**StatusBadge Component:**
```tsx
<StatusBadge
  status={order.status}
  orderType={order.type}
/>
```
- Read-only status display
- Smart text based on order type
- Consistent colors across system

**StatusSelect Component:**
```tsx
<StatusSelect
  options={getStatusOptions(order.type)}
  value={order.status}
  onChange={handleStatusChange}
  orderType={order.type}
/>
```
- Interactive badge-styled dropdown
- Normalizes frontend statuses to backend statuses
- Single compact element for status changes

#### Implementation Files

**Key Files:**
- `/admin/src/app/components/orders/StatusBadge.tsx` - Read-only badge
- `/admin/src/shared/ui/forms/StatusSelect.tsx` - Interactive dropdown
- `/admin/src/shared/utils/orderStatusHelpers.ts` - Helper functions
- `/admin/src/shared/ui/components/ui/badge/Badge.tsx` - Base badge component
- `/back/prisma/schema.prisma` - OrderStatus enum
- `/back/src/utils/notificationTriggers.ts` - SMS triggers

**Helper Functions:**
```typescript
getStatusDisplayText(status, orderType?) // Get human-readable text
getStatusColor(status) // Get Tailwind CSS classes
getStatusOptions(orderType?) // Get dropdown options
getNextStatuses(currentStatus, orderType?) // Get valid transitions
isValidStatusTransition(fromStatus, toStatus, orderType?) // Validate transition
getAllStatuses() // Get all statuses
isFinalStatus(status) // Check if terminal state
isActiveStatus(status) // Check if active state
getStatusProgress(status, orderType?) // Get progress percentage
```

---

### 4. Customer Management

#### Overview
Phone-first customer identification system with address management and duplicate prevention.

#### Key Features

**Phone-First Identification:**
- Primary lookup by phone number
- Works across both Stripe and Square
- Automatic customer creation/linking
- Duplicate prevention via API integration

**Address Management:**
- Multiple delivery addresses per customer
- Address shortcuts for common venues
- Google Places autocomplete
- Timezone handling for multi-region support (future)

**Recipient Management:**
- Three-option workflow for existing recipients:
  1. Update existing recipient
  2. Create new from scratch
  3. Duplicate with new name
- Separate recipient details from purchaser
- Gift delivery support

**Customer Data:**
- Contact information (name, phone, email)
- Delivery addresses
- Order history
- Saved payment methods (Stripe + Square)
- Notes and preferences

#### Database Schema

**Customer Model:**
```prisma
model Customer {
  id          String
  phone       String    @unique
  email       String?
  firstName   String
  lastName    String
  addresses   Address[]
  orders      Order[]
  savedCards  SavedPaymentMethod[]
  notes       String?
  createdAt   DateTime
}
```

**Address Model:**
```prisma
model Address {
  id         String
  customerId String
  customer   Customer
  address1   String
  address2   String?
  city       String
  province   String
  postalCode String
  country    String    @default("Canada")
  isDefault  Boolean   @default(false)
  label      String?   // "Home", "Work", etc.
}
```

#### Implementation Files

**Key Files:**
- `/admin/src/app/components/customers/CustomerLookup.tsx` - Phone-based search
- `/admin/src/app/components/customers/cards/AdditionalAddressesCard.tsx` - Address management
- `/admin/src/app/components/orders/RecipientCard.tsx` - Recipient selection
- `/back/src/routes/customers.ts` - Customer API
- `/back/src/services/customerService.ts` - Business logic

**API Endpoints:**
- `GET /api/customers?phone=` - Search by phone
- `POST /api/customers` - Create customer
- `GET /api/customers/:id/addresses` - Get addresses
- `POST /api/customers/:id/addresses` - Add address
- `PUT /api/customers/:id/merge/:targetId` - Merge customers
- `DELETE /api/customers/:id` - Delete customer

---

### 5. Delivery & Logistics

#### Overview
Zone-based delivery system with Google Maps integration and intelligent scheduling.

#### Key Features

**Zone-Based Pricing:**
- Delivery zones with configurable pricing
- Free delivery thresholds
- Manual override capability
- Distance-based calculations

**Address Management:**
- Google Places autocomplete
- Address shortcuts for common venues
- Timezone handling
- Address validation

**Scheduling:**
- Delivery date picker with restrictions
- Business hours validation
- Holiday restrictions
- Prep-time management per product
- Route optimization for drivers (planned)

**Delivery Tracking:**
- Active deliveries by date
- Driver assignment (planned)
- Status updates (OUT_FOR_DELIVERY → DELIVERED)
- SMS notifications to recipients

#### Database Schema

**Delivery Settings:**
```prisma
model DeliveryCharge {
  id            String
  zoneName      String
  baseCharge    Decimal
  freeThreshold Decimal?
  description   String?
}
```

**Order Delivery Fields:**
```prisma
model Order {
  type            OrderType       // DELIVERY or PICKUP
  deliveryDate    DateTime?
  deliveryAddress String?
  deliveryCharge  Decimal?
  recipientName   String?
  recipientPhone  String?
  specialInstructions String?
}
```

#### Implementation Files

**Key Files:**
- `/admin/src/app/pages/delivery/DeliveryPage.tsx` - Delivery management
- `/admin/src/app/components/orders/DeliveryDatePicker.tsx` - Date selection
- `/admin/src/app/components/orders/AddressAutocomplete.tsx` - Google Places
- `/back/src/routes/orders/delivery.ts` - Delivery API
- `/back/src/routes/settings/delivery.ts` - Settings API

**API Endpoints:**
- `GET /api/orders/delivery?date=` - Get deliveries by date
- `GET /api/orders/delivery/count/future` - Future order counts
- `GET /api/settings/delivery-charges` - Get zones
- `POST /api/settings/delivery-charges` - Create zone
- `PUT /api/orders/:id/status` - Update delivery status

---

### 6. Gift Card System

#### Overview
Complete gift card purchase/activation workflow supporting both physical and digital cards.

#### Key Features

**Card Types:**
- **Physical Cards:** Enter preprinted card numbers, activate with customer details
- **Digital Cards:** System-generated card numbers (GC-XXXX-XXXX format), email delivery

**Workflows:**
- Purchase workflow with recipient management
- Activation workflow for physical cards
- Redemption at checkout (POS and phone orders)
- Print functionality for immediate handoff
- Balance management and tracking

**Business Rules:**
- Tax Compliance: Gift cards are non-taxable (respects product isTaxable flags)
- Integration: Works in both POS and TakeOrder with PT-XXXX transaction system
- Security: Delivery orders cannot use gift cards within POS (apply at POS checkout)

**Card Status Tracking:**
```
INACTIVE → ACTIVE → USED/EXPIRED
```

#### Database Schema

**GiftCard Model:**
```prisma
model GiftCard {
  id              String
  cardNumber      String          @unique  // GC-XXXX-XXXX
  initialBalance  Decimal
  currentBalance  Decimal
  status          GiftCardStatus  // INACTIVE, ACTIVE, USED, EXPIRED
  purchaserName   String?
  purchaserEmail  String?
  recipientName   String?
  recipientEmail  String?
  activatedAt     DateTime?
  expiresAt       DateTime?
  transactions    GiftCardTransaction[]
}
```

**GiftCardTransaction Model:**
```prisma
model GiftCardTransaction {
  id          String
  giftCardId  String
  giftCard    GiftCard
  orderId     String?
  order       Order?
  amount      Decimal
  type        TransactionType  // PURCHASE, REDEMPTION, REFUND
  createdAt   DateTime
}
```

#### Implementation Files

**Key Files:**
- `/admin/src/app/pages/giftcards/GiftCardsPage.tsx` - Management interface
- `/admin/src/app/components/payments/GiftCardModal.tsx` - Purchase/activation
- `/admin/src/app/components/payments/GiftCardRedemptionModal.tsx` - Redemption
- `/back/src/routes/giftcards.ts` - Gift card API
- `/back/src/services/giftCardService.ts` - Business logic

**API Endpoints:**
- `POST /api/giftcards` - Create/activate gift card
- `GET /api/giftcards/:cardNumber` - Lookup card
- `POST /api/giftcards/:id/redeem` - Apply to order
- `GET /api/giftcards/:id/transactions` - Transaction history
- `PUT /api/giftcards/:id/deactivate` - Deactivate card

---

## Important Patterns

### 1. Image Upload Pattern

#### Overview
Immediate upload with crop-before-upload pattern using Supabase storage.

#### User Flow

```
User selects image
  → Crop Modal opens
    → User crops (Free or Square aspect ratio)
      → Image uploads immediately to Supabase
        → Success feedback + preview shown
          → User continues editing other fields
            → Click Save → Only saves other data (not images)
```

#### Why Immediate Upload?

✅ **Industry Standard** - Matches Shopify, WooCommerce, Instagram
✅ **Better UX** - Instant feedback, feels faster
✅ **Error Handling** - User knows immediately if upload fails
✅ **Simpler Save** - Form save only handles metadata, not files

#### Implementation

**Frontend Components:**

**ImageCropModal:**
```tsx
<ImageCropModal
  image={imageToEdit}
  onCropComplete={handleCropComplete}
  onCancel={() => setCropModalOpen(false)}
/>
```

Features:
- Free crop (any aspect ratio)
- Square crop (1:1 locked)
- Zoom in/out
- Drag to reposition
- Real-time preview

**Image Upload Service:**
```typescript
import { uploadImage, deleteImage, fileToDataURL } from "@shared/utils/imageUploadService";

// Upload
const imageUrl = await uploadImage(croppedBlob, 'products');

// Delete
await deleteImage(imageUrl, 'products');

// Convert for preview
const dataUrl = await fileToDataURL(file);
```

**Supabase Configuration:**

**Bucket:** `images`
**Folders:**
- `products/` - Product images
- `orders/` - Order completion/delivery images
- `events/` - Event/wedding photos (future)

**Required Storage Policies:**
- INSERT Policy: `bucket_id = 'images' AND auth.role() = 'anon'`
- DELETE Policy: `bucket_id = 'images' AND auth.role() = 'anon'`
- SELECT Policy: `bucket_id = 'images' AND auth.role() = 'anon'`

**Environment Variables:**
```env
VITE_SUPABASE_URL=https://iohmuzityuugpypvlkft.supabase.co
VITE_SUPABASE_SERVICE_ROLE_KEY=your-anon-key-here
```

#### Implementation Pattern

**For Product Images (Complete):**

```typescript
const handleFileSelect = async (files: FileList | null) => {
  const dataUrl = await fileToDataURL(file);
  setImageToEdit(dataUrl);
  setCropModalOpen(true);
};

const handleCropComplete = async (croppedBlob: Blob) => {
  const imageUrl = await uploadImage(croppedBlob, 'products');
  onImageUploaded(imageUrl);  // Adds to state
};

const handleDeleteImage = async (imageUrl: string) => {
  await deleteImage(imageUrl, 'products');
  onImageDeleted(imageUrl);  // Removes from state
};
```

**Backend Changes:**

Images already uploaded, just save URLs:
```typescript
router.put('/:id', async (req, res) => {
  const { images } = req.body;  // Array of URLs
  updateData.images = images;
  // Save to database
});
```

#### Implementation Files

**Key Files:**
- `/admin/src/shared/ui/components/ui/modal/ImageCropModal.tsx` - Crop modal
- `/admin/src/shared/utils/imageUploadService.ts` - Upload/delete utilities
- `/admin/src/app/components/products/cards/ProductInfoCard.tsx` - Example implementation
- `/back/src/routes/products.ts` - Updated PUT route (no longer handles files)

---

### 2. Timezone Handling

#### Overview
Single-timezone system with patches for Vancouver-based deployment. Multi-timezone expansion requires full timezone-aware implementation.

#### Current Status (January 2025)

**✅ Single-Timezone Patches Implemented:**
- Frontend display with date extraction
- Order creation/update with explicit time strings
- Delivery queries with timezone-dependent patches
- System works correctly when server timezone = `America/Vancouver`

**⚠️ Deployment Requirement:**
Server must run in `America/Vancouver` timezone OR set `TZ=America/Vancouver` environment variable.

**📋 When to Implement Full Solution:**
- Expanding to stores in different timezones (Toronto, Calgary, etc.)
- Preparing for multi-timezone SaaS product launch
- Signing first out-of-timezone customer

#### Frontend Implementation

**useBusinessTimezone Hook:**
```typescript
const { timezone, getBusinessDateString, formatDate } = useBusinessTimezone();

// Get date string in business timezone
const today = getBusinessDateString(new Date());  // "2025-10-04"

// Format date in business timezone
const formatted = formatDate(new Date(), {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});
```

**File:** `/admin/src/shared/hooks/useBusinessTimezone.ts`

#### Backend Patches (Single-Timezone)

**Order Operations:**
```typescript
// Explicit time string appending
deliveryDate: orderData.deliveryDate
  ? new Date(orderData.deliveryDate + 'T00:00:00')
  : null
```

**Delivery Queries:**
```typescript
const dateStr = date ? (date as string) : new Date().toISOString().split('T')[0];
const startOfRange = new Date(dateStr + 'T00:00:00');
const endOfRange = new Date(dateStr + 'T23:59:59.999');
```

#### Future Multi-Timezone Solution

**When implementing full timezone support, create:**

**Date Helpers Utility:**
```typescript
// /back/src/utils/dateHelpers.ts
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz';

export async function getBusinessTimezone(): Promise<string> {
  // Fetch from database settings
}

export async function getBusinessDayBoundaries(
  dateString: string,
  timezone?: string
): Promise<{ startOfDay: Date; endOfDay: Date }> {
  // Convert date string to UTC boundaries in business timezone
}

export async function businessDateToUTC(
  dateString: string,
  timezone?: string
): Promise<Date> {
  // Convert business date to UTC
}

export async function formatInBusinessTimezone(
  date: Date,
  timezone?: string
): Promise<string> {
  // Format UTC date in business timezone
}
```

**Implementation Effort (When Needed):**
- Priority 1 (Core functionality): 3-4 hours
- Priority 2 (Data consistency): 3-4 hours
- Priority 3 (Display issues): 1-2 hours
- Total: 8-12 hours

#### Implementation Files

**Key Files:**
- `/admin/src/shared/hooks/useBusinessTimezone.ts` - Frontend timezone hook
- `/back/src/routes/orders/create.ts` - Order creation (patched)
- `/back/src/routes/orders/update.ts` - Order updates (patched)
- `/back/src/routes/orders/delivery.ts` - Delivery queries (patched)
- `/docs/Timezone_Issues_and_Fixes.md` - Full implementation guide

---

### 3. Performance Optimization

#### Overview
Immediate response architecture with fire-and-forget pattern for external API calls.

#### Implementation

**Background Processing Pattern:**

All external API calls (SendGrid, Twilio, Supabase) use fire-and-forget for instant UI response:

```typescript
// Synchronous operation
const order = await prisma.order.update({
  where: { id: orderId },
  data: { status: 'PAID' }
});

// Fire-and-forget notification (no await)
sendOrderConfirmation(order).catch(error => {
  console.error('Notification failed:', error);
  // Log but don't block user flow
});

// Immediate response
return res.json({ success: true, order });
```

**Benefits:**
- Eliminates 2-5 second delays
- Prevents cascading failures
- Improves user experience under high traffic
- 50ms response vs 2-5s blocking

**Applied To:**
- Status change notifications
- Product/order image uploads
- Email receipts
- SMS delivery confirmations

**Production Considerations:**
- Ready for background job queues (Redis/Bull)
- Comprehensive logging for monitoring
- Should be applied to customer website for optimal UX

#### Implementation Files

**Key Files:**
- `/back/src/utils/notificationTriggers.ts` - Fire-and-forget notifications
- `/back/src/services/emailService.ts` - Background email sending
- `/back/src/services/smsService.ts` - Background SMS sending
- `/admin/src/shared/utils/imageUploadService.ts` - Background image uploads

---

## API Reference

### Order Management

#### Create Order
```http
POST /api/orders
Content-Type: application/json

{
  "type": "DELIVERY" | "PICKUP",
  "customerId": "string",
  "deliveryDate": "2025-10-04",
  "items": [
    {
      "productId": "string",
      "quantity": 1,
      "price": 29.99
    }
  ],
  "deliveryAddress": "string",
  "recipientName": "string",
  "recipientPhone": "string",
  "specialInstructions": "string",
  "status": "DRAFT"
}

Response: 201 Created
{
  "success": true,
  "order": { ...orderObject }
}
```

#### Update Order Status
```http
PUT /api/orders/:id/status
Content-Type: application/json

{
  "status": "PAID" | "IN_DESIGN" | "READY" | "OUT_FOR_DELIVERY" | "COMPLETED"
}

Response: 200 OK
{
  "success": true,
  "order": { ...orderObject }
}
```

#### Get Delivery Orders by Date
```http
GET /api/orders/delivery?date=2025-10-04

Response: 200 OK
{
  "success": true,
  "date": "2025-10-04",
  "orders": {
    "forDelivery": [...],
    "forPickup": [...],
    "completed": [...]
  }
}
```

#### Get Future Order Count
```http
GET /api/orders/delivery/count/future?startDate=2025-10-04&days=10

Response: 200 OK
{
  "success": true,
  "count": 15,
  "days": 10
}
```

#### List Orders with Filters
```http
GET /api/orders?status=PAID&deliveryDateFrom=2025-10-01&deliveryDateTo=2025-10-31

Response: 200 OK
{
  "success": true,
  "orders": [...],
  "total": 25
}
```

### Payment Processing

#### Create Payment Transaction
```http
POST /api/payment-transactions
Content-Type: application/json

{
  "orderIds": ["order1", "order2"],
  "totalAmount": 150.00,
  "paymentMethods": [
    {
      "type": "CARD",
      "provider": "stripe",
      "amount": 100.00,
      "metadata": { ... }
    },
    {
      "type": "CASH",
      "amount": 50.00
    }
  ]
}

Response: 201 Created
{
  "success": true,
  "transaction": {
    "id": "...",
    "transactionNumber": "PT-00123",
    "totalAmount": 150.00,
    "status": "COMPLETED"
  }
}
```

#### Get Saved Payment Methods
```http
GET /api/saved-payment-methods/:customerId

Response: 200 OK
{
  "success": true,
  "cards": [
    {
      "id": "...",
      "provider": "stripe",
      "last4": "4242",
      "brand": "visa",
      "expiryMonth": 12,
      "expiryYear": 2025
    }
  ]
}
```

#### Process Stripe Payment
```http
POST /api/payments/stripe/process
Content-Type: application/json

{
  "amount": 100.00,
  "customerId": "cus_...",
  "paymentMethodId": "pm_..." | "new",
  "saveCard": true
}

Response: 200 OK
{
  "success": true,
  "paymentIntent": { ... }
}
```

#### Process Square Payment
```http
POST /api/payments/square/process
Content-Type: application/json

{
  "amount": 100.00,
  "customerId": "...",
  "sourceId": "...",
  "saveCard": true
}

Response: 200 OK
{
  "success": true,
  "payment": { ... }
}
```

### Customer Management

#### Search Customers by Phone
```http
GET /api/customers?phone=6045551234

Response: 200 OK
{
  "success": true,
  "customers": [
    {
      "id": "...",
      "phone": "6045551234",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com"
    }
  ]
}
```

#### Create Customer
```http
POST /api/customers
Content-Type: application/json

{
  "phone": "6045551234",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "address": {
    "address1": "123 Main St",
    "city": "Vancouver",
    "province": "BC",
    "postalCode": "V6B 1A1"
  }
}

Response: 201 Created
{
  "success": true,
  "customer": { ...customerObject }
}
```

#### Merge Customers
```http
PUT /api/customers/:id/merge/:targetId
Content-Type: application/json

{
  "preserveOrders": true,
  "preserveAddresses": true
}

Response: 200 OK
{
  "success": true,
  "message": "Customers merged successfully"
}
```

### Gift Cards

#### Create/Activate Gift Card
```http
POST /api/giftcards
Content-Type: application/json

{
  "cardNumber": "GC-1234-5678" | null,  // null for auto-generate
  "initialBalance": 50.00,
  "purchaserName": "John Doe",
  "purchaserEmail": "john@example.com",
  "recipientName": "Jane Doe",
  "recipientEmail": "jane@example.com"
}

Response: 201 Created
{
  "success": true,
  "giftCard": {
    "id": "...",
    "cardNumber": "GC-1234-5678",
    "initialBalance": 50.00,
    "currentBalance": 50.00,
    "status": "ACTIVE"
  }
}
```

#### Lookup Gift Card
```http
GET /api/giftcards/:cardNumber

Response: 200 OK
{
  "success": true,
  "giftCard": {
    "cardNumber": "GC-1234-5678",
    "currentBalance": 35.00,
    "status": "ACTIVE"
  }
}
```

#### Redeem Gift Card
```http
POST /api/giftcards/:id/redeem
Content-Type: application/json

{
  "orderId": "...",
  "amount": 15.00
}

Response: 200 OK
{
  "success": true,
  "transaction": {
    "amount": 15.00,
    "newBalance": 20.00
  }
}
```

### Settings

#### Get Store Settings
```http
GET /api/settings/store-info

Response: 200 OK
{
  "success": true,
  "settings": {
    "name": "Bloom Flower Shop",
    "phone": "6045551234",
    "email": "info@bloomflowers.com",
    "address": "123 Main St, Vancouver, BC",
    "timezone": "America/Vancouver"
  }
}
```

#### Get Delivery Charges
```http
GET /api/settings/delivery-charges

Response: 200 OK
{
  "success": true,
  "zones": [
    {
      "id": "...",
      "zoneName": "Downtown",
      "baseCharge": 10.00,
      "freeThreshold": 50.00
    }
  ]
}
```

#### Get Business Hours
```http
GET /api/settings/business-hours

Response: 200 OK
{
  "success": true,
  "hours": {
    "monday": { "open": "09:00", "close": "18:00", "closed": false },
    "tuesday": { "open": "09:00", "close": "18:00", "closed": false },
    ...
  }
}
```

---

## Database Schema

### Key Models

#### Order
```prisma
model Order {
  id                  String        @id @default(cuid())
  orderNumber         String        @unique
  type                OrderType     // DELIVERY, PICKUP
  status              OrderStatus   @default(DRAFT)

  // Customer & Recipient
  customerId          String
  customer            Customer      @relation(fields: [customerId], references: [id])
  recipientName       String?
  recipientPhone      String?

  // Delivery Information
  deliveryDate        DateTime?
  deliveryAddress     String?
  deliveryCharge      Decimal?

  // Financial
  subtotal            Decimal
  tax                 Decimal
  total               Decimal

  // Items & Payments
  items               OrderItem[]
  payments            OrderPayment[]

  // Metadata
  specialInstructions String?
  notes               String?
  createdAt           DateTime      @default(now())
  updatedAt           DateTime      @updatedAt
  createdBy           String?
}

enum OrderType {
  DELIVERY
  PICKUP
}

enum OrderStatus {
  DRAFT
  PAID
  IN_DESIGN
  READY
  OUT_FOR_DELIVERY
  COMPLETED
  CANCELLED
  REJECTED
}
```

#### Customer
```prisma
model Customer {
  id             String                 @id @default(cuid())
  phone          String                 @unique
  email          String?
  firstName      String
  lastName       String

  // Relationships
  addresses      Address[]
  orders         Order[]
  savedCards     SavedPaymentMethod[]

  // Metadata
  notes          String?
  tags           String[]
  createdAt      DateTime               @default(now())
  updatedAt      DateTime               @updatedAt
}
```

#### PaymentTransaction
```prisma
model PaymentTransaction {
  id                String          @id @default(cuid())
  transactionNumber String          @unique  // PT-00001
  totalAmount       Decimal
  status            TransactionStatus

  // Relationships
  paymentMethods    PaymentMethod[]
  orderPayments     OrderPayment[]
  refunds           Refund[]

  // Metadata
  createdAt         DateTime        @default(now())
  createdBy         String?
}

enum TransactionStatus {
  PENDING
  COMPLETED
  FAILED
  REFUNDED
}
```

#### PaymentMethod
```prisma
model PaymentMethod {
  id              String
  transactionId   String
  transaction     PaymentTransaction @relation(fields: [transactionId], references: [id])

  type            PaymentMethodType
  provider        String?           // stripe, square
  amount          Decimal

  // Provider-specific data
  metadata        Json?

  createdAt       DateTime          @default(now())
}

enum PaymentMethodType {
  CASH
  CARD
  CHECK
  GIFT_CARD
  HOUSE_ACCOUNT
  OTHER
}
```

#### SavedPaymentMethod
```prisma
model SavedPaymentMethod {
  id             String
  customerId     String
  customer       Customer    @relation(fields: [customerId], references: [id])

  provider       String      // stripe, square
  providerCardId String      // Provider's card ID

  // Card Details
  last4          String
  brand          String      // visa, mastercard, amex, etc.
  expiryMonth    Int
  expiryYear     Int

  // Metadata
  isDefault      Boolean     @default(false)
  createdAt      DateTime    @default(now())
}
```

#### GiftCard
```prisma
model GiftCard {
  id              String              @id @default(cuid())
  cardNumber      String              @unique  // GC-XXXX-XXXX

  // Balances
  initialBalance  Decimal
  currentBalance  Decimal

  // Status
  status          GiftCardStatus      @default(INACTIVE)

  // Purchaser & Recipient
  purchaserName   String?
  purchaserEmail  String?
  recipientName   String?
  recipientEmail  String?

  // Dates
  activatedAt     DateTime?
  expiresAt       DateTime?
  createdAt       DateTime            @default(now())

  // Relationships
  transactions    GiftCardTransaction[]
}

enum GiftCardStatus {
  INACTIVE
  ACTIVE
  USED
  EXPIRED
}
```

#### Product
```prisma
model Product {
  id              String      @id @default(cuid())
  name            String
  description     String?
  sku             String?     @unique

  // Pricing
  price           Decimal
  cost            Decimal?

  // Inventory
  trackInventory  Boolean     @default(false)
  quantity        Int?
  lowStockAlert   Int?

  // Categories & Tags
  categoryId      String?
  category        Category?   @relation(fields: [categoryId], references: [id])
  tags            String[]

  // Images
  images          String[]    // Array of Supabase URLs

  // Availability
  isActive        Boolean     @default(true)
  isTaxable       Boolean     @default(true)
  availableFrom   DateTime?
  availableTo     DateTime?

  // Relationships
  orderItems      OrderItem[]

  // Metadata
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
}
```

#### StoreSettings
```prisma
model StoreSettings {
  id            String    @id @default(cuid())

  // Store Information
  name          String
  phone         String
  email         String
  address       String
  city          String
  province      String
  postalCode    String
  country       String    @default("Canada")

  // Business Configuration
  timezone      String    @default("America/Vancouver")
  currency      String    @default("CAD")
  taxRate       Decimal   @default(0.12)  // 12% GST+PST

  // Integrations
  stripeKey     String?
  squareKey     String?
  twilioSid     String?
  sendGridKey   String?
  googleMapsKey String?

  // Metadata
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}
```

### Database Relationships

```
Customer
  ├── addresses (1:many)
  ├── orders (1:many)
  └── savedCards (1:many)

Order
  ├── customer (many:1)
  ├── items (1:many)
  └── payments (1:many via OrderPayment)

PaymentTransaction
  ├── paymentMethods (1:many)
  ├── orderPayments (1:many)
  └── refunds (1:many)

Product
  ├── category (many:1)
  └── orderItems (1:many)

GiftCard
  └── transactions (1:many)
```

---

## Business Rules

### Order Management

**Order Creation:**
- All orders start with status DRAFT
- Customer must be associated with order
- Delivery orders require deliveryDate and deliveryAddress
- Pickup orders require only customer information

**Order Status Transitions:**
- DRAFT → PAID (only after payment completed)
- PAID → IN_DESIGN (custom arrangements only)
- PAID → COMPLETED (POS walk-ins, immediate fulfillment)
- IN_DESIGN → READY (design completed)
- READY → OUT_FOR_DELIVERY (delivery orders only)
- READY → COMPLETED (pickup orders, displays as "Picked Up")
- OUT_FOR_DELIVERY → COMPLETED (displays as "Delivered")
- Any active status → CANCELLED (customer cancellation)
- IN_DESIGN → REJECTED (quality control failure)

**Invalid Transitions:**
- Cannot go backward in workflow (except CANCELLED)
- Cannot skip required status steps
- Final statuses (COMPLETED, CANCELLED) cannot transition

### Payment Rules

**Transaction Numbering:**
- Sequential PT-XXXX format (PT-00001, PT-00002)
- One PT per payment session
- Single PT can cover multiple orders
- PT number never reused

**Split Payments:**
- Multiple payment methods allowed per transaction
- Sum of payment methods must equal transaction total
- Each payment method tracked with provider information

**Gift Card Rules:**
- Gift cards cannot be used for delivery orders within POS
- Must apply gift cards at POS checkout for security
- Gift cards are non-taxable
- Can be purchased with any payment method
- Balance cannot exceed initial purchase amount

**Payment Provider Selection:**
- Stripe: Website sales, saved card payments
- Square: POS terminal, phone order manual entry
- Internal: Gift cards, house accounts

**Saved Card Management:**
- Cards automatically saved on successful transactions (if customer consents)
- Phone number used as primary customer identifier
- Works across both Stripe and Square
- Customer can have multiple saved cards per provider

### Customer Management

**Phone-First Identification:**
- Phone number is primary unique identifier
- Format: (XXX) XXX-XXXX or XXXXXXXXXX
- Used for customer lookup across payment providers
- Duplicate prevention via phone number matching

**Address Management:**
- Customers can have multiple addresses
- One address marked as default
- Address labels supported: Home, Work, Other
- Google Places autocomplete for validation

**Customer Merging:**
- Merge duplicate customers by ID
- Preserves order history from both accounts
- Combines addresses (removes duplicates)
- Consolidates saved payment methods
- Cannot be undone - create backup first

**Recipient Management:**
- Recipient information separate from customer
- Same recipient can be reused across orders
- Three update options: Update existing, Create new, Duplicate with changes
- Prevents accidental recipient information overwrite

### Delivery & Logistics

**Delivery Date Rules:**
- Must be future date (today or later)
- Respects business hours from settings
- Excludes holidays from settings
- Minimum prep time per product enforced
- Cannot schedule delivery on closed days

**Delivery Charges:**
- Zone-based pricing from settings
- Manual override allowed per order
- Free delivery threshold by zone
- Charge calculated at order creation time

**Order Type Restrictions:**
- DELIVERY orders: Require deliveryDate, deliveryAddress, recipientName
- PICKUP orders: Only require customer, optional pickup time
- Cannot change order type after payment (create new order)

### Product Management

**Pricing:**
- Price must be greater than 0
- Cost optional (for profit tracking)
- Tax calculated based on product isTaxable flag
- Sale prices handled via discount system (future)

**Inventory:**
- Optional inventory tracking per product
- Low stock alerts at configurable threshold
- Negative inventory allowed (back orders)
- Inventory decremented on order payment, not creation

**Availability:**
- Products can have seasonal availability windows
- availableFrom / availableTo dates control visibility
- Inactive products hidden from POS/website
- Active products shown in all sales channels

**Images:**
- Up to 10 images per product
- First image used as primary thumbnail
- Images stored in Supabase storage
- Immediate upload with crop-before-save pattern

### Gift Card Rules

**Purchase:**
- Minimum value: $10.00
- Maximum value: $500.00
- Non-taxable (no GST/PST)
- Can be purchased with any payment method
- Physical cards require card number entry
- Digital cards auto-generate GC-XXXX-XXXX format

**Activation:**
- Cards start as INACTIVE status
- Become ACTIVE upon purchase completion
- Require purchaser and recipient information
- Optional expiry date (typically 1-2 years)

**Redemption:**
- Can be used for partial payments
- Cannot exceed current balance
- Balance updated immediately on redemption
- Transaction history tracked per card
- Cannot be used on delivery orders within POS (security)

**Expiry:**
- Configurable expiry period (default: 2 years)
- Warning notifications before expiry (planned)
- Expired cards cannot be redeemed
- Balance forfeited on expiry (per BC law)

### Tax Rules

**Taxable Items:**
- Flowers and arrangements: Taxable (12% combined GST+PST in BC)
- Delivery fees: Taxable
- Gift cards: Non-taxable
- Some supplies: Non-taxable (check product isTaxable flag)

**Tax Calculation:**
```
Subtotal = Sum of (item.price * item.quantity)
Tax = (Subtotal + DeliveryCharge) * TaxRate (if taxable)
Total = Subtotal + Tax + DeliveryCharge
```

**Tax Rate by Province (Future Multi-Location):**
- BC: 12% (5% GST + 7% PST)
- AB: 5% (GST only)
- ON: 13% (HST)
- QC: 14.975% (5% GST + 9.975% QST)

### Notification Rules

**Automatic Notifications:**
- Order status changes trigger customer notifications
- Configurable per status in settings
- Multi-channel: SMS (Twilio) + Email (SendGrid)
- Fire-and-forget (non-blocking)

**Notification Triggers:**
- PAID: Order confirmation to customer
- READY: "Order ready" notification (pickup) or "Preparing for delivery"
- OUT_FOR_DELIVERY: SMS to recipient with ETA
- COMPLETED: Final completion notification with receipt

**Notification Preferences (Future):**
- Customer can opt-in/opt-out per channel
- Notification type preferences (order updates, marketing, etc.)
- Quiet hours respect (no SMS 10pm-8am)

---

## Development Standards

### Component Architecture

**Page Components:**
- Top-level route components
- Handle data fetching
- Manage page-level state
- Coordinate between feature components

**Feature Components:**
- Domain-specific business logic
- Reusable across pages
- Handle user interactions
- Manage local state

**UI Components:**
- Pure presentational components
- Highly reusable
- No business logic
- Consistent styling with TailAdmin

**Hook Components:**
- Custom React hooks
- Encapsulate reusable logic
- State management
- API interactions

### TailAdmin Standards

**Component Usage:**
- Always use TailAdmin pre-built components
- Never use vanilla Tailwind or raw HTML
- Use ComponentCard for sections
- Use InputField for form inputs
- Use Table for data display

**Color Standards:**
- Primary button: `bg-[#597485] hover:bg-[#4e6575]`
- Brand color: `#597485` (custom flower shop green)
- Use TailAdmin color variables for consistency
- Dark mode support required

**Icon Standards:**
- Always use local icons from `/admin/src/icons/`
- Never use `lucide-react` or external libraries
- Check `/admin/src/icons/index.ts` for available icons
- If not available, check `/admin/src/icons/more-icons/`

**Spacing Standards:**
- Gap between elements: 24px
- Border radius: 12px (rounded-xl)
- Padding inside cards: 24px (p-6)
- Input height: 44px (h-11)

### Modal Standards

**Proper Modal Structure:**
```jsx
<div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4">
  <div className="bg-white dark:bg-boxdark rounded-2xl shadow-2xl w-full max-w-md">
    {/* Header with border */}
    <div className="border-b border-stroke dark:border-strokedark p-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-black dark:text-white">Title</h2>
        <button>Close Icon</button>
      </div>
    </div>

    {/* Content */}
    <div className="p-6">
      {/* Modal content */}
    </div>

    {/* Footer with border */}
    <div className="border-t border-stroke dark:border-strokedark p-6">
      <div className="flex gap-3">
        <button className="flex-1 py-3 px-4 border ...">Cancel</button>
        <button className="flex-1 py-3 px-4 bg-[#597485] ...">Confirm</button>
      </div>
    </div>
  </div>
</div>
```

**Key Requirements:**
- Backdrop: `bg-black/40` (not black or dark blue)
- Z-index: `z-[60]` (higher than header)
- Container: `bg-white dark:bg-boxdark` with `rounded-2xl shadow-2xl`
- Borders: `border-stroke dark:border-strokedark`

### Form Standards

**Input Fields:**
```jsx
<input
  className="w-full px-4 py-3 border border-stroke dark:border-strokedark rounded-xl focus:border-[#597485] focus:ring-2 focus:ring-[#597485]/20 bg-white dark:bg-boxdark text-black dark:text-white"
/>
```

**Select Components:**
- Height: `h-11` standard
- Border radius: `rounded-lg`
- Focus ring: `#597485` (brand color)
- Custom SVG arrow icon
- Support for hierarchical options with indentation

**Date Pickers:**
- Use `flatpickr` library
- Height: `h-11` standard
- Calendar icon from local icons
- Read-only input with cursor-pointer

**Button Standards:**
- Primary: `bg-[#597485] hover:bg-[#4e6575]`
- Secondary: Border style with hover states
- Border radius: `rounded-xl`
- Font weight: `font-medium`
- Transition: `transition-colors`

### TypeScript Standards

**Strict Type Definitions:**
- All interfaces exported
- No `any` types (use `unknown` if needed)
- Proper null/undefined handling
- Type guards where appropriate

**Example Interface:**
```typescript
export interface Order {
  id: string;
  orderNumber: string;
  type: OrderType;
  status: OrderStatus;
  customer: Customer;
  items: OrderItem[];
  total: number;
  createdAt: Date;
}

export enum OrderType {
  DELIVERY = 'DELIVERY',
  PICKUP = 'PICKUP'
}

export enum OrderStatus {
  DRAFT = 'DRAFT',
  PAID = 'PAID',
  IN_DESIGN = 'IN_DESIGN',
  READY = 'READY',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED'
}
```

### State Management

**Context Providers:**
- Use for global state (user, theme, settings)
- Keep context small and focused
- Memoize values to prevent re-renders

**Local State:**
- Use `useState` for component-specific state
- Use `useReducer` for complex state logic
- Keep state as close to where it's used as possible

**Form State:**
- Use controlled inputs
- Validation on blur and submit
- Show errors inline with form fields

**API Caching:**
- Use React Query for API state (future)
- Cache customer lookups
- Invalidate on mutations

### Code Quality

**ESLint:**
- Enforce consistent code style
- No unused variables
- Proper import ordering
- Consistent naming conventions

**Error Boundaries:**
- Wrap major sections in error boundaries
- Provide fallback UI
- Log errors to monitoring service (future)

**Testing:**
- Unit tests for utilities
- Integration tests for API endpoints
- E2E tests for critical flows (future)

---

## Deployment & Production

### Environment Configuration

**Required Environment Variables:**

**Backend (.env):**
```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/bloom_db"

# Server
PORT=4000
NODE_ENV=production
TZ=America/Vancouver  # CRITICAL: Must be Vancouver timezone

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...

# Square
SQUARE_ACCESS_TOKEN=...
SQUARE_LOCATION_ID=...
SQUARE_ENVIRONMENT=production

# Twilio (SMS)
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...

# SendGrid (Email)
SENDGRID_API_KEY=...
SENDGRID_FROM_EMAIL=...

# Supabase (Image Storage)
SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...

# Google Maps
GOOGLE_MAPS_API_KEY=...
```

**Frontend (.env.production):**
```bash
VITE_API_URL=https://api.yourstore.com
VITE_SUPABASE_URL=https://...
VITE_SUPABASE_SERVICE_ROLE_KEY=...
```

### Server Requirements

**Minimum Specifications:**
- CPU: 2 cores
- RAM: 4GB
- Disk: 20GB SSD
- OS: Ubuntu 20.04+ or compatible Linux

**Timezone Configuration:**
```bash
# Set server timezone to Vancouver (CRITICAL)
sudo timedatectl set-timezone America/Vancouver

# Verify timezone
timedatectl
date +%Z  # Should show PST or PDT
```

### Database Setup

**PostgreSQL Configuration:**
```sql
-- Create database
CREATE DATABASE bloom_db;

-- Create user
CREATE USER bloom_user WITH PASSWORD 'secure_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE bloom_db TO bloom_user;

-- Enable UUID extension (if needed)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

**Run Migrations:**
```bash
cd back
npx prisma migrate deploy
npx prisma generate
```

### Deployment Checklist

**Pre-Deployment:**
- [ ] Environment variables configured
- [ ] Server timezone set to `America/Vancouver`
- [ ] Database backups enabled
- [ ] SSL certificates installed
- [ ] DNS records configured
- [ ] Firewall rules configured
- [ ] Payment provider webhooks configured
- [ ] Email/SMS services tested
- [ ] Image storage buckets created
- [ ] Google Maps API key activated

**Deployment:**
- [ ] Pull latest code from main branch
- [ ] Install dependencies (`npm install`)
- [ ] Build frontend (`npm run build`)
- [ ] Run database migrations
- [ ] Start backend service
- [ ] Start frontend service (or serve static build)
- [ ] Verify health endpoints
- [ ] Test critical flows (order creation, payment)

**Post-Deployment:**
- [ ] Monitor logs for errors
- [ ] Test order creation
- [ ] Test payment processing
- [ ] Test notifications (SMS/Email)
- [ ] Verify timezone handling (orders appear on correct dates)
- [ ] Check daily sales reports
- [ ] Verify delivery schedules

### Known Limitations (Production)

**⚠️ CRITICAL: Single-Timezone Only**

The system is currently **production-ready for single-timezone deployment only**.

**Requirements:**
- Server must run in `America/Vancouver` timezone OR
- Set `TZ=America/Vancouver` environment variable

**Why This Matters:**
- Date/time operations rely on server timezone = business timezone
- Orders, deliveries, and reports work correctly in single timezone
- Multi-timezone expansion requires full timezone-aware implementation

**When to Implement Multi-Timezone:**
- Expanding to stores in different timezones (Toronto, Calgary, etc.)
- Preparing for multi-timezone SaaS product
- First customer outside Vancouver timezone

**Implementation Effort:**
- 8-12 hours of development time
- Full guide available: `/docs/Timezone_Issues_and_Fixes.md`

**Other Limitations:**
- No offline mode (requires internet connection)
- No mobile app (web-based only)
- No multi-location support (single store only)
- No multi-currency support (CAD only)

### Monitoring & Logging

**Application Logs:**
```bash
# Backend logs
tail -f /var/log/bloom/backend.log

# Frontend logs (Nginx access/error)
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

**Key Metrics to Monitor:**
- Order creation success rate
- Payment success rate
- API response times
- Database query performance
- External service failures (Stripe, Twilio, etc.)
- Disk usage (images accumulate over time)

**Error Tracking:**
- Console errors logged to backend
- Payment failures logged with transaction ID
- Notification failures logged (don't block user flow)
- Image upload failures logged

**Recommended Tools (Future):**
- Sentry for error tracking
- DataDog for performance monitoring
- CloudWatch for AWS deployments
- Grafana for custom dashboards

### Backup & Recovery

**Database Backups:**
```bash
# Daily automated backup
pg_dump bloom_db > backup_$(date +%Y%m%d).sql

# Restore from backup
psql bloom_db < backup_20250110.sql
```

**Image Backups:**
- Supabase provides automatic backups
- Consider additional S3 backup for critical images
- Test restore process quarterly

**Code Backups:**
- Git repository is source of truth
- Tag releases: `git tag v1.0.0`
- Keep production branch protected

**Recovery Plan:**
1. Identify issue (database corruption, server failure, etc.)
2. Restore latest database backup
3. Restore code to last known good version
4. Verify payment transaction integrity
5. Notify customers of any order delays
6. Resume operations

### Performance Optimization

**Frontend:**
- Code splitting by route
- Image lazy loading
- Minimize bundle size
- Enable compression (gzip/brotli)

**Backend:**
- Database query optimization
- Add indexes for frequent queries
- Enable connection pooling
- Cache frequently accessed settings

**External Services:**
- Fire-and-forget for notifications (implemented)
- Background image uploads (implemented)
- Batch operations where possible
- Rate limit handling

**Database Indexes:**
```sql
-- Orders
CREATE INDEX idx_orders_delivery_date ON orders(delivery_date);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);

-- Customers
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_email ON customers(email);

-- Payment Transactions
CREATE INDEX idx_payment_transactions_created_at ON payment_transactions(created_at);
```

---

## Success Metrics

### Technical Metrics

**Performance:**
- Order processing: < 2 minutes per order
- UI Response Time: < 100ms for all actions
- External Service Integration: Non-blocking (fire-and-forget)
- Uptime: 99.9% during business hours
- Page load: < 3 seconds
- API response time: < 500ms (95th percentile)

**Quality:**
- Order accuracy: 100% payment success
- Zero data loss on transactions
- < 1% error rate on external service calls
- Mobile responsive across all devices

### Business Metrics

**Customer Satisfaction:**
- Streamlined ordering process
- Instant feedback on all actions
- Clear order status visibility
- Accurate delivery schedules

**Staff Efficiency:**
- Reduced manual errors
- Faster order processing
- Less time on phone orders
- Simplified payment reconciliation

**Revenue Impact:**
- Increased online/subscription sales (future)
- Higher average order value (upsells in POS)
- Better inventory management
- Reduced payment processing costs

---

## Related Documentation

- **Progress Tracker:** `/docs/Progress_Tracker.markdown` - Feature implementation status
- **Known Limitations:** `/docs/KNOWN_LIMITATIONS.md` - Production deployment requirements
- **Timezone Guide:** `/docs/Timezone_Issues_and_Fixes.md` - Multi-timezone implementation
- **Order Status System:** `/docs/Order_Status_System.md` - Complete status reference
- **Image Upload Pattern:** `/docs/Image_Upload_Pattern.md` - Image handling standard
- **CLAUDE.md:** Main development tracker and instructions

---

**Document Version:** 1.0
**Created:** January 2025
**Maintained By:** Development Team
**Next Review:** After major feature releases or multi-timezone implementation

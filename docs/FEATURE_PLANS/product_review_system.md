# Product Review System - Implementation Plan

## Overview
Add a customer review system allowing verified purchasers to rate and review products, with admin moderation and public display on product pages.

## Goals
- Build trust through verified purchase reviews
- Increase conversion with social proof
- Gather customer feedback and insights
- Improve SEO with user-generated content
- Enable data-driven product decisions

---

## Phase 1: MVP (Basic Implementation)

**Timeline:** 1-2 days
**Status:** 🔜 Planned

### Core Features
- ✅ Star ratings (1-5)
- ✅ Written reviews (headline + body)
- ✅ Verified purchase badge
- ✅ Admin moderation (approve/reject)
- ✅ Display on product pages
- ✅ Basic aggregates (avg rating, count)

---

### Database Schema - Phase 1

```prisma
model ProductReview {
  id              String   @id @default(cuid())
  productId       String
  customerId      String
  orderId         String?  // Links to purchase

  // Review content
  rating          Int      // 1-5
  headline        String   @db.VarChar(100)
  body            String   @db.Text

  // Metadata
  verifiedPurchase Boolean @default(false)
  status          ReviewStatus @default(PENDING)

  // Timestamps
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  publishedAt     DateTime?

  // Relations
  product         Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  customer        Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)
  order           Order?   @relation(fields: [orderId], references: [id], onDelete: SetNull)

  @@index([productId, status])
  @@index([customerId])
  @@index([status])
  @@unique([productId, customerId]) // One review per product per customer
}

enum ReviewStatus {
  PENDING
  PUBLISHED
  REJECTED
}

// Extend existing Product model
model Product {
  // ... existing fields ...

  // Review aggregates (cached for performance)
  reviewCount     Int      @default(0)
  averageRating   Decimal? @db.Decimal(3, 2) // e.g., 4.67
  ratingBreakdown Json?    // { "5": 10, "4": 5, "3": 2, "2": 1, "1": 0 }

  // Relations
  reviews         ProductReview[]
}

// Extend existing Customer model
model Customer {
  // ... existing fields ...

  reviews         ProductReview[]
}

// Extend existing Order model
model Order {
  // ... existing fields ...

  reviews         ProductReview[]
}
```

---

### Backend API - Phase 1

**File:** `back/src/routes/product-reviews.ts`

#### Endpoints:

**1. GET /api/products/:id/reviews**
- Public endpoint
- Returns published reviews only
- Includes pagination (default 10 per page)
- Includes aggregate data
- Sorting: newest first (default)

```typescript
// Response format
{
  reviews: [
    {
      id: "cuid",
      rating: 5,
      headline: "Amazing flowers!",
      body: "These roses lasted 2 weeks...",
      verifiedPurchase: true,
      customerName: "John D.", // First name + last initial
      createdAt: "2025-11-01T...",
      publishedAt: "2025-11-01T..."
    }
  ],
  aggregates: {
    averageRating: 4.67,
    totalReviews: 18,
    breakdown: {
      "5": 10,
      "4": 5,
      "3": 2,
      "2": 1,
      "1": 0
    }
  },
  pagination: {
    page: 1,
    limit: 10,
    total: 18,
    totalPages: 2
  }
}
```

**2. POST /api/products/:id/reviews**
- Requires customer authentication
- Validates purchase via OrderItem
- Auto-sets verifiedPurchase if order found
- Creates review with PENDING status
- Prevents duplicate reviews (one per product per customer)
- Returns created review

```typescript
// Request body
{
  rating: 5,           // Required, 1-5
  headline: "string",  // Required, max 100 chars
  body: "string"       // Required, max 5000 chars
}

// Response
{
  success: true,
  review: { id, status: "PENDING", ... },
  message: "Thank you! Your review is pending approval."
}
```

**3. GET /api/admin/product-reviews (Admin only)**
- Returns reviews filtered by status
- Pagination support
- Sorting by createdAt
- Includes customer and product info

```typescript
// Query params: ?status=PENDING&page=1&limit=20

// Response
{
  reviews: [
    {
      id: "cuid",
      rating: 5,
      headline: "...",
      body: "...",
      status: "PENDING",
      verifiedPurchase: true,
      customer: { id, firstName, lastName, email },
      product: { id, name, slug },
      createdAt: "..."
    }
  ],
  pagination: { ... }
}
```

**4. PATCH /api/admin/product-reviews/:id (Admin only)**
- Update review status (PENDING → PUBLISHED or REJECTED)
- Optional: edit headline/body for moderation
- Triggers aggregate recalculation
- Sends email notification to customer

```typescript
// Request body
{
  status: "PUBLISHED", // or "REJECTED"
  headline: "...",     // Optional edit
  body: "..."          // Optional edit
}
```

**5. DELETE /api/admin/product-reviews/:id (Admin only)**
- Permanently delete review
- Recalculates product aggregates
- Returns success message

---

### Service Layer - Phase 1

**File:** `back/src/services/reviewService.ts`

Key functions:
- `calculateProductAggregates(productId)` - Recalc avg rating, count, breakdown
- `verifyPurchase(customerId, productId)` - Check if customer bought product
- `checkDuplicateReview(customerId, productId)` - Prevent duplicates
- `updateProductReviewStats(productId)` - Update Product model cache

Use Prisma transactions for review create/update + aggregate updates.

---

### Admin UI - Phase 1

**File:** `admin/src/app/pages/products/ReviewsModeration.tsx`

**Features:**
- Table view with columns: Product, Customer, Rating, Headline, Status, Date
- Filter by status (All, Pending, Published, Rejected)
- Quick actions: Approve, Reject buttons
- Click to expand full review body
- Bulk actions: Select multiple → Approve/Reject all
- Pagination controls
- Search by product name or customer name

**Location in menu:**
- Add to Products submenu: Products → Reviews

**UI Components to reuse:**
- ComponentCardCollapsible for filters
- Existing table patterns from OrdersListPage
- Toast notifications for actions

---

### Customer Website (www) - Phase 1

**1. Display Component**

**File:** `www/src/components/ProductDetails/Reviews/ReviewsSection.jsx`

```jsx
<ReviewsSection>
  <ReviewsSummary
    averageRating={4.67}
    totalReviews={18}
    breakdown={{ 5: 10, 4: 5, 3: 2, 2: 1, 1: 0 }}
  />

  <ReviewsList
    reviews={[...]}
    onLoadMore={handleLoadMore}
  />

  {isAuthenticated && (
    <WriteReviewButton onClick={openReviewForm} />
  )}
</ReviewsSection>
```

**2. Review Form Component**

**File:** `www/src/components/ProductDetails/Reviews/ReviewForm.jsx`

- Star rating selector (1-5)
- Headline input (100 char limit)
- Body textarea (5000 char limit)
- Character counters
- Submit button
- Success/error messages
- Login CTA if not authenticated

**3. Individual Review Display**

**File:** `www/src/components/ProductDetails/Reviews/ReviewCard.jsx`

```jsx
<ReviewCard>
  <StarRating value={5} readonly />
  <Headline>Amazing flowers!</Headline>
  <Body>These roses lasted 2 weeks...</Body>
  <Meta>
    <CustomerName>John D.</CustomerName>
    {verifiedPurchase && <VerifiedBadge />}
    <Date>November 1, 2025</Date>
  </Meta>
</ReviewCard>
```

**4. Stars Component**

**File:** `www/src/components/common/StarRating.jsx`

Reusable component:
- Display mode: filled/empty stars
- Interactive mode: click to select rating
- Half-star support for averages
- Size variants (small, medium, large)

**5. Service Layer**

**File:** `www/src/services/reviewService.js`

```javascript
export const reviewService = {
  getProductReviews: async (productId, page = 1) => {
    return api.get(`/products/${productId}/reviews?page=${page}`);
  },

  createReview: async (productId, reviewData) => {
    return api.post(`/products/${productId}/reviews`, reviewData);
  }
};
```

**6. Update Product Details Page**

**File:** `www/src/pages/ProductDetails.jsx`

- Import ReviewsSection
- Fetch reviews parallel to product data
- Add reviews section below product description
- Pass review data and handlers

---

### Email Notifications - Phase 1

**Template:** Review Published

**File:** `back/src/services/emailTemplates/reviewPublished.ts`

```
Subject: Your review for [Product Name] is live!

Hi [Customer Name],

Thank you for reviewing [Product Name]. Your review is now live on our website and helping other customers make informed decisions.

View your review: [Product URL]#reviews

Thank you for your feedback!
```

**Template:** Review Rejected

```
Subject: Update on your review for [Product Name]

Hi [Customer Name],

Thank you for taking the time to review [Product Name]. Unfortunately, we're unable to publish your review as it doesn't meet our review guidelines.

Common reasons:
- Profanity or inappropriate language
- Personal information
- Off-topic content

If you'd like to submit a revised review, please visit: [Product URL]

Thank you for your understanding.
```

---

### Data Migration - Phase 1

**File:** `back/src/scripts/initializeReviewAggregates.ts`

One-time script to:
1. Add new columns to Product table
2. Initialize reviewCount to 0
3. Set averageRating to null
4. Set ratingBreakdown to null

Run after migration:
```bash
npx prisma db push
npx tsx back/src/scripts/initializeReviewAggregates.ts
```

---

### Testing - Phase 1

**Manual Test Checklist:**
- [ ] Customer can submit review for purchased product
- [ ] Customer cannot submit duplicate review
- [ ] Customer cannot review without purchase (no verified badge)
- [ ] Unauthenticated user sees login CTA
- [ ] Review shows as PENDING after submit
- [ ] Admin can see pending reviews
- [ ] Admin can approve review → appears on product page
- [ ] Admin can reject review → customer gets email
- [ ] Product aggregates update correctly
- [ ] Star rating displays correctly
- [ ] Pagination works on review list
- [ ] Review form validates input

**Unit Tests:**
- `reviewService.calculateProductAggregates()`
- `reviewService.verifyPurchase()`
- `reviewService.checkDuplicateReview()`

**API Tests:**
- POST /api/products/:id/reviews (auth required)
- GET /api/products/:id/reviews (pagination)
- PATCH /api/admin/product-reviews/:id (admin only)

---

### Documentation - Phase 1

**Files to Update:**

**1. API_Endpoints.md**
Add review endpoints with request/response examples

**2. Progress_Tracker.markdown**
Add to "Production-Ready" section after completion:
```
- ✅ Product review system — verified purchase reviews with admin moderation,
  star ratings, and aggregated displays (`back/src/routes/product-reviews.ts`,
  `admin/src/app/pages/products/ReviewsModeration.tsx`,
  `www/src/components/ProductDetails/Reviews/*`)
```

**3. System_Reference.md**
Document review lifecycle and moderation workflow

---

## Phase 2: Full Implementation

**Timeline:** 1 week
**Status:** 🔜 Future

### Additional Features

**1. Photo/Video Reviews**
- Multiple image uploads per review (max 5)
- Video upload support (max 30s)
- Leverage existing R2 integration (`back/src/utils/r2Client.ts`)
- Thumbnail generation for gallery view
- Lightbox/carousel for viewing

**Schema changes:**
```prisma
model ProductReviewMedia {
  id            String   @id @default(cuid())
  reviewId      String
  type          MediaType // IMAGE or VIDEO
  url           String   // R2 URL
  thumbnailUrl  String?  // For videos
  sortOrder     Int      @default(0)
  createdAt     DateTime @default(now())

  review        ProductReview @relation(fields: [reviewId], references: [id], onDelete: Cascade)

  @@index([reviewId])
}

enum MediaType {
  IMAGE
  VIDEO
}

model ProductReview {
  // ... existing fields ...
  media         ProductReviewMedia[]
}
```

**New endpoints:**
- POST /api/product-reviews/:id/media (multipart form)
- DELETE /api/product-reviews/:id/media/:mediaId

**2. Helpful Votes**
- "Was this review helpful?" buttons
- Track helpful/not helpful counts
- Sort by most helpful
- Prevent vote manipulation (one vote per customer)

**Schema changes:**
```prisma
model ProductReview {
  // ... existing fields ...
  helpfulCount    Int      @default(0)
  notHelpfulCount Int      @default(0)
  votes           ReviewVote[]
}

model ReviewVote {
  id         String   @id @default(cuid())
  reviewId   String
  customerId String
  helpful    Boolean  // true = helpful, false = not helpful
  createdAt  DateTime @default(now())

  review     ProductReview @relation(fields: [reviewId], references: [id], onDelete: Cascade)
  customer   Customer      @relation(fields: [customerId], references: [id], onDelete: Cascade)

  @@unique([reviewId, customerId])
  @@index([reviewId])
}
```

**New endpoints:**
- POST /api/product-reviews/:id/vote (body: { helpful: true/false })

**3. Business Responses**
- Allow admin to respond to reviews
- Shows under review on product page
- Email notification to customer

**Schema changes:**
```prisma
model ProductReview {
  // ... existing fields ...
  adminResponse   String?  @db.Text
  respondedAt     DateTime?
  respondedBy     String?  // Employee ID

  responder       Employee? @relation(fields: [respondedBy], references: [id], onDelete: SetNull)
}
```

**New endpoints:**
- POST /api/admin/product-reviews/:id/response
- DELETE /api/admin/product-reviews/:id/response

**4. Advanced Filtering & Sorting**
- Filter by star rating (5★, 4★, 3★, etc.)
- Filter verified purchases only
- Filter with photos only
- Sort options:
  - Most Recent (default)
  - Highest Rated
  - Lowest Rated
  - Most Helpful
- Search within reviews

**Updated endpoint:**
```
GET /api/products/:id/reviews
  ?page=1
  &rating=5          // Filter by rating
  &verified=true     // Verified only
  &withMedia=true    // Photos only
  &sort=helpful      // newest|highest|lowest|helpful
  &search=lasting    // Search text
```

**5. Abuse Reporting**
- "Report review" button
- Report reasons: spam, inappropriate, fake, etc.
- Admin dashboard for reported reviews
- Auto-flag after X reports

**Schema changes:**
```prisma
model ProductReview {
  // ... existing fields ...
  reportCount     Int      @default(0)
  reports         ReviewReport[]
}

model ReviewReport {
  id         String   @id @default(cuid())
  reviewId   String
  customerId String
  reason     ReportReason
  details    String?  @db.Text
  createdAt  DateTime @default(now())

  review     ProductReview @relation(fields: [reviewId], references: [id], onDelete: Cascade)
  customer   Customer      @relation(fields: [customerId], references: [id], onDelete: Cascade)

  @@unique([reviewId, customerId])
  @@index([reviewId])
}

enum ReportReason {
  SPAM
  INAPPROPRIATE
  FAKE
  OFF_TOPIC
  OTHER
}
```

**New endpoints:**
- POST /api/product-reviews/:id/report
- GET /api/admin/review-reports

**6. Customer Review Management**
- "My Reviews" section in customer profile
- Edit review (within 24 hours)
- Delete review
- View review status (pending/published)

**New endpoints:**
- GET /api/customers/me/reviews
- PATCH /api/customers/me/reviews/:id (edit own review)
- DELETE /api/customers/me/reviews/:id

**UI Location:**
- www/src/pages/Profile.jsx → Add "My Reviews" tab

**7. SEO Enhancements**
- Schema.org Product Review markup
- Rich snippets for Google
- Aggregate rating in meta tags

**Add to:** `www/src/pages/ProductDetails.jsx`

```jsx
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Product Name",
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.67",
    "reviewCount": "18"
  },
  "review": [
    {
      "@type": "Review",
      "author": "John D.",
      "datePublished": "2025-11-01",
      "reviewRating": {
        "@type": "Rating",
        "ratingValue": "5"
      },
      "reviewBody": "..."
    }
  ]
}
</script>
```

**8. Email Automation**
- Auto-request reviews 7 days after delivery
- Reminder if no review after 14 days
- Include direct review link

**New service:** `back/src/services/reviewRequestService.ts`

**Integrate with:** `back/src/utils/notificationTriggers.ts`

**9. Analytics Dashboard (Admin)**
- Review submission rate
- Average rating trend over time
- Review velocity (reviews per day/week)
- Most reviewed products
- Response rate to reviews

**New page:** `admin/src/app/pages/reports/ReviewAnalytics.tsx`

**10. Auto-Moderation**
- Profanity filter
- Spam detection (repeated text, gibberish)
- Auto-approve trusted customers (e.g., 5+ previous reviews)
- Auto-reject suspicious patterns

**Add to:** `back/src/services/reviewService.ts`

```typescript
function autoModerateReview(review: ReviewInput): ReviewStatus {
  if (containsProfanity(review.body)) return 'REJECTED';
  if (isSpam(review.body)) return 'REJECTED';
  if (isTrustedCustomer(review.customerId)) return 'PUBLISHED';
  return 'PENDING';
}
```

---

### Phase 2 API Additions

**Summary of new endpoints:**
```
POST   /api/product-reviews/:id/media
DELETE /api/product-reviews/:id/media/:mediaId
POST   /api/product-reviews/:id/vote
POST   /api/product-reviews/:id/report
POST   /api/admin/product-reviews/:id/response
DELETE /api/admin/product-reviews/:id/response
GET    /api/admin/review-reports
GET    /api/customers/me/reviews
PATCH  /api/customers/me/reviews/:id
DELETE /api/customers/me/reviews/:id
```

---

### Phase 2 UI Components

**New components:**
```
www/src/components/ProductDetails/Reviews/
  - PhotoGallery.jsx (lightbox for review photos)
  - VideoPlayer.jsx (review videos)
  - HelpfulVotes.jsx (thumbs up/down)
  - ReportReviewModal.jsx
  - ReviewFilters.jsx (rating, verified, photos)
  - BusinessResponse.jsx (displays under review)

admin/src/app/pages/products/
  - ReviewAnalytics.tsx (dashboard)
  - ReportedReviews.tsx (abuse management)

www/src/pages/Profile/
  - MyReviews.jsx (customer's reviews)
```

---

### Phase 2 Testing

**Additional tests:**
- [ ] Photo upload and display
- [ ] Video upload and playback
- [ ] Helpful vote increments correctly
- [ ] Report review workflow
- [ ] Business response displays
- [ ] Review editing within 24h window
- [ ] Auto-moderation catches profanity
- [ ] SEO markup validates
- [ ] Email automation triggers
- [ ] Analytics data accuracy

---

## Implementation Order (Phase 1)

**Day 1:**
1. Database migration (1-2 hours)
   - Add ProductReview model
   - Extend Product, Customer, Order models
   - Run migration
   - Test in Prisma Studio

2. Backend API (4-6 hours)
   - Create reviewService.ts
   - Create product-reviews.ts routes
   - Add validation with Zod
   - Test with Postman/Thunder Client

**Day 2:**
3. Admin UI (3-4 hours)
   - Create ReviewsModeration page
   - Add to Products menu
   - Test moderation workflow

4. Customer UI (4-6 hours)
   - Create ReviewsSection components
   - Update ProductDetails page
   - Add reviewService.js
   - Test submission and display

5. Polish & Deploy (1-2 hours)
   - Email templates
   - Update documentation
   - Run test checklist
   - Deploy to staging

---

## Success Metrics

**Phase 1:**
- [ ] Reviews can be submitted and approved
- [ ] Verified purchase badge shows correctly
- [ ] Product pages display reviews and ratings
- [ ] Admin can moderate effectively
- [ ] No duplicate reviews possible
- [ ] Aggregates calculate correctly

**Phase 2:**
- [ ] Photo reviews increase engagement by 30%+
- [ ] Helpful votes identify quality reviews
- [ ] Business responses improve customer satisfaction
- [ ] Auto-moderation reduces manual work by 50%+
- [ ] SEO traffic increases from rich snippets
- [ ] Review request emails get 20%+ response rate

---

## Dependencies

**Existing Infrastructure:**
- ✅ Customer authentication (`back/src/middleware/customerAuth.ts`)
- ✅ Admin authentication (`back/src/middleware/auth.ts`)
- ✅ Email service (`back/src/services/emailService.ts`)
- ✅ Image uploads - R2 (`back/src/utils/r2Client.ts`)
- ✅ Prisma ORM
- ✅ Product & Order models
- ✅ React component library

**New Dependencies:**
```json
// Phase 1: None

// Phase 2:
{
  "bad-words": "^3.0.4",        // Profanity filter
  "react-image-lightbox": "^5.1.4"  // Photo gallery
}
```

---

## Rollout Checklist

**Pre-launch:**
- [ ] Run database migration in staging
- [ ] Seed test reviews in staging
- [ ] Test all endpoints with Postman
- [ ] Run manual test checklist
- [ ] Update API documentation
- [ ] Update Progress_Tracker.markdown
- [ ] Train admin team on moderation

**Launch:**
- [ ] Deploy backend to production
- [ ] Run migration on production DB
- [ ] Deploy admin panel
- [ ] Deploy customer website
- [ ] Monitor error logs for 24 hours
- [ ] Check review submission flow
- [ ] Verify email notifications

**Post-launch:**
- [ ] Announce feature to customers (email)
- [ ] Add review request to order confirmation emails
- [ ] Monitor review velocity
- [ ] Gather feedback from admin team
- [ ] Plan Phase 2 based on usage data

---

## Notes

**Security Considerations:**
- Rate limit review submissions (max 5 per hour per customer)
- Sanitize HTML in review body to prevent XSS
- Validate file types for photo uploads (Phase 2)
- Prevent review spam with captcha if needed

**Performance Considerations:**
- Cache product aggregates in Product table (already planned)
- Index on [productId, status] for fast queries
- Lazy load reviews (pagination)
- Optimize aggregate recalculation (batch updates)

**Future Enhancements (Beyond Phase 2):**
- Review incentives (discount for review)
- Import reviews from other platforms
- Review syndication to Google Shopping
- ML-based sentiment analysis
- A/B test review prompts
- Review lottery (monthly prize draw)
- Review translation for international customers

---

**Implementation Ready:** ✅ Phase 1
**Needs Planning:** 🔜 Phase 2

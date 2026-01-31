# Phone Type Verification (NumVerify)

## Overview
Before sending SMS to a customer, verify the phone number is mobile (not landline). Use NumVerify free tier (100 lookups/month) and cache results on the customer record so each number is only looked up once.

## Architecture

### Flow
1. User triggers "Send SMS" action
2. Check customer's `phoneType` field
3. If `null` → call NumVerify API → store result (`MOBILE`, `LANDLINE`, `VOIP`, `UNKNOWN`)
4. If `LANDLINE` → show warning: "This number is a landline and cannot receive texts"
5. If `MOBILE` or `VOIP` → proceed with sending
6. If `UNKNOWN` (API failed/limit reached) → proceed with sending, let Twilio error handle it

### On phone number change
- When a customer's phone number is updated, reset `phoneType` to `null` so it gets re-verified next time

---

## Implementation Tasks

### Task 1: Database — Add phoneType field
**File**: `back/prisma/schema.prisma`

- Add `phoneType String?` to the Customer model (nullable, values: `MOBILE`, `LANDLINE`, `VOIP`, `UNKNOWN`)
- Create migration: `npx prisma migrate dev --name add_customer_phone_type`

### Task 2: Backend — NumVerify service
**File**: New `back/src/services/phoneVerificationService.ts`

- Call NumVerify API: `http://apilayer.net/api/validate?access_key=KEY&number=PHONE&country_code=CA`
- Parse response `line_type` field → map to `MOBILE`, `LANDLINE`, `VOIP`, or `UNKNOWN`
- Handle errors/rate limits gracefully → return `UNKNOWN`
- Add `NUMVERIFY_API_KEY` to env config

### Task 3: Backend — Verification endpoint
**File**: New route or add to existing customer routes

- `POST /api/customers/:id/verify-phone` (or inline in SMS-sending logic)
- Checks `phoneType` on customer record
- If `null`, calls NumVerify, updates customer record, returns result
- If already set, returns cached value
- Response: `{ phoneType: "MOBILE" | "LANDLINE" | "VOIP" | "UNKNOWN", canSMS: boolean }`

### Task 4: Backend — Reset phoneType on number change
**Files**: Customer update routes/services

- When `phone` field changes on a customer, set `phoneType = null`

### Task 5: Admin — SMS send flow integration
**Files**: Communication modal / SMS sending component

- Before sending, call verify-phone endpoint
- If `LANDLINE`: show warning message, block send
- If `UNKNOWN`: proceed but maybe show info note
- If `MOBILE`/`VOIP`: proceed normally

---

## Implementation Order
1. Task 1 (DB migration)
2. Task 2 (NumVerify service)
3. Task 3 (API endpoint)
4. Task 4 (Reset on change)
5. Task 5 (Admin UI integration)

## Environment Variables
- `NUMVERIFY_API_KEY` — from https://numverify.com (free tier: 100 lookups/month)

## Ready for Implementation: ✅

# Move Driver Route Page to Admin

**Status:** 🔜 Ready for Implementation
**Created:** 2026-01-28
**Priority:** Medium

---

## Overview
Move the driver route page and QR code generator from `www` to `admin`. Driver routes are internal operations, not customer-facing. When `www` moves to the production customer domain, driver links should remain on the admin domain.

---

## 🤖 Implementation Constraints for AI

### Required Reading (IN ORDER)
1. `/docs/AI_IMPLEMENTATION_GUIDE.md`
2. `/CLAUDE.md`

### Pattern Reference Files
- **Current driver page:** `/www/src/pages/DriverRoute.jsx`
- **Current QR generator:** Search for QR/route token generation in admin
- **Driver API:** `/back/src/routes/driver/route-view.ts`
- **Route token utility:** `/back/src/utils/routeToken.ts`

---

## Goals

1. Driver route page runs on admin domain (not customer-facing www)
2. QR code / link generation points to admin domain
3. Page remains publicly accessible via token (no admin login required)
4. Clean up www — remove driver-related code

---

## Changes

### 1. Create driver route page in admin
- **New file:** `/admin/src/app/pages/driver/DriverRoutePage.tsx`
- Convert `DriverRoute.jsx` from www (JSX → TSX)
- Register as a **public route** in admin router (no auth wrapper)
- Route: `/driver/route?token=...`
- Keep all existing functionality: map, stop cards, move up/down, Google Maps nav, signature, mark delivered

### 2. Update route token URL builder
- **File:** `/back/src/utils/routeToken.ts` → `buildRouteViewUrl()`
- Change base URL from www domain to admin domain
- Ensure env var or config controls the domain

### 3. Update QR code generation
- Find where QR codes / driver links are generated
- Update to use admin domain URL

### 4. Remove from www
- Delete `/www/src/pages/DriverRoute.jsx`
- Remove route registration from www router
- Remove `react-signature-canvas` from www if only used here

---

## Implementation Checklist

- [ ] Create `/admin/src/app/pages/driver/DriverRoutePage.tsx` (convert from JSX)
- [ ] Add public route in admin router (no ProtectedRoute wrapper)
- [ ] Update `buildRouteViewUrl()` to use admin domain
- [ ] Update QR code / link generation
- [ ] Delete `DriverRoute.jsx` from www
- [ ] Clean up www dependencies if unused
- [ ] Test: driver link opens on admin domain without login
- [ ] Test: all functionality works (map, reorder, deliver, signature, Google Maps)

---

## Notes
- Admin domain stays as `admin.hellobloom.ca` (or current domain)
- www will move to production customer domain later
- `react-signature-canvas` may need to be added to admin's package.json
- `@react-google-maps/api` may need to be added to admin's package.json

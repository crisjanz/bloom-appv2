# Employee Login - Unified Auth System

**Status:** 🔜 Ready for Implementation
**Created:** 2026-01-24
**Priority:** High

---

## Overview
Unify the Employee and User login systems. Employees can optionally have login credentials (email + password). The header UserDropdown should display the logged-in employee's name and provide proper logout functionality.

**Current State:**
- Employee model already has auth fields: `password`, `lastLogin`, `failedLoginAttempts`, `accountLockedUntil`
- AuthContext.tsx already works with Employee model
- Backend auth routes (login, refresh, change-password) are fully implemented
- UserDropdown.tsx is hardcoded with placeholder "Musharof" - not connected to AuthContext

---

## 🤖 Implementation Constraints for AI

**CRITICAL - Read Before Implementing:**

### Required Reading (IN ORDER)
1. `/docs/AI_IMPLEMENTATION_GUIDE.md` ← **READ THIS FIRST**
2. `/docs/System_Reference.md` (architecture context)
3. `/CLAUDE.md` (project conventions)

### Pattern Reference Files
- **Existing auth routes:** `/back/src/routes/auth.ts` (already complete)
- **AuthContext:** `/admin/src/app/contexts/AuthContext.tsx` (already complete)
- **Employee card pattern:** `/admin/src/app/components/settings/business/EmployeeListCard.tsx`
- **Header dropdown:** `/admin/src/shared/ui/header/UserDropdown.tsx`

### Critical Don'ts
❌ Create a new User model - Use Employee model for auth
❌ Modify backend auth routes - They're already complete
❌ Use raw fetch() - Use existing AuthContext methods or useApiClient

---

## Goals

1. Allow employees to have optional login credentials (set via Settings → Business)
2. Display logged-in employee name/email in header UserDropdown
3. Provide working logout functionality
4. Allow logged-in user to change their own password

---

## Architecture & Endpoints

### Backend API Routes (ALREADY IMPLEMENTED - DO NOT MODIFY)

**File:** `/back/src/routes/auth.ts`

| Endpoint | Description | Status |
|----------|-------------|--------|
| `POST /api/auth/login` | Login with email/password | ✅ Done |
| `POST /api/auth/refresh` | Refresh access token | ✅ Done |
| `POST /api/auth/logout` | Logout (invalidate tokens) | ✅ Done |
| `GET /api/auth/me` | Get current logged-in employee | ✅ Done |
| `POST /api/auth/change-password` | Change own password | ✅ Done |
| `POST /api/auth/setup-admin` | Initial admin setup | ✅ Done |

### New Endpoint Needed

**File:** `/back/src/routes/employees.ts`

| Endpoint | Description |
|----------|-------------|
| `POST /api/employees/:id/set-password` | Admin sets password for employee |
| `POST /api/employees/:id/reset-password` | Admin resets employee password |

---

## UI Requirements

### 1. Update EmployeeListCard.tsx

**Location:** `/admin/src/app/components/settings/business/EmployeeListCard.tsx`

**Add to each employee row:**
- Show login status indicator (has password = can login)
- "Set Password" button (if no password set)
- "Reset Password" button (if password exists)

**New Modal: SetPasswordModal**
- Password input (with show/hide toggle)
- Confirm password input
- Validation: min 8 chars, 1 number, 1 special char
- Submit sets password via `POST /api/employees/:id/set-password`

### 2. Update UserDropdown.tsx

**Location:** `/admin/src/shared/ui/header/UserDropdown.tsx`

**Changes:**
- Import and use `useAuth` hook from AuthContext
- Display `employee.name` instead of hardcoded "Musharof"
- Display `employee.email` instead of hardcoded email
- Remove hardcoded avatar, use initials or generic avatar
- "Sign out" link should call `logout()` then redirect to `/signin`

**Updated structure:**
```tsx
const { employee, logout } = useAuth();

// Display
<span>{employee?.name || 'User'}</span>
<span>{employee?.email || ''}</span>

// Logout
const handleLogout = () => {
  logout();
  navigate('/signin');
};
```

### 3. Add ChangePasswordModal (Optional but recommended)

**Location:** `/admin/src/app/components/settings/ChangePasswordModal.tsx`

For logged-in user to change their own password:
- Current password input
- New password input
- Confirm new password input
- Calls `POST /api/auth/change-password`

### User Flow

**Admin setting up employee login:**
1. Go to Settings → Business
2. Find employee in list
3. Click "Set Password" button
4. Enter password in modal
5. Employee can now login with email + password

**User logging in:**
1. Go to /signin
2. Enter email + password
3. Redirected to dashboard
4. Header shows their name
5. Dropdown has logout option

---

## Implementation Checklist

### Phase 1: Backend (Employee Password Management)
- [ ] Add `POST /api/employees/:id/set-password` endpoint
  - Admin-only (check `authenticateToken` + ADMIN role)
  - Validate password strength
  - Hash password with bcrypt
  - Update employee record
- [ ] Add `POST /api/employees/:id/reset-password` endpoint
  - Clears password, locks account until new password set
  - OR generates temporary password
- [ ] Register routes in `/back/src/routes/employees.ts`

### Phase 2: Employee Settings UI
- [ ] Add login status indicator to employee list (icon: key or lock)
- [ ] Create `SetPasswordModal.tsx` component
  - Password + confirm password inputs
  - Show/hide password toggle
  - Validation feedback
- [ ] Add "Set Password" / "Reset Password" buttons to employee rows
- [ ] Wire up API calls using `useApiClient`

### Phase 3: Header UserDropdown
- [ ] Import `useAuth` from AuthContext
- [ ] Replace hardcoded name with `employee?.name`
- [ ] Replace hardcoded email with `employee?.email`
- [ ] Replace avatar with initials avatar or generic icon
- [ ] Implement proper logout handler:
  ```tsx
  const handleLogout = () => {
    logout();
    window.location.href = '/signin';
  };
  ```
- [ ] Remove "Edit profile" and "Account settings" links (or wire them up)

### Phase 4: Change Password (Optional)
- [ ] Create `ChangePasswordModal.tsx`
- [ ] Add "Change Password" option to UserDropdown
- [ ] Wire up `POST /api/auth/change-password`

### Phase 5: Testing
- [ ] Test employee password setup via Settings
- [ ] Test login with new credentials
- [ ] Test header shows correct employee name
- [ ] Test logout clears session and redirects
- [ ] Test password change flow
- [ ] Test account lockout after failed attempts

---

## Files to Create/Modify

### New Files
```
/admin/src/app/components/settings/business/SetPasswordModal.tsx  (~100 lines)
/admin/src/app/components/settings/ChangePasswordModal.tsx        (~100 lines)
```

### Modified Files
```
/back/src/routes/employees.ts                                     (add password endpoints)
/admin/src/app/components/settings/business/EmployeeListCard.tsx  (add password UI)
/admin/src/shared/ui/header/UserDropdown.tsx                      (connect to AuthContext)
```

---

## Edge Cases & Validation

### Password Validation
- Minimum 8 characters
- At least 1 number
- At least 1 special character
- Password and confirm password must match

### Business Rules
- Only ADMIN type employees can set passwords for others
- Employees can only change their own password (via change-password)
- Email must be set before password can be set (email is login identifier)

### Error Scenarios
- Employee without email tries to set password → Show error "Email required first"
- Password doesn't meet requirements → Show validation errors
- Wrong current password on change → Show error
- Account locked → Show lockout message with time remaining

---

## Success Criteria

- [ ] Employees can be given login credentials via Settings
- [ ] Header shows logged-in employee's name and email
- [ ] Logout works and redirects to /signin
- [ ] Password validation enforced
- [ ] Account lockout works after 5 failed attempts
- [ ] No console errors
- [ ] Dark mode supported

---

## Implementation Notes

**Dependencies:**
- AuthContext is already fully implemented
- Backend auth routes are already complete
- Just need UI work + one new endpoint

**What NOT to do:**
- Don't create a separate User model
- Don't modify existing auth routes (they work)
- Don't remove Employee type - it's used for order assignment

**Deployment Notes:**
- No database migration needed (Employee already has auth fields)
- No environment variable changes needed

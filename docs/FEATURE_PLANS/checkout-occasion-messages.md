# Checkout Occasion Selector & Card Message Suggestions

**Status:** 🔜 Ready for Implementation
**Created:** 2026-02-16
**Priority:** High

---

## Overview
The www checkout has a card message textarea but no occasion selector and no message suggestions. Other floral sites let customers pick an occasion (Birthday, Sympathy, etc.) and offer pre-written card messages. The admin POS already has this — `MessageSuggestion` model with categories, a suggestions modal (`MessageSuggestions.tsx`), and the Order schema has an `occasion` field. This plan brings that same functionality to the customer-facing www checkout.

---

## 🤖 Implementation Constraints for AI

**CRITICAL - Read Before Implementing:**

> **⚠️ FOR AI ASSISTANTS: You MUST read the required documentation before writing code. Follow existing patterns exactly.**

### Required Reading (IN ORDER)
1. `/CLAUDE.md` ← **READ THIS FIRST** (project conventions)
2. `/docs/AI_IMPLEMENTATION_GUIDE.md` (all patterns)

### Pattern Reference Files
- **Admin message suggestions modal:** `/admin/src/app/components/orders/MessageSuggestions.tsx` — categories, radio select, "Use This Message" flow
- **Admin settings for suggestions:** `/admin/src/app/components/settings/orders/MessageSuggestionsCard.tsx` — CRUD for MessageSuggestion
- **Backend messages API:** `/back/src/routes/messages.ts` — GET/POST/DELETE `/api/messages`
- **Current checkout recipient form (desktop):** `/www/src/components/Checkout/RecipientStep/DesktopRecipientForm.jsx`
- **Current checkout recipient form (mobile):** `/www/src/components/Checkout/RecipientStep/MobileRecipientForm.jsx`
- **Checkout state/constants:** `/www/src/components/Checkout/shared/constants.js`
- **Checkout main page:** `/www/src/pages/Checkout.jsx`

### Pre-Implementation Contract (Required — Answer Before Coding)
- **Goals → Changes mapping**: Map each Goal to the specific code changes/files.
- **Files to touch (exact paths)**: List every file you will create/modify.
- **Unknowns / questions**: If anything is ambiguous, ask now — do not start coding.

### Critical Don'ts
❌ Create a new API endpoint for message suggestions — use existing `GET /api/messages` (already public, no auth required)
❌ Modify the `MessageSuggestion` model or admin settings — they already work
❌ Use raw `<select>` — use the www checkout's existing form component patterns
❌ Make the occasion field required — it should be optional
❌ Change how `cardMessage` or `occasion` are saved to the Order — the backend already handles these fields

---

## What Already Exists

### Database
- `Order.occasion` — `String?` field, already in schema
- `Order.cardMessage` — `String?` field, already in schema
- `MessageSuggestion` model — `{ id, label, message }` where `label` is the category (BIRTHDAY, SYMPATHY, etc.)

### Backend
- `GET /api/messages` — Returns all message suggestions, sorted by label
- `POST /api/messages` — Create (admin only)
- `DELETE /api/messages/:id` — Delete (admin only)

### Admin POS
- Occasion dropdown in Take Order and Order Edit pages
- Message suggestions modal grouped by category with radio select
- Categories: SYMPATHY, BIRTHDAY, ANNIVERSARY, THANK_YOU, LOVE, GET_WELL, CONGRATULATIONS, OTHER

### www Checkout (current)
- Card message textarea exists in both desktop and mobile recipient forms
- `occasion` field exists in `initialRecipient` state but is NOT shown in UI
- No message suggestions shown to customer

---

## Goals

1. **Add occasion dropdown** to www checkout recipient step (both desktop and mobile) — uses same categories as admin
2. **Add "Message Ideas" button** next to card message textarea that opens a suggestions panel filtered by selected occasion
3. **Pass occasion to order creation** — already supported by backend, just needs to be included in the checkout payload
4. **Mobile-friendly** — suggestions should work well on small screens (bottom sheet or inline expansion)

---

## Architecture & Endpoints

### No New Endpoints Needed

Everything uses existing APIs:
- `GET /api/messages` — Fetch all suggestions (already exists, returns `{ id, label, message }[]`)
- `POST /api/orders/draft` — Already accepts `occasion` field

### No Database Changes Needed

`Order.occasion` and `MessageSuggestion` model already exist.

---

## UI Requirements

### Occasion Dropdown

Add above the card message textarea in the recipient step:

```
Occasion (optional)
[Select an occasion ▼]
- Birthday
- Anniversary
- Sympathy
- Thank You
- Love & Romance
- Get Well
- Congratulations
- Other
```

**Category display names** (match admin):
```js
const occasionOptions = [
  { value: "", label: "Select an occasion" },
  { value: "BIRTHDAY", label: "Birthday" },
  { value: "ANNIVERSARY", label: "Anniversary" },
  { value: "SYMPATHY", label: "Sympathy" },
  { value: "THANK_YOU", label: "Thank You" },
  { value: "LOVE", label: "Love & Romance" },
  { value: "GET_WELL", label: "Get Well" },
  { value: "CONGRATULATIONS", label: "Congratulations" },
  { value: "OTHER", label: "Other" },
];
```

### Message Suggestions

**Trigger:** Small link/button below or beside the card message textarea: "Need inspiration?" or "Message ideas"

**Desktop:** Expandable panel below the textarea showing suggestions filtered by selected occasion (or all if no occasion selected). Each suggestion is clickable — clicking it fills the textarea.

**Mobile:** Same inline expandable panel (not a modal — keep the user in the flow).

**Behavior:**
- Fetch suggestions once on checkout load via `GET /api/messages`
- If occasion is selected, filter suggestions to that category
- If no occasion selected, show all suggestions grouped by category
- Clicking a suggestion fills the `cardMessage` textarea (replaces existing text)
- User can still type their own message or edit after selecting a suggestion
- If no suggestions exist in the system, don't show the "Message ideas" button at all

### User Flow

1. Customer fills recipient info
2. Optionally selects an occasion from dropdown
3. Sees card message textarea
4. Clicks "Message ideas" link → suggestions expand below
5. Suggestions filtered by occasion (or all if none selected)
6. Customer clicks a suggestion → textarea fills with that message
7. Customer can edit the message or clear and type their own
8. Suggestions panel collapses after selection (or customer can collapse manually)

### Mobile Responsiveness
- Occasion dropdown: full width on mobile
- Message suggestions: inline expandable, not a modal
- Touch-friendly suggestion items (adequate tap targets)

---

## Implementation Checklist

### Phase 1: Add Occasion Dropdown
- [ ] Add occasion dropdown to `/www/src/components/Checkout/RecipientStep/DesktopRecipientForm.jsx`
- [ ] Add occasion dropdown to `/www/src/components/Checkout/RecipientStep/MobileRecipientForm.jsx`
- [ ] Ensure `occasion` is included in recipient state (`initialRecipient` in constants.js — check if already there)
- [ ] Ensure `occasion` is passed through to order draft creation in `Checkout.jsx`
- [ ] Test: occasion shows in created order in admin

### Phase 2: Message Suggestions
- [ ] Fetch message suggestions via `GET /api/messages` on checkout load (in `Checkout.jsx` or a small hook)
- [ ] Create a `MessageSuggestions` component for www (simple expandable panel, NOT a copy of the admin modal)
- [ ] Place in both desktop and mobile recipient forms below the card message textarea
- [ ] Filter suggestions by selected occasion
- [ ] Clicking suggestion fills `cardMessage` field
- [ ] Hide "Message ideas" button if no suggestions exist
- [ ] Style to match www checkout theme

### Phase 3: Testing
- [ ] Test with no occasion selected (show all suggestions grouped)
- [ ] Test with occasion selected (filtered suggestions)
- [ ] Test with no suggestions in database (button hidden)
- [ ] Test on mobile (responsive, touch-friendly)
- [ ] Test that selected message appears in order in admin
- [ ] Verify dark mode if www supports it

### Phase 4: Cleanup & Docs
- [ ] Update `/docs/Progress_Tracker.markdown`
- [ ] Archive this feature plan to `/docs/FEATURE_PLANS/archive/`

---

## Files to Create/Modify

### New Files
```
www/src/components/Checkout/RecipientStep/MessageSuggestions.jsx    (~80 lines, expandable suggestion panel)
```

### Modified Files
```
www/src/components/Checkout/RecipientStep/DesktopRecipientForm.jsx  (add occasion dropdown + suggestions)
www/src/components/Checkout/RecipientStep/MobileRecipientForm.jsx   (add occasion dropdown + suggestions)
www/src/pages/Checkout.jsx                                          (fetch suggestions, pass to forms, include occasion in order)
www/src/components/Checkout/shared/constants.js                     (occasion options, verify initialRecipient has occasion)
```

---

## Success Criteria

- [ ] Occasion dropdown visible in checkout (optional, not required)
- [ ] Message suggestions appear when clicking "Message ideas"
- [ ] Suggestions filter by selected occasion
- [ ] Clicking a suggestion fills the card message textarea
- [ ] Occasion and card message saved to order correctly
- [ ] Works on mobile (375px+)
- [ ] No suggestions = no "Message ideas" button
- [ ] No console errors

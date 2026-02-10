# Discussion Recap: Customer/Address Schema Issues

**Date:** 2026-02-09

## Problem Observed

In checkout, user sees 3 saved recipients with the same name, but only 1 in the manage recipients screen and 1 in dashboard customers.

## Root Cause

1. **Checkout shows one dropdown entry per address, not per recipient.** If a recipient has 3 addresses (homeAddress + 2 in addresses[]), you see 3 entries with the same name.

2. **Merge doesn't deduplicate addresses by content.** When merging customers A, B, C → A, all their addresses get copied to A. If they all had "123 Main St", you now have 3 Address records with identical content.

## Current Schema Structure

```
Customer
  - id, firstName, lastName, email, phone, etc.
  - homeAddressId → points to ONE Address (optional, "primary")
  - addresses[] → array of Address records via customerId

Address
  - id, address1, address2, city, province, postalCode, country
  - label (e.g., "Work", "Mom's house")
  - firstName, lastName, phone (can differ from customer)
  - addressType (RESIDENCE, BUSINESS, etc.)
  - customerId → owner

CustomerRecipient (sender↔recipient link)
  - senderId → Customer who sends
  - recipientId → Customer who receives
  - No tags, no metadata - just the relationship
```

## Issues with Current Design

1. **homeAddress is redundant** - Could use `isPrimary` flag on Address instead
2. **firstName/lastName on Address is confusing** - If it's a different person, should be a new Customer
3. **No relationship labeling** - Can't tag a recipient as "Mom" or "Office"
4. **Merge creates duplicate addresses** - Doesn't check if address content already exists

## Proposed Cleaner Model

```
Customer
  - id, firstName, lastName, email, phone
  - addresses[] (with one marked isPrimary)

Address
  - id, address1, city, province, postalCode
  - label ("Home", "Work")
  - isPrimary (boolean)
  - NO firstName/lastName (use customer's name)

CustomerRecipient
  - senderId, recipientId
  - label ("Mom", "Office", etc.) ← NEW: for tagging relationships
```

## Files Involved

**homeAddress usage:**
- `back/src/routes/customers.ts`
- `back/src/routes/orders/create.ts`
- `back/src/routes/orders/update.ts`
- `admin/src/app/components/customers/cards/HomeAddressCard.tsx`
- `admin/src/app/components/orders/RecipientCard.tsx`
- `www/src/components/Checkout/shared/utils.js`

**Merge logic:**
- `back/src/routes/customers.ts` (POST /merge endpoint, line ~422)

**Saved recipients fetch:**
- `back/src/routes/customers.ts` (GET /:id/recipients, line ~832)
- `www/src/services/checkoutService.js` (getSavedRecipients)

## Next Steps

1. **Immediate fix:** Write cleanup script to dedupe duplicate addresses (same content, same customer)
2. **Schema refactor:**
   - Drop `homeAddressId` from Customer
   - Add `isPrimary` boolean to Address
   - Remove `firstName`/`lastName` from Address (or keep for edge cases like "Attn: Reception")
   - Add `label` to CustomerRecipient for relationship tagging
3. **Update merge logic:** Check if address content already exists before copying

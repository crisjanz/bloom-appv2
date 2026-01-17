# Wireout Order Implementation

**Status:** ✅ COMPLETED (2026-01-17)
**Documentation:** See `docs/System_Reference.md` and `docs/API_Endpoints.md` for full system documentation

---

## Completed Features

### 1. Database Schema ✅
- Added `WIREOUT` to OrderType enum
- Added `wireoutServiceFee` (Int, cents) to Order model
- Added `wireoutServiceName` (String) to Order model
- Created `OperationsSettings` model with:
  - `wireoutServiceFee` (default $15.00)
  - `wireoutServiceName` (default "FTD")

### 2. Settings UI ✅
- Created Wireout Settings card in Orders Settings page
- Users can configure:
  - Wire Service Name (e.g., "FTD", "Teleflora")
  - Default Wire Service Fee (in dollars)
- Settings saved to database via `/api/settings/operations`

### 3. Zone Detection ✅
- Updated `calculateDeliveryFee()` to return zone status
- When address is outside delivery zone, modal popup asks:
  - "Wire Order" → Sets orderType to WIREOUT
  - "Direct Delivery" → Keeps as DELIVERY with out-of-zone fee
- Modal shows address summary for confirmation

### 4. UI Updates ✅
- Added "Wire Order" option to orderType dropdown
- RecipientCard supports WIREOUT orderType
- MultiOrderTabs supports WIREOUT in type definitions

## Tax Calculation Logic

**Tax rules for WIREOUT orders:**
- **BC destination:** GST (5%) + PST (7%) = 12% total
- **Other Canadian province:** GST only (5%)
- **Out of country:** No tax (0%)

**Implementation approach:**
- Frontend: Shows estimated tax using normal BC rates
- Backend: Applies correct tax based on `orderType` and destination province during order creation

**Backend implementation needed:**
```typescript
if (order.type === 'WIREOUT') {
  const province = order.deliveryAddress.province;

  if (province === 'BC') {
    // Apply GST + PST (12%)
    gst = calculateGST(taxableAmount);
    pst = calculatePST(taxableAmount);
  } else if (isCanadianProvince(province)) {
    // Apply GST only (5%)
    gst = calculateGST(taxableAmount);
    pst = 0;
  } else {
    // No tax for international
    gst = 0;
    pst = 0;
  }
}
```

## Wire Service Fee

**When orderType = WIREOUT:**
1. Load default fee from OperationsSettings
2. Add as editable field in order form
3. Include in order total
4. Save to order.wireoutServiceFee and order.wireoutServiceName

**Display:**
- Show in order summary as: "[FTD] Wire Service Fee: $15.00"
- User can edit amount per order if needed

## Next Steps

1. **Backend Order Creation** - Implement province-aware tax calculation
2. **Wire Service Fee Field** - Add to order form UI (DeliveryCard or separate section)
3. **Order Display** - Show wireout badge/indicator on order list/details
4. **Reporting** - Track wireout orders separately for accounting

## Testing Checklist

- [ ] Create DELIVERY order in Vancouver (normal flow)
- [ ] Enter address outside zone → popup appears
- [ ] Select "Wire Order" → changes to WIREOUT type
- [ ] Verify wireout settings save/load correctly
- [ ] Create wireout order to different provinces
- [ ] Verify correct tax applied based on destination
- [ ] Verify wire service fee added to total
- [ ] Test multi-order scenario (mix of DELIVERY and WIREOUT)

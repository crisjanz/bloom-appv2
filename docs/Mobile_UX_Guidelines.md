# Mobile UX Guidelines

## Overview

This document explains how mobile-responsive design is implemented in the Bloom app using Tailwind CSS responsive utilities. Use this as a reference when implementing or modifying mobile layouts.

---

## Core Principle: Single Page, Multiple Layouts

**✅ CORRECT APPROACH**: One component file with different styles activated by screen size
**❌ INCORRECT APPROACH**: Separate mobile and desktop pages/components

All responsive behavior is handled within a single component using Tailwind's responsive prefixes.

---

## Tailwind Responsive Breakpoints

Tailwind uses **mobile-first** design - base styles apply to mobile, then override for larger screens:

| Prefix | Screen Size | When Applied |
|--------|-------------|--------------|
| *(none)* | `< 768px` | Mobile devices (default) |
| `md:` | `≥ 768px` | Tablets and up |
| `lg:` | `≥ 1024px` | Laptops and up |
| `xl:` | `≥ 1280px` | Desktops and up |
| `2xl:` | `≥ 1536px` | Large desktops |

### Example Usage

```jsx
// Base style (mobile): 2 columns, Desktop: 4 columns
<div className="grid grid-cols-2 md:grid-cols-4">

// Mobile: hidden, Desktop: visible
<div className="hidden md:block">

// Mobile: visible, Desktop: hidden
<div className="block md:hidden">
```

---

## Pattern 1: Completely Different Mobile/Desktop Layouts

Use when mobile and desktop need fundamentally different structures.

### Example: Product Grid

**File**: `www/src/components/Filters/ProductGrid.jsx`

```jsx
<>
  {/* MOBILE: Compact 2-column grid */}
  <div className="grid grid-cols-2 gap-3 md:hidden">
    {filteredProducts.map((product) => (
      <Link to={`/product-details?id=${product.id}`}>
        <img className="w-full aspect-square object-cover rounded" />
        <h3 className="text-sm font-medium line-clamp-2">{product.name}</h3>
        <p className="text-base font-semibold">${product.price}</p>
      </Link>
    ))}
  </div>

  {/* DESKTOP: Full card layout with shadows, ratings, buttons */}
  <div className="hidden md:flex md:flex-wrap md:-mx-4">
    {filteredProducts.map((product) => (
      <div className="w-full px-4 md:w-1/2 xl:w-1/3">
        <div className="shadow-1 rounded-lg">
          <img className="h-64 object-cover" />
          <h3>{product.name}</h3>
          <p>${product.price}</p>
          <div>{/* Star ratings */}</div>
          <button>Add to Cart</button>
        </div>
      </div>
    ))}
  </div>
</>
```

**Key Points**:
- Mobile: Simple, compact, minimal styling (`md:hidden`)
- Desktop: Rich cards with shadows, buttons, ratings (`hidden md:flex`)
- No duplicate logic - just different presentation

---

## Pattern 2: Progressive Enhancement

Use when the same structure works for both, but needs size/spacing adjustments.

### Example: Form Grid Layout

**File**: `admin/src/app/components/orders/RecipientCard.tsx`

```jsx
{/* Row 1: Stacks on mobile, 4 columns on desktop */}
<div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-4">
  <InputField id="firstName" label="First Name" />
  <InputField id="lastName" label="Last Name" />
  <InputField id="company" label="Company" />
  <InputField id="addressLabel" label="Label" />
</div>

{/* Row 2: Similar responsive grid */}
<div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-4">
  <InputField id="address1" />
  <InputField id="address2" />
  <InputField id="city" />
  <InputField id="province" />
</div>
```

**Key Points**:
- Mobile: 1 column (`grid-cols-1`) - all fields stack vertically
- Desktop: 4 columns (`md:grid-cols-4`) - fields in one row
- Same inputs, just different grid layout

---

## Pattern 3: Modal/Drawer for Mobile

Use when desktop sidebars don't fit well on mobile.

### Example: Filter Sidebar → Filter Modal

**File**: `www/src/pages/Filters.jsx`

```jsx
{/* Mobile: Filter Button */}
<div className="md:hidden mb-4 px-4">
  <button onClick={() => setIsFilterOpen(true)}>
    <svg>...</svg>
    Filter
  </button>
</div>

{/* Mobile: Slide-in Modal */}
{isFilterOpen && (
  <div className="fixed inset-0 bg-black bg-opacity-50 z-50 md:hidden">
    <div className="fixed inset-y-0 left-0 w-4/5 max-w-sm bg-white">
      <FilterBoxes onCategoryChange={handleCategoryChange} />
    </div>
    {/* Backdrop to close */}
    <div onClick={() => setIsFilterOpen(false)} />
  </div>
)}

{/* Desktop: Always-visible Sidebar */}
<div className="hidden lg:block w-full lg:w-4/12 xl:w-3/12">
  <FilterBoxes onCategoryChange={setSelectedCategory} />
</div>
```

**Key Points**:
- Mobile: Button opens full-screen/slide-in modal
- Desktop: Sidebar always visible
- Auto-close modal after selection for better UX

---

## Common Mobile UX Issues & Solutions

### Issue: Components Too Large on Mobile

**Problem**: TailGrids defaults use large padding/spacing

**Solution**: Override mobile spacing, preserve desktop
```jsx
// ❌ Too much padding on mobile
<div className="px-8 py-12">

// ✅ Compact mobile, spacious desktop
<div className="px-4 py-3 md:px-8 md:py-12">
```

### Issue: Text Too Large on Mobile

**Problem**: Headlines overflow or wrap awkwardly

**Solution**: Use line-clamp and smaller mobile text
```jsx
// ✅ Truncate long titles on mobile
<h3 className="text-sm md:text-lg line-clamp-2">
  {product.name}
</h3>
```

### Issue: Images Not Optimized

**Problem**: Large images load slowly on mobile

**Solution**: Use appropriate aspect ratios
```jsx
// ✅ Square images on mobile, flexible on desktop
<img className="w-full aspect-square md:aspect-auto object-cover" />
```

### Issue: Mobile Menu Not Closing

**Problem**: Hamburger menu stays open after navigation

**Solution**: Add onClick handlers to close menu
```jsx
<Link
  to="/shop"
  onClick={() => setNavbarOpen(false)} // Add this
>
  Shop
</Link>
```

---

## Testing Checklist

When implementing mobile changes:

- [ ] Test at all breakpoints: 320px, 768px, 1024px, 1280px
- [ ] Check portrait and landscape orientations
- [ ] Ensure touch targets are at least 44x44px
- [ ] Verify modals close on backdrop click
- [ ] Check that forms are keyboard-accessible
- [ ] Test navigation menu open/close behavior
- [ ] Confirm images load and scale correctly

---

## Key Files Reference

| File | Mobile Pattern Used |
|------|---------------------|
| `www/src/components/Filters/ProductGrid.jsx` | Completely different layouts |
| `www/src/pages/Filters.jsx` | Modal for mobile, sidebar for desktop |
| `admin/src/app/components/orders/RecipientCard.tsx` | Progressive enhancement (grid) |
| `www/src/components/Navbar/index.jsx` | Hamburger menu with close on navigation |

---

## Quick Reference: Common Classes

```jsx
// Visibility
hidden md:block          // Show only on desktop
block md:hidden          // Show only on mobile

// Grid Layout
grid grid-cols-1 md:grid-cols-4    // 1 col mobile, 4 cols desktop
flex flex-col md:flex-row          // Stack mobile, row desktop

// Spacing
gap-3 md:gap-6           // Compact mobile, spacious desktop
px-4 md:px-8             // Less padding mobile

// Typography
text-sm md:text-lg       // Smaller mobile text
line-clamp-2             // Truncate to 2 lines

// Images
aspect-square            // 1:1 ratio (good for mobile grids)
object-cover             // Fill container without distortion
```

---

## Instructions for New Conversations

When asking Claude to implement mobile changes:

1. **Specify the breakpoint**: "Make this compact on mobile (< 768px)"
2. **Show examples**: Reference existing patterns in this doc
3. **Be specific**: "2-column grid on mobile, 4-column on desktop"
4. **Test thoroughly**: Ask to verify at multiple screen sizes
5. **Reference this doc**: "Follow the Mobile_UX_Guidelines"

---

## Related Documentation

- [System Reference](./System_Reference.md) - Full tech stack details
- [Progress Tracker](./Progress_Tracker.markdown) - Implementation status
- [Tailwind Docs](https://tailwindcss.com/docs/responsive-design) - Official responsive design guide

# Bloom POS System - Complete User Guide

## Table of Contents
1. [Getting Started](#getting-started)
2. [POS Interface Overview](#pos-interface-overview)
3. [Basic Sale Process](#basic-sale-process)
4. [Advanced Features](#advanced-features)
5. [Customer Management](#customer-management)
6. [Payment Processing](#payment-processing)
7. [Product Management](#product-management)
8. [Discounts & Promotions](#discounts--promotions)
9. [Phone Orders Integration](#phone-orders-integration)
10. [Troubleshooting](#troubleshooting)
11. [Best Practices](#best-practices)

---

## Getting Started

### Accessing the POS System

**Standard Mode:**
- Navigate to `/pos` in your browser
- System loads with fullscreen toggle available
- Use browser controls for navigation

**Fullscreen/Kiosk Mode:**
- Navigate to `/pos/fullscreen`
- Automatically enters fullscreen mode
- Optimized for tablet/touch screen operation
- Minimal navigation controls

**Progressive Web App (PWA):**
- Install the app from browser menu
- Operates as standalone application
- Offline capability for basic functions

### System Requirements
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Minimum screen resolution: 1024×768
- Touch screen recommended for optimal experience
- Stable internet connection for full functionality

---

## POS Interface Overview

### Main Interface Layout

```
┌─────────────────────────────────────────────────────────┐
│ Header: Search | Settings | Fullscreen | Dashboard      │
├─────────────────────────────────┬───────────────────────┤
│                                 │                       │
│ Product Grid                    │ Cart & Customer       │
│ - Category Tabs                 │ - Current Items       │
│ - Product Buttons               │ - Customer Info       │
│ - Search Bar                    │ - Totals              │
│                                 │ - Payment Button      │
│                                 │                       │
└─────────────────────────────────┴───────────────────────┘
```

### Key Interface Elements

**Product Grid (Left Side):**
- Category tabs for product organization
- Grid of product buttons (130×168px each)
- Real-time search functionality
- Custom item creation

**Cart Area (Right Side):**
- Current cart items with quantities
- Customer selection and search
- Price totals and tax breakdown
- Payment processing controls

**Header Controls:**
- Product search bar
- Settings access
- Fullscreen toggle
- Return to dashboard

---

## Basic Sale Process

### Simple Walk-in Sale (15-30 seconds)

**Step 1: Add Products**
1. Click product buttons from the grid
2. Products automatically add to cart
3. Quantities can be adjusted with +/- buttons
4. System automatically checks for discounts

**Step 2: Process Payment**
1. Click **"Take Payment"** button in cart
2. Select payment method (Cash/Card/Split)
3. Complete payment process
4. Review transaction summary

**Step 3: Complete Sale**
1. Choose receipt delivery method
2. System generates PT-XXXX transaction number
3. Cart automatically clears for next customer

### Example Workflow
```
Customer wants: 1x Rose Bouquet ($25.00)

1. Click "Rose Bouquet" → Automatically adds to cart
2. Cart shows: "Rose Bouquet × 1 = $25.00"
3. Tax calculated: "$25.00 + $3.25 tax = $28.25 total"
4. Click "Take Payment" → Select "Cash"
5. Enter cash received → Calculate change
6. Complete transaction → Generate receipt
```

---

## Advanced Features

### Product Variants

**When Variants Are Available:**
- Product button click opens variant selection modal
- Choose from available options (size, color, style)
- Prices update automatically based on variant
- "Default" variant is highlighted

**Variant Selection Process:**
1. Click product with variants
2. Modal displays all available options
3. Select desired variant
4. Price adjusts automatically
5. Item adds to cart with variant details

### Custom Items

**Adding Custom Products:**
1. Click **"Custom Item"** button in product grid
2. Enter product name (required)
3. Enter price (required)
4. Select category (optional)
5. Click **"Add to Cart"**

**Use Cases:**
- Special arrangements not in catalog
- Custom pricing for specific customers
- One-off services or products

### Price Editing

**Editing Item Prices:**
1. Click on any price in the cart
2. Price becomes editable input field
3. Enter new price and press Enter or click away
4. Price updates and totals recalculate
5. Press Escape to cancel changes

**Important Notes:**
- Custom prices are preserved during transaction
- Tax calculations update automatically
- Changes are logged for audit purposes

---

## Customer Management

### Finding Customers

**Customer Search Process:**
1. Click **"+"** button next to "Guest Customer"
2. Type customer name, email, or phone (minimum 3 characters)
3. Select customer from dropdown results
4. Customer information displays in cart

**Search Tips:**
- Search works with partial names
- Email addresses are searchable
- Phone numbers work with or without formatting
- Results update in real-time

### Customer Information Display

**When Customer Selected:**
- Customer name and phone number shown
- Customer avatar or initials displayed
- Easy removal with "X" button
- Customer-specific discounts may apply

### Guest Customers

**Default Behavior:**
- System defaults to "Guest Customer"
- No customer search required for walk-ins
- Guest customer automatically created during payment
- Limited receipt options (print only)

---

## Payment Processing

### Available Payment Methods

**Cash Payments:**
- Opens cash payment modal
- Enter amount received from customer
- System calculates change automatically
- Quick amount buttons for common denominations

**Credit/Debit Card:**
- Integrated with Square/Stripe processing
- Customer information optional for receipt
- Real-time transaction processing
- Automatic receipt generation

**Split Payments:**
- Combine multiple payment methods
- Specify amount for each method
- System tracks remaining balance
- Single transaction number for all methods

### Payment Workflow

**Standard Payment Process:**
1. Click **"Take Payment"** (displays total)
2. Payment method selection screen appears
3. Choose payment method
4. Complete method-specific workflow
5. Transaction processed and confirmed
6. Receipt options presented

**Payment Method Details:**

```
Cash Payment:
├─ Enter amount received
├─ System calculates change
├─ Display change amount clearly
└─ Complete transaction

Card Payment:
├─ Optional customer email/phone
├─ Process through payment provider
├─ Wait for authorization
├─ Display success/failure
└─ Generate receipt

Split Payment:
├─ Select first payment method
├─ Enter amount for first method
├─ Complete first payment
├─ Repeat for remaining balance
└─ Consolidate into single transaction
```

### Transaction Numbers

**PT-XXXX System:**
- All transactions get unique PT-XXXX numbers
- Sequential numbering (PT-0001, PT-0002, etc.)
- Same numbering across POS, phone orders, website
- Used for tracking and customer service

---

## Product Management

### Category Tabs

**Tab Organization:**
- **"All Products"** - Shows entire catalog
- **Custom Tabs** - Configured by admin (e.g., "Bouquets", "Plants")
- Products can appear in multiple tabs
- Empty tabs show appropriate messaging

**Using Tabs Effectively:**
- Click tab to filter products
- Search within active tab
- Use "All Products" for comprehensive search

### Product Search

**Search Functionality:**
- Real-time search as you type
- Searches product names and descriptions
- Respects active tab filtering
- Limited to 10 results for performance

**Search Tips:**
- Use partial words for broader results
- Search is case-insensitive
- Clear search to see full category
- Combine with tabs for targeted searching

### Product Information

**Product Button Display:**
- Product image (or flower icon if no image)
- Product name (truncated at 16 characters)
- Price (calculated from variants/base price)
- Touch-optimized button size

**Product Details:**
- Hover or long-press for additional information
- Variants indicated by selection modal
- Pricing includes any automatic discounts
- Tax status handled automatically

---

## Discounts & Promotions

### Automatic Discounts

**How Automatic Discounts Work:**
- Applied automatically when eligible items added to cart
- Based on product IDs, categories, or customer criteria
- Displayed with blue color coding
- Examples: "20forU" promotion, "Pretty in Purple" discounts

**Automatic Discount Display:**
- Shows discount name and amount
- Cannot be manually removed (they're automatic)
- Stacks with manual discounts when allowed
- Updates when cart contents change

### Manual Discounts

**Applying Manual Discounts:**
1. Click **"Discount"** button in cart area
2. Choose percentage (%) or fixed amount ($)
3. Enter discount value
4. Add optional reason/description
5. Click **"Apply Discount"**

**Manual Discount Features:**
- Green color coding for manual discounts
- Individual remove buttons for each discount
- Reason field for audit tracking
- Multiple manual discounts allowed

### Coupon Codes

**Using Coupon Codes:**
1. Click **"Coupon"** button in cart area
2. Enter coupon code (e.g., "BLOOM20")
3. System validates code in real-time
4. Valid codes apply automatically
5. Invalid codes show error message

**Coupon Code Validation:**
- Real-time validation as you type
- Success/error messages with color coding
- Prevents invalid code application
- Tracks usage for single-use codes

### Gift Cards

**Gift Card Redemption:**
1. Click **"Gift Card"** button in cart area
2. Enter gift card number
3. System checks balance automatically
4. Applied amount shows in totals
5. Remaining balance preserved

**Gift Card Features:**
- Real-time balance checking
- Partial redemption supported
- Easy removal if needed
- Integration with gift card system

---

## Phone Orders Integration

### TakeOrder System Integration

**Creating Phone Orders:**
1. Click **"Add Order"** button in POS
2. TakeOrder interface opens as overlay
3. Create delivery orders with full details
4. Orders transfer back to POS as cart items

**TakeOrder Features in POS:**
- Full delivery order creation
- Multiple orders in single transaction
- Customer information transfers automatically
- Draft orders maintained until payment

### Processing Phone Order Payments

**Payment Workflow:**
1. Phone orders appear as consolidated line items
2. Shows "Order #X" with total amount
3. Process payment through standard POS flow
4. Original draft orders updated to "paid" status

**Integration Benefits:**
- Single payment transaction for multiple orders
- Consistent PT-XXXX numbering
- Customer data synchronization
- Streamlined staff workflow

---

## Troubleshooting

### Common Issues and Solutions

**Product Not Adding to Cart:**
- Check if product has variants (modal should appear)
- Ensure product has valid price
- Try refreshing the page
- Contact support if image shows broken icon

**Customer Search Not Working:**
- Ensure minimum 3 characters entered
- Check internet connection
- Try different search terms (name vs. phone)
- Customer may need to be created first

**Payment Processing Errors:**
- Verify internet connection
- Check payment provider status
- Retry with different payment method
- Contact technical support with error message

**Discount Not Applying:**
- Check if items qualify for discount
- Verify coupon code spelling
- Ensure discount hasn't expired
- Check if customer meets requirements

### Error Recovery

**When Things Go Wrong:**
- Cart contents are preserved during errors
- Payment failures don't clear cart
- System maintains transaction state
- Manual retry options available

**Recovery Steps:**
1. Note any error messages displayed
2. Try the operation again
3. Check network connection
4. Clear browser cache if persistent
5. Contact support with specific error details

### System Recovery

**After System Issues:**
- Cart state may be preserved in browser
- Customer selection may need to be re-entered
- Payment processing resumes from last successful step
- Transaction logs maintain audit trail

---

## Best Practices

### Efficient Workflows

**For Experienced Staff:**
- Use keyboard shortcuts (Enter/Escape) for faster editing
- Memorize common product locations in grid
- Use tab system to narrow product searches
- Keep frequently used customers easily searchable

**For New Staff:**
- Start with simple transactions to learn basics
- Use search function rather than browsing when learning
- Double-check customer selection before payment
- Ask for help with complex discounting scenarios

### Customer Service Excellence

**During Transactions:**
- Confirm customer selection before payment
- Review order totals with customer
- Explain any applied discounts
- Offer receipt delivery options

**For Complex Orders:**
- Use price editing for custom arrangements
- Apply manual discounts for special pricing
- Utilize phone order integration for delivery requests
- Document special requests in order notes

### System Maintenance

**Daily Practices:**
- Clear completed transactions regularly
- Check for system updates/announcements
- Report any recurring issues promptly
- Keep workspace clean and organized

**End of Day:**
- Review transaction totals
- Check for incomplete orders
- Report any payment processing issues
- Ensure system is ready for next day

### Security and Accuracy

**Transaction Accuracy:**
- Verify prices before payment processing
- Confirm customer information
- Double-check discount applications
- Review payment amounts carefully

**Data Security:**
- Log out when leaving workstation
- Don't share login credentials
- Report suspicious payment activities
- Follow company data handling policies

---

## Quick Reference

### Common Keyboard Shortcuts
- **Enter**: Confirm edits, submit forms
- **Escape**: Cancel edits, close modals
- **Tab**: Navigate between fields
- **F11**: Toggle browser fullscreen

### Transaction Flow Summary
```
Add Products → Select Customer → Apply Discounts → Take Payment → Complete Transaction
```

### Payment Methods Available
- Cash (with change calculation)
- Credit/Debit Card (Square/Stripe)
- Split Payments (combination methods)
- Gift Cards (balance checking)

### Support Contacts
- Technical Support: [Contact Information]
- Training Questions: [Contact Information]
- Payment Issues: [Contact Information]
- System Administrator: [Contact Information]

---

*This guide covers the complete POS system functionality based on the current implementation. For additional training or specific questions, contact your system administrator.*
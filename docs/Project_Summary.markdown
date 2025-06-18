# Bloom Flower Shop - Project Summary

## Overview
Bloom is a comprehensive flower shop management system designed to digitize and streamline operations for a full-service flower shop specializing in floral arrangements, wedding services, and events. Owned by Cristian Janz, a beginner coder using a MacBook M1, the project aims to provide a custom-built solution for complete control over business operations. Development spans 6 months at 2-3 hours/day, with a vision to create a modern, touch-optimized POS system, customer e-commerce website, and advanced business management features.

## Business Context
- **Business**: Full-service flower shop offering floral arrangements, wedding/event services, subscriptions, and gift cards.
- **Philosophy**: Complete custom solution for operational control, replacing traditional flower shop systems with a digital ecosystem.
- **Owner**: Cristian Janz, self-taught developer managing all aspects of development.
- **Business Ecosystem**:
  - In-Store Operations (POS Terminal)
  - Phone Orders (TakeOrderPage)
  - Customer E-commerce Website (TailGrids-based, planned)
  - Wedding & Event Management (Quote system)
  - Subscription Services (Recurring deliveries)
  - House Account Management (Customer credit accounts)
  - Gift Card System (Purchase & redemption)
  - Multi-location Expansion (Future café integration)

## Technical Architecture
- **Frontend**: React 19 + Vite 6 + TypeScript
- **UI Framework**: TailAdmin v4 (Admin POS/Management) + TailGrids (Customer website, planned)
- **Backend**: Node.js + Express + Prisma ORM
- **Database**: PostgreSQL
- **Styling**: Tailwind CSS 4.0.8, brand color #597485 (custom flower shop green)
- **Payment**: Stripe (primary) + Square (future integration)
- **Maps**: Google Maps API for delivery calculations
- **Project Structure**:
  ```
  bloom-app/
  ├── admin/src/          # TailAdmin POS & Management System
  ├── website/src/        # TailGrids Customer E-commerce (Planned)
  ├── back/              # Express API & Database
  ```
- **Repository**: [https://github.com/crisjanz/bloom-appv2.git](https://github.com/crisjanz/bloom-appv2.git)

## Core Features
### 1. POS System
- **UX Design**:
  - **Layout**: 75% product grid (left), 25% order card (right), fixed split (no adjustable divider).
  - **Responsive**: Desktop/tablet (two-panel), mobile (collapsible sidebar, single-column).
  - **Touch Optimization**: Large touch targets (60px+), swipe gestures, card-based design.
  - **Product Grid**: Dynamic category tabs (Roses, Arrangements, etc.), product cards with images, prices, and quick-add.
  - **Cart**: Displays items, quantities, prices, totals; supports customer selection, price editing, and item removal.
  - **TakeOrderPage Integration**: Fullscreen overlay for delivery orders, persists cart, passes customer data.
- **Completed**:
  - Product display with responsive grid (180px buttons, 4:5 aspect ratio, 24px gaps).
  - Cart functionality (add/remove/edit items, custom products).
  - Customer lookup and selection.
  - Pill-style category tabs with scrollable navigation.
  - Header redesign with icon-based navigation.
  - Basic payment modal (test version).
  - Card-based TakeOrderPage UX for phone orders, reducing errors and speeding up order entry.
  - Seamless TakeOrder to POS transfer system with "Send to POS" payment method, enabling phone orders to transfer directly to POS cart without page reloads or data loss.

### 2. Payment System
- **Architecture**:
  - **PT-XXXX Transaction System**: Sequential numbering (PT-00001, PT-00002) with one PT per payment session.
  - **Multi-Order Support**: Single PT transaction can cover multiple orders (e.g., PT-00789 for Orders #123 + #124).
  - **Split Payment Design**: Multiple payment methods within one PT (e.g., $100 cash + $50 card = PT-00789).
  - **Channel-Specific Providers**: Stripe for website sales, Square for POS/phone orders, internal system for gift cards.
  - **Multi-Provider Support**: Each payment method tracks its provider and channel for unified reporting.
  - **Database Structure**: PaymentTransaction → PaymentMethods (with provider tracking) + OrderPayments with validation constraints.
  - **Audit Trail**: Complete transaction history with employee tracking and refund capabilities.
- **Gift Card Rules**:
  - Allowed: Phone orders, POS direct, POS combined transactions.
  - Forbidden: Delivery orders within POS (apply at POS checkout for security).
- **Completed**:
  - PaymentController and basic modal integration.
  - Split payment processing (cash, card, check, COD).
  - Gift card purchase flow (activates after order completion).
  - Fixed bugs: % Discount NaN, gift card redemption timing, mobile sidebar, breadcrumbs.
  - Centralized payment method configuration supporting multiple sales channels (POS, TakeOrder, future website).
  - Draft order system for data safety with seamless cart transfers.
- **Designed (Ready for Implementation)**:
  - **PT-XXXX Database Models**: PaymentTransaction, PaymentMethod, Refund, TransactionCounter.
  - **Business Logic**: One PT per payment session, supports multi-order + split payment scenarios.
  - **Edge Cases Planned**: Partial refunds, payment method failures, cross-order gift card usage.
  - PaymentMethodGrid for card-based selection.
  - CashPaymentModal, CardPaymentModal, SplitPaymentView, GiftCardModal.
  - **Gift Card Number Display Modal**: Shows generated/entered card numbers for customer handoff after purchase/activation.

### 3. Settings System
- **Architecture**: Modular card-based system (45 planned, 7 complete) with admin/employee permissions.
- **Completed Settings**:
  - Store Information (Google Places integration).
  - Business Hours (7-day schedule, timezone support).
  - Holiday Management (date ranges, special hours).
  - Delivery Charges (zone-based, free thresholds).
  - Delivery/Pickup Times (calendar with exceptions).
  - Employee Management (roles, permissions).
  - POS Configuration (tab management, grid size, color themes).
- **Planned**: 38 remaining cards (e.g., Tax, Coupons, Notifications, Print).

### 4. Customer Website (Planned)
- **E-commerce**:
  - Product catalog with search, categories, and smart product pages (delivery date picker, card messages, upsells).
  - Shopping cart with delivery scheduling and checkout.
- **Wedding/Event System**:
  - Quote request forms with photo uploads.
  - Customer portal for status tracking (Submitted → Under Review → Quote Ready → Confirmed).
- **Subscriptions**:
  - Weekly/monthly plans with auto-billing (Stripe/Square).
  - Customer portal for managing subscriptions.
- **Gift Certificates**:
  - Digital cards ($25, $50, $100, custom up to $500).
  - Email delivery and online/POS redemption.

### 5. Delivery & Logistics
- **Features**:
  - Zone-based pricing with Google Maps integration.
  - Address shortcuts for common venues.
  - Schedule restrictions (business hours, holidays).
  - Prep-time management per product.
  - Route optimization for drivers.
  - **Enhanced Recipient Selection**: Three-option workflow for existing recipients (Update existing, Create new from scratch, Duplicate with new name).
- **Completed**:
  - Delivery fee calculation with manual overrides.
  - Address autocomplete with timezone handling.
  - Delivery date picker with holiday restrictions.
  - Recipient management with duplicate prevention via customer API integration.

### 6. Printing & Hardware
- **Printers**: Receipt (front POS), ticket (networked, polling-based), document (shared network).
- **Hardware**: Dual computers (front POS, back office), Stripe/Square terminals, local print servers.
- **Planned**: Local print server, receipt/ticket printing, offline sync.

### 7. Communication
- **Customer Notifications**: SMS (order confirmations, delivery updates), email receipts, subscription alerts.
- **Business Notifications**: Owner alerts (new orders, low inventory), staff assignments.
- **Planned**: Twilio/Nexmo SMS integration, automated email system.

### 8. Error Handling & Monitoring
- **Connection Monitoring**: Status indicator (Green/Amber/Red), periodic health checks.
- **Error Notifications**: Toast messages for network/validation errors, detailed logging.
- **Offline Capabilities**: Local storage, transaction queuing, read-only mode.
- **Completed**: Basic error handling, form validation, graceful degradation.

## Development Standards
- **Component Architecture**: Page, Feature, UI, and Hook components using TailAdmin.
- **State Management**: Context Providers, local state, form state, API caching.
- **TypeScript**: Strict type definitions for interfaces, props, and APIs.
- **Code Quality**: ESLint, error boundaries, unit/integration testing.
- **TailAdmin Standards**:
  - Use ComponentCard, InputField, Table, and pre-styled buttons.
  - Primary button: `bg-[#597485] hover:bg-[#4e6575]`.
  - No vanilla Tailwind or raw HTML elements.
  - Lucide icons and consistent spacing (24px gaps, 12px border-radius).

## Developer Info
- **Name**: Cristian Janz
- **Experience**: Beginner coder, self-taught, building Bloom as a passion project.
- **Hardware**: MacBook M1
- **Time Commitment**: 2-3 hours/day, 6-month timeline.
- **Motivation**: Create a tailored solution to enhance business efficiency and customer experience.

## Future Expansion
- **Revenue Streams**: Corporate accounts, subscription gifts, event partnerships, loyalty programs.
- **Technology**: Mobile apps, AI for demand forecasting, advanced analytics, third-party integrations (QuickBooks, Mailchimp).
- **Market**: Multi-location support, franchise model, white-label solutions, B2B marketplace.
- **Café Integration**: Café-specific POS, ticket number system, department reporting.

## Success Metrics
- **Technical**:
  - Order processing: < 2 minutes/order.
  - Uptime: 99.9% during business hours.
  - Page load: < 3 seconds.
  - Mobile responsiveness: Full functionality across devices.
- **Business**:
  - Order accuracy: 100% payment success.
  - Customer satisfaction: Streamlined ordering.
  - Staff efficiency: Reduced manual errors.
  - Revenue growth: Increased online/subscription sales.
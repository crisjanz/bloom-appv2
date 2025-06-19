# Bloom Flower Shop - Progress Tracker

Todos are grouped by feature and sorted by priority within each group. Partially complete or vague tasks include notes for confirmation.

[x] task is done
[/] task is partly done. if no note, ask what is left to do.

## POS System
### High Priority
- [x] **Implement seamless TakeOrder to POS transfer system** (Completed 2025-06-17)
  - Created "Send to POS" payment method with draft order creation
  - Fixed recipient duplication using proper customer API endpoints
  - Replaced complex session storage with direct callback mechanism
  - Orders transfer without page reload or fullscreen exit
  - Maintains real database order numbers in POS cart
  - **Fixed multi-order datepicker isolation** (Completed 2025-06-17)
    - Each order maintains its own delivery date using React key prop
    - Prevents date sharing between order tabs
  - **Fixed POS individual order totals** (Completed 2025-06-17)
    - POS now receives correct individual order totals instead of combined total
    - Proportional discount distribution across multiple orders
    - Eliminates duplicate total display in POS cart
- [x] Build PaymentMethodGrid for card-based payment selection (Phase 3).
- [x] Implement CashPaymentModal with change calculation (Phase 3).
- [/] Create CardPaymentModal with terminal integration and manual entry (Card is functional, needs to be connected to provider)
- [/] Build SplitPaymentView for multi-payment handling (Needs testing).
- [x] Add GiftCardModal for gift card redemption interface (Phase 3).
- [x] **Implement grid-based TakeOrderPage interface for phone orders** (Completed 2025-06-17)
- [x] **Develop delivery order overlay in POS** (Completed 2025-06-17)
- [ ] Complete Customer Creation in POS (Status to be confirmed).
- [ ] Implement Order History display for selected customers (Status to be confirmed).
- [ ] **Improve recipient selection workflow** (New requirement from real-world use)
  - Add "Create duplicate recipient with new name" option when selecting existing recipients
  - Use case: Delivery to same address but different person (e.g., dentist office, different patient)
  - Current options: Update existing recipient OR create new recipient from scratch
  - Needed: Third option to duplicate address but change recipient name
  - Status: Needs design and implementation
- [ ] **Fix POS guest customer creation issue** (Critical - POS Hardware Testing 2025-06-17)
  - Problem: Creating guest customer orders creates new "Walk-In Customer" records in database
  - Impact: Database pollution with duplicate walk-in customer entries
  - Expected: Guest orders should not create customer records or use single reusable guest record
  - Status: Needs investigation and fix
- [x] **Fix gift card purchase/activation workflow** (Completed 2025-06-18)
  - ✅ Built complete gift card purchase/activation workflow for both POS and TakeOrder
  - ✅ Created GiftCardActivationModal for entering card numbers and selecting Physical/Digital types
  - ✅ Built GiftCardHandoffModal with print functionality for customer handoff
  - ✅ Added support for both physical (preprinted) and digital (system-generated) gift cards
  - ✅ Implemented proper recipient name/email collection for digital cards
  - ✅ Fixed backend validation to allow digital cards without card numbers
  - ✅ Added beautiful print layout for digital gift cards with professional styling
  - ✅ Fixed POS tax calculation to respect product isTaxable flags (gift cards now non-taxable)
  - ✅ Integrated with PT-XXXX payment transaction system
- [ ] **Fix coupon discount application glitch** (High - POS Hardware Testing 2025-06-17)
  - Problem: Coupon discount doesn't apply to cart on first attempt
  - Behavior: Code remains in modal, works on second "Add" click
  - Impact: Confusing UX, requires double-entry to apply discount
  - Expected: Discount applies immediately on first attempt
  - Status: Needs debugging of coupon state management

### Medium Priority
- [ ] Enhance mobile responsiveness for tablet touch optimization (Phase 6).
- [ ] Add loading states for async operations (Phase 6).
- [ ] Implement error boundaries for component-level recovery (Phase 6).
- [ ] Develop toast notifications for success/error messaging (Phase 6).

### Low Priority
- [ ] Optimize performance for faster product loading (Phase 6).

## Payment System
### High Priority
- [x] **Design and implement PT-XXXX transaction numbering system** (Completed 2025-06-17)
  - [x] Create PaymentTransaction model with sequential PT-XXXX numbering
  - [x] Design PaymentMethod model for split payment tracking
  - [x] Create Refund model with audit trail
  - [x] Add TransactionCounter for PT number generation
  - [x] Create database migration for all payment models
- [x] **Implement payment transaction APIs** (Completed 2025-06-17)
  - [x] Create transaction creation endpoints
  - [x] Build payment method processing
  - [x] Add transaction validation logic
  - [x] Implement multi-order payment support
- [x] **Testing comprehensive payment scenarios** (Completed 2025-06-17)
  - [x] Test single order, single payment method
  - [x] Test single order, split payment (cash + card)
  - [x] Test multiple orders, single payment
  - [x] Test multiple orders, split payment
  - [x] Test gift card redemption across orders
  - [x] Test partial refund scenarios
  - [x] Test payment method failure handling
- [x] **PT-XXXX system integration with existing components** (Completed 2025-06-17)
  - [x] Integrated PT-XXXX system with POS PaymentController
  - [x] Integrated PT-XXXX system with TakeOrder payment methods
  - [x] Updated order status workflow (DRAFT → PAID) when PT transaction completes
  - [x] Added PT transaction display to order views and receipts
  - [x] **Customer message history system** (Completed 2025-06-17)
    - Created /api/customers/:id/messages endpoint
    - Retrieves customer's previous card messages from order history
    - Displays last 10 unique messages in suggestion dropdown
    - Improves user experience with personalized message options
- [ ] **Integration testing with POS/TakeOrder components**
  - [ ] Test PT-XXXX system with actual POS payment flow
  - [ ] Test PT-XXXX system with TakeOrder payment flow
  - [ ] Test cross-component scenarios (TakeOrder → POS with PT transactions)
  - [ ] Verify receipt generation with PT numbers
  - [ ] Test refund processing through UI components
- [ ] Develop order status workflow (DRAFT → PAID) (Phase 4).
- [ ] Complete Stripe credit card processing in PaymentModal (Phase 1).
- [ ] Integrate Square credit card processing (Phase 1).
- [ ] Create payment testing environment (sandbox mode) (Phase 1).
- [x] **Develop receipt generation for print/email** (Completed 2025-06-19)
  - [x] Backend email infrastructure with SendGrid integration
  - [x] Professional HTML receipt email templates with Bloom branding
  - [x] Integration with payment completion flow for both POS and TakeOrder
  - [x] EmailReceiptModal with customer email auto-fill functionality
  - [x] Toast notification system (replaced browser alerts to prevent fullscreen exit)
  - [x] Customer data flow fix for proper email auto-population
- [ ] Implement partial refund system with audit trail (Phase 3).

### Medium Priority
- [ ] Enhance reporting for transaction totals by channel, payment method breakdown, and refund trends (Phase 3).
- [ ] Add webhook retries for Stripe race conditions (Phase 3).
- [ ] Implement cleanup jobs for incomplete transactions (Phase 3).

### Low Priority
- [ ] Develop layaway system for partial payments over time (Future).
- [ ] Add store credit issuance and redemption (Future).
- [ ] Implement employee discount tracking (Future).

## Settings System
### High Priority
- [x] **Develop centralized tax system for any number of tax rates** (Completed 2025-06-18)
  - Created TaxCard settings component with full CRUD operations for tax rate management
  - Built useTaxRates hook for centralized tax calculations throughout the app
  - Implemented backend tax-rates API with validation and error handling
  - Updated Order schema to support dynamic tax breakdown (JSON array) instead of hardcoded GST/PST fields
  - Replaced all hardcoded tax rates (0.05, 0.07, 0.12) across frontend components with centralized system
  - Updated PaymentSection, POSPage, ProductsCard to use dynamic tax calculations
  - System now supports 1, 2, 3, or any number of tax rates configured in settings
  - Geographic flexibility - no hardcoded provincial/country assumptions
  - Backward compatibility maintained with existing order data
- [ ] Create CouponListCard for comprehensive coupon management (Planning complete).
- [ ] Implement GiftCardsCard for gift card management and reporting.
- [ ] Develop ProductDiscountsCard for product-specific discount rules.

### Medium Priority
- [ ] Build TipSettingsCard for tip calculation options.
- [ ] Create ReportingCategoriesCard for sales reporting groupings.
- [ ] Develop SquareCard for Square terminal configuration.
- [ ] Implement StripeCard for Stripe terminal configuration.
- [ ] Create PaypalCard for PayPal integration settings.
- [ ] Develop HouseAccountsCard for customer credit management.
- [ ] Build OtherMethodsCard for cash/check/wire transfer settings.
- [ ] Create AddOnGroupsCard for product add-ons.
- [ ] Implement AddressShortcutsCard for quick delivery addresses.
- [ ] Develop MessageSuggestionsCard for card message templates.
- [ ] Create GeneralSettingsCard for order flow configuration.
- [ ] Build LogicSettingsCard for business rule configuration.

### Low Priority
- [ ] Develop 21 remaining settings cards (Notifications, Print, Website, POS, Events, Misc, Delivery) (Status to be confirmed).

## Customer Website
### High Priority
- [ ] Integrate TailGrids template for e-commerce setup.
- [ ] Connect to existing backend APIs.
- [ ] Implement customer authentication (login/registration).
- [ ] Develop product catalog with search and categories.
- [ ] Create smart product pages (delivery date picker, card messages, upsells).
- [ ] Build shopping cart with delivery scheduling.
- [ ] Implement checkout process with payment processing.

### Medium Priority
- [ ] Develop quote request forms with photo uploads.
- [ ] Create customer portal for status tracking.
- [ ] Build staff quote management interface.
- [ ] Implement subscription plans with auto-billing.
- [ ] Develop customer subscription management portal.
- [ ] Create digital gift card purchase system.
- [x] **Implement email delivery for gift cards** (Completed 2025-06-18)
  - ✅ SendGrid integration with verified business email (iyvflowers@gmail.com)
  - ✅ Professional HTML email templates with Bloom branding (#597485 colors)
  - ✅ Automatic digital gift card email delivery on purchase
  - ✅ Beautiful gift card display with card number, amount, and personal messages
  - ✅ Integration with existing gift card purchase workflow
- [ ] Build gift card redemption interface.

### Low Priority
- [ ] Add flower care tips on product pages and post-purchase.
- [ ] Develop account portal for house account management (Partially complete, status to be confirmed).

## Email & Communication System
### High Priority  
- [ ] **Design global email template system** (New requirement 2025-06-18)
  - Create unified branding template for all email types
  - Standardize header/footer design with Bloom colors (#597485)
  - Implement template inheritance for consistency
  - Support for different email types (receipts, gift cards, care tips, notifications)

## Delivery & Logistics
### High Priority
- [ ] Implement route optimization for drivers (Status to be confirmed).

### Medium Priority
- [ ] Enhance delivery analytics for zone performance and fee optimization.

### Low Priority
- [ ] Develop delivery-specific tax settings for website.

## Printing & Hardware
### High Priority
- [ ] Implement local print server for direct printer communication.
- [ ] Develop receipt printing system (bypass OS dialogs).
- [ ] Create ticket printing with polling-based system.
- [ ] Implement document printing for invoices/gift certificates.
- [ ] Complete Stripe/Square terminal setup.
- [ ] Configure printers with static IP addresses.

### Medium Priority
- [ ] Set up dual computer configuration for front/back operations.
- [ ] Implement offline printing and data sync capabilities.

## Communication
### High Priority
- [ ] Integrate Twilio/Nexmo for SMS notifications.
- [/] **Develop automated email system for receipts and care instructions**
  - [x] Email service infrastructure setup (SendGrid + templates)
  - [x] Receipt email implementation with professional templates
  - [ ] Care instruction emails
  - [x] Email template design system (global branding with #597485 colors)
- [ ] Implement subscription alerts for upcoming deliveries.

### Medium Priority
- [ ] Create owner alert system for new orders, low inventory, system issues.
- [ ] Develop staff communication for order assignments and schedules.

### Low Priority
- [ ] Add post-purchase care tip reminders via SMS/email.

## Error Handling & Monitoring
### High Priority
- [ ] Implement offline capability for core POS functions (Phase 6).

### Medium Priority
- [ ] Enhance error logging for detailed debugging.
- [ ] Develop session recovery for temporary outages.

### Low Priority
- [ ] Add user-initiated manual retry buttons for failed requests.

## Technical Improvements
### High Priority
- [/] Complete OrdersListPage.tsx with order history/search (Partially complete, needs filters).
- [ ] Implement order status workflow (DRAFT → PAID → SCHEDULED → COMPLETED).
- [x] Develop order editing for existing orders.
- [x] **Multi-order system improvements** (Completed 2025-06-17)
  - [x] Fixed delivery fee calculation per order instead of global
  - [x] Enhanced order state management with proper React hooks
  - [x] Improved debugging and error handling
  - [x] Cleaned up console logging and development artifacts
- [ ] Create order cancellation with refund processing.
- [ ] Create Partial Refund processiing in OrderPage.
- [ ] Extract useMessageSuggestions and useEmployeeData hooks.
- [ ] Organize components with OrderTabsSection.tsx wrapper.
- [ ] Create shared types in src/types/order.ts.
- [ ] Develop orderHelpers.ts for shared order logic.

### Medium Priority
- [ ] Implement unit tests for critical business logic.
- [ ] Develop integration tests for API/database interactions.
- [ ] Create E2E tests for complete user workflows.
- [ ] Perform load testing for peak business hours.

### Low Priority
- [ ] Optimize database queries for performance.

## Future Expansion
### Low Priority
- [ ] Develop café POS interface with ticket number system.
- [ ] Implement mobile apps for customers and drivers.
- [ ] Integrate AI for demand forecasting and inventory optimization.
- [ ] Develop advanced analytics for customer behavior.
- [ ] Add third-party integrations (QuickBooks, Mailchimp).
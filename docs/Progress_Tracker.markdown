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
- [x] **Create CardPaymentModal with comprehensive payment provider integration** (Completed 2025-06-23)
  - ✅ Built unified CardPaymentModal supporting both Stripe and Square providers
  - ✅ Implemented phone-first customer identification system for saved payment methods
  - ✅ Added saved credit card display and one-click payment functionality
  - ✅ Created dual-mode support: Terminal (card reader) vs Manual (form entry)
  - ✅ Built provider-specific customer search (phone primary, email fallback)
  - ✅ Integrated automatic card saving on successful payments
  - ✅ Added cross-provider saved card management (Stripe cards for Stripe, Square cards for Square)
  - ✅ Implemented customer creation/linking for both payment providers
  - ✅ Created consistent UI for saved payment methods across providers
  - ✅ Added real-time saved card loading when customer information is available
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
- [x] **Fix coupon discount application glitch** (Completed 2025-06-20)
  - ✅ Fixed POS coupon modal behavior
  - ✅ Modal now stays open on validation errors instead of closing immediately
  - ✅ Only closes on successful coupon application
  - ✅ Allows employees to correct invalid codes without reopening modal
  - ✅ Improved user experience with proper async validation handling
- [x] **Implement unified discount system and product variants** (Completed 2025-06-21)
  - ✅ Built comprehensive unified discount system replacing legacy coupon system
  - ✅ Created TailAdmin-compliant discount manager with progressive disclosure UI
  - ✅ Implemented 5 discount types: $ OFF, % OFF, Free Delivery, Sale Price, Buy X Get Y Free
  - ✅ Added automatic discount engine with real-time cart checking
  - ✅ Fixed product variant system for both POS and TakeOrder interfaces
  - ✅ Enhanced product search API to include variant data with calculated prices
  - ✅ Integrated automatic discount checking in TakeOrder payment flow
  - ✅ Added multi-select product/category targeting with tag-based UI
  - ✅ Fixed default variant pricing display in TakeOrder modal
  - ✅ Enabled product ID storage for proper discount eligibility matching
  - ✅ Unified coupon validation across POS and TakeOrder systems
- [x] **Implement recipient address type classification system** (Completed 2025-01-08)
  - ✅ Added addressType field to Address model in database schema (Prisma)
  - ✅ Created AddressType enum with 6 options: RESIDENCE, BUSINESS, CHURCH, SCHOOL, FUNERAL_HOME, OTHER
  - ✅ Integrated addressType dropdown in RecipientCard component (TakeOrder page)
  - ✅ Added addressType to RecipientEditModal (Order edit page)
  - ✅ Updated MultiOrderTabs and useOrderState hook to support addressType
  - ✅ Implemented proper default value (RESIDENCE) across all entry points
  - ✅ Database migration completed and tested
  - ✅ Full integration with recipient save/load functionality
  - Benefits: Better delivery categorization, improved route planning, enhanced reporting capabilities
- [x] **Enable backward status transitions for operational flexibility** (Completed 2025-01-09)
  - ✅ Updated VALID_STATUS_TRANSITIONS in Order entity to allow backward movement
  - ✅ Staff can now move orders backward (e.g., OUT_FOR_DELIVERY → IN_DESIGN)
  - ✅ Enables error correction without cancelling/recreating orders
  - ✅ Maintains business logic validation while providing operational flexibility
  - File: `/admin/src/domains/orders/entities/Order.ts`
- [x] **Fix Delivery Page to show all order statuses** (Completed 2025-01-09)
  - ✅ Changed delivery queries to show orders in ALL statuses (not just READY/OUT_FOR_DELIVERY)
  - ✅ Added red badges for CANCELLED/REJECTED orders in completed section
  - ✅ Fixed status filtering: Active orders (not completed/cancelled) vs Completed (including cancelled/rejected)
  - File: `/back/src/routes/orders/delivery.ts`, `/admin/src/app/pages/delivery/DeliveryPage.tsx`

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
- [x] **Complete Stripe credit card processing in PaymentModal** (Completed 2025-06-23)
  - ✅ Full Stripe Elements integration with PaymentElement
  - ✅ Customer creation and linking with phone-first identification
  - ✅ Saved payment method retrieval and one-click payments
  - ✅ Automatic card saving on successful transactions
- [x] **Integrate Square credit card processing** (Completed 2025-06-23)
  - ✅ Square API integration with manual card entry
  - ✅ Customer search and creation using Square Customers API
  - ✅ Payment processing with customer linking
  - ✅ Sandbox testing environment with mock nonces
- [x] **Create payment testing environment (sandbox mode)** (Completed 2025-06-23)
  - ✅ Stripe sandbox integration with test payment methods
  - ✅ Square sandbox integration with test card nonces
  - ✅ Environment variable configuration for testing
  - ✅ Comprehensive logging for payment debugging
- [x] **Develop receipt generation for print/email** (Completed 2025-06-19)
  - [x] Backend email infrastructure with SendGrid integration
  - [x] Professional HTML receipt email templates with Bloom branding
  - [x] Integration with payment completion flow for both POS and TakeOrder
  - [x] EmailReceiptModal with customer email auto-fill functionality
  - [x] Toast notification system (replaced browser alerts to prevent fullscreen exit)
  - [x] Customer data flow fix for proper email auto-population
- [x] **Implement offline payment methods** (Completed 2025-01-08)
  - ✅ Fixed incomplete DDD migration stubs in useOrderService hook
  - ✅ Implemented completeOrderPayment function with real API calls
  - ✅ Added support for COD, house account, PayPal, wire transfer, offline payments
  - ✅ Integrated with existing TakeOrderPaymentModal "Other Methods" screen
  - ✅ Complete order creation with proper database IDs
  - ✅ Automatic customer and recipient creation/update
  - ✅ Integration with PT-XXXX transaction system
  - ✅ Proper order status workflow and navigation
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
- [x] **Complete unified discount management system** (Completed 2025-06-21)
  - ✅ Replaced legacy coupon system with unified discount architecture
  - ✅ Built comprehensive discount manager with TailAdmin design patterns
  - ✅ Implemented 5 discount types with contextual form fields
  - ✅ Created automatic discount engine for real-time cart evaluation
  - ✅ Added multi-select product/category targeting with search functionality
  - ✅ Integrated with both POS and TakeOrder payment systems
  - ✅ Built progressive disclosure UI for complex discount configuration
  - ✅ Support for usage limits, date restrictions, and channel restrictions
  - ✅ Color-coded discount display (green=coupons, blue=automatic/gift cards)
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

## Unified Notification System
### High Priority
- [x] **Complete foundation: Order status system with smart display** (Completed 2025-06-19)
  - [x] 7-status workflow with smart display (Ready for Pickup/Delivery, Picked Up/Delivered/Completed)
  - [x] Dropdown filtering (no Out for Delivery for pickup orders)
  - [x] StatusBadge component with order type-aware text
  - [x] Order edit page integration with smart status display
- [x] **Legacy SMS/Email systems completed** (Foundation for unified system)
  - [x] Twilio SMS integration with receipt functionality
  - [x] SendGrid email integration with professional templates  
  - [x] Separate modals and API endpoints working in POS/TakeOrder
- [x] **Build unified NotificationService** (Completed 2025-06-19)
  - [x] Create NotificationService class replacing separate email/SMS services
  - [x] Design notification types system (receipt, order_confirmation, status_update, etc.)
  - [x] Build template system with token replacement ({{firstName}}, {{orderNumber}})
  - [x] Multi-channel delivery logic (email + SMS, email OR SMS, fallback)
- [x] **Refactor API routes to unified pattern** (Completed 2025-06-19)
  - [x] Replace `/api/email/*` and `/api/sms/*` with `/api/notifications/*`
  - [x] Update endpoints: /send, /receipt, /order-update, /preferences
  - [x] Maintain existing email/SMS services as delivery providers
- [x] **Create unified frontend components** (Completed 2025-06-19)
  - [x] Build NotificationModal with multi-channel selection (☑ Email ☑ SMS)
  - [x] Replace EmailReceiptModal + SMSReceiptModal with single interface
  - [x] Update POS OrderCompletionSummary to use single "Send Receipt" button
  - [x] Update TakeOrder PaymentSection to use unified notification checkbox
- [x] **Implement comprehensive order status notification settings** (Completed 2025-06-19)
  - [x] Built OrderStatusNotificationsCard with customer vs recipient separation
  - [x] Created backend API `/api/settings/notifications/order-status` with database storage
  - [x] Implemented 5 order statuses (PAID, IN_DESIGN, READY, OUT_FOR_DELIVERY, COMPLETED)
  - [x] Comprehensive template system with customer/recipient/order tokens
  - [x] Global email/SMS toggles and business hours restrictions
  - [x] Color-coded UI (blue for customer, green for recipient)
  - [x] Full TailAdmin integration with expandable settings interface
- [ ] **Implement order status change triggers** (Phase 4 - Next Priority)
  - [ ] Create triggers that fire when order status changes
  - [ ] Use notification settings to determine which notifications to send
  - [ ] Integration with existing order update workflows
  - [ ] Testing with real order status transitions
- [ ] **Build comprehensive notification types** (Phase 5)
  - [ ] Order confirmation notifications
  - [ ] Status update notifications (ready, out for delivery, delivered)
  - [ ] Pickup ready alerts
  - [ ] Subscription reminders
  - [ ] Employee messaging system
  - [ ] Authentication codes
- [ ] **Port shop phone number (250) 562-8273 to Twilio for branded SMS**
  - Current: SMS from +1 (978) 696-8598 (Twilio assigned number)
  - Goal: SMS from (250) 562-8273 (actual shop number customers recognize)
  - Process: Port existing business number to Twilio (~2-7 business days)
  - Benefit: Professional SMS delivery from recognized business number
  - Cost: ~$1/month hosting fee (replaces current Twilio number)

### Medium Priority
- [ ] **Delivery Notifications via SMS**
  - SMS to recipients (not customers) when delivery is out for delivery
  - SMS when delivery is completed/delivered
  - Include florist name, sender message, and delivery status
  - Integrate with order status workflow (SCHEDULED → OUT_FOR_DELIVERY → DELIVERED)
- [ ] **Employee Internal SMS Messaging**
  - SMS alerts to owner/manager for new website orders
  - Driver notifications when deliveries are ready (include mobile app link)
  - Low inventory alerts via SMS
  - System issue notifications
- [ ] **Enhanced Order Status Workflow Integration**
  - Complete DRAFT → PAID → SCHEDULED → OUT_FOR_DELIVERY → COMPLETED workflow
  - SMS triggers at each status transition
  - Status tracking in OrdersListPage with SMS history

### Low Priority
- [ ] **Advanced SMS Features (Planning Stage)**
  - [ ] **Subscription SMS Reminders**
    - Remind customers 1-2 days before next subscription delivery
    - Allow pause, skip, or update via SMS response links
    - Integration with subscription management system
  - [ ] **SMS User Authentication**
    - SMS verification codes for customer website login
    - Two-factor authentication for admin/employee accounts
    - Password reset via SMS verification
  - [ ] **Rush Order Alert System**
    - Immediate SMS alerts to florist/designer for urgent/rush orders
    - Priority notification system with escalation
    - Integration with order priority flags
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
- [x] **Implement customer management features** (Completed 2025-01-10)
  - ✅ Delete customer functionality with order preservation
    - Orders are unlinked (customerId set to null) but retain all data
    - Addresses are deleted with customer
    - Customer record removed from database
  - ✅ Merge duplicate customers feature
    - Multi-select customer list with checkboxes
    - Transfer orders, addresses, and payment transactions to target customer
    - Automatic duplicate address detection
    - Clean deletion of source customers after merge
  - ✅ Updated Order schema to make customerId nullable
    - Supports historical data after customer deletion
    - Added null checks across notification and order systems
  - ✅ Enhanced CustomersPage UI
    - Checkbox column for customer selection
    - "Merge Selected" button (appears when 2+ selected)
    - Confirmation dialogs with detailed information
    - Success messages showing transferred data counts
  - Files: `CustomersPage.tsx`, `customers.ts` (routes), `schema.prisma`
- [x] **Implement customer-based recipient system** (Completed 2025-01-11)
  - ✅ Recipients are now Customer records instead of Address records
  - ✅ Phone-first recipient lookup integrated in RecipientCard
  - ✅ Multiple labeled addresses per recipient ("Home", "Office", "Mom's House")
  - ✅ CustomerRecipient junction table for many-to-many sender→recipient relationships
  - ✅ Orders now store recipientCustomerId + deliveryAddressId
  - ✅ Backward compatibility maintained with existing orders
  - ✅ Recipient email notifications now functional (recipients have email addresses)
  - ✅ Unified customer profiles enable loyalty tracking and marketing opportunities
  - Files: `RecipientCard.tsx`, `customers.ts`, `orders/create.ts`, `schema.prisma`
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
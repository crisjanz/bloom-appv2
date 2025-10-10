# Bloom DDD Architecture (src-new/)

## 🏗️ **Clean Domain-Driven Design Structure**

This directory contains the new **Domain-Driven Design (DDD)** architecture for the Bloom system. It's built alongside the existing system (`src/`) to allow gradual migration while maintaining system stability.

### **📁 Architecture Overview**

```
src-new/
├── domains/           # Business domains (core business logic)
├── shared/           # Shared utilities and infrastructure  
└── app/              # Application layer (contexts, providers, config)
```

## **🎯 Current Implementation Status**

### ✅ **Completed: Foundation + Customer + Orders Domains**

**Core Infrastructure:**
- ✅ Complete DDD folder structure
- ✅ Base interfaces and types (`shared/types/common.ts`)
- ✅ Centralized API service (`shared/infrastructure/api/ApiService.ts`)
- ✅ Repository pattern (`shared/infrastructure/database/BaseRepository.ts`)

**Customer Domain (Fully Implemented):**
- ✅ **Customer Entity** - Future-ready for POS + website + subscriptions
- ✅ **CustomerRepository** - Data access with advanced querying
- ✅ **CustomerService** - Business logic for all customer operations
- ✅ **React Hooks** - `useCustomerService`, `useCustomerSearch`, `useSelectedCustomer`
- ✅ **Demo Component** - Integration test with existing UI

**Orders Domain (Fully Implemented):**
- ✅ **Order Entity** - Complete with 17-status workflow system
- ✅ **OrderRepository** - Advanced search, analytics, and bulk operations
- ✅ **OrderService** - All business logic for POS, delivery, pickup, events, subscriptions
- ✅ **React Hooks** - `useOrderService`, `usePOSOrderService`, `useOrderSearch`, `useDeliveryManagement`
- ✅ **Status Management** - Complete workflow validation and transitions

**Cart Domain (Removed - Reverted to Local State):**
- ❌ **Removed** - DDD cart system was over-engineered for business needs
- ✅ **Reverted** - Back to simple local state management (`useState([])`)
- ✅ **Draft System** - Added optional draft saving using existing Order model

### **🔄 Next: POS Core Domains**
- ⏳ **Payment Domain** - Extract from PaymentController (NEXT)
- ⏳ **Products Domain** - Extract product and variant management
- ⏳ **Events Domain** - Wedding/event management  
- ⏳ **Notifications Domain** - Unified communication

## **🚀 How to Use the New Architecture**

### **1. Test the Customer Domain**

Import the demo component into any existing page:

```typescript
// In any existing component (e.g., TestPlayground.tsx)
import { CustomerSearchDemo } from '../src-new/domains/customers/components/CustomerSearchDemo'

// Use it:
<CustomerSearchDemo 
  onCustomerSelect={(customer) => console.log('Selected:', customer)}
/>
```

### **2. Replace Legacy Customer Logic**

Replace existing customer hooks with new DDD hooks:

```typescript
// OLD: Legacy hook
import { useCustomerSearch } from '../hooks/useCustomerSearch'

// NEW: DDD hook (same interface, better architecture)
import { useCustomerSearch } from '../src-new/domains/customers/hooks/useCustomerService'
```

### **3. Use Customer Service Directly**

For complex customer operations:

```typescript
import { useCustomerService } from '../src-new/domains/customers/hooks/useCustomerService'

const { customerService, findByPhone, createCustomer } = useCustomerService()

// POS customer lookup
const customer = await findByPhone('555-0123')

// Create new customer
const newCustomer = await createCustomer({
  firstName: 'John',
  lastName: 'Doe',
  phone: '555-0123',
  email: 'john@example.com'
})
```

## **💡 Architecture Benefits**

### **Current System Integration**
- ✅ Uses existing UI components (ComponentCard, InputField, etc.)
- ✅ Compatible with current TailAdmin styling
- ✅ Drop-in replacement for existing hooks
- ✅ No changes needed to current pages

### **Future System Ready**
- ✅ Customer authentication built-in (website login)
- ✅ Subscription management hooks ready
- ✅ Loyalty points and preferences included
- ✅ Cross-provider payment methods supported
- ✅ Analytics and insights ready

### **Technical Improvements**
- ✅ **Type Safety** - Comprehensive TypeScript interfaces
- ✅ **Error Handling** - Result pattern, no throwing exceptions
- ✅ **Testability** - Service layer separated from UI
- ✅ **Maintainability** - Clear separation of concerns
- ✅ **Performance** - Debounced searches, optimized queries

## **🔧 Development Guide**

### **Adding New Domains**

Follow the established pattern:

```typescript
domains/new-domain/
├── entities/          # Business entities with full TypeScript
├── services/          # Business logic (extends DomainService)
├── repositories/      # Data access (extends BaseRepository)  
├── hooks/            # React hooks for UI integration
└── components/       # UI components for this domain
```

### **Integration with Existing System**

1. **Build new domain** in `src-new/domains/`
2. **Test integration** by importing into existing components
3. **Replace legacy logic** incrementally 
4. **Remove old code** when new version is proven

### **Key Patterns to Follow**

```typescript
// 1. All entities extend DomainEntity
export interface MyEntity extends DomainEntity {
  // entity properties
}

// 2. All services implement DomainService
export class MyService implements DomainService<MyEntity> {
  // business logic
}

// 3. All repositories extend BaseRepository
export class MyRepository extends BaseRepository<MyEntity> {
  // data access
}

// 4. All hooks follow use[Domain][Operation] pattern
export const useMyDomainService = () => {
  // React integration
}
```

## **📊 Success Metrics**

### **Before (Legacy System)**
- Customer logic scattered across multiple files
- API calls mixed with UI components
- No type safety for customer operations
- Difficult to test business logic

### **After (DDD System)**
- ✅ Customer logic centralized in CustomerService
- ✅ Clean separation between UI and business logic
- ✅ 100% TypeScript coverage with comprehensive interfaces
- ✅ Testable service layer with mocked repositories

### **Future Benefits**
- 🚀 **Customer website**: Reuse CustomerService for authentication/profiles
- 🚀 **Subscription system**: Built-in subscription management
- 🚀 **Mobile app**: Same business logic, different UI
- 🚀 **Admin tools**: Rich customer insights and analytics

## **🎯 Migration Strategy**

### **Phase 1: Foundation** ✅
- [x] Domain structure created
- [x] Core infrastructure built
- [x] Customer domain fully implemented
- [x] Integration pattern proven

### **Phase 2: POS Domains** (Next)
- [x] Orders domain ✅
- [x] Cart domain (Removed - reverted to local state) ❌
- [ ] Payment domain
- [ ] Products domain

### **Phase 3: Future Domains** (Later)
- [ ] Events domain
- [ ] Subscriptions domain
- [ ] Inventory domain
- [ ] Analytics domain

---

## **🚦 Quick Start**

1. **Test the demo**: Add `CustomerSearchDemo` to any existing page
2. **Compare architectures**: See how new Customer domain works vs legacy
3. **Start migration**: Replace one customer hook at a time
4. **Build next domain**: Follow the Customer domain pattern

The new architecture provides a solid foundation for all future development while remaining fully compatible with your existing system!
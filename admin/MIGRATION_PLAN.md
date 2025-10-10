# Migration Plan: src/ → src-new/

## 🎯 **Goal**
Complete migration from legacy `src/` architecture to new DDD architecture in `src-new/`

## 📋 **Migration Checklist**

### Phase 1: Infrastructure & Shared Components ✅
- [x] Domain entities, repositories, services built
- [x] Bridge hooks created for compatibility
- [x] Infrastructure layer (API client, base repository)

### Phase 2: UI Components Migration
#### 2.1 Move UI Components to `src-new/shared/ui/`
- [ ] `src/components/ui/` → `src-new/shared/ui/components/`
  - [ ] Alert, Avatar, Badge, Button, Dropdown, Modal, Table
- [ ] `src/components/form/` → `src-new/shared/ui/forms/`
  - [ ] InputField, Select, TextArea, Checkbox, Radio, etc.
- [ ] `src/components/common/` → `src-new/shared/ui/common/`
  - [ ] ComponentCard, PageBreadcrumb, LazyImage, etc.
- [ ] `src/layout/` → `src-new/shared/ui/layout/`
  - [ ] AppLayout, AppHeader, AppSidebar

#### 2.2 Move Business Components to `src-new/app/components/`
- [ ] `src/components/orders/` → `src-new/app/components/orders/`
- [ ] `src/components/pos/` → `src-new/app/components/pos/`
- [ ] `src/components/products/` → `src-new/app/components/products/`
- [ ] `src/components/customer/` → `src-new/app/components/customers/`
- [ ] `src/components/discounts/` → `src-new/app/components/discounts/`

### Phase 3: Pages Migration
#### 3.1 Move Pages to `src-new/app/pages/`
- [ ] `src/pages/` → `src-new/app/pages/`
  - [ ] Update imports to use new domain hooks
  - [ ] Update component imports to use new shared UI
  - [ ] Test each page after migration

### Phase 4: App Structure Migration
#### 4.1 Move App Core
- [ ] `src/App.tsx` → `src-new/app/App.tsx`
- [ ] `src/main.tsx` → `src-new/main.tsx`
- [ ] `src/context/` → `src-new/app/contexts/`
- [ ] Update router configuration
- [ ] Update context providers

### Phase 5: Assets & Utils Migration
#### 5.1 Move Assets
- [ ] `src/icons/` → `src-new/shared/assets/icons/`
- [ ] `src/index.css` → `src-new/shared/assets/styles/`

#### 5.2 Move Utils & Types
- [ ] `src/utils/` → `src-new/shared/utils/`
- [ ] `src/types/` → `src-new/shared/types/`
- [ ] `src/config/` → `src-new/app/config/`
- [ ] `src/constants/` → `src-new/shared/constants/`

### Phase 6: Services Migration
#### 6.1 Move Remaining Services to Domains
- [ ] `src/services/couponService.ts` → Integrate with discounts domain
- [ ] `src/services/giftCardService.ts` → Integrate with payments domain
- [ ] Remove duplicate services (productService, stripeService already in domains)

### Phase 7: Import Updates & Testing
#### 7.1 Update All Imports
- [ ] Update package.json build scripts
- [ ] Update Vite configuration
- [ ] Update TypeScript paths
- [ ] Fix all import statements throughout codebase

#### 7.2 Testing
- [ ] Test all pages load correctly
- [ ] Test all domain functionality works
- [ ] Test all components render properly
- [ ] Test build process

### Phase 8: Cleanup
#### 8.1 Remove Old Structure
- [ ] Delete `src/` folder
- [ ] Update any remaining references
- [ ] Clean up unused dependencies

## 🔄 **Migration Strategy**

### Option A: Gradual Migration (Recommended)
1. Move shared UI components first
2. Move one domain's pages at a time (start with customers)
3. Update imports incrementally
4. Test after each domain migration
5. Move app structure last
6. Final cleanup

### Option B: Complete Migration
1. Move everything at once
2. Fix all imports
3. Test everything
4. Higher risk but faster

## 📁 **Final Structure**

```
admin/
├── src-new/           # New DDD architecture (becomes src/)
│   ├── app/           # Application layer
│   │   ├── App.tsx
│   │   ├── components/    # Business components
│   │   ├── config/
│   │   ├── contexts/
│   │   ├── pages/
│   │   ├── providers/
│   │   └── router/
│   ├── domains/       # Domain layer (already complete)
│   │   ├── customers/
│   │   ├── orders/
│   │   ├── events/
│   │   ├── products/
│   │   ├── payments/
│   │   └── notifications/
│   └── shared/        # Shared layer
│       ├── assets/
│       ├── hooks/
│       ├── infrastructure/
│       ├── types/
│       ├── ui/        # Reusable UI components
│       └── utils/
├── main.tsx          # App entry point
└── package.json
```

## 🚨 **Risks & Considerations**

1. **Import Dependencies**: Many components have complex import chains
2. **Build Configuration**: May need to update Vite/TypeScript config
3. **Component Coupling**: Some components are tightly coupled to old hooks
4. **Testing**: Need comprehensive testing after migration

## 📝 **Migration Commands**

### Step-by-step Migration Script:
```bash
# 1. Create directory structure (already done)
mkdir -p src-new/shared/{assets,utils,types}
mkdir -p src-new/shared/ui/{components,layout}
mkdir -p src-new/app/{pages,components}

# 2. Move UI components
cp -r src/components/ui/* src-new/shared/ui/components/
cp -r src/components/form/* src-new/shared/ui/forms/
cp -r src/components/common/* src-new/shared/ui/common/

# 3. Move layout
cp -r src/layout/* src-new/shared/ui/layout/

# 4. Move business components
cp -r src/components/orders/* src-new/app/components/orders/
cp -r src/components/pos/* src-new/app/components/pos/
# ... etc

# 5. Move pages
cp -r src/pages/* src-new/app/pages/

# 6. Move app structure
cp src/App.tsx src-new/app/
cp src/main.tsx src-new/
cp -r src/context/* src-new/app/contexts/

# 7. Move assets & utils
cp -r src/icons/* src-new/shared/assets/icons/
cp src/index.css src-new/shared/assets/styles/
cp -r src/utils/* src-new/shared/utils/
cp -r src/types/* src-new/shared/types/

# 8. Update package.json & vite.config.ts
# 9. Fix all imports
# 10. Test and cleanup
```

## ✅ **Success Criteria**

- [ ] All pages load without errors
- [ ] All domain functionality works
- [ ] All components render correctly
- [ ] Build process completes successfully
- [ ] All tests pass
- [ ] Performance is maintained or improved
- [ ] Old `src/` folder can be safely deleted

## 🎯 **Next Steps**

1. **Start with Phase 2.1**: Move shared UI components
2. **Choose migration approach**: Gradual vs Complete
3. **Begin execution**: Follow checklist systematically
4. **Test frequently**: Verify functionality after each phase
5. **Document issues**: Track any problems encountered
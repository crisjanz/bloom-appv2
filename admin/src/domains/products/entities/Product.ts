/**
 * Product Domain Entities
 * Complete product system with variants, categories, and pricing
 */

import { DomainEntity, Money } from '@shared/types/common'
import { centsToDollars } from '@shared/utils/currency'

// ===== CORE PRODUCT ENTITY =====

export interface Product extends DomainEntity {
  // Basic Information
  name: string
  description?: string
  price: number // Base price in dollars
  
  // Categorization
  category?: string
  categoryId?: string
  tags?: string[]
  
  // Media
  image?: string
  images?: string[]
  
  // Variants and Configuration
  variants?: ProductVariant[]
  hasVariants: boolean
  
  // Inventory and Status
  isActive: boolean
  inStock: boolean
  stockQuantity?: number
  lowStockThreshold?: number
  
  // POS Configuration  
  posVisible: boolean
  posOrder?: number // Display order in POS
  
  // Pricing and Tax
  isTaxable: boolean
  taxCategory?: string
  displayPrice?: number
  
  // Metadata
  sku?: string
  barcode?: string
  weight?: number
  dimensions?: ProductDimensions
  notes?: string
  
  // Analytics
  salesCount?: number
  revenue?: number
  lastSoldAt?: Date
}

// ===== PRODUCT VARIANT ENTITY =====

export interface ProductVariant extends DomainEntity {
  productId: string
  
  // Variant Information
  name: string
  description?: string
  
  // Pricing (stored as differences from base product)
  priceDifference: number // In cents, can be negative
  calculatedPrice?: number // Computed: base + difference (in dollars)
  
  // Configuration
  isDefault: boolean
  isActive: boolean
  
  // Inventory
  sku?: string
  barcode?: string
  stockQuantity?: number
  featuredImageUrl?: string | null
  
  // Display
  sortOrder: number
  
  // Metadata
  attributes?: Record<string, any>
  notes?: string
}

// ===== PRODUCT CATEGORY ENTITY =====

export interface ProductCategory extends DomainEntity {
  name: string
  description?: string
  
  // Hierarchy
  parentId?: string
  parentCategory?: ProductCategory
  childCategories?: ProductCategory[]
  level: number
  
  // Display
  color?: string
  icon?: string
  image?: string
  sortOrder: number
  
  // Configuration
  isActive: boolean
  posVisible: boolean
  
  // Products
  productCount?: number
  products?: Product[]
}

// ===== POS TAB ENTITY =====

export interface POSTab extends DomainEntity {
  name: string
  color?: string
  icon?: string
  
  // Product Assignment
  productIds: string[]
  products?: Product[]
  
  // Display
  sortOrder: number
  isActive: boolean
  
  // Configuration
  isDefault: boolean
}

// ===== SUPPORT INTERFACES =====

export interface ProductDimensions {
  length?: number
  width?: number
  height?: number
  weight?: number
  unit: 'in' | 'cm' | 'mm'
  weightUnit: 'oz' | 'lb' | 'g' | 'kg'
}

export interface ProductSearchFilters {
  query?: string
  categoryId?: string
  tabId?: string
  isActive?: boolean
  posVisible?: boolean
  hasVariants?: boolean
  inStock?: boolean
  priceMin?: number
  priceMax?: number
  tags?: string[]
}

export interface ProductSearchResult {
  products: Product[]
  total: number
  categories: ProductCategory[]
  tabs: POSTab[]
  filters: ProductSearchFilters
}

// ===== ENUMS =====

export enum ProductSortBy {
  NAME = 'name',
  PRICE = 'price',
  CATEGORY = 'category',
  CREATED_AT = 'createdAt',
  SALES_COUNT = 'salesCount',
  REVENUE = 'revenue',
  POS_ORDER = 'posOrder'
}

export enum ProductStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DISCONTINUED = 'DISCONTINUED',
  OUT_OF_STOCK = 'OUT_OF_STOCK'
}

export enum VariantType {
  SIZE = 'SIZE',
  COLOR = 'COLOR',
  STYLE = 'STYLE',
  UPGRADE = 'UPGRADE',
  ADDON = 'ADDON'
}

// ===== REQUEST/RESPONSE INTERFACES =====

export interface CreateProductRequest {
  name: string
  description?: string
  price: number
  categoryId?: string
  isActive: boolean
  posVisible: boolean
  isTaxable: boolean
  image?: string
  images?: string[]
  variants?: CreateVariantRequest[]
}

export interface CreateVariantRequest {
  name: string
  description?: string
  priceDifference: number
  isDefault: boolean
  isActive: boolean
  sortOrder: number
  featuredImageUrl?: string | null
}

export interface UpdateProductRequest extends Partial<CreateProductRequest> {
  id: string
}

export interface UpdateVariantRequest extends Partial<CreateVariantRequest> {}

// ===== ANALYTICS INTERFACES =====

export interface ProductAnalytics {
  // Sales Performance
  totalProducts: number
  activeProducts: number
  totalRevenue: Money
  totalSales: number
  averageOrderValue: Money
  
  // Top Performers
  topSellingProducts: Array<{
    product: Product
    salesCount: number
    revenue: Money
    percentage: number
  }>
  
  // Category Performance
  categoryPerformance: Array<{
    category: ProductCategory
    productCount: number
    salesCount: number
    revenue: Money
    percentage: number
  }>
  
  // Variant Performance
  variantPerformance: Array<{
    variant: ProductVariant
    product: Product
    salesCount: number
    revenue: Money
    percentage: number
  }>
  
  // Stock Status
  lowStockProducts: Product[]
  outOfStockProducts: Product[]
  stockValue: Money
  
  // Time Period
  periodStart: Date
  periodEnd: Date
}

// ===== BUSINESS LOGIC HELPERS =====

export const ProductHelper = {
  /**
   * Calculate variant price
   */
  calculateVariantPrice(product: Product, variant: ProductVariant): number {
    return product.price + centsToDollars(variant.priceDifference)
  },
  
  /**
   * Get product display price (base or default variant)
   */
  getDisplayPrice(product: Product): number {
    if (!product.hasVariants || !product.variants?.length) {
      return product.price
    }
    
    const defaultVariant = product.variants.find(v => v.isDefault)
    if (defaultVariant) {
      return ProductHelper.calculateVariantPrice(product, defaultVariant)
    }
    
    return product.price
  },
  
  /**
   * Get product primary image
   */
  getPrimaryImage(product: Product): string | null {
    if (product.images && product.images.length > 0) {
      return product.images[0]
    }
    return product.image || null
  },
  
  /**
   * Check if product is available for sale
   */
  isAvailable(product: Product): boolean {
    return product.isActive && product.inStock && product.posVisible
  },
  
  /**
   * Get product stock status
   */
  getStockStatus(product: Product): 'in_stock' | 'low_stock' | 'out_of_stock' {
    if (!product.inStock || (product.stockQuantity !== undefined && product.stockQuantity <= 0)) {
      return 'out_of_stock'
    }
    
    if (product.lowStockThreshold && product.stockQuantity !== undefined && 
        product.stockQuantity <= product.lowStockThreshold) {
      return 'low_stock'
    }
    
    return 'in_stock'
  },
  
  /**
   * Format product name for display
   */
  formatDisplayName(product: Product, maxLength: number = 16): string {
    if (!product.name) return 'Unnamed Product'
    
    if (product.name.length > maxLength) {
      return `${product.name.substring(0, maxLength)}...`
    }
    
    return product.name
  }
}

// ===== TYPE GUARDS =====

export const isProduct = (obj: any): obj is Product => {
  return obj && typeof obj.name === 'string' && typeof obj.price === 'number'
}

export const isProductVariant = (obj: any): obj is ProductVariant => {
  return obj && typeof obj.productId === 'string' && typeof obj.name === 'string'
}

export const isProductCategory = (obj: any): obj is ProductCategory => {
  return obj && typeof obj.name === 'string' && typeof obj.level === 'number'
}

// ===== DOMAIN EVENTS =====

export interface ProductEvent {
  type: string
  productId: string
  timestamp: Date
  metadata?: Record<string, any>
}

export interface ProductCreated extends ProductEvent {
  type: 'PRODUCT_CREATED'
  product: Product
}

export interface ProductUpdated extends ProductEvent {
  type: 'PRODUCT_UPDATED'
  product: Product
  changes: Partial<Product>
}

export interface ProductDeleted extends ProductEvent {
  type: 'PRODUCT_DELETED'
  productId: string
}

export interface VariantCreated extends ProductEvent {
  type: 'VARIANT_CREATED'
  variant: ProductVariant
}

export interface VariantUpdated extends ProductEvent {
  type: 'VARIANT_UPDATED'
  variant: ProductVariant
  changes: Partial<ProductVariant>
}

export interface ProductSold extends ProductEvent {
  type: 'PRODUCT_SOLD'
  quantity: number
  price: number
  orderId: string
  variantId?: string
}

/**
 * Product Service
 * Business logic for products, variants, categories, and POS management
 */

import { DomainService } from '@shared/types/common'
import {
  Product,
  ProductVariant,
  ProductCategory,
  POSTab,
  ProductSearchFilters,
  ProductSearchResult,
  ProductAnalytics,
  CreateProductRequest,
  CreateVariantRequest,
  UpdateProductRequest,
  UpdateVariantRequest,
  ProductHelper,
  ProductSortBy
} from '../entities/Product'
import { ProductRepository } from '../repositories/ProductRepository'

export class ProductService implements DomainService<Product> {
  constructor(
    private productRepository: ProductRepository
  ) {}

  // ===== CORE PRODUCT OPERATIONS =====

  async create(data: CreateProductRequest): Promise<Product>
  async create(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product>
  async create(data: CreateProductRequest | Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    const normalizedData = this.normalizeProductInput(data)

    // Validate product data
    const validationResult = this.validateProductData(normalizedData)
    if (!validationResult.isValid) {
      throw new Error(`Product validation failed: ${validationResult.errors.join(', ')}`)
    }

    // Ensure proper defaults
    const productData = {
      ...normalizedData,
      hasVariants: normalizedData.hasVariants ?? Boolean(normalizedData.variants?.length),
      isActive: normalizedData.isActive ?? true,
      posVisible: normalizedData.posVisible ?? true,
      isTaxable: normalizedData.isTaxable ?? true,
      inStock: normalizedData.inStock ?? true,
      salesCount: normalizedData.salesCount ?? 0,
      revenue: normalizedData.revenue ?? 0
    }

    return await this.productRepository.save(productData as Product)
  }

  async findById(id: string): Promise<Product | null> {
    return await this.productRepository.findById(id)
  }

  async update(id: string, updates: Partial<Product>): Promise<Product> {
    const product = await this.findById(id)
    if (!product) {
      throw new Error(`Product with id ${id} not found`)
    }

    // Validate updates
    const validationResult = this.validateProductData({ ...product, ...updates })
    if (!validationResult.isValid) {
      throw new Error(`Product update validation failed: ${validationResult.errors.join(', ')}`)
    }

    // Update hasVariants if variants are modified
    if (updates.variants !== undefined) {
      updates.hasVariants = Boolean(updates.variants.length)
    }

    return await this.productRepository.save({ ...product, ...updates })
  }

  async delete(id: string): Promise<void> {
    const product = await this.findById(id)
    if (!product) {
      throw new Error(`Product with id ${id} not found`)
    }

    // Soft delete by setting inactive
    await this.update(id, { isActive: false, posVisible: false })
  }

  // ===== PRODUCT SEARCH AND FILTERING =====

  async searchProducts(filters: ProductSearchFilters = {}): Promise<ProductSearchResult> {
    return await this.productRepository.searchProducts(filters)
  }

  async getPOSProducts(tabId?: string): Promise<Product[]> {
    const products = await this.productRepository.getPOSProducts(tabId)
    
    // Calculate display prices for all products
    return products.map(product => ({
      ...product,
      displayPrice: ProductHelper.getDisplayPrice(product)
    }))
  }

  async getProductsByCategory(categoryId: string): Promise<Product[]> {
    return await this.productRepository.getProductsByCategory(categoryId)
  }

  async getTopSellingProducts(limit: number = 10): Promise<Product[]> {
    return await this.productRepository.getTopSellingProducts(limit)
  }

  async getLowStockProducts(): Promise<Product[]> {
    return await this.productRepository.getLowStockProducts()
  }

  // ===== VARIANT MANAGEMENT =====

  async getProductVariants(productId: string): Promise<ProductVariant[]> {
    const variants = await this.productRepository.getProductVariants(productId)
    const product = await this.findById(productId)
    
    if (!product) return variants

    // Calculate prices for all variants
    return variants.map(variant => ({
      ...variant,
      calculatedPrice: ProductHelper.calculateVariantPrice(product, variant)
    })).sort((a, b) => a.sortOrder - b.sortOrder)
  }

  async createVariant(productId: string, variantData: CreateVariantRequest): Promise<ProductVariant> {
    const product = await this.findById(productId)
    if (!product) {
      throw new Error(`Product with id ${productId} not found`)
    }

    // Validate variant data
    const validationResult = this.validateVariantData(variantData)
    if (!validationResult.isValid) {
      throw new Error(`Variant validation failed: ${validationResult.errors.join(', ')}`)
    }

    // If this is the first variant or marked as default, handle default logic
    const existingVariants = await this.getProductVariants(productId)
    if (variantData.isDefault || existingVariants.length === 0) {
      // Make sure only one default variant exists
      if (existingVariants.some(v => v.isDefault) && variantData.isDefault) {
        // Update existing default variants to not be default
        for (const variant of existingVariants.filter(v => v.isDefault)) {
          await this.productRepository.updateVariant(variant.id, { isDefault: false })
        }
      }
    }

    const variant = await this.productRepository.createVariant(productId, {
      ...variantData,
      isActive: variantData.isActive ?? true,
      sortOrder: variantData.sortOrder ?? existingVariants.length
    })

    // Update product to indicate it has variants
    await this.update(productId, { hasVariants: true })

    return variant
  }

  async updateVariant(variantId: string, variantData: UpdateVariantRequest): Promise<ProductVariant> {
    // Handle default variant logic
    if (variantData.isDefault) {
      const variant = await this.productRepository.findById(variantId) as any // This would need proper typing
      if (variant?.productId) {
        const existingVariants = await this.getProductVariants(variant.productId)
        // Remove default from other variants
        for (const existingVariant of existingVariants.filter(v => v.isDefault && v.id !== variantId)) {
          await this.productRepository.updateVariant(existingVariant.id, { isDefault: false })
        }
      }
    }

    return await this.productRepository.updateVariant(variantId, variantData)
  }

  async deleteVariant(variantId: string): Promise<void> {
    await this.productRepository.deleteVariant(variantId)
  }

  // ===== CATEGORY MANAGEMENT =====

  async getCategories(): Promise<ProductCategory[]> {
    return await this.productRepository.getCategories()
  }

  async getCategoryHierarchy(): Promise<ProductCategory[]> {
    return await this.productRepository.getCategoryHierarchy()
  }

  async createCategory(categoryData: Omit<ProductCategory, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProductCategory> {
    // Validate category data
    const validationResult = this.validateCategoryData(categoryData)
    if (!validationResult.isValid) {
      throw new Error(`Category validation failed: ${validationResult.errors.join(', ')}`)
    }

    return await this.productRepository.createCategory({
      ...categoryData,
      isActive: categoryData.isActive ?? true,
      posVisible: categoryData.posVisible ?? true,
      productCount: 0
    })
  }

  // ===== POS TAB MANAGEMENT =====

  async getPOSTabs(): Promise<POSTab[]> {
    const tabs = await this.productRepository.getPOSTabs()
    
    // Add "All Products" tab if not exists
    const allTab: POSTab = {
      id: 'all',
      name: 'All Products',
      productIds: [],
      sortOrder: -1,
      isActive: true,
      isDefault: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    return [allTab, ...tabs.sort((a, b) => a.sortOrder - b.sortOrder)]
  }

  async createPOSTab(tabData: Omit<POSTab, 'id' | 'createdAt' | 'updatedAt'>): Promise<POSTab> {
    return await this.productRepository.createPOSTab({
      ...tabData,
      isActive: tabData.isActive ?? true,
      isDefault: tabData.isDefault ?? false
    })
  }

  async updatePOSTab(tabId: string, tabData: Partial<POSTab>): Promise<POSTab> {
    return await this.productRepository.updatePOSTab(tabId, tabData)
  }

  async assignProductsToTab(tabId: string, productIds: string[]): Promise<POSTab> {
    return await this.productRepository.assignProductsToTab(tabId, productIds)
  }

  // ===== PRICING OPERATIONS =====

  async updateProductPricing(productId: string, newPrice: number): Promise<Product> {
    const product = await this.findById(productId)
    if (!product) {
      throw new Error(`Product with id ${productId} not found`)
    }

    if (newPrice < 0) {
      throw new Error('Product price cannot be negative')
    }

    return await this.update(productId, { price: newPrice })
  }

  async bulkUpdatePricing(updates: Array<{ productId: string; price: number }>): Promise<Product[]> {
    const results: Product[] = []

    for (const update of updates) {
      try {
        const product = await this.updateProductPricing(update.productId, update.price)
        results.push(product)
      } catch (error) {
        console.error(`Failed to update pricing for product ${update.productId}:`, error)
      }
    }

    return results
  }

  // ===== INVENTORY OPERATIONS =====

  async updateStock(productId: string, quantity: number): Promise<Product> {
    const product = await this.findById(productId)
    if (!product) {
      throw new Error(`Product with id ${productId} not found`)
    }

    return await this.update(productId, {
      stockQuantity: quantity,
      inStock: quantity > 0
    })
  }

  async adjustStock(productId: string, adjustment: number): Promise<Product> {
    const product = await this.findById(productId)
    if (!product) {
      throw new Error(`Product with id ${productId} not found`)
    }

    const currentStock = product.stockQuantity || 0
    const newStock = Math.max(0, currentStock + adjustment)

    return await this.updateStock(productId, newStock)
  }

  // ===== ANALYTICS =====

  async getProductAnalytics(dateFrom: Date, dateTo: Date): Promise<ProductAnalytics> {
    return await this.productRepository.getProductAnalytics(dateFrom, dateTo)
  }

  async getDailySummary(date: Date = new Date()) {
    return await this.productRepository.getDailySummary(date)
  }

  // ===== VALIDATION METHODS =====

  private validateProductData(data: Partial<Product>): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (data.name !== undefined && (!data.name || data.name.trim().length === 0)) {
      errors.push('Product name is required')
    }

    if (data.name && data.name.length > 100) {
      errors.push('Product name cannot exceed 100 characters')
    }

    if (data.price !== undefined && (data.price < 0 || data.price > 999999.99)) {
      errors.push('Product price must be between $0.00 and $999,999.99')
    }

    if (data.stockQuantity !== undefined && data.stockQuantity < 0) {
      errors.push('Stock quantity cannot be negative')
    }

    if (data.lowStockThreshold !== undefined && data.lowStockThreshold < 0) {
      errors.push('Low stock threshold cannot be negative')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  private validateVariantData(data: Partial<ProductVariant>): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (data.name !== undefined && (!data.name || data.name.trim().length === 0)) {
      errors.push('Variant name is required')
    }

    if (data.name && data.name.length > 100) {
      errors.push('Variant name cannot exceed 100 characters')
    }

    if (data.priceDifference !== undefined && (data.priceDifference < -99999 || data.priceDifference > 99999)) {
      errors.push('Price difference must be between -$999.99 and $999.99')
    }

    if (data.sortOrder !== undefined && data.sortOrder < 0) {
      errors.push('Sort order cannot be negative')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  private validateCategoryData(data: Partial<ProductCategory>): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (data.name !== undefined && (!data.name || data.name.trim().length === 0)) {
      errors.push('Category name is required')
    }

    if (data.name && data.name.length > 50) {
      errors.push('Category name cannot exceed 50 characters')
    }

    if (data.level !== undefined && data.level < 0) {
      errors.push('Category level cannot be negative')
    }

    if (data.sortOrder !== undefined && data.sortOrder < 0) {
      errors.push('Sort order cannot be negative')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // ===== BUSINESS LOGIC HELPERS =====

  private normalizeProductInput(
    data: CreateProductRequest | Omit<Product, 'id' | 'createdAt' | 'updatedAt'>
  ): Omit<Product, 'id' | 'createdAt' | 'updatedAt'> {
    const hasVariants =
      'hasVariants' in data
        ? (data as Omit<Product, 'id' | 'createdAt' | 'updatedAt'>).hasVariants
        : Boolean(data.variants?.length)

    return {
      ...data,
      hasVariants
    } as Omit<Product, 'id' | 'createdAt' | 'updatedAt'>
  }

  /**
   * Calculate product with variant pricing
   */
  calculateProductPricing(product: Product): Product {
    if (!product.hasVariants || !product.variants?.length) {
      return { ...product, displayPrice: product.price }
    }

    const variants = product.variants.map(variant => ({
      ...variant,
      calculatedPrice: ProductHelper.calculateVariantPrice(product, variant)
    }))

    return {
      ...product,
      variants,
      displayPrice: ProductHelper.getDisplayPrice(product)
    }
  }

  /**
   * Get product availability status
   */
  getProductAvailability(product: Product): {
    isAvailable: boolean
    stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock'
    message: string
  } {
    const isAvailable = ProductHelper.isAvailable(product)
    const stockStatus = ProductHelper.getStockStatus(product)

    let message = ''
    switch (stockStatus) {
      case 'out_of_stock':
        message = 'Out of stock'
        break
      case 'low_stock':
        message = `Low stock (${product.stockQuantity || 0} remaining)`
        break
      case 'in_stock':
        message = 'In stock'
        break
    }

    if (!product.isActive) {
      message = 'Product inactive'
    } else if (!product.posVisible) {
      message = 'Not available in POS'
    }

    return {
      isAvailable,
      stockStatus,
      message
    }
  }
}

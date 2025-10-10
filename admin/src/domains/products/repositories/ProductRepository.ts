/**
 * Product Repository
 * Data access layer for products, variants, categories, and POS tabs
 */

import { BaseRepository } from '@shared/infrastructure/database/BaseRepository'
import { 
  Product, 
  ProductVariant, 
  ProductCategory, 
  POSTab,
  ProductSearchFilters,
  ProductSearchResult,
  ProductAnalytics,
  ProductSortBy 
} from '../entities/Product'
import { Money } from '@shared/types/common'

export class ProductRepository extends BaseRepository<Product> {
  protected readonly endpoint = 'products'
  protected readonly entityName = 'Product'

  // ===== PRODUCT QUERIES =====

  /**
   * Search products with advanced filtering
   */
  async searchProducts(filters: ProductSearchFilters = {}): Promise<ProductSearchResult> {
    const queryParams = new URLSearchParams()
    
    if (filters.query) queryParams.set('search', filters.query)
    if (filters.categoryId) queryParams.set('categoryId', filters.categoryId)
    if (filters.tabId) queryParams.set('tabId', filters.tabId)
    if (filters.isActive !== undefined) queryParams.set('isActive', filters.isActive.toString())
    if (filters.posVisible !== undefined) queryParams.set('posVisible', filters.posVisible.toString())
    if (filters.hasVariants !== undefined) queryParams.set('hasVariants', filters.hasVariants.toString())
    if (filters.inStock !== undefined) queryParams.set('inStock', filters.inStock.toString())
    if (filters.priceMin !== undefined) queryParams.set('priceMin', filters.priceMin.toString())
    if (filters.priceMax !== undefined) queryParams.set('priceMax', filters.priceMax.toString())
    if (filters.tags?.length) queryParams.set('tags', filters.tags.join(','))

    const result = await this.findMany({
      filters: Object.fromEntries(queryParams),
      limit: 100
    })

    // In real implementation, this would come from the API response
    return {
      products: result.items,
      total: result.total,
      categories: [], // Would be populated by API
      tabs: [], // Would be populated by API
      filters
    }
  }

  /**
   * Get products for POS display
   */
  async getPOSProducts(tabId?: string): Promise<Product[]> {
    const filters: Record<string, any> = {
      posVisible: true,
      isActive: true
    }

    if (tabId && tabId !== 'all') {
      filters.tabId = tabId
    }

    const result = await this.findMany({ filters })
    return result.items
  }

  /**
   * Get products by category
   */
  async getProductsByCategory(categoryId: string): Promise<Product[]> {
    const result = await this.findMany({
      filters: { categoryId }
    })
    return result.items
  }

  /**
   * Get products with variants
   */
  async getProductsWithVariants(): Promise<Product[]> {
    const result = await this.findMany({
      filters: { hasVariants: true }
    })
    return result.items
  }

  /**
   * Get top selling products
   */
  async getTopSellingProducts(limit: number = 10): Promise<Product[]> {
    // In real implementation, this would use proper ordering
    const result = await this.findMany({
      filters: {},
      limit
    })
    return result.items
  }

  /**
   * Get low stock products
   */
  async getLowStockProducts(): Promise<Product[]> {
    // In real implementation, this would use complex stock queries
    const result = await this.findMany({
      filters: { lowStock: true }
    })
    return result.items
  }

  // ===== VARIANT QUERIES =====

  /**
   * Get variants for a product
   */
  async getProductVariants(productId: string): Promise<ProductVariant[]> {
    // This would call a separate variants endpoint
    try {
      const response = await fetch(`${this.getBaseUrl()}/products/${productId}/variants`)
      if (!response.ok) throw new Error('Failed to fetch variants')
      return await response.json()
    } catch (error) {
      console.error('Error fetching product variants:', error)
      return []
    }
  }

  /**
   * Create product variant
   */
  async createVariant(productId: string, variantData: Omit<ProductVariant, 'id' | 'createdAt' | 'updatedAt' | 'productId'>): Promise<ProductVariant> {
    try {
      const response = await fetch(`${this.getBaseUrl()}/products/${productId}/variants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(variantData)
      })
      if (!response.ok) throw new Error('Failed to create variant')
      return await response.json()
    } catch (error) {
      console.error('Error creating variant:', error)
      throw error
    }
  }

  /**
   * Update product variant
   */
  async updateVariant(variantId: string, variantData: Partial<ProductVariant>): Promise<ProductVariant> {
    try {
      const response = await fetch(`${this.getBaseUrl()}/variants/${variantId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(variantData)
      })
      if (!response.ok) throw new Error('Failed to update variant')
      return await response.json()
    } catch (error) {
      console.error('Error updating variant:', error)
      throw error
    }
  }

  /**
   * Delete product variant
   */
  async deleteVariant(variantId: string): Promise<void> {
    try {
      const response = await fetch(`${this.getBaseUrl()}/variants/${variantId}`, {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error('Failed to delete variant')
    } catch (error) {
      console.error('Error deleting variant:', error)
      throw error
    }
  }

  // ===== CATEGORY QUERIES =====

  /**
   * Get all product categories
   */
  async getCategories(): Promise<ProductCategory[]> {
    try {
      const response = await fetch(`${this.getBaseUrl()}/categories`)
      if (!response.ok) throw new Error('Failed to fetch categories')
      return await response.json()
    } catch (error) {
      console.error('Error fetching categories:', error)
      return []
    }
  }

  /**
   * Get category hierarchy
   */
  async getCategoryHierarchy(): Promise<ProductCategory[]> {
    try {
      const response = await fetch(`${this.getBaseUrl()}/categories/hierarchy`)
      if (!response.ok) throw new Error('Failed to fetch category hierarchy')
      return await response.json()
    } catch (error) {
      console.error('Error fetching category hierarchy:', error)
      return []
    }
  }

  /**
   * Create product category
   */
  async createCategory(categoryData: Omit<ProductCategory, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProductCategory> {
    try {
      const response = await fetch(`${this.getBaseUrl()}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryData)
      })
      if (!response.ok) throw new Error('Failed to create category')
      return await response.json()
    } catch (error) {
      console.error('Error creating category:', error)
      throw error
    }
  }

  // ===== POS TAB QUERIES =====

  /**
   * Get all POS tabs
   */
  async getPOSTabs(): Promise<POSTab[]> {
    try {
      const response = await fetch(`${this.getBaseUrl()}/pos-tabs`)
      if (!response.ok) throw new Error('Failed to fetch POS tabs')
      return await response.json()
    } catch (error) {
      console.error('Error fetching POS tabs:', error)
      return []
    }
  }

  /**
   * Create POS tab
   */
  async createPOSTab(tabData: Omit<POSTab, 'id' | 'createdAt' | 'updatedAt'>): Promise<POSTab> {
    try {
      const response = await fetch(`${this.getBaseUrl()}/pos-tabs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tabData)
      })
      if (!response.ok) throw new Error('Failed to create POS tab')
      return await response.json()
    } catch (error) {
      console.error('Error creating POS tab:', error)
      throw error
    }
  }

  /**
   * Update POS tab
   */
  async updatePOSTab(tabId: string, tabData: Partial<POSTab>): Promise<POSTab> {
    try {
      const response = await fetch(`${this.getBaseUrl()}/pos-tabs/${tabId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tabData)
      })
      if (!response.ok) throw new Error('Failed to update POS tab')
      return await response.json()
    } catch (error) {
      console.error('Error updating POS tab:', error)
      throw error
    }
  }

  /**
   * Assign products to POS tab
   */
  async assignProductsToTab(tabId: string, productIds: string[]): Promise<POSTab> {
    try {
      const response = await fetch(`${this.getBaseUrl()}/pos-tabs/${tabId}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds })
      })
      if (!response.ok) throw new Error('Failed to assign products to tab')
      return await response.json()
    } catch (error) {
      console.error('Error assigning products to tab:', error)
      throw error
    }
  }

  // ===== ANALYTICS =====

  /**
   * Get product analytics
   */
  async getProductAnalytics(dateFrom: Date, dateTo: Date): Promise<ProductAnalytics> {
    try {
      const params = new URLSearchParams({
        dateFrom: dateFrom.toISOString(),
        dateTo: dateTo.toISOString()
      })

      const response = await fetch(`${this.getBaseUrl()}/analytics/products?${params}`)
      if (!response.ok) throw new Error('Failed to fetch product analytics')
      
      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error fetching product analytics:', error)
      
      // Return empty analytics on error
      return {
        totalProducts: 0,
        activeProducts: 0,
        totalRevenue: { amount: 0, currency: 'CAD' },
        totalSales: 0,
        averageOrderValue: { amount: 0, currency: 'CAD' },
        topSellingProducts: [],
        categoryPerformance: [],
        variantPerformance: [],
        lowStockProducts: [],
        outOfStockProducts: [],
        stockValue: { amount: 0, currency: 'CAD' },
        periodStart: dateFrom,
        periodEnd: dateTo
      }
    }
  }

  /**
   * Get daily product summary
   */
  async getDailySummary(date: Date): Promise<{
    productsSold: number
    revenue: Money
    topProduct?: {
      product: Product
      quantity: number
      revenue: Money
    }
  }> {
    try {
      const params = new URLSearchParams({
        date: date.toISOString().split('T')[0]
      })

      const response = await fetch(`${this.getBaseUrl()}/analytics/products/daily?${params}`)
      if (!response.ok) throw new Error('Failed to fetch daily summary')
      
      return await response.json()
    } catch (error) {
      console.error('Error fetching daily summary:', error)
      return {
        productsSold: 0,
        revenue: { amount: 0, currency: 'CAD' }
      }
    }
  }

  // ===== BULK OPERATIONS =====

  /**
   * Bulk update products
   */
  async bulkUpdateProducts(updates: Array<{ id: string; data: Partial<Product> }>): Promise<Product[]> {
    try {
      const response = await fetch(`${this.getBaseUrl()}/products/bulk-update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      })
      if (!response.ok) throw new Error('Failed to bulk update products')
      return await response.json()
    } catch (error) {
      console.error('Error bulk updating products:', error)
      throw error
    }
  }

  /**
   * Bulk delete products
   */
  async bulkDeleteProducts(productIds: string[]): Promise<void> {
    try {
      const response = await fetch(`${this.getBaseUrl()}/products/bulk-delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds })
      })
      if (!response.ok) throw new Error('Failed to bulk delete products')
    } catch (error) {
      console.error('Error bulk deleting products:', error)
      throw error
    }
  }

  // ===== HELPER METHODS =====

  private getBaseUrl(): string {
    return 'http://localhost:4000/api'
  }

  /**
   * Build search query for products
   */
  private buildSearchQuery(filters: ProductSearchFilters): Record<string, any> {
    const query: Record<string, any> = {}

    if (filters.query) {
      query.search = filters.query
    }

    if (filters.categoryId) {
      query.categoryId = filters.categoryId
    }

    if (filters.tabId && filters.tabId !== 'all') {
      query.tabId = filters.tabId
    }

    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive
    }

    if (filters.posVisible !== undefined) {
      query.posVisible = filters.posVisible
    }

    if (filters.hasVariants !== undefined) {
      query.hasVariants = filters.hasVariants
    }

    if (filters.inStock !== undefined) {
      query.inStock = filters.inStock
    }

    if (filters.priceMin !== undefined) {
      query.priceMin = filters.priceMin
    }

    if (filters.priceMax !== undefined) {
      query.priceMax = filters.priceMax
    }

    if (filters.tags?.length) {
      query.tags = filters.tags.join(',')
    }

    return query
  }
}
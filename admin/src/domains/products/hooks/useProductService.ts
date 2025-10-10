/**
 * React Hooks for Product Service
 * Clean interface for POS and product management components
 */

import { useState, useCallback, useEffect } from 'react'
import { ProductService } from '../services/ProductService'
import { ProductRepository } from '../repositories/ProductRepository'
import {
  Product,
  ProductVariant,
  ProductCategory,
  POSTab,
  ProductSearchFilters,
  ProductSearchResult,
  ProductAnalytics,
  CreateProductRequest,
  CreateVariantRequest
} from '../entities/Product'

// Create singleton instances
const productRepository = new ProductRepository()
const productService = new ProductService(productRepository)

// ===== MAIN PRODUCT SERVICE HOOK =====

export const useProductService = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Clear error helper
  const clearError = useCallback(() => setError(null), [])
  
  return {
    // State
    loading,
    error,
    clearError,
    
    // Direct service access
    productService,
    productRepository
  }
}

// ===== PRODUCT SEARCH HOOK =====

export const useProductSearch = () => {
  const { productService } = useProductService()
  const [searchResult, setSearchResult] = useState<ProductSearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchFilters, setSearchFilters] = useState<ProductSearchFilters>({})

  // Debounced search function
  const searchProducts = useCallback(async (filters: ProductSearchFilters) => {
    setLoading(true)
    setSearchFilters(filters)
    
    try {
      const result = await productService.searchProducts(filters)
      setSearchResult(result)
    } catch (error) {
      console.error('Product search error:', error)
      setSearchResult({
        products: [],
        total: 0,
        categories: [],
        tabs: [],
        filters
      })
    } finally {
      setLoading(false)
    }
  }, [productService])

  // Quick search by query string
  const quickSearch = useCallback((query: string) => {
    searchProducts({ ...searchFilters, query })
  }, [searchProducts, searchFilters])

  // Filter by category
  const filterByCategory = useCallback((categoryId: string) => {
    searchProducts({ ...searchFilters, categoryId })
  }, [searchProducts, searchFilters])

  // Filter by tab
  const filterByTab = useCallback((tabId: string) => {
    searchProducts({ ...searchFilters, tabId })
  }, [searchProducts, searchFilters])

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchFilters({})
    setSearchResult(null)
  }, [])

  return {
    // State
    searchResult,
    loading,
    searchFilters,
    
    // Operations
    searchProducts,
    quickSearch,
    filterByCategory,
    filterByTab,
    clearSearch
  }
}

// ===== POS PRODUCTS HOOK (Drop-in replacement for existing useProducts) =====

export const usePOSProducts = () => {
  const { productService } = useProductService()
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('all')

  // Load products for POS
  const fetchProducts = useCallback(async (tabId?: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const data = await productService.getPOSProducts(tabId)
      setProducts(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load products'
      setError(message)
      console.error('Failed to fetch POS products:', err)
    } finally {
      setLoading(false)
    }
  }, [productService])

  // Filter products based on search term and active tab
  const filterProducts = useCallback(() => {
    let filtered = products

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredProducts(filtered)
  }, [products, searchTerm])

  // Update active tab and reload products
  const updateActiveTab = useCallback((tabId: string) => {
    setActiveTab(tabId)
    fetchProducts(tabId === 'all' ? undefined : tabId)
  }, [fetchProducts])

  // Update search term
  const updateSearchTerm = useCallback((term: string) => {
    setSearchTerm(term)
  }, [])

  // Refresh products
  const refetch = useCallback(() => {
    fetchProducts(activeTab === 'all' ? undefined : activeTab)
  }, [fetchProducts, activeTab])

  // Apply filters when products or search term changes
  useEffect(() => {
    filterProducts()
  }, [filterProducts])

  // Initial load
  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  return {
    // State (compatible with existing useProducts)
    products: filteredProducts,
    allProducts: products,
    loading,
    error,
    searchTerm,
    activeTab,
    
    // Operations (compatible with existing useProducts)
    refetch,
    updateSearchTerm,
    updateActiveTab,
    
    // New operations
    fetchProducts
  }
}

// ===== POS TABS HOOK =====

export const usePOSTabs = () => {
  const { productService } = useProductService()
  const [tabs, setTabs] = useState<POSTab[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load POS tabs
  const fetchTabs = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const data = await productService.getPOSTabs()
      setTabs(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load tabs'
      setError(message)
      console.error('Failed to fetch POS tabs:', err)
    } finally {
      setLoading(false)
    }
  }, [productService])

  // Create new tab
  const createTab = useCallback(async (tabData: Omit<POSTab, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newTab = await productService.createPOSTab(tabData)
      setTabs(prev => [...prev, newTab])
      return newTab
    } catch (error) {
      console.error('Failed to create POS tab:', error)
      throw error
    }
  }, [productService])

  // Update tab
  const updateTab = useCallback(async (tabId: string, tabData: Partial<POSTab>) => {
    try {
      const updatedTab = await productService.updatePOSTab(tabId, tabData)
      setTabs(prev => prev.map(tab => tab.id === tabId ? updatedTab : tab))
      return updatedTab
    } catch (error) {
      console.error('Failed to update POS tab:', error)
      throw error
    }
  }, [productService])

  // Assign products to tab
  const assignProductsToTab = useCallback(async (tabId: string, productIds: string[]) => {
    try {
      const updatedTab = await productService.assignProductsToTab(tabId, productIds)
      setTabs(prev => prev.map(tab => tab.id === tabId ? updatedTab : tab))
      return updatedTab
    } catch (error) {
      console.error('Failed to assign products to tab:', error)
      throw error
    }
  }, [productService])

  // Initial load
  useEffect(() => {
    fetchTabs()
  }, [fetchTabs])

  return {
    // State
    tabs,
    loading,
    error,
    
    // Operations
    fetchTabs,
    createTab,
    updateTab,
    assignProductsToTab
  }
}

// ===== PRODUCT MANAGEMENT HOOK =====

export const useProductManagement = () => {
  const { productService } = useProductService()
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(false)

  // Load product by ID
  const loadProduct = useCallback(async (productId: string) => {
    setLoading(true)
    
    try {
      const product = await productService.findById(productId)
      setSelectedProduct(product)
      return product
    } catch (error) {
      console.error('Failed to load product:', error)
      setSelectedProduct(null)
      throw error
    } finally {
      setLoading(false)
    }
  }, [productService])

  // Create new product
  const createProduct = useCallback(async (productData: CreateProductRequest) => {
    setLoading(true)
    
    try {
      const newProduct = await productService.create(productData)
      setSelectedProduct(newProduct)
      return newProduct
    } catch (error) {
      console.error('Failed to create product:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [productService])

  // Update product
  const updateProduct = useCallback(async (productId: string, updates: Partial<Product>) => {
    setLoading(true)
    
    try {
      const updatedProduct = await productService.update(productId, updates)
      setSelectedProduct(updatedProduct)
      return updatedProduct
    } catch (error) {
      console.error('Failed to update product:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [productService])

  // Delete product
  const deleteProduct = useCallback(async (productId: string) => {
    setLoading(true)
    
    try {
      await productService.delete(productId)
      if (selectedProduct?.id === productId) {
        setSelectedProduct(null)
      }
    } catch (error) {
      console.error('Failed to delete product:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [productService, selectedProduct])

  return {
    // State
    selectedProduct,
    loading,
    
    // Operations
    loadProduct,
    createProduct,
    updateProduct,
    deleteProduct,
    setSelectedProduct
  }
}

// ===== PRODUCT VARIANTS HOOK =====

export const useProductVariants = () => {
  const { productService } = useProductService()
  const [variants, setVariants] = useState<ProductVariant[]>([])
  const [loading, setLoading] = useState(false)

  // Load variants for product
  const loadVariants = useCallback(async (productId: string) => {
    setLoading(true)
    
    try {
      const data = await productService.getProductVariants(productId)
      setVariants(data)
      return data
    } catch (error) {
      console.error('Failed to load variants:', error)
      setVariants([])
      throw error
    } finally {
      setLoading(false)
    }
  }, [productService])

  // Create variant
  const createVariant = useCallback(async (productId: string, variantData: CreateVariantRequest) => {
    setLoading(true)
    
    try {
      const newVariant = await productService.createVariant(productId, variantData)
      setVariants(prev => [...prev, newVariant].sort((a, b) => a.sortOrder - b.sortOrder))
      return newVariant
    } catch (error) {
      console.error('Failed to create variant:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [productService])

  // Update variant
  const updateVariant = useCallback(async (variantId: string, variantData: Partial<ProductVariant>) => {
    setLoading(true)
    
    try {
      const updatedVariant = await productService.updateVariant(variantId, variantData)
      setVariants(prev => prev.map(v => v.id === variantId ? updatedVariant : v))
      return updatedVariant
    } catch (error) {
      console.error('Failed to update variant:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [productService])

  // Delete variant
  const deleteVariant = useCallback(async (variantId: string) => {
    setLoading(true)
    
    try {
      await productService.deleteVariant(variantId)
      setVariants(prev => prev.filter(v => v.id !== variantId))
    } catch (error) {
      console.error('Failed to delete variant:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [productService])

  return {
    // State
    variants,
    loading,
    
    // Operations
    loadVariants,
    createVariant,
    updateVariant,
    deleteVariant
  }
}

// ===== PRODUCT CATEGORIES HOOK =====

export const useProductCategories = () => {
  const { productService } = useProductService()
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [hierarchy, setHierarchy] = useState<ProductCategory[]>([])
  const [loading, setLoading] = useState(false)

  // Load categories
  const loadCategories = useCallback(async () => {
    setLoading(true)
    
    try {
      const [categoriesData, hierarchyData] = await Promise.all([
        productService.getCategories(),
        productService.getCategoryHierarchy()
      ])
      
      setCategories(categoriesData)
      setHierarchy(hierarchyData)
    } catch (error) {
      console.error('Failed to load categories:', error)
      setCategories([])
      setHierarchy([])
    } finally {
      setLoading(false)
    }
  }, [productService])

  // Create category
  const createCategory = useCallback(async (categoryData: Omit<ProductCategory, 'id' | 'createdAt' | 'updatedAt'>) => {
    setLoading(true)
    
    try {
      const newCategory = await productService.createCategory(categoryData)
      setCategories(prev => [...prev, newCategory])
      // Reload hierarchy to reflect changes
      await loadCategories()
      return newCategory
    } catch (error) {
      console.error('Failed to create category:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [productService, loadCategories])

  // Initial load
  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  return {
    // State
    categories,
    hierarchy,
    loading,
    
    // Operations
    loadCategories,
    createCategory
  }
}

// ===== PRODUCT ANALYTICS HOOK =====

export const useProductAnalytics = () => {
  const { productService } = useProductService()
  const [analytics, setAnalytics] = useState<ProductAnalytics | null>(null)
  const [loading, setLoading] = useState(false)

  // Load analytics
  const loadAnalytics = useCallback(async (dateFrom: Date, dateTo: Date) => {
    setLoading(true)
    
    try {
      const data = await productService.getProductAnalytics(dateFrom, dateTo)
      setAnalytics(data)
      return data
    } catch (error) {
      console.error('Failed to load product analytics:', error)
      setAnalytics(null)
      throw error
    } finally {
      setLoading(false)
    }
  }, [productService])

  // Get daily summary
  const getDailySummary = useCallback(async (date: Date = new Date()) => {
    try {
      return await productService.getDailySummary(date)
    } catch (error) {
      console.error('Failed to get daily summary:', error)
      throw error
    }
  }, [productService])

  return {
    // State
    analytics,
    loading,
    
    // Operations
    loadAnalytics,
    getDailySummary
  }
}
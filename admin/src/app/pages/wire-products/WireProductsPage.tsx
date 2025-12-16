import React, { useState, useEffect } from 'react';
import { PhotoIcon, PencilIcon, TrashIcon, ArrowUpIcon } from '@shared/assets/icons';

interface WireProduct {
  id: string;
  productCode: string;
  productName: string | null;
  description: string | null;
  imageUrl: string | null;
  source: string | null;
  externalUrl: string | null;
  timesUsed: number;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function WireProductsPage() {
  const [products, setProducts] = useState<WireProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [editingProduct, setEditingProduct] = useState<WireProduct | null>(null);
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
  }, [searchQuery, sourceFilter]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (sourceFilter) params.append('source', sourceFilter);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/wire-products?${params.toString()}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (!response.ok) throw new Error('Failed to load wire products');

      const data = await response.json();
      setProducts(data.products || []);
    } catch (error) {
      console.error('Error loading wire products:', error);
      alert('Failed to load wire products');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (productCode: string, file: File) => {
    try {
      setUploadingImage(productCode);
      const token = localStorage.getItem('token');

      const formData = new FormData();
      formData.append('image', file);
      formData.append('productCode', productCode);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/wire-products/upload-image`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        }
      );

      if (!response.ok) throw new Error('Failed to upload image');

      const data = await response.json();
      alert('Image uploaded successfully!');
      await loadProducts();
    } catch (error: any) {
      console.error('Error uploading image:', error);
      alert(`Failed to upload image: ${error.message}`);
    } finally {
      setUploadingImage(null);
    }
  };

  const handleUpdateProduct = async (product: WireProduct) => {
    try {
      const token = localStorage.getItem('token');

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/wire-products/${product.productCode}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            productName: product.productName,
            description: product.description,
            source: product.source,
            externalUrl: product.externalUrl
          })
        }
      );

      if (!response.ok) throw new Error('Failed to update product');

      alert('Product updated successfully!');
      setEditingProduct(null);
      await loadProducts();
    } catch (error: any) {
      console.error('Error updating product:', error);
      alert(`Failed to update product: ${error.message}`);
    }
  };

  const sourceBadgeColor = (source: string | null) => {
    switch (source?.toUpperCase()) {
      case 'FTD':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'TELEFLORA':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'PETALS.CA':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  return (
    <div className="p-6 max-w-full overflow-x-hidden">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-black dark:text-white">Wire Product Library</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Product codes and images for FTD, Teleflora, and other wire services
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by product code, name, or description..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Source
            </label>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All sources</option>
              <option value="FTD">FTD</option>
              <option value="Teleflora">Teleflora</option>
              <option value="Petals.ca">Petals.ca</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Products</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{products.length}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">With Images</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {products.filter(p => p.imageUrl).length}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">Missing Images</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {products.filter(p => !p.imageUrl).length}
          </div>
        </div>
      </div>

      {/* Products List */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#597485]"></div>
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <div className="text-gray-500 dark:text-gray-400">
            No wire products found. Products will be added automatically when FTD orders are imported.
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow"
            >
              {/* Image Section */}
              <div className="relative h-48 bg-gray-100 dark:bg-gray-700 rounded-t-lg overflow-hidden">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.productCode}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <PhotoIcon className="w-12 h-12 mb-2" />
                    <span className="text-sm">No image</span>
                  </div>
                )}

                {/* Upload Image Button */}
                <label className="absolute bottom-2 right-2 cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(product.productCode, file);
                    }}
                    className="hidden"
                    disabled={uploadingImage === product.productCode}
                  />
                  <div className="flex items-center gap-1 px-3 py-1.5 bg-[#597485] hover:bg-[#4e6575] text-white rounded text-sm transition-colors">
                    {uploadingImage === product.productCode ? (
                      'Uploading...'
                    ) : (
                      <>
                        <ArrowUpIcon className="w-3 h-3" />
                        {product.imageUrl ? 'Change' : 'Upload'}
                      </>
                    )}
                  </div>
                </label>
              </div>

              {/* Product Info */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-mono font-bold text-lg text-gray-900 dark:text-white">
                      {product.productCode}
                    </div>
                    {product.source && (
                      <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${sourceBadgeColor(product.source)} mt-1`}>
                        {product.source}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setEditingProduct(product)}
                    className="p-1.5 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                </div>

                {product.productName && (
                  <div className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">
                    {product.productName}
                  </div>
                )}

                {product.description && (
                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                    {product.description}
                  </div>
                )}

                {product.externalUrl && (
                  <a
                    href={`http://${product.externalUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline mb-2 block"
                  >
                    {product.externalUrl}
                  </a>
                )}

                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div>Used: {product.timesUsed}x</div>
                  {product.lastUsedAt && (
                    <div>Last: {new Date(product.lastUsedAt).toLocaleDateString()}</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Edit Product: {editingProduct.productCode}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Product Name
                  </label>
                  <input
                    type="text"
                    value={editingProduct.productName || ''}
                    onChange={(e) => setEditingProduct({...editingProduct, productName: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={editingProduct.description || ''}
                    onChange={(e) => setEditingProduct({...editingProduct, description: e.target.value})}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Source
                  </label>
                  <select
                    value={editingProduct.source || ''}
                    onChange={(e) => setEditingProduct({...editingProduct, source: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">None</option>
                    <option value="FTD">FTD</option>
                    <option value="Teleflora">Teleflora</option>
                    <option value="Petals.ca">Petals.ca</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    External URL
                  </label>
                  <input
                    type="text"
                    value={editingProduct.externalUrl || ''}
                    onChange={(e) => setEditingProduct({...editingProduct, externalUrl: e.target.value})}
                    placeholder="e.g., petals.ca/ch77aa-s"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => handleUpdateProduct(editingProduct)}
                  className="flex-1 px-4 py-2 bg-[#597485] hover:bg-[#4e6575] text-white rounded-lg transition-colors"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

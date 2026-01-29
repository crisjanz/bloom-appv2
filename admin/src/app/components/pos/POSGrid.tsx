// components/pos/POSGrid.tsx - Add fullscreen toggle
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProductsEnhanced } from '@shared/hooks/useProductsNew';
import { usePOSTabs } from '@shared/hooks/usePOSTabsNew';
import ProductButton from './ProductButton';
import InputField from '@shared/ui/forms/input/InputField';
import { GridIcon, SettingsIcon } from '@shared/assets/icons';

type Props = {
  onAddProduct: (product: any) => void;
  onShowCustomModal: () => void;
  onDeliveryOrder: () => void;
};

export default function POSGrid({ onAddProduct, onShowCustomModal, onDeliveryOrder }: Props) {
  const navigate = useNavigate();
  const { 
    products, 
    loading: productsLoading, 
    refetch,
    searchTerm,
    activeTab,
    updateSearchTerm,
    updateActiveTab
  } = useProductsEnhanced();
  const { tabs, defaultTab, loading: tabsLoading } = usePOSTabs();

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPWA, setIsPWA] = useState(false);

  // Set starting tab from settings
  useEffect(() => {
    if (!tabsLoading && defaultTab && !activeTab) {
      updateActiveTab(defaultTab);
    }
  }, [tabsLoading, defaultTab]);

  // Fullscreen detection
  useEffect(() => {
    // Check if running as PWA
    const isInPWA = window.matchMedia('(display-mode: standalone)').matches || 
                    (window.navigator as any).standalone === true;
    setIsPWA(isInPWA);

    // Listen for fullscreen changes
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const loading = productsLoading || tabsLoading;

  // Fullscreen functions
  const enterFullscreen = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (error) {
      console.log('Fullscreen not supported or blocked:', error);
    }
  };

  const exitFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.log('Exit fullscreen failed:', error);
    }
  };

  // Filter by active tab's productIds
  const filteredProducts = (activeTab === 'all' || activeTab === '')
    ? products
    : products.filter(p => {
        const tab = tabs.find(t => t.id === activeTab);
        return tab?.productIds.includes(p.id);
      });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-50 dark:bg-gray-900 flex flex-col">
      
      {/* Header */}
      <div className="bg-gray-50 dark:bg-gray-900 p-6 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          {/* Fullscreen Toggle - Only show in browser mode */}
          {!isPWA && (
            <button
              onClick={isFullscreen ? exitFullscreen : enterFullscreen}
              className="text-gray-600 dark:text-gray-400 hover:text-brand-500 transition-colors"
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isFullscreen ? (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              )}
            </button>
          )}
          
          {/* Settings Icon */}
          <button
            onClick={() => navigate('/settings/pos')}
            className="text-gray-600 dark:text-gray-400 hover:text-brand-500 transition-colors"
            title="POS Settings"
          >
            <SettingsIcon className="w-8 h-8" />
          </button>

          {/* Back to Dashboard */}
          <button
            onClick={() => navigate('/')}
            className="text-gray-600 dark:text-gray-400 hover:text-brand-500 transition-colors"
            title="Back to Dashboard"
          >
            <GridIcon className="w-8 h-8" />
          </button>
        </div>
        
        {/* Logo/Title with PWA indicator */}
        <div className="flex items-center gap-3">
          <div className="text-2xl font-bold text-black dark:text-white">
            Bloom POS
          </div>
          {/* PWA Status Indicator */}
          {isPWA && (
            <div className="rounded-full bg-green-600 px-3 py-1 text-white text-xs font-medium">
              PWA
            </div>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-6 pb-4 flex-shrink-0">
        <div className="max-w-md">
          <div className="relative">
            <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <InputField
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => updateSearchTerm(e.target.value)}
              className="pl-12 py-3 text-lg rounded-2xl bg-white dark:bg-boxdark border-0 shadow-sm focus:border-brand-500 focus:ring-brand-500/20"
            />
          </div>
        </div>
      </div>

      {/* Category Tabs with Add Order Button */}
      <div className="px-6 pb-6 flex-shrink-0">
        <div className="flex items-center justify-between gap-4">
          
          {/* Category Tabs */}
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 flex-1">
            {/* All Products Tab */}
            <button
              onClick={() => updateActiveTab('all')}
              className={`px-5 py-2.5 rounded-lg font-medium whitespace-nowrap transition-all duration-200 text-sm flex-shrink-0 ${
                activeTab === 'all'
                  ? 'bg-brand-500 text-white shadow-md'
                  : 'bg-white dark:bg-boxdark text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 shadow-sm'
              }`}
            >
              All Products
            </button>
            
            {/* Dynamic Tabs */}
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => updateActiveTab(tab.id)}
                className={`px-5 py-2.5 rounded-lg font-medium whitespace-nowrap transition-all duration-200 text-sm flex-shrink-0 ${
                  activeTab === tab.id
                    ? 'bg-brand-500 text-white shadow-md'
                    : 'bg-white dark:bg-boxdark text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 shadow-sm'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </div>

          {/* Add Order Button */}
          <button
            onClick={onDeliveryOrder}
            className="px-4 py-2.5 rounded-lg font-medium text-sm bg-orange-600 hover:bg-orange-700 text-white shadow-md transition-all duration-200 flex items-center gap-2 flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Order
          </button>
        </div>
      </div>

      {/* Product Grid - Fixed button sizes with dynamic spacing */}
      <div className="flex-1 px-6 overflow-y-auto pos-scrollbar">
        <div 
          className="grid pb-6"
          style={{
            gridTemplateColumns: 'repeat(auto-fit, 130px)', // 1.25" at 96 DPI
            gridTemplateRows: 'repeat(auto-fit, 168px)',     // 1.75" at 96 DPI
            gap: '24px',                                     // 1/4" minimum
            justifyContent: 'space-between'
          }}
        >
          {/* Custom Item Button - Fixed size */}
          <button
            onClick={onShowCustomModal}
            className="bg-white dark:bg-boxdark rounded-2xl shadow-md items-center hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden group transform hover:scale-105 active:scale-95 border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-brand-500"
            style={{ 
              width: '130px',   // 1.25"
              height: '168px'   // 1.75"
            }}
          >
            {/* Image area */}
            <div className="flex-1 bg-white dark:bg-boxdark flex items-center justify-center p-3 relative overflow-hidden">
              <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 group-hover:text-brand-500 group-hover:scale-110 transition-all duration-300">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
            </div>

            {/* Text area - Fixed centered */}
            <div className="bg-white dark:bg-boxdark h-14 flex flex-col justify-center items-center px-2">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 group-hover:text-brand-500 transition-colors text-center leading-tight mb-1">
                Add Custom
              </div>
              <div className="text-sm font-bold text-brand-500 text-center">
                Item
              </div>
            </div>
          </button>

          {/* Product Buttons */}
          {filteredProducts.map((product) => (
            <ProductButton
              key={product.id}
              product={product}
              onClick={() => onAddProduct(product)}
            />
          ))}
        </div>

        {/* No Products Message */}
        {filteredProducts.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
            <div className="w-20 h-20 bg-white dark:bg-boxdark rounded-2xl flex items-center justify-center mb-6 shadow-sm">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8v.01M6 5v.01" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-black dark:text-white mb-2">No products found</h3>
            <p className="text-center max-w-sm">
              {searchTerm 
                ? "Try adjusting your search or check a different category"
                : activeTab === 'all'
                  ? "Add products to see them here"
                  : "No products assigned to this category"
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
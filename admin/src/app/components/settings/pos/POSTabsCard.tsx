// components/settings/pos/POSTabsCard.tsx - Updated import
import { useState, useEffect } from 'react';
import ComponentCard from '@shared/ui/common/ComponentCard';
import InputField from '@shared/ui/forms/input/InputField';
import Label from '@shared/ui/forms/Label';
import { useProducts } from '@shared/hooks/useProductsNew';
import { usePOSTabs } from '@shared/hooks/usePOSTabsNew';
import Checkbox from '@shared/ui/forms/input/Checkbox';
import { toast } from 'sonner';

export default function POSTabsCard() {
  const [selectedTab, setSelectedTab] = useState('tab1');
  const [saving, setSaving] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [hideAssigned, setHideAssigned] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  const { products, refetch } = useProducts();
  const { tabs, defaultTab, setDefaultTab, loading, error, saveTabs, setTabs } = usePOSTabs();

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Set default selected tab when tabs load
  useEffect(() => {
    if (tabs.length > 0 && !tabs.find(tab => tab.id === selectedTab)) {
      setSelectedTab(tabs[0].id);
    }
  }, [tabs, selectedTab]);

  const handleTabNameChange = (tabId: string, newName: string) => {
    setTabs(tabs.map(tab => 
      tab.id === tabId ? { ...tab, name: newName } : tab
    ));
  };

  const handleProductToggle = (productId: string, checked: boolean) => {
    setTabs(tabs.map(tab => 
      tab.id === selectedTab 
        ? {
            ...tab,
            productIds: checked 
              ? [...tab.productIds, productId]
              : tab.productIds.filter(id => id !== productId)
          }
        : tab
    ));
  };

  const handleSave = async () => {
    setSaving(true);
    
    const result = await saveTabs(tabs, defaultTab);
    
    if (result.success) {
      toast.success('POS tab configuration saved');
    } else {
      toast.error(result.error || 'Failed to save POS tab configuration');
    }
    
    setSaving(false);
  };

  const currentTab = tabs.find(tab => tab.id === selectedTab);

  // IDs assigned to OTHER tabs (not current)
  const otherTabProductIds = new Set(
    tabs.filter(t => t.id !== selectedTab).flatMap(t => t.productIds)
  );

  // Filter products by search + hide-assigned
  const visibleProducts = products.filter(p => {
    if (searchFilter && !p.name?.toLowerCase().includes(searchFilter.toLowerCase())) return false;
    if (hideAssigned && otherTabProductIds.has(p.id) && !currentTab?.productIds.includes(p.id)) return false;
    return true;
  });

  // Group by category
  const grouped = visibleProducts.reduce<Record<string, any[]>>((acc, p) => {
    const cat = p.category?.name || 'Uncategorized';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});
  const sortedCategories = Object.keys(grouped).sort();

  const toggleCategory = (cat: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  if (loading) {
    return (
      <ComponentCard title="POS Tab Configuration">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
        </div>
      </ComponentCard>
    );
  }

  if (error) {
    return (
      <ComponentCard title="POS Tab Configuration">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">Error: {error}</p>
        </div>
      </ComponentCard>
    );
  }

  return (
    <ComponentCard title="POS Tab Configuration">
      <div className="space-y-6">
        {/* Tab Names Configuration */}
        <div>
          <h3 className="text-lg font-medium text-black dark:text-white mb-4">Tab Names</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tabs.map((tab) => (
              <div key={tab.id}>
                <Label htmlFor={`tab-${tab.id}`}>
                  {tab.id.charAt(0).toUpperCase() + tab.id.slice(1)} Name
                </Label>
                <InputField
                  type="text"
                  id={`tab-${tab.id}`}
                  value={tab.name}
                  onChange={(e) => handleTabNameChange(tab.id, e.target.value)}
                  className="focus:border-brand-500 focus:ring-brand-500/20"
                  placeholder={`Enter ${tab.id} name`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Default Starting Tab */}
        <div>
          <Label htmlFor="default-tab">Default Starting Tab</Label>
          <select
            id="default-tab"
            value={defaultTab}
            onChange={(e) => setDefaultTab(e.target.value)}
            className="mt-1 block w-full sm:w-64 rounded-lg border border-stroke dark:border-strokedark bg-white dark:bg-boxdark px-4 py-2.5 text-sm text-black dark:text-white focus:border-brand-500 focus:ring-brand-500/20"
          >
            <option value="all">All Products</option>
            {tabs.map((tab) => (
              <option key={tab.id} value={tab.id}>{tab.name}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">POS will open to this tab by default</p>
        </div>

        {/* Product Assignment */}
        <div>
          <h3 className="text-lg font-medium text-black dark:text-white mb-4">Assign Products to Tabs</h3>
          
          {/* Tab Selector */}
          <div className="flex space-x-2 mb-4 border-b border-stroke dark:border-strokedark">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={`px-4 py-2 font-medium transition-colors ${
                  selectedTab === tab.id
                    ? 'text-brand-500 border-b-2 border-brand-500'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </div>

          {/* Search & Filter Controls */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1">
              <InputField
                type="text"
                placeholder="Search products..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap cursor-pointer">
              <Checkbox
                checked={hideAssigned}
                onChange={(checked) => setHideAssigned(checked)}
              />
              Hide assigned to other tabs
            </label>
          </div>

          {/* Product List - Grouped by Category */}
          <div className="max-h-96 overflow-y-auto border border-stroke dark:border-strokedark rounded-lg">
            {visibleProducts.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <p>No products found</p>
                <p className="text-sm">
                  {searchFilter ? 'Try a different search term' : 'Add products first to assign them to tabs'}
                </p>
              </div>
            ) : (
              <div>
                {sortedCategories.map((cat) => (
                  <div key={cat}>
                    {/* Category Header */}
                    <button
                      onClick={() => toggleCategory(cat)}
                      className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-b border-stroke dark:border-strokedark text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <span>{cat} ({grouped[cat].length})</span>
                      <svg
                        className={`w-4 h-4 transition-transform ${collapsedCategories.has(cat) ? '' : 'rotate-180'}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {/* Products in Category */}
                    {!collapsedCategories.has(cat) && (
                      <div className="divide-y divide-stroke dark:divide-strokedark">
                        {grouped[cat].map((product: any) => {
                          const isAssignedElsewhere = otherTabProductIds.has(product.id);
                          return (
                            <div key={product.id} className="px-4 py-3 flex items-center space-x-3">
                              <Checkbox
                                checked={currentTab?.productIds.includes(product.id) || false}
                                onChange={(checked) => handleProductToggle(product.id, checked)}
                              />
                              <div className="flex-1">
                                <h4 className="font-medium text-black dark:text-white text-sm">{product.name}</h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  ${product.price.toFixed(2)}
                                  {isAssignedElsewhere && (
                                    <span className="ml-2 text-amber-500">
                                      (in: {tabs.filter(t => t.id !== selectedTab && t.productIds.includes(product.id)).map(t => t.name).join(', ')})
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {currentTab && (
            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">{currentTab.name}</span> has{' '}
                <span className="font-medium text-brand-500">
                  {currentTab.productIds.length}
                </span>{' '}
                product{currentTab.productIds.length !== 1 ? 's' : ''} assigned
              </p>
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="border-t border-stroke dark:border-strokedark pt-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            {saving ? 'Saving...' : 'Save Tab Configuration'}
          </button>
        </div>
      </div>
    </ComponentCard>
  );
}

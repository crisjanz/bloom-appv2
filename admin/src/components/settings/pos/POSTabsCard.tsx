// components/settings/pos/POSTabsCard.tsx - Updated import
import React, { useState, useEffect } from 'react';
import ComponentCard from '../../common/ComponentCard';
import InputField from '../../form/input/InputField';
import Label from '../../form/Label';
import { useProducts } from '../../../hooks/useProducts';
import { usePOSTabs } from '../../../hooks/usePOSTabs'; // No service import needed
import Checkbox from '../../form/input/Checkbox';

export default function POSTabsCard() {
  const [selectedTab, setSelectedTab] = useState('tab1');
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  const { products, fetchProducts } = useProducts();
  const { tabs, loading, error, saveTabs, setTabs } = usePOSTabs();

  useEffect(() => {
    refetch();
  }, []);

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
    setSuccessMessage('');
    
    const result = await saveTabs(tabs);
    
    if (result.success) {
      setSuccessMessage('POS tab configuration saved successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
    
    setSaving(false);
  };

  const currentTab = tabs.find(tab => tab.id === selectedTab);

  if (loading) {
    return (
      <ComponentCard title="POS Tab Configuration">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#597485]"></div>
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
        
        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <p className="text-green-800 dark:text-green-200">{successMessage}</p>
          </div>
        )}
        
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
                  className="focus:border-[#597485] focus:ring-[#597485]/20"
                  placeholder={`Enter ${tab.id} name`}
                />
              </div>
            ))}
          </div>
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
                    ? 'text-[#597485] border-b-2 border-[#597485]'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </div>

          {/* Product List */}
          <div className="max-h-96 overflow-y-auto border border-stroke dark:border-strokedark rounded-lg">
            {products.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <p>No products available</p>
                <p className="text-sm">Add products first to assign them to tabs</p>
              </div>
            ) : (
              <div className="divide-y divide-stroke dark:divide-strokedark">
                {products.map((product) => (
                  <div key={product.id} className="p-4 flex items-center space-x-3">
                    <Checkbox
                      checked={currentTab?.productIds.includes(product.id) || false}
                      onChange={(checked) => handleProductToggle(product.id, checked)}
                      className="checked:bg-[#597485] checked:border-[#597485]"
                    />
                    <div className="flex-1">
                      <h4 className="font-medium text-black dark:text-white">{product.name}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        ${product.price.toFixed(2)} • {product.category || 'No category'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {currentTab && (
            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">{currentTab.name}</span> has{' '}
                <span className="font-medium text-[#597485]">
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
            className="bg-[#597485] hover:bg-[#4e6575] disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            {saving ? 'Saving...' : 'Save Tab Configuration'}
          </button>
        </div>
      </div>
    </ComponentCard>
  );
}
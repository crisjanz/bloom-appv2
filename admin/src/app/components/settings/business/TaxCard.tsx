import { useState, useEffect } from "react";
import ComponentCardCollapsible from "@shared/ui/common/ComponentCardCollapsible";
import InputField from "@shared/ui/forms/input/InputField";
import Label from "@shared/ui/forms/Label";
import Select from "@shared/ui/forms/Select";
import Button from "@shared/ui/components/ui/button/Button";
import { TrashBinIcon, PencilIcon } from "@shared/assets/icons";

interface TaxRate {
  id?: string;
  name: string;
  rate: number; // Percentage (e.g., 5.00 for 5%)
  isActive: boolean;
  sortOrder: number;
  description?: string;
}

const TaxCard = () => {
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingTax, setEditingTax] = useState<TaxRate | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<TaxRate>({
    name: "",
    rate: 0,
    isActive: true,
    sortOrder: 1,
    description: ""
  });

  const statusOptions = [
    { value: "true", label: "Active" },
    { value: "false", label: "Inactive" },
  ];

  useEffect(() => {
    loadTaxRates();
  }, []);

  const loadTaxRates = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/settings/tax-rates');
      if (response.ok) {
        const data = await response.json();
        setTaxRates(data.taxRates || []);
      }
    } catch (error) {
      console.error('Failed to load tax rates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof TaxRate, value: string | boolean | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // Ensure rate is a number and sort order is set
      const submitData = {
        ...formData,
        rate: parseFloat(formData.rate.toString()),
        isActive: formData.isActive === true || formData.isActive === 'true',
        sortOrder: editingTax ? formData.sortOrder : Math.max(...taxRates.map(t => t.sortOrder), 0) + 1
      };

      const method = editingTax ? 'PUT' : 'POST';
      const url = editingTax 
        ? `/api/settings/tax-rates/${editingTax.id}`
        : '/api/settings/tax-rates';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        await loadTaxRates();
        resetForm();
      } else {
        console.error('Failed to save tax rate');
      }
    } catch (error) {
      console.error('Error saving tax rate:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (taxRate: TaxRate) => {
    setEditingTax(taxRate);
    setFormData({
      ...taxRate,
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tax rate? This will affect all calculations using this tax.')) return;

    try {
      const response = await fetch(`/api/settings/tax-rates/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadTaxRates();
      }
    } catch (error) {
      console.error('Error deleting tax rate:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      rate: 0,
      isActive: true,
      sortOrder: Math.max(...taxRates.map(t => t.sortOrder), 0) + 1,
      description: ""
    });
    setEditingTax(null);
  };

  const calculateTotalTaxRate = () => {
    return taxRates
      .filter(tax => tax.isActive)
      .reduce((total, tax) => total + tax.rate, 0);
  };

  if (isLoading) {
    return (
      <ComponentCardCollapsible title="Tax Rates" desc="Configure tax rates for all calculations">
        <div className="animate-pulse">Loading tax rates...</div>
      </ComponentCardCollapsible>
    );
  }

  return (
    <ComponentCardCollapsible 
      title="Tax Rates" 
      desc="Configure tax rates used throughout the system"
      defaultOpen={false}
    >
      {/* Total Tax Rate Display */}
      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
            Total Active Tax Rate:
          </span>
          <span className="text-lg font-bold text-blue-900 dark:text-blue-100">
            {calculateTotalTaxRate().toFixed(2)}%
          </span>
        </div>
      </div>

      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* LEFT COLUMN - Tax Rates List */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-5 h-5 rounded bg-primary flex items-center justify-center">
              <span className="text-white text-xs font-bold">%</span>
            </div>
            <h3 className="text-lg font-medium text-gray-800 dark:text-white">
              Current Tax Rates
            </h3>
          </div>

          {taxRates.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {taxRates
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((tax) => (
                <div
                  key={tax.id}
                  className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="font-medium text-black dark:text-white">
                        {tax.name}
                      </div>
                      <div className={`px-2 py-1 rounded text-xs font-medium ${
                        tax.isActive 
                          ? 'bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-200'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200'
                      }`}>
                        {tax.isActive ? 'Active' : 'Inactive'}
                      </div>
                    </div>
                    <div className="text-lg font-semibold text-primary">
                      {tax.rate.toFixed(2)}%
                    </div>
                    {tax.description && (
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {tax.description}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={() => handleEdit(tax)}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      title="Edit"
                    >
                      <PencilIcon className="w-4 h-4 text-gray-500" />
                    </button>
                    <button
                      onClick={() => handleDelete(tax.id!)}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      title="Delete"
                    >
                      <TrashBinIcon className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="w-12 h-12 mx-auto mb-2 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <span className="text-gray-400 text-xl font-bold">%</span>
              </div>
              <p>No tax rates configured yet.</p>
              <p className="text-sm">Use the form to add your first tax rate.</p>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN - Add/Edit Form */}
        <div>
          <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4">
            {editingTax ? 'Edit Tax Rate' : 'Add New Tax Rate'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Tax Name */}
            <div>
              <Label htmlFor="name">Tax Name</Label>
              <InputField
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g. GST, PST, VAT, Sales Tax"
                required
              />
            </div>

            {/* Tax Rate */}
            <div>
              <Label htmlFor="rate">Tax Rate (%)</Label>
              <InputField
                type="number"
                id="rate"
                step="0.01"
                min="0"
                max="100"
                value={formData.rate}
                onChange={(e) => handleInputChange('rate', parseFloat(e.target.value) || 0)}
                placeholder="e.g. 5.00, 7.00, 13.00"
                required
              />
            </div>

            {/* Status */}
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                options={statusOptions}
                placeholder="Select Status"
                value={formData.isActive.toString()}
                onChange={(value) => handleInputChange('isActive', value === 'true')}
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <InputField
                type="text"
                id="description"
                value={formData.description || ""}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="e.g. Provincial Sales Tax, Goods and Services Tax"
              />
            </div>

            {/* Form Actions */}
            <div className="flex flex-col gap-2">
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-primary hover:bg-primary/90 text-white px-4 py-2 w-full"
              >
                {isSaving ? 'Saving...' : editingTax ? 'Update Tax Rate' : 'Add Tax Rate'}
              </Button>
              {editingTax && (
                <Button
                  type="button"
                  onClick={resetForm}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 w-full"
                >
                  Cancel Edit
                </Button>
              )}
            </div>
          </form>
        </div>
      </div>
    </ComponentCardCollapsible>
  );
};

export default TaxCard;
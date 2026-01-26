import { FC, useEffect, useMemo, useState } from 'react';
import InputField from '@shared/ui/forms/input/InputField';
import SelectField from '@shared/ui/forms/Select';
import ToggleSwitch from '@shared/ui/forms/switch/Switch';
import ComponentCard from '@shared/ui/common/ComponentCard';
import MultiSelect from '@shared/ui/forms/MultiSelect';
import { useApiClient } from '@shared/hooks/useApiClient';

type Category = {
  id: string;
  name: string;
  depth?: number;
  fullName?: string;
};

type Props = {
  visibility: string;
  categoryId: string;
  additionalCategoryIds: string[];
  reportingCategoryId: string;
  isTaxable: boolean;
  isActive: boolean;
  isFeatured: boolean;
  productType: string;
  inventory: number;
  slug: string;
  title: string;
  onChange: (field: string, value: string | boolean | number) => void;
  onAdditionalCategoriesChange: (categoryIds: string[]) => void;
  onSave: () => void;
};

const SettingsCard: FC<Props> = ({
  visibility,
  categoryId,
  additionalCategoryIds,
  reportingCategoryId,
  isTaxable,
  isActive,
  isFeatured,
  productType,
  inventory,
  slug,
  onChange,
  onAdditionalCategoriesChange,
  onSave,
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [reportingCategories, setReportingCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const apiClient = useApiClient();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catResponse, repCatResponse] = await Promise.all([
          apiClient.get('/api/categories'),
          apiClient.get('/api/reportingcategories'),
        ]);

        if (catResponse.status >= 400) {
          throw new Error(catResponse.data?.error || 'Failed to fetch categories');
        }

        if (repCatResponse.status >= 400) {
          throw new Error(
            repCatResponse.data?.error || 'Failed to fetch reporting categories'
          );
        }

        const catData = catResponse.data;
        const repCatData = repCatResponse.data;

        setCategories(Array.isArray(catData) ? catData : catData.categories || []);
        setReportingCategories(
          Array.isArray(repCatData)
            ? repCatData
            : repCatData.categories || repCatData.reportingCategories || [],
        );
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [apiClient]);

  const additionalCategoryOptions = useMemo(
    () =>
      categories
        .filter((cat) => cat.id !== categoryId)
        .map((cat) => ({
          value: cat.id,
          text: `${cat.depth ? '-- '.repeat(cat.depth) : ''}${cat.name}`,
        })),
    [categories, categoryId]
  );

  const handleChange = (field: string, value: string | boolean | number) => {
    console.log(`SettingsCard: Updating ${field} to`, value, `type: ${typeof value}`);
    onChange(field, value);
  };

  return (
    <ComponentCard title="Settings">
      <div className="mb-6">
        <button
          onClick={onSave}
          className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white rounded-lg bg-brand-500 hover:bg-brand-600 w-full"
        >
          Save Product
        </button>
      </div>

      <div className="mb-5.5">
        <ToggleSwitch
          label="Add-on Product"
          name="productType"
          checked={productType === 'ADDON'}
          onChange={(value: boolean) =>
            handleChange('productType', value ? 'ADDON' : 'MAIN')
          }
        />
      </div>

      <div className="mb-5.5">
        <SelectField
          label="Visibility"
          name="visibility"
          value={visibility}
          onChange={(value) => handleChange('visibility', value)}
          placeholder="Select visibility"
          options={[
            { label: 'Online', value: 'ONLINE' },
            { label: 'POS', value: 'POS' },
            { label: 'Both', value: 'BOTH' },
          ]}
        />
      </div>

      <div className="mb-5.5">
        <SelectField
          label="Category"
          name="categoryId"
          value={categoryId}
          onChange={(value) => handleChange('categoryId', value)}
          placeholder={isLoading ? 'Loading...' : 'Select a category'}
          options={categories.map((cat) => ({
            label: cat.name, // Use just the name since indentation is handled separately
            value: cat.id,
            depth: cat.depth || 0, // Add depth for indentation
          }))}
          disabled={isLoading}
        />
      </div>

      <div className="mb-5.5">
        <MultiSelect
          key={`additional-categories-${categoryId}-${additionalCategoryIds.join('-')}`}
          label="Additional Categories"
          options={additionalCategoryOptions}
          defaultSelected={additionalCategoryIds}
          onChange={onAdditionalCategoriesChange}
          disabled={isLoading}
        />
      </div>

      <div className="mb-5.5">
        <SelectField
          label="Reporting Category"
          name="reportingCategoryId"
          value={reportingCategoryId}
          onChange={(value) => handleChange('reportingCategoryId', value)}
          placeholder={isLoading ? 'Loading...' : 'Select a reporting category'}
          options={reportingCategories.map((cat) => ({
            label: cat.name,
            value: cat.id,
          }))}
          disabled={isLoading}
        />
      </div>

      <div className="mb-5.5">
        <ToggleSwitch
          label="Taxable"
          name="isTaxable"
          checked={isTaxable}
          onChange={(value: boolean) => handleChange('isTaxable', value)}
        />
      </div>

      <div className="mb-5.5">
       <ToggleSwitch
  label="Active"
  name="isActive"
  checked={isActive}
  onChange={(value: boolean) => handleChange('isActive', value)}
/>
      </div>

      <div className="mb-5.5">
        <ToggleSwitch
          label="Show on Front Page"
          name="isFeatured"
          checked={isFeatured}
          onChange={(value: boolean) => handleChange('isFeatured', value)}
        />
      </div>

      <div className="mb-5.5">
        <InputField
          label="Slug"
          name="slug"
          value={slug}
          onChange={(e) => handleChange('slug', e.target.value)}
          placeholder="e.g. bright-and-bold"
        />
      </div>
    </ComponentCard>
  );
};

export default SettingsCard;

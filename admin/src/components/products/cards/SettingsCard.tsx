// src/components/products/cards/SettingsCard.tsx
import { FC } from 'react';
import InputField from '../../form/input/InputField';
import SelectField from '../../form/Select';
import ToggleSwitch from '../../form/switch/Switch';
import ComponentCard from '../../common/ComponentCard';

type Props = {
  status: string;
  visibility: string;
  categoryId: string;
  reportingCategoryId: string;
  isTaxable: boolean;
  isActive: boolean;
  isFeatured: boolean;
  inventory: number;
  slug: string;
  onChange: (field: string, value: any) => void;
  onSave: () => void;
};
const SettingsCard: FC<Props> = ({
  status,
  visibility,
  categoryId,
  reportingCategoryId,
  isTaxable,
  isActive,
  isFeatured,
  inventory,
  slug,
  onChange,
  onSave,
}) => {
  return (
    <ComponentCard title="Settings">
      <div className="mb-6">
        <button
          onClick={onSave}
          className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white rounded-lg bg-[#597485] hover:bg-[#4e6575] w-full"
        >
          Save Product
        </button>
      </div>

      <div className="mb-5.5">
        <SelectField
          label="Status"
          name="status"
          value={status}
          onChange={(e) => onChange('status', e.target.value)}
          options={[
            { label: 'Active', value: 'ACTIVE' },
            { label: 'Inactive', value: 'INACTIVE' },
          ]}
        />
      </div>

      <div className="mb-5.5">
        <SelectField
          label="Visibility"
          name="visibility"
          value={visibility}
          onChange={(e) => onChange('visibility', e.target.value)}
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
          onChange={(e) => onChange('categoryId', e.target.value)}
          options={[
            { label: 'Select a category', value: '' },
            // Load dynamically later
          ]}
        />
      </div>

      <div className="mb-5.5">
        <SelectField
          label="Reporting Category"
          name="reportingCategoryId"
          value={reportingCategoryId}
          onChange={(e) => onChange('reportingCategoryId', e.target.value)}
          options={[
            { label: 'Select a reporting category', value: '' },
            // Load dynamically later
          ]}
        />
      </div>

      <div className="mb-5.5">
        <ToggleSwitch
          label="Taxable"
          name="isTaxable"
          checked={isTaxable}
          onChange={(value) => onChange('isTaxable', value)}
        />
      </div>

      <div className="mb-5.5">
        <ToggleSwitch
          label="Active"
          name="isActive"
          checked={isActive}
          onChange={(value) => onChange('isActive', value)}
        />
      </div>

      <div className="mb-5.5">
        <ToggleSwitch
          label="Show on Front Page"
          name="isFeatured"
          checked={isFeatured}
          onChange={(value) => onChange('isFeatured', value)}
        />
      </div>

      <div className="mb-5.5">
        <InputField
          label="Slug"
          name="slug"
          value={slug}
          onChange={(e) => onChange('slug', e.target.value)}
          placeholder="e.g. bright-and-bold"
        />
      </div>
    </ComponentCard>
  );
};

export default SettingsCard;
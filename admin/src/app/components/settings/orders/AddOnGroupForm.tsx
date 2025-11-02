import { useEffect, useMemo, useState } from "react";
import InputField from "@shared/ui/forms/input/InputField";
import Label from "@shared/ui/forms/Label";
import Switch from "@shared/ui/forms/switch/Switch";
import Button from "@shared/ui/components/ui/button/Button";
import MultiSelect from "@shared/ui/forms/MultiSelect";
import type {
  AddOnGroupOptions,
  CreateAddOnGroupPayload,
  UpdateAddOnGroupPayload,
} from "@shared/hooks/useAddOnGroups";

type FormValues = CreateAddOnGroupPayload;

type AddOnGroupFormProps = {
  initialValues?: FormValues;
  options: AddOnGroupOptions;
  submitting: boolean;
  error?: string | null;
  mode: "create" | "edit";
  onCancel: () => void;
  onSubmit: (values: FormValues) => Promise<void>;
};

const emptyValues: FormValues = {
  name: "",
  isDefault: false,
  productIds: [],
  addonProductIds: [],
};

const formatOptionLabel = (
  name: string,
  price: number | null,
  isActive: boolean,
) => {
  const parts = [name];
  if (typeof price === "number") {
    parts.push(`$${price.toFixed(2)}`);
  }
  if (!isActive) {
    parts.push("inactive");
  }
  return parts.join(" • ");
};

const AddOnGroupForm = ({
  initialValues,
  options,
  submitting,
  error,
  mode,
  onCancel,
  onSubmit,
}: AddOnGroupFormProps) => {
  const [name, setName] = useState(initialValues?.name ?? emptyValues.name);
  const [isDefault, setIsDefault] = useState<boolean>(
    initialValues?.isDefault ?? emptyValues.isDefault,
  );
  const [productIds, setProductIds] = useState<string[]>(
    initialValues?.productIds ?? emptyValues.productIds,
  );
  const [addonProductIds, setAddonProductIds] = useState<string[]>(
    initialValues?.addonProductIds ?? emptyValues.addonProductIds,
  );

  useEffect(() => {
    setName(initialValues?.name ?? emptyValues.name);
    setIsDefault(initialValues?.isDefault ?? emptyValues.isDefault);
    setProductIds(initialValues?.productIds ?? emptyValues.productIds);
    setAddonProductIds(initialValues?.addonProductIds ?? emptyValues.addonProductIds);
  }, [
    initialValues?.name,
    initialValues?.isDefault,
    JSON.stringify(initialValues?.productIds ?? []),
    JSON.stringify(initialValues?.addonProductIds ?? []),
  ]);

  const mainProductOptions = useMemo(
    () =>
      options.mainProducts.map((product) => ({
        value: product.id,
        text: formatOptionLabel(product.name, product.price, product.isActive),
      })),
    [options.mainProducts],
  );

  const addonOptions = useMemo(
    () =>
      options.addonProducts.map((product) => ({
        value: product.id,
        text: formatOptionLabel(product.name, product.price, product.isActive),
      })),
    [options.addonProducts],
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      return;
    }

    await onSubmit({
      name: name.trim(),
      isDefault,
      productIds,
      addonProductIds,
    });
  };

  const multiSelectKeyBase = mode === "edit" ? initialValues?.name ?? "edit" : "create";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="addon-group-name">Group name</Label>
        <InputField
          id="addon-group-name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g., Deluxe Extras"
        />
      </div>

      <div className="flex items-center gap-3">
        <Switch
          id="addon-group-default"
          label="Make this group available to all main products by default"
          checked={isDefault}
          onChange={setIsDefault}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <MultiSelect
          key={`main-${multiSelectKeyBase}`}
          label="Assign to products"
          options={mainProductOptions}
          defaultSelected={productIds}
          onChange={setProductIds}
        />
        <MultiSelect
          key={`addons-${multiSelectKeyBase}`}
          label="Add-on products"
          options={addonOptions}
          defaultSelected={addonProductIds}
          onChange={setAddonProductIds}
        />
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-900/20 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <Button type="button" className="bg-gray-200 text-gray-700" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button
          type="submit"
          className="bg-primary text-white"
          disabled={submitting || !name.trim()}
        >
          {submitting ? "Saving…" : mode === "edit" ? "Update Group" : "Create Group"}
        </Button>
      </div>
    </form>
  );
};

export default AddOnGroupForm;

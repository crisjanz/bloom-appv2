import { useEffect, useRef, useState } from 'react';
import ProductInfoCard from './cards/ProductInfoCard';
import PricingCard from './cards/PricingCard';
import RecipeCard from './cards/RecipeCard';
import AvailabilityCard from './cards/AvailabilityCard';
import SettingsCard from './cards/SettingsCard';
import SeoCard from './cards/SeoCard';
import ComponentCard from '@shared/ui/common/ComponentCard';
import MultiSelect from '@shared/ui/forms/MultiSelect';
import { useApiClient } from '@shared/hooks/useApiClient';
import { Modal } from '@shared/ui/components/ui/modal';
import { centsToDollars, dollarsToCents } from '@shared/utils/currency';

const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

type OptionValue = {
  label: string;
  priceAdjustment: number; // in dollars
};

type OptionGroup = {
  id: string;
  name: string;
  values: OptionValue[];
  impactsVariants: boolean;
  optionType?: string; // 'PRICING_TIER' for pricing group, null for customization
};

type Variant = {
  id: string;
  name: string;
  sku: string;
  priceDifference: number; // in cents
  stockLevel: number;
  trackInventory: boolean;
  isManuallyEdited?: boolean;
  featuredImageUrl?: string | null;
};

type PricingTier = {
  id: string;
  title: string;
  price: number; // in dollars
  inventory: number;
  featuredImageUrl?: string;
};

type AddOnGroupSummary = {
  id: string;
  name: string;
  productCount: number;
  addOnCount: number;
};

interface ProductFormProps {
  initialData?: any;
  onSubmit: (data: any) => Promise<void>;
}

const ProductForm = ({ initialData, onSubmit }: ProductFormProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('ONLINE');
  const [categoryId, setCategoryId] = useState('');
  const [additionalCategoryIds, setAdditionalCategoryIds] = useState<string[]>([]);
  const [reportingCategoryId, setReportingCategoryId] = useState('');
  const [price, setPrice] = useState(0);
  const [priceTitle, setPriceTitle] = useState('');
  const [pricingGroupId, setPricingGroupId] = useState<string>(() => generateUUID());
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([
    { id: generateUUID(), title: 'Standard', price: 0, inventory: 0, featuredImageUrl: undefined },
    { id: generateUUID(), title: 'Deluxe', price: 0, inventory: 0, featuredImageUrl: undefined },
    { id: generateUUID(), title: 'Premium', price: 0, inventory: 0, featuredImageUrl: undefined },
  ]);
  const [isTaxable, setIsTaxable] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [productType, setProductType] = useState<string>('MAIN');
  const [inventory, setInventory] = useState(0);
  const [optionGroups, setOptionGroups] = useState<OptionGroup[]>(() => [
    {
      id: pricingGroupId,
      name: 'Pricing Options',
      values: [
        { label: 'Standard', priceAdjustment: 0 },
        { label: 'Deluxe', priceAdjustment: 0 },
        { label: 'Premium', priceAdjustment: 0 },
      ],
      impactsVariants: true,
      optionType: 'PRICING_TIER',
    },
  ]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [recipe, setRecipe] = useState('');
  const [availableFrom, setAvailableFrom] = useState('');
  const [availableTo, setAvailableTo] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [slug, setSlug] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [availabilityType, setAvailabilityType] = useState('always');
  const [holidayPreset, setHolidayPreset] = useState('');
  const [isTemporarilyUnavailable, setIsTemporarilyUnavailable] = useState(false);
  const [unavailableUntil, setUnavailableUntil] = useState('');
  const [unavailableMessage, setUnavailableMessage] = useState('');
  const [notAvailableFrom, setNotAvailableFrom] = useState('');
  const [notAvailableUntil, setNotAvailableUntil] = useState('');
  const [availableAddOnGroups, setAvailableAddOnGroups] = useState<AddOnGroupSummary[]>([]);
  const [loadingAddOnGroups, setLoadingAddOnGroups] = useState(false);
  const [addOnGroupsError, setAddOnGroupsError] = useState<string | null>(null);
  const [selectedAddOnGroupIds, setSelectedAddOnGroupIds] = useState<string[]>([]);
  const [addOnGroupSeed, setAddOnGroupSeed] = useState(0);

  // API client for making requests
  const apiClient = useApiClient();

  // Track if we're loading initial data to prevent variant regeneration
  const isInitialLoadRef = useRef(true);

  const productSlug = slug || title.toLowerCase().replace(/\s+/g, '-') || 'product';

  // Load initial data if provided
  useEffect(() => {
    if (initialData) {
      setTitle(initialData.name || '');
      setDescription(initialData.description || '');
      setVisibility(initialData.visibility || 'ONLINE');
      const initialCategoryId = initialData.categoryId || '';
      setCategoryId(initialCategoryId);
      const initialCategoryIds = Array.isArray(initialData.categoryIds)
        ? initialData.categoryIds
        : [];
      setAdditionalCategoryIds(
        initialCategoryIds.filter((id: string) => id && id !== initialCategoryId)
      );
      setReportingCategoryId(initialData.reportingCategoryId || '');
      setPrice(initialData.price || 0);
      setIsTaxable(Boolean(initialData.isTaxable));
      setIsActive(Boolean(initialData.isActive));
      setIsFeatured(Boolean(initialData.showOnHomepage));
      setProductType(initialData.productType || 'MAIN');
      setInventory(initialData.variants?.[0]?.stockLevel || 0);
      setRecipe(initialData.recipeNotes || '');
      setSlug(initialData.slug || '');
      setSeoTitle(initialData.seoTitle || '');
      setSeoDescription(initialData.seoDescription || '');
      
      if (initialData.images && Array.isArray(initialData.images)) {
        setExistingImages(initialData.images);
      }
      
      setAvailabilityType(initialData.availabilityType || 'always');
      setHolidayPreset(initialData.holidayPreset || '');
      setAvailableFrom(initialData.availableFrom ? initialData.availableFrom.split('T')[0] : '');
      setAvailableTo(initialData.availableTo ? initialData.availableTo.split('T')[0] : '');
      setNotAvailableFrom(initialData.notAvailableFrom ? initialData.notAvailableFrom.split('T')[0] : '');
      setNotAvailableUntil(initialData.notAvailableUntil ? initialData.notAvailableUntil.split('T')[0] : '');
      setIsTemporarilyUnavailable(initialData.isTemporarilyUnavailable || false);
      setUnavailableUntil(initialData.unavailableUntil ? initialData.unavailableUntil.split('T')[0] : '');
      setUnavailableMessage(initialData.unavailableMessage || '');
      
      const pricingOption = initialData.optionStructure?.pricingOptions?.[0];
      const derivedPricingGroupId = pricingOption?.id || generateUUID();
      const basePrice = initialData.price || 0;

      // Load pricing tiers directly from pricing option values (not from variants!)
      let loadedTiers: PricingTier[] = [];

      if (pricingOption && Array.isArray(pricingOption.values)) {
        // Reconstruct tiers from pricing option values
        loadedTiers = pricingOption.values.map((value: any) => {
          // Calculate tier price = base + adjustment
          const tierPrice = basePrice + centsToDollars(value.priceAdjustment || 0);

          // Get inventory from first variant with this tier
          let tierInventory = 0;
          let tierFeaturedImage: string | undefined;
          if (Array.isArray(initialData.variants)) {
            const variantWithThisTier = initialData.variants.find((v: any) =>
              v.optionValues?.some((ov: any) => ov.valueId === value.id)
            );
            tierInventory = variantWithThisTier?.stockLevel ?? 0;
            tierFeaturedImage = variantWithThisTier?.featuredImageUrl || undefined;
          }

          return {
            id: value.id,
            title: value.label,
            price: tierPrice,
            inventory: tierInventory,
            featuredImageUrl: tierFeaturedImage,
          };
        });
      }

      // Load exactly what exists - don't add default tiers on edit
      const combinedTiers = loadedTiers.length > 0 ? loadedTiers : [
        {
          id: generateUUID(),
          title: 'Standard',
          price: basePrice,
          inventory: 0,
          featuredImageUrl: undefined,
        }
      ];

      setPricingGroupId(derivedPricingGroupId);
      setPricingTiers(combinedTiers);

      const pricingGroup: OptionGroup = {
        id: derivedPricingGroupId,
        name: pricingOption?.name || 'Pricing Options',
        values: combinedTiers.map((tier) => ({
          label: tier.title,
          priceAdjustment: tier.price - basePrice, // Calculate difference from base price
        })),
        impactsVariants: true,
        optionType: 'PRICING_TIER',
      };

      const customizationGroups: OptionGroup[] =
        (initialData.optionStructure?.customizationOptions || [])
          .filter(
            (option: any) =>
              option.id !== derivedPricingGroupId &&
              option.name !== 'Pricing Options'
          )
          .map((option: any) => ({
            id: option.id,
            name: option.name,
            values: option.values.map((value: any) => ({
              label: value.label,
              priceAdjustment: centsToDollars(value.priceAdjustment || 0),
            })),
            impactsVariants: Boolean(option.impactsVariants),
          }));

      setOptionGroups([pricingGroup, ...customizationGroups]);

      setPriceTitle(combinedTiers[0]?.title || 'Standard');
      setVariants(initialData.variants || []);

      const initialGroupIds = Array.isArray(initialData.addOnGroupIds)
        ? initialData.addOnGroupIds.filter((id: unknown): id is string => typeof id === 'string')
        : [];
      if ((initialData.productType || 'MAIN') === 'MAIN') {
        setSelectedAddOnGroupIds(initialGroupIds);
      } else {
        setSelectedAddOnGroupIds([]);
      }
      setAddOnGroupSeed((seed) => seed + 1);

      // Mark initial load as complete after a small delay to ensure all state updates finish
      setTimeout(() => {
        isInitialLoadRef.current = false;
      }, 100);
    }
    if (!initialData) {
      setSelectedAddOnGroupIds([]);
      setAddOnGroupSeed((seed) => seed + 1);
      // Mark initial load as complete for new products
      setTimeout(() => {
        isInitialLoadRef.current = false;
      }, 100);
    }
  }, [initialData]);

  // Handle immediate image upload (from ImageCropModal)
  const handleImageUploaded = (imageUrl: string) => {
    setExistingImages(prev => [...prev, imageUrl]);
  };

  // Handle immediate image deletion
  const handleImageDeleted = (imageUrl: string) => {
    setExistingImages(prev => prev.filter(img => img !== imageUrl));
    setPricingTiers((prev) =>
      prev.map((tier) =>
        tier.featuredImageUrl === imageUrl ? { ...tier, featuredImageUrl: undefined } : tier
      )
    );
    setVariants((prev) =>
      prev.map((variant) =>
        variant.featuredImageUrl === imageUrl ? { ...variant, featuredImageUrl: null } : variant
      )
    );
  };

  // Handle image reordering
  const handleImagesReordered = (newOrder: string[]) => {
    setExistingImages(newOrder);
  };

  useEffect(() => {
    if (!pricingTiers.length) {
      return;
    }

    const baseTier = pricingTiers[0];

    if (price !== baseTier.price) {
      setPrice(baseTier.price);
    }

    if (priceTitle !== baseTier.title) {
      setPriceTitle(baseTier.title);
    }

    if (inventory !== baseTier.inventory) {
      setInventory(baseTier.inventory);
    }

    setOptionGroups((previousGroups) => {
      const existingPricingGroup = previousGroups.find(
        (group) => group.id === pricingGroupId
      );
      const pricingGroupName = existingPricingGroup?.name || 'Pricing Options';

      const baseTier = pricingTiers[0];

      const pricingGroup: OptionGroup = {
        id: pricingGroupId,
        name: pricingGroupName,
        values: pricingTiers.map((tier) => ({
          label: tier.title || '',
          priceAdjustment: tier.price - baseTier.price, // Difference from base price
        })),
        impactsVariants: true,
        optionType: 'PRICING_TIER',
      };

      const otherGroups = previousGroups.filter(
        (group) =>
          group.id !== pricingGroupId && group.name !== pricingGroupName
      );

      return [pricingGroup, ...otherGroups];
    });
  }, [pricingTiers, pricingGroupId, price, priceTitle, inventory]);

  useEffect(() => {
    // Skip variant regeneration during initial load
    if (isInitialLoadRef.current) {
      return;
    }

    if (!pricingTiers.length) {
      return;
    }

    const impactingGroups = optionGroups
      .filter((group) => group.impactsVariants)
      .filter((group) => Array.isArray(group.values) && group.values.length > 0);

    if (!impactingGroups.length) {
      setVariants([]);
      return;
    }

    const pricingGroup =
      impactingGroups.find((group) => group.id === pricingGroupId) ??
      impactingGroups[0];

    const baseTier = pricingTiers[0];

    type CombinationPart = {
      groupId: string;
      groupName: string;
      value: OptionValue;
    };

    const combinations = impactingGroups.reduce<CombinationPart[][]>(
      (acc, group) => {
        return acc.flatMap((combo) =>
          group.values.map((value) => [
            ...combo,
            { groupId: group.id, groupName: group.name, value },
          ])
        );
      },
      [[]]
    );

    setVariants((previousVariants) =>
      combinations.map((combo, comboIndex) => {
        const comboLabel = combo.map((part) => part.value.label).join(" - ") || "Default";

        // Try to find existing variant by name or SKU to preserve IDs and data
        const existing = previousVariants.find(
          (variant) => {
            // Match by exact name
            if (variant.name === comboLabel) return true;

            // Match by SKU (in case name formatting changed slightly)
            const expectedSku = `${productSlug}-${comboLabel.toLowerCase().replace(/\s+/g, "-")}`;
            if (variant.sku === expectedSku) return true;

            return false;
          }
        );

        // Calculate total price adjustment from ALL options
        const totalPriceAdjustment = combo.reduce((sum, part) => {
          return sum + (part.value.priceAdjustment || 0);
        }, 0);

        // Convert dollars to cents for priceDifference
        const priceDifference = dollarsToCents(totalPriceAdjustment);

        // Find the pricing tier from this combination
        const pricingPart = combo.find((part) => part.groupId === pricingGroup?.id);
        const tierTitle = pricingPart?.value.label || baseTier.title;
        const selectedTier = pricingTiers.find((t) => t.title === tierTitle) || baseTier;
        const tierFeaturedImage = selectedTier?.featuredImageUrl ?? null;

        const fallbackSkuBase = `${productSlug}-${comboLabel
          .toLowerCase()
          .replace(/\s+/g, "-")}`;

        return {
          id: existing?.id || generateUUID(),
          name: comboLabel,
          sku: existing?.sku || fallbackSkuBase,
          priceDifference,
          stockLevel:
            existing?.stockLevel ??
            selectedTier.inventory ??
            (comboIndex === 0 ? baseTier.inventory : 0),
          trackInventory:
            existing?.trackInventory ??
            ((selectedTier.inventory ?? 0) > 0),
          isManuallyEdited: existing?.isManuallyEdited || false,
          featuredImageUrl: tierFeaturedImage,
        };
      })
    );
  }, [pricingTiers, pricingGroupId, optionGroups, productSlug]);

  useEffect(() => {
    const loadAddOnGroups = async () => {
      setLoadingAddOnGroups(true);
      setAddOnGroupsError(null);
      try {
        const data = await apiClient.get('/api/addon-groups');
        if (Array.isArray(data)) {
          setAvailableAddOnGroups(
            data.map((group: any) => ({
              id: String(group.id),
              name: String(group.name ?? ''),
              productCount: Number(group.productCount ?? 0),
              addOnCount: Number(group.addOnCount ?? 0),
            }))
          );
        } else {
          setAvailableAddOnGroups([]);
        }
      } catch (error) {
        console.error('Failed to load add-on groups:', error);
        setAddOnGroupsError('Failed to load add-on groups.');
      } finally {
        setLoadingAddOnGroups(false);
      }
    };

    loadAddOnGroups();
  }, [apiClient]);

  useEffect(() => {
    if (productType !== 'MAIN' && selectedAddOnGroupIds.length > 0) {
      setSelectedAddOnGroupIds([]);
      setAddOnGroupSeed((seed) => seed + 1);
    }
  }, [productType, selectedAddOnGroupIds.length]);

  const handleChange = (field: string, value: any) => {
    switch (field) {
      case 'title':
        setTitle(value);
        break;
      case 'description':
        setDescription(value);
        break;
      case 'visibility':
        setVisibility(value);
        break;
      case 'categoryId':
        setCategoryId(value);
        setAdditionalCategoryIds((prev) =>
          prev.filter((category) => category !== value)
        );
        break;
      case 'additionalCategoryIds':
        setAdditionalCategoryIds(
          Array.isArray(value)
            ? value.filter((category) => category !== categoryId)
            : []
        );
        break;
      case 'reportingCategoryId':
        setReportingCategoryId(value);
        break;
      case 'price':
        setPrice(value);
        setPricingTiers((prev) =>
          prev.map((tier, index) =>
            index === 0 ? { ...tier, price: Number(value) || 0 } : tier
          )
        );
        break;
      case 'priceTitle':
        setPriceTitle(value);
        setPricingTiers((prev) =>
          prev.map((tier, index) =>
            index === 0 ? { ...tier, title: value } : tier
          )
        );
        break;
      case 'isTaxable':
        setIsTaxable(value);
        break;
      case 'isActive':
        setIsActive(value);
        break;
      case 'isFeatured':
        setIsFeatured(value);
        break;
      case 'productType':
        setProductType(value as string);
        break;
      case 'inventory':
        setInventory(value);
        setPricingTiers((prev) =>
          prev.map((tier, index) =>
            index === 0 ? { ...tier, inventory: Number(value) || 0 } : tier
          )
        );
        break;
      case 'recipe':
        setRecipe(value);
        break;
      case 'availableFrom':
        setAvailableFrom(value);
        break;
      case 'availableTo':
        setAvailableTo(value);
        break;
      case 'seoTitle':
        setSeoTitle(value);
        break;
      case 'seoDescription':
        setSeoDescription(value);
        break;
      case 'slug':
        setSlug(value);
        break;
      case 'availabilityType':
        setAvailabilityType(value);
        break;
      case 'holidayPreset':
        setHolidayPreset(value);
        break;
      case 'notAvailableFrom':
        setNotAvailableFrom(value);
        break;
      case 'notAvailableUntil':
        setNotAvailableUntil(value);
        break;
      case 'isTemporarilyUnavailable':
        setIsTemporarilyUnavailable(value);
        break;
      case 'unavailableUntil':
        setUnavailableUntil(value);
        break;
      case 'unavailableMessage':
        setUnavailableMessage(value);
        break;
    }
  };

  const handleSave = async () => {
    console.log('🔵 Save button clicked!');
    try {
      setIsSaving(true);
      console.log('🔵 Validation checks...', { title, categoryId, reportingCategoryId });
      if (!title) throw new Error('Title is required');
      if (!categoryId) throw new Error('Category is required');
      if (!reportingCategoryId) throw new Error('Reporting category is required');

      const categoryIds = Array.from(
        new Set([categoryId, ...additionalCategoryIds].filter(Boolean))
      );

      const data = {
        title,
        name: title,
        description: description || 'No description provided',
        visibility,
        categoryId,
        categoryIds,
        reportingCategoryId,
        isTaxable,
        isActive,
        isFeatured,
        inventory,
        recipe,
        availableFrom,
        availableTo,
        seoTitle,
        seoDescription,
        slug: slug || title.toLowerCase().replace(/\s+/g, '-'),
        price,
        optionGroups,
        variants,
        availabilityType,
        holidayPreset,
        notAvailableFrom,
        notAvailableUntil,
        isTemporarilyUnavailable,
      unavailableUntil,
      unavailableMessage,
      productType,
      images: existingImages, // Images are already uploaded, just save URLs
      addOnGroupIds: productType === 'MAIN' ? selectedAddOnGroupIds : [],
    };

      await onSubmit(data);
    } catch (error: any) {
      console.error('Error saving product:', error);
      alert(`Failed to save product: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <ProductInfoCard
          title={title}
          description={description}
          existingImages={existingImages}
          onChange={handleChange}
          onImageUploaded={handleImageUploaded}
          onImageDeleted={handleImageDeleted}
          onImagesReordered={handleImagesReordered}
          setSlug={setSlug}
          productId={initialData?.id}
        />
        <PricingCard
          productSlug={productSlug}
          pricingGroupId={pricingGroupId}
          pricingTiers={pricingTiers}
          optionGroups={optionGroups}
          variants={variants}
          productImages={existingImages}
          onPricingTiersChange={setPricingTiers}
          onChange={handleChange}
          onOptionGroupsChange={setOptionGroups}
          onVariantsChange={setVariants}
        />
        <RecipeCard
          recipe={recipe}
          onChange={(val) => handleChange('recipe', val)}
        />
        <AvailabilityCard
          availabilityType={availabilityType}
          holidayPreset={holidayPreset}
          availableFrom={availableFrom}
          availableTo={availableTo}
          notAvailableFrom={notAvailableFrom}
          notAvailableUntil={notAvailableUntil}
          isTemporarilyUnavailable={isTemporarilyUnavailable}
          unavailableUntil={unavailableUntil}
          unavailableMessage={unavailableMessage}
          onChange={handleChange}
        />
      </div>

      <div className="space-y-6">
        <SettingsCard
          visibility={visibility}
          categoryId={categoryId}
          additionalCategoryIds={additionalCategoryIds}
          reportingCategoryId={reportingCategoryId}
          isTaxable={isTaxable}
          isActive={isActive}
          isFeatured={isFeatured}
          productType={productType}
          inventory={inventory}
          slug={slug}
          title={title}
          onChange={handleChange}
          onAdditionalCategoriesChange={(categoryIds) =>
            handleChange('additionalCategoryIds', categoryIds)
          }
          onSave={handleSave}
        />
        {productType === 'MAIN' && (
          <ComponentCard
            title="Add-On Groups"
            desc="Choose which add-on bundles should appear when this product is selected."
          >
            {addOnGroupsError && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-900/20 dark:text-red-200">
                {addOnGroupsError}
              </div>
            )}
            {loadingAddOnGroups ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading add-on groups…</p>
            ) : availableAddOnGroups.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No add-on groups yet. Manage groups in Settings → Orders.
              </p>
            ) : (
              <MultiSelect
                key={`addon-groups-${addOnGroupSeed}`}
                label="Available groups"
                options={availableAddOnGroups.map((group) => ({
                  value: group.id,
                  text: `${group.name} (${group.addOnCount} add-ons)`
                }))}
                defaultSelected={selectedAddOnGroupIds}
                onChange={setSelectedAddOnGroupIds}
              />
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Manage add-ons under Settings → Orders.
            </p>
          </ComponentCard>
        )}
        <SeoCard
          seoTitle={seoTitle}
          seoDescription={seoDescription}
          onChange={handleChange}
        />
      </div>

      <Modal
        isOpen={isSaving}
        onClose={() => {}}
        showCloseButton={false}
        className="max-w-sm"
      >
        <div className="p-6 flex items-center gap-3">
          <svg
            className="animate-spin h-6 w-6 text-brand-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <span className="text-lg font-medium text-black dark:text-white">
            Saving...
          </span>
        </div>
      </Modal>
    </div>
  );
};

export default ProductForm;

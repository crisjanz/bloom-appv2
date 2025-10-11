import { useState, useEffect } from 'react';
import ProductInfoCard from './cards/ProductInfoCard';
import PricingCard from './cards/PricingCard';
import RecipeCard from './cards/RecipeCard';
import AvailabilityCard from './cards/AvailabilityCard';
import SettingsCard from './cards/SettingsCard';
import SeoCard from './cards/SeoCard';

type OptionGroup = {
  id: string;
  name: string;
  values: string[];
  impactsVariants: boolean;
};

type Variant = {
  id: string;
  name: string;
  sku: string;
  priceDifference: number;
  stockLevel: number;
  trackInventory: boolean;
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
  const [reportingCategoryId, setReportingCategoryId] = useState('');
  const [price, setPrice] = useState(0);
  const [priceTitle, setPriceTitle] = useState('');
  const [isTaxable, setIsTaxable] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [inventory, setInventory] = useState(0);
  const [optionGroups, setOptionGroups] = useState<OptionGroup[]>([]);
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

  const productSlug = slug || title.toLowerCase().replace(/\s+/g, '-') || 'product';

  // Load initial data if provided
  useEffect(() => {
    if (initialData) {
      setTitle(initialData.name || '');
      setDescription(initialData.description || '');
      setVisibility(initialData.visibility || 'ONLINE');
      setCategoryId(initialData.categoryId || '');
      setReportingCategoryId(initialData.reportingCategoryId || '');
      setPrice(initialData.price || 0);
      setIsTaxable(Boolean(initialData.isTaxable));
      setIsActive(Boolean(initialData.isActive));
      setIsFeatured(Boolean(initialData.showOnHomepage));
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
      
      setVariants(initialData.variants || []);
      setOptionGroups(initialData.optionGroups || []);
    }
  }, [initialData]);

  // Handle immediate image upload (from ImageCropModal)
  const handleImageUploaded = (imageUrl: string) => {
    setExistingImages(prev => [...prev, imageUrl]);
  };

  // Handle immediate image deletion
  const handleImageDeleted = (imageUrl: string) => {
    setExistingImages(prev => prev.filter(img => img !== imageUrl));
  };

  // Handle image reordering
  const handleImagesReordered = (newOrder: string[]) => {
    setExistingImages(newOrder);
  };

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
        break;
      case 'reportingCategoryId':
        setReportingCategoryId(value);
        break;
      case 'price':
        setPrice(value);
        break;
      case 'priceTitle':
        setPriceTitle(value);
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
      case 'inventory':
        setInventory(value);
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

      const data = {
        title,
        name: title,
        description: description || 'No description provided',
        visibility,
        categoryId,
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
        images: existingImages  // Images are already uploaded, just save URLs
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
          price={price}
          priceTitle={priceTitle}
          inventory={inventory}
          productSlug={productSlug}
          optionGroups={optionGroups}
          variants={variants}
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
          reportingCategoryId={reportingCategoryId}
          isTaxable={isTaxable}
          isActive={isActive}
          isFeatured={isFeatured}
          inventory={inventory}
          slug={slug}
          title={title}
          onChange={handleChange}
          onSave={handleSave}
        />
        <SeoCard
          seoTitle={seoTitle}
          seoDescription={seoDescription}
          onChange={handleChange}
        />
      </div>

      {isSaving && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-boxdark p-6 rounded-lg shadow-lg flex items-center gap-3">
            <svg
              className="animate-spin h-6 w-6 text-[#597485]"
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
        </div>
      )}
    </div>
  );
};

export default ProductForm;
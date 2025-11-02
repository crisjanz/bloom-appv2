import { useState, useEffect } from "react";
import ComponentCardCollapsible from "@shared/ui/common/ComponentCardCollapsible";
import InputField from "@shared/ui/forms/input/InputField";
import Label from "@shared/ui/forms/Label";
import Select from "@shared/ui/forms/Select";
import Button from "@shared/ui/components/ui/button/Button";

interface Product {
  id: string;
  name: string;
}

interface SeasonalProduct {
  productId?: string;
  customTitle: string;
  customSubtitle: string;
  customDescription: string;
  customImageUrl: string;
  buttonText: string;
  buttonLink: string;
}

const SeasonalProductsCard = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [seasonalProducts, setSeasonalProducts] = useState<SeasonalProduct[]>([
    {
      customTitle: "",
      customSubtitle: "",
      customDescription: "",
      customImageUrl: "",
      buttonText: "View All Items",
      buttonLink: "",
    },
    {
      customTitle: "",
      customSubtitle: "",
      customDescription: "",
      customImageUrl: "",
      buttonText: "View All Items",
      buttonLink: "",
    },
  ]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load products for dropdown
      const productsResponse = await fetch('/api/products');
      if (productsResponse.ok) {
        const productsData = await productsResponse.json();
        setProducts(productsData);
      }

      // Load saved seasonal products
      const settingsResponse = await fetch('/api/settings/homepage');
      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json();
        if (settingsData.seasonalProducts && Array.isArray(settingsData.seasonalProducts)) {
          setSeasonalProducts(settingsData.seasonalProducts);
        }
      }
    } catch (error) {
      console.error('Failed to load seasonal products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProductUpdate = (index: number, field: keyof SeasonalProduct, value: any) => {
    setSeasonalProducts((prev) =>
      prev.map((product, i) => (i === index ? { ...product, [field]: value } : product))
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/settings/homepage', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seasonalProducts }),
      });

      if (response.ok) {
        alert('Seasonal products saved successfully');
      } else {
        alert('Failed to save seasonal products');
      }
    } catch (error) {
      console.error('Failed to save seasonal products:', error);
      alert('Failed to save seasonal products');
    } finally {
      setIsSaving(false);
    }
  };

  const productOptions = [
    { value: "", label: "None (Custom Content Only)" },
    ...products.map((p) => ({ value: p.id, label: p.name })),
  ];

  return (
    <ComponentCardCollapsible title="Seasonal Products (2 Slots)" defaultOpen={false}>
      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <div className="space-y-6">
          {seasonalProducts.map((product, index) => (
            <div key={index} className="border-b pb-6 last:border-b-0 last:pb-0">
              <h3 className="text-lg font-semibold mb-4">Seasonal Product {index + 1}</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor={`product-${index}`}>Linked Product (Optional)</Label>
                  <Select
                    id={`product-${index}`}
                    value={product.productId || ""}
                    onChange={(e) => handleProductUpdate(index, 'productId', e.target.value || undefined)}
                    options={productOptions}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Optional: Link to a product for fallback data
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`customTitle-${index}`}>Custom Title</Label>
                    <InputField
                      id={`customTitle-${index}`}
                      type="text"
                      value={product.customTitle}
                      onChange={(e) => handleProductUpdate(index, 'customTitle', e.target.value)}
                      placeholder="Summer Collection"
                    />
                  </div>

                  <div>
                    <Label htmlFor={`customSubtitle-${index}`}>Custom Subtitle</Label>
                    <InputField
                      id={`customSubtitle-${index}`}
                      type="text"
                      value={product.customSubtitle}
                      onChange={(e) => handleProductUpdate(index, 'customSubtitle', e.target.value)}
                      placeholder="Start From $50"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor={`customDescription-${index}`}>Custom Description</Label>
                  <textarea
                    id={`customDescription-${index}`}
                    value={product.customDescription}
                    onChange={(e) => handleProductUpdate(index, 'customDescription', e.target.value)}
                    className="w-full rounded border border-stroke bg-transparent py-3 px-5 outline-none transition focus:border-primary dark:border-form-strokedark dark:bg-form-input"
                    rows={3}
                    placeholder="Describe this seasonal collection..."
                  />
                </div>

                <div>
                  <Label htmlFor={`customImageUrl-${index}`}>Custom Image URL</Label>
                  <InputField
                    id={`customImageUrl-${index}`}
                    type="text"
                    value={product.customImageUrl}
                    onChange={(e) => handleProductUpdate(index, 'customImageUrl', e.target.value)}
                    placeholder="https://example.com/seasonal.jpg"
                  />
                  {product.customImageUrl && (
                    <div className="mt-2">
                      <img
                        src={product.customImageUrl}
                        alt={`Seasonal product ${index + 1} preview`}
                        className="h-32 w-auto rounded border border-stroke object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`buttonText-${index}`}>Button Text</Label>
                    <InputField
                      id={`buttonText-${index}`}
                      type="text"
                      value={product.buttonText}
                      onChange={(e) => handleProductUpdate(index, 'buttonText', e.target.value)}
                      placeholder="View All Items"
                    />
                  </div>

                  <div>
                    <Label htmlFor={`buttonLink-${index}`}>Button Link</Label>
                    <InputField
                      id={`buttonLink-${index}`}
                      type="text"
                      value={product.buttonLink}
                      onChange={(e) => handleProductUpdate(index, 'buttonLink', e.target.value)}
                      placeholder="/collections/summer"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}

          <div className="flex justify-end pt-4">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-primary text-white"
            >
              {isSaving ? 'Saving...' : 'Save Seasonal Products'}
            </Button>
          </div>
        </div>
      )}
    </ComponentCardCollapsible>
  );
};

export default SeasonalProductsCard;

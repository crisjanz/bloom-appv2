import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";

// Card components
import ProductInfoCard from "../../components/products/cards/ProductInfoCard";
import PricingCard from "../../components/products/cards/PricingCard";
import RecipeCard from "../../components/products/cards/RecipeCard";
import AvailabilityCard from "../../components/products/cards/AvailabilityCard";
import SettingsCard from "../../components/products/cards/SettingsCard";
import SeoCard from "../../components/products/cards/SeoCard";

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

export default function NewProductPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [visibility, setVisibility] = useState("ONLINE");
  const [categoryId, setCategoryId] = useState("7b1211d1-4c72-4676-b24b-6c3450b18d4b");
  const [reportingCategoryId, setReportingCategoryId] = useState("05630112-f898-477f-a7d0-e8f9f91c81a6");
  const [price, setPrice] = useState(0);
  const [priceTitle, setPriceTitle] = useState("");
  const [isTaxable, setIsTaxable] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [inventory, setInventory] = useState(0);
  const [optionGroups, setOptionGroups] = useState<OptionGroup[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [recipe, setRecipe] = useState("");
  const [availableFrom, setAvailableFrom] = useState("");
  const [availableTo, setAvailableTo] = useState(""); // Fixed: Changed setAvailableFrom to setAvailableTo
  const [subscriptionAvailable, setSubscriptionAvailable] = useState(false);
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [slug, setSlug] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();

  const productSlug = slug || title.toLowerCase().replace(/\s+/g, "-") || "product";

  const handleChange = (field: string, value: any) => {
    switch (field) {
      case "title":
        setTitle(value);
        break;
      case "description":
        setDescription(value);
        break;
      case "status":
        setStatus(value);
        break;
      case "visibility":
        setVisibility(value);
        break;
      case "categoryId":
        setCategoryId(value);
        break;
      case "reportingCategoryId":
        setReportingCategoryId(value);
        break;
      case "price":
        setPrice(value);
        break;
      case "priceTitle":
        setPriceTitle(value);
        break;
      case "isTaxable":
        setIsTaxable(value);
        break;
      case "isActive":
        setIsActive(value);
        break;
      case "isFeatured":
        setIsFeatured(value);
        break;
      case "inventory":
        setInventory(value);
        break;
      case "recipe":
        setRecipe(value);
        break;
      case "availableFrom":
        setAvailableFrom(value);
        break;
      case "availableTo":
        setAvailableTo(value);
        break;
      case "subscriptionAvailable":
        setSubscriptionAvailable(value);
        break;
      case "seoTitle":
        setSeoTitle(value);
        break;
      case "seoDescription":
        setSeoDescription(value);
        break;
      case "slug":
        setSlug(value);
        break;
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      if (!title) throw new Error("Title is required");
      if (!categoryId) throw new Error("Category is required");
      if (!reportingCategoryId) throw new Error("Reporting category is required");

      const baseSlug = slug || title.toLowerCase().replace(/\s+/g, "-") || "product-slug";
      const timestamp = Date.now();
      const finalSlug = `${baseSlug}-${timestamp}`;

      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description || "No description provided");
      formData.append("status", status);
      formData.append("visibility", visibility);
      formData.append("categoryId", categoryId);
      formData.append("reportingCategoryId", reportingCategoryId);
      formData.append("isTaxable", String(isTaxable));
      formData.append("isActive", String(isActive));
      formData.append("isFeatured", String(isFeatured));
      formData.append("inventory", String(inventory));
      formData.append("recipe", recipe);
      formData.append("availableFrom", availableFrom);
      formData.append("availableTo", availableTo);
      formData.append("subscriptionAvailable", String(subscriptionAvailable));
      formData.append("seoTitle", seoTitle);
      formData.append("seoDescription", seoDescription);
      formData.append("slug", finalSlug);
      formData.append("price", String(price));
      formData.append("optionGroups", JSON.stringify(optionGroups));
      formData.append("variants", JSON.stringify(variants));

      imageFiles.forEach((file) => {
        formData.append("images", file);
      });

      const res = await fetch("/api/products", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `HTTP error ${res.status}`);
      }

      const result = await res.json();
      setIsSaving(false);
      alert("✅ Product saved!");
      navigate(`/products/view/${result.id}`, { replace: true });
    } catch (error: any) {
      setIsSaving(false);
      alert(`❌ Failed to save product: ${error.message}`);
    }
  };

  return (
    <div className="bg-whiten dark:bg-boxdark min-h-screen relative">
      <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10">
        <PageMeta title="New Product" />
        <PageBreadcrumb pageName="New Product" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-6">
            <ProductInfoCard
              title={title}
              description={description}
              onChange={handleChange}
              onImagesChange={setImageFiles}
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
              onChange={(val) => handleChange("recipe", val)}
            />
            <AvailabilityCard
              availableFrom={availableFrom}
              availableTo={availableTo}
              subscriptionAvailable={subscriptionAvailable}
              onChange={handleChange}
            />
          </div>

          {/* Sidebar Column */}
          <div className="space-y-6">
            <SettingsCard
              status={status}
              visibility={visibility}
              categoryId={categoryId}
              reportingCategoryId={reportingCategoryId}
              isTaxable={isTaxable}
              isActive={isActive}
              isFeatured={isFeatured}
              inventory={inventory}
              slug={slug}
              onChange={handleChange}
              onSave={handleSave}
            />
            <SeoCard
              seoTitle={seoTitle}
              seoDescription={seoDescription}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* Loading Modal */}
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
              <span className="text-lg font-medium text-black dark:text-white">Saving...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
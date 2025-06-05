import { useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";

// Card components
import ProductInfoCard from "../../components/products/cards/ProductInfoCard";
import PricingCard from "../../components/products/cards/PricingCard";
import RecipeCard from "../../components/products/cards/RecipeCard";
import AvailabilityCard from "../../components/products/cards/AvailabilityCard";
import SettingsCard from "../../components/products/cards/SettingsCard";
import SeoCard from "../../components/products/cards/SeoCard";

export default function NewProductPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [visibility, setVisibility] = useState("ONLINE");
  const [categoryId, setCategoryId] = useState("");
  const [reportingCategoryId, setReportingCategoryId] = useState("");
  const [price, setPrice] = useState(0);
  const [priceTitle, setPriceTitle] = useState("");
  const [isTaxable, setIsTaxable] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [inventory, setInventory] = useState(0);
  const [recipe, setRecipe] = useState("");
  const [availableFrom, setAvailableFrom] = useState("");
  const [availableTo, setAvailableTo] = useState("");
  const [subscriptionAvailable, setSubscriptionAvailable] = useState(false);
  const [seoTitle, setSeoTitle] = useState("");
const [seoDescription, setSeoDescription] = useState("");

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
    }
  };

  const handleSave = () => {
    alert("Saving product...");
  };

  return (
    <div className="bg-whiten dark:bg-boxdark min-h-screen">
      <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10">
        <PageMeta title="New Product" />
        <PageBreadcrumb pageTitle="New Product" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-6">
            <ProductInfoCard
              title={title}
              description={description}
              onChange={handleChange}
            />
            <PricingCard
              price={price}
              priceTitle={priceTitle}
              onChange={handleChange}
            />
            <RecipeCard recipe={recipe} onChange={(val) => handleChange("recipe", val)} />
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
      </div>
    </div>
  );
}
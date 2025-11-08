import { useEffect, useState } from "react";
import PropTypes from 'prop-types';
import { useNavigate } from "react-router-dom";
import { useCart } from "../../contexts/CartContext";
import DeliveryDatePicker from "../DeliveryDatePicker";
import AddOns from "./AddOns";

const buildCartItemKey = (productId, variantId) => (
  `${productId}-${variantId || "base"}`
);

const DetailsBox = ({ product }) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedPricingTierId, setSelectedPricingTierId] = useState(null);
  const [selectedCustomization, setSelectedCustomization] = useState({});
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [selectedAddOnSelections, setSelectedAddOnSelections] = useState([]);
  const [isUpsellExpanded, setIsUpsellExpanded] = useState(false);
  const [isMobileUpsellOpen, setIsMobileUpsellOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [addonState, setAddonState] = useState({
    loading: true,
    count: 0,
    error: null,
  });
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [confirmationItems, setConfirmationItems] = useState([]);
  const { addToCart, deliveryDate, setDeliveryDate } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    setQuantity(1);
    setSelectedPricingTierId(null);
    setSelectedCustomization({});
    setSelectedAddOnSelections([]);
    setIsMobileUpsellOpen(false);
  }, [product?.id]);

  useEffect(() => {
    const updateViewport = () => {
      setIsMobileViewport(window.innerWidth < 768);
    };

    updateViewport();
    window.addEventListener("resize", updateViewport);

    return () => {
      window.removeEventListener("resize", updateViewport);
    };
  }, []);

  useEffect(() => {
    if (!isMobileUpsellOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileUpsellOpen]);

  const rawPricingOptions = product?.optionStructure?.pricingOptions ?? [];
  const rawCustomizationOptions = product?.optionStructure?.customizationOptions ?? [];

  const pricingOptions = rawPricingOptions.filter(
    (option) => option?.values && option.values.length > 0
  );

  const pricingOptionIds = new Set(pricingOptions.map((option) => option.id));

  const customizationOptions = rawCustomizationOptions
    .filter((option) => option?.values && option.values.length > 0)
    .filter((option) => !pricingOptionIds.has(option.id));

  const pricingTierValues =
    pricingOptions.length > 0
      ? pricingOptions[0].values ?? []
      : [];

  const variantOptions = Array.isArray(product.variants) ? product.variants : [];
  const basePrice = Number(product.price) || 0;

  const computeVariantPrice = (variant) => {
    if (!variant) {
      return basePrice;
    }

    const calculated = Number(variant.calculatedPrice);
    if (!Number.isNaN(calculated) && Number.isFinite(calculated)) {
      return calculated;
    }

    if (typeof variant.price === "number") {
      return variant.price / 100;
    }

    if (typeof variant.priceDifference === "number") {
      return basePrice + variant.priceDifference / 100;
    }

    return basePrice;
  };

  const findVariantBySelection = (pricingValueId, customizationMap) => {
    const selectedOptionIds = [
      pricingValueId,
      ...Object.values(customizationMap || {}),
    ].filter(Boolean);

    if (selectedOptionIds.length === 0) {
      return (
        variantOptions.find((variant) => variant.isDefault) ??
        variantOptions[0] ??
        null
      );
    }

    const selectedSet = new Set(selectedOptionIds);

    const exactMatch = variantOptions.find((variant) => {
      const optionValueIds = Array.isArray(variant.optionValueIds)
        ? variant.optionValueIds
        : [];
      const variantSet = new Set(optionValueIds);

      if (variantSet.size !== selectedSet.size) {
        return false;
      }

      for (const id of selectedSet) {
        if (!variantSet.has(id)) {
          return false;
        }
      }

      return true;
    });

    if (exactMatch) {
      return exactMatch;
    }

    return (
      variantOptions.find((variant) => variant.isDefault) ??
      variantOptions[0] ??
      null
    );
  };

  const selectedVariant = findVariantBySelection(
    selectedPricingTierId,
    selectedCustomization
  );

  // Calculate display price: base + selected tier adjustment + customization adjustments
  const calculateDisplayPrice = () => {
    let totalPrice = basePrice;

    // Add pricing tier adjustment
    if (selectedPricingTierId) {
      const selectedTier = pricingTierValues.find((v) => v.id === selectedPricingTierId);
      if (selectedTier && selectedTier.priceAdjustment) {
        totalPrice += selectedTier.priceAdjustment / 100;
      }
    }

    // Add customization adjustments
    Object.keys(selectedCustomization).forEach((optionId) => {
      const selectedValueId = selectedCustomization[optionId];
      const customOption = customizationOptions.find((opt) => opt.id === optionId);
      if (customOption) {
        const selectedValue = customOption.values.find((v) => v.id === selectedValueId);
        if (selectedValue && selectedValue.priceAdjustment) {
          totalPrice += selectedValue.priceAdjustment / 100;
        }
      }
    });

    return totalPrice;
  };

  const displayPrice = calculateDisplayPrice();

  const pricingChoices = pricingTierValues.map((value) => {
    // Show FIXED tier price: base + tier adjustment only (no customizations)
    const tierPrice = basePrice + (value.priceAdjustment / 100);

    return {
      id: value.id,
      label: value.label,
      price: tierPrice,
    };
  });

  const increment = () => {
    setQuantity(quantity + 1);
  };

  const decrement = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const performAddToCart = (addonSelections) => {
    const addedItems = [];

    const variantPrice = selectedVariant
      ? computeVariantPrice(selectedVariant)
      : calculateDisplayPrice();

    for (let i = 0; i < quantity; i++) {
      addToCart(product, selectedVariant ? selectedVariant.id : null);
    }

    const baseImage = Array.isArray(product.images)
      ? product.images[0]?.url || product.images[0]
      : product.thumbnail || null;
    addedItems.push({
      key: buildCartItemKey(product.id, selectedVariant ? selectedVariant.id : null),
      name: product.name,
      variantName: selectedVariant?.name || null,
      price: variantPrice,
      quantity,
      image: baseImage,
    });

    const selectionsToApply = Array.isArray(addonSelections) ? addonSelections : [];

    if (selectionsToApply.length > 0) {
      selectionsToApply.forEach(({ product: addOnProduct, variantId }) => {
        for (let i = 0; i < quantity; i++) {
          addToCart(addOnProduct, variantId ?? null);
        }
        let variantName = null;
        if (variantId && Array.isArray(addOnProduct.variants)) {
          variantName =
            addOnProduct.variants.find((variant) => variant.id === variantId)?.name ??
            null;
        }

        const addOnImage = Array.isArray(addOnProduct.images)
          ? addOnProduct.images[0]?.url || addOnProduct.images[0]
          : addOnProduct.thumbnail || null;

        addedItems.push({
          key: buildCartItemKey(addOnProduct.id, variantId ?? null),
          name: addOnProduct.name,
          variantName,
          price: Number(addOnProduct.price) || 0,
          quantity,
          image: addOnImage,
        });
      });
    }

    setQuantity(1);
    return addedItems;
  };

  const handleAddToCart = () => {
    if (!deliveryDate) {
      alert('Please select a delivery date');
      return;
    }

    if (isMobileViewport) {
      if (addonState.loading || addonState.count > 0) {
        setIsMobileUpsellOpen(true);
        return;
      }
    }

    finalizeAddToCart(selectedAddOnSelections);
  };

  const finalizeAddToCart = (addonSelections) => {
    const addedItems = performAddToCart(addonSelections);
    setConfirmationItems(addedItems);
    setIsConfirmationOpen(true);
  };

  useEffect(() => {
    if (!isMobileUpsellOpen) {
      return;
    }

    if (!addonState.loading && !addonState.error && addonState.count === 0) {
      setIsMobileUpsellOpen(false);
      finalizeAddToCart([]);
    }
  }, [addonState, isMobileUpsellOpen]);

  useEffect(() => {
    const initialPricingId =
      pricingTierValues[0]?.id ?? null;

    const initialCustomizations = {};

    customizationOptions.forEach((option) => {
      const firstValue = option.values?.[0];
      if (firstValue) {
        initialCustomizations[option.id] = firstValue.id;
      }
    });

    setSelectedPricingTierId(initialPricingId);
    setSelectedCustomization(initialCustomizations);
  }, [product?.id]); // Only run when product changes, not when arrays are recreated

  const showPricingButtons = pricingChoices.length > 0;
  const showCustomizationDropdowns = customizationOptions.length > 0;

  // Truncate description to 150 characters for preview
  const descriptionPreview = product.description?.length > 150
    ? product.description.substring(0, 150) + '...'
    : product.description;

  return (
    <>
      {/* 1. Title */}
      <h2 className="mb-4 text-2xl font-bold text-dark dark:text-white sm:text-3xl md:text-4xl lg:text-3xl xl:text-4xl">
        {product.name}
      </h2>

      {/* 2. Availability */}
      <div className="mb-4 flex items-center">
        <div className="flex items-center">
          <span className="pr-2">
            <svg
              width={20}
              height={20}
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g clipPath="url(#clip0_1031_24115)">
                <path
                  d="M10 0.5625C4.78125 0.5625 0.5625 4.78125 0.5625 10C0.5625 15.2188 4.78125 19.4688 10 19.4688C15.2188 19.4688 19.4688 15.2188 19.4688 10C19.4688 4.78125 15.2188 0.5625 10 0.5625ZM10 18.0625C5.5625 18.0625 1.96875 14.4375 1.96875 10C1.96875 5.5625 5.5625 1.96875 10 1.96875C14.4375 1.96875 18.0625 5.59375 18.0625 10.0312C18.0625 14.4375 14.4375 18.0625 10 18.0625Z"
                  fill="#22AD5C"
                />
                <path
                  d="M12.6874 7.09368L8.96868 10.7187L7.28118 9.06243C6.99993 8.78118 6.56243 8.81243 6.28118 9.06243C5.99993 9.34368 6.03118 9.78118 6.28118 10.0624L8.28118 11.9999C8.46868 12.1874 8.71868 12.2812 8.96868 12.2812C9.21868 12.2812 9.46868 12.1874 9.65618 11.9999L13.6874 8.12493C13.9687 7.84368 13.9687 7.40618 13.6874 7.12493C13.4062 6.84368 12.9687 6.84368 12.6874 7.09368Z"
                  fill="#22AD5C"
                />
              </g>
              <defs>
                <clipPath id="clip0_1031_24115">
                  <rect width={20} height={20} fill="white" />
                </clipPath>
              </defs>
            </svg>
          </span>
          <span className="text-base font-medium text-dark dark:text-white">
            {product.isActive ? 'Available' : 'Out of Stock'}
          </span>
        </div>
      </div>

      {/* 3. Price */}
      <div className="mb-4">
        <span className="text-3xl font-bold text-dark dark:text-white sm:text-4xl">
          ${displayPrice.toFixed(2)}
        </span>
      </div>

      {/* 4. Star Rating (Future Implementation) */}
      <div className="mb-6 flex items-center gap-2">
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <svg
              key={star}
              width={16}
              height={16}
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-gray-300 dark:text-gray-600"
            >
              <path
                d="M8 0L9.79611 6.04894H16L11.1019 9.77606L12.8981 15.825L8 12.0979L3.10189 15.825L4.89811 9.77606L0 6.04894H6.20389L8 0Z"
                fill="currentColor"
              />
            </svg>
          ))}
        </div>
        <span className="text-sm text-body-color dark:text-dark-6">(No reviews yet)</span>
      </div>

      {/* 5. Pricing Tier Buttons */}
      {showPricingButtons && (
        <div className="mb-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {pricingChoices.map((choice) => {
              const isSelected = selectedPricingTierId === choice.id;
              return (
                <button
                  key={choice.id}
                  type="button"
                  onClick={() => {
                    setSelectedPricingTierId(choice.id);
                  }}
                  aria-pressed={isSelected}
                  className={`rounded-lg border px-4 py-3 text-left transition ${
                    isSelected
                      ? "border-primary bg-primary/10 text-primary dark:border-primary dark:bg-primary/10 dark:text-primary"
                      : "border-stroke text-dark hover:border-primary dark:border-dark-3 dark:text-white"
                  }`}
                >
                  <span className="block text-sm font-medium">{choice.label}</span>
                  <span className="mt-1 block text-lg font-semibold">
                    ${choice.price.toFixed(2)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. Customization Options */}
      {showCustomizationDropdowns &&
        customizationOptions.map((option) => (
          <div className="mb-6" key={option.id}>
            <label className="mb-3 block text-base font-medium text-dark dark:text-white">
              {option.name}
            </label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {option.values?.map((value) => {
                const priceAdjustment = value.priceAdjustment ? value.priceAdjustment / 100 : 0;
                const priceText = priceAdjustment !== 0
                  ? ` ${priceAdjustment > 0 ? '+' : ''}$${priceAdjustment.toFixed(2)}`
                  : '';
                const isSelected = selectedCustomization[option.id] === value.id;

                return (
                  <button
                    key={value.id}
                    type="button"
                    onClick={() => {
                      setSelectedCustomization((prev) => ({
                        ...prev,
                        [option.id]: value.id,
                      }));
                    }}
                    aria-pressed={isSelected}
                    className={`rounded-lg border px-4 py-2.5 text-center transition ${
                      isSelected
                        ? "border-primary bg-primary/10 text-primary dark:border-primary dark:bg-primary/10 dark:text-primary"
                        : "border-stroke text-dark hover:border-primary dark:border-dark-3 dark:text-white"
                    }`}
                  >
                    <span className="block text-sm font-medium">{value.label}</span>
                    {priceText && (
                      <span className="mt-0.5 block text-xs font-semibold opacity-70">
                        {priceText}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

      {/* 7. Date Picker */}
      <DeliveryDatePicker
        selectedDate={deliveryDate}
        onDateChange={setDeliveryDate}
        required={true}
      />

      {/* 8. Description with Read More */}
      {product.description && product.description !== 'No description provided' && (
        <div className="mb-6">
          <p className="mb-2 text-base font-medium text-body-color">
            {showFullDescription ? product.description : descriptionPreview}
          </p>
          {product.description?.length > 150 && (
            <button
              onClick={() => setShowFullDescription(!showFullDescription)}
              className="text-sm font-medium text-primary hover:underline"
            >
              {showFullDescription ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>
      )}

      {/* 9. Upsell/Add-On Items (Collapsible) */}
      <div className="mb-6 hidden md:block">
        <button
          type="button"
          onClick={() => setIsUpsellExpanded(!isUpsellExpanded)}
          className="flex w-full items-center justify-between rounded-lg border border-stroke bg-gray-50 px-4 py-3 text-left transition hover:bg-gray-100 dark:border-dark-3 dark:bg-dark-2 dark:hover:bg-dark-3"
        >
          <h3 className="text-base font-semibold text-dark dark:text-white">
            Add Chocolates or Balloons
          </h3>
          <svg
            width={20}
            height={20}
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={`transition-transform ${isUpsellExpanded ? 'rotate-180' : ''}`}
          >
            <path
              d="M10 13.125C9.8125 13.125 9.65625 13.0625 9.5 12.9375L3.9375 7.375C3.65625 7.09375 3.65625 6.625 3.9375 6.34375C4.21875 6.0625 4.6875 6.0625 4.96875 6.34375L10 11.375L15.0312 6.34375C15.3125 6.0625 15.7812 6.0625 16.0625 6.34375C16.3438 6.625 16.3438 7.09375 16.0625 7.375L10.5 12.9375C10.3438 13.0625 10.1875 13.125 10 13.125Z"
              fill="currentColor"
            />
          </svg>
        </button>

        {isUpsellExpanded && (
          <div className="mt-4">
            <AddOns
              productId={product.id}
              onSelectionChange={setSelectedAddOnSelections}
              onStateChange={setAddonState}
            />
          </div>
        )}
      </div>
      {/* 10. Quantity & Add to Cart */}
      <div className="mb-6 flex items-center gap-4">
        {/* Desktop: Show quantity selector */}
        <div className="hidden md:inline-flex items-center rounded-sm border border-stroke text-base font-medium text-dark dark:border-dark-3 dark:text-white">
          <span
            className="flex h-[50px] w-[42px] cursor-pointer select-none items-center justify-center text-dark dark:text-white"
            onClick={decrement}
          >
            <svg
              width={12}
              height={4}
              viewBox="0 0 12 4"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M11.3333 1.84615V2.15385C11.3333 2.52308 11.0385 2.84615 10.6667 2.84615H1.33332C0.988698 2.84615 0.666655 2.52308 0.666655 2.15385V1.84615C0.666655 1.47692 0.988698 1.15385 1.33332 1.15385H10.6667C11.0385 1.15385 11.3333 1.47692 11.3333 1.84615Z"
                fill="currentColor"
              />
            </svg>
          </span>
          <span className="flex h-[50px] w-[50px] items-center justify-center text-lg font-semibold">
            {quantity}
          </span>
          <span
            className="flex h-[50px] w-[42px] cursor-pointer select-none items-center justify-center text-dark dark:text-white"
            onClick={increment}
          >
            <svg
              width={12}
              height={12}
              viewBox="0 0 12 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M11.3333 5.84615V6.15385C11.3333 6.52308 11.0385 6.84615 10.6667 6.84615H6.66666V10.8462C6.66666 11.2154 6.37179 11.5385 5.99999 11.5385H5.69231C5.32051 11.5385 4.99999 11.2154 4.99999 10.8462V6.84615H1.33332C0.961518 6.84615 0.666655 6.52308 0.666655 6.15385V5.84615C0.666655 5.47692 0.961518 5.15385 1.33332 5.15385H4.99999V1.15385C4.99999 0.784619 5.32051 0.461548 5.69231 0.461548H5.99999C6.37179 0.461548 6.66666 0.784619 6.66666 1.15385V5.15385H10.6667C11.0385 5.15385 11.3333 5.47692 11.3333 5.84615Z"
                fill="currentColor"
              />
            </svg>
          </span>
        </div>

        <button
          onClick={handleAddToCart}
          disabled={!product.isActive}
          className="flex flex-1 md:flex-auto items-center justify-center rounded-md bg-primary px-10 py-[13px] text-center text-base font-medium text-white hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add to Cart
        </button>
      </div>

      {/* Mobile Upsell Bottom Sheet */}
      <div
        className={`fixed inset-0 z-50 flex items-end justify-center md:hidden transition-opacity ${
          isMobileUpsellOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!isMobileUpsellOpen}
      >
        <div
          className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ${
            isMobileUpsellOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => {
            setIsMobileUpsellOpen(false);
            finalizeAddToCart([]);
          }}
        />
        <div
          className={`relative w-full max-w-lg transform transition-transform duration-300 pb-safe ${
            isMobileUpsellOpen ? "translate-y-0" : "translate-y-full"
          }`}
        >
          <div className="rounded-t-3xl bg-white px-5 pt-4 pb-5 shadow-xl">
            <div className="mb-2.5 flex justify-center">
              <div className="h-1.5 w-12 rounded-full bg-gray-200" />
            </div>

            <header className="mb-3 text-center">
              <h3 className="text-lg font-semibold text-dark">
                Complete your gift
              </h3>
            </header>

            <div className="max-h-80 overflow-y-auto pr-1">
              <AddOns
                productId={product.id}
                onSelectionChange={setSelectedAddOnSelections}
                onStateChange={setAddonState}
              />
              {addonState.loading && (
                <div className="py-8 text-center text-sm text-body-color">
                  Loading add-ons…
                </div>
              )}
              {!addonState.loading && addonState.count === 0 && (
                <div className="py-8 text-center text-sm text-body-color">
                  No add-ons are available for this arrangement.
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setIsMobileUpsellOpen(false);
                finalizeAddToCart(selectedAddOnSelections);
              }}
              className="mt-6 flex w-full items-center justify-center rounded-xl bg-primary py-3 text-base font-semibold text-white transition hover:bg-primary-dark"
            >
              {selectedAddOnSelections.length > 0 ? "Add to Cart" : "Skip add-ons"}
            </button>
          </div>
        </div>
      </div>

      {/* Added to Cart Confirmation Modal */}
      <div
        className={`fixed inset-0 z-50 ${isConfirmationOpen ? "pointer-events-auto" : "pointer-events-none"} flex items-center justify-center px-4 transition-opacity ${
          isConfirmationOpen ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden={!isConfirmationOpen}
      >
        <div
          className="absolute inset-0 bg-black/50"
          onClick={() => setIsConfirmationOpen(false)}
        />
        <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
          <button
            type="button"
            onClick={() => setIsConfirmationOpen(false)}
            className="absolute right-4 top-4 text-body-color transition hover:text-dark"
            aria-label="Close added to cart confirmation"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M13.5 4.5L4.5 13.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path
                d="M4.5 4.5L13.5 13.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <h3 className="text-dark mb-4 text-xl font-semibold dark:text-white">Added to your cart</h3>

          <div className="space-y-3">
            {confirmationItems.map((item) => (
              <div key={item.key} className="flex items-center gap-3">
                <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-2xl bg-gray-100 dark:bg-dark-3">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-body-color">
                      No image
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-dark dark:text-white">{item.name}</p>
                  {item.variantName && (
                    <p className="text-xs text-body-color dark:text-dark-6">{item.variantName}</p>
                  )}
                  <p className="text-xs text-body-color dark:text-dark-6">
                    ${item.price.toFixed(2)} · Qty {item.quantity}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 space-y-3">
            <button
              type="button"
              onClick={() => {
                setIsConfirmationOpen(false);
                navigate("/shopping-cart");
              }}
              className="w-full rounded-full bg-primary py-3 text-base font-semibold text-white transition hover:bg-primary-dark"
            >
              Go to cart
            </button>
            <button
              type="button"
              onClick={() => {
                setIsConfirmationOpen(false);
                navigate("/checkout");
              }}
              className="w-full rounded-full border border-stroke py-3 text-base font-semibold text-dark transition hover:border-primary hover:text-primary dark:border-dark-3 dark:text-white"
            >
              Checkout now
            </button>
            <button
              type="button"
              onClick={() => {
                setIsConfirmationOpen(false);
                navigate("/filters");
              }}
              className="w-full rounded-full py-3 text-base font-medium text-body-color transition hover:text-primary dark:text-dark-6"
            >
              Continue shopping
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

DetailsBox.propTypes = {
  product: PropTypes.object.isRequired,
};

export default DetailsBox;

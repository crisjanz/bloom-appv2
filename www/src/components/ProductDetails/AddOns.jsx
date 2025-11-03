import { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { getAddonGroupsForProduct } from "../../services/addonService";
import placeholderImage from "../../assets/ecom-images/products/product-carousel-02/image-01.jpg";

const normalizeAddOns = (groups) => {
  const normalized = [];

  (groups ?? []).forEach((group) => {
    if (!group || !Array.isArray(group.addOns)) return;

    group.addOns.forEach((assignment) => {
      const product = assignment?.product;
      if (!product || !product.isActive) return;

      const variants = Array.isArray(product.variants) ? product.variants : [];
      const defaultVariant = variants.find((variant) => variant.isDefault) ?? variants[0] ?? null;
      const rawBasePrice = typeof product.price === "number"
        ? product.price
        : defaultVariant?.calculatedPrice;
      const basePrice = Number.isFinite(rawBasePrice) ? rawBasePrice : 0;

      normalized.push({
        id: assignment.productId,
        groupId: group.id,
        groupName: group.name,
        name: product.name,
        basePrice,
        image:
          (Array.isArray(product.images) && product.images[0]) ||
          product.thumbnail ||
          null,
        isTaxable: typeof product.isTaxable === "boolean" ? product.isTaxable : true,
        reportingCategoryId: product.reportingCategoryId ?? null,
        variants: variants.map((variant) => ({
          id: variant.id,
          name: variant.name || "Default",
          calculatedPrice: Number.isFinite(variant.calculatedPrice)
            ? variant.calculatedPrice
            : basePrice,
          isDefault: Boolean(variant.isDefault),
        })),
        defaultVariantId: defaultVariant?.id ?? null,
        rawProduct: {
          id: assignment.productId,
          name: product.name,
          price: basePrice,
          images: product.images ?? (product.thumbnail ? [product.thumbnail] : []),
          isTaxable: typeof product.isTaxable === "boolean" ? product.isTaxable : true,
          variants: variants.map((variant) => ({
            id: variant.id,
            name: variant.name || "Default",
            calculatedPrice: Number.isFinite(variant.calculatedPrice)
              ? variant.calculatedPrice
              : basePrice,
            isDefault: Boolean(variant.isDefault),
          })),
          reportingCategoryId: product.reportingCategoryId ?? null,
          productType: product.productType,
        },
      });
    });
  });

  return normalized;
};

const AddOns = ({ productId, onSelectionChange }) => {
  const [addons, setAddons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selections, setSelections] = useState({});

  useEffect(() => {
    let active = true;
    setAddons([]);
    setSelections({});

    if (!productId) {
      return () => {
        active = false;
      };
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getAddonGroupsForProduct(productId);
        if (!active) return;
        setAddons(normalizeAddOns(data));
      } catch (err) {
        console.error("Failed to load add-on groups:", err);
        if (active) {
          setError("Unable to load add-ons right now.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      active = false;
    };
  }, [productId]);

  const addonsById = useMemo(() => {
    const map = new Map();
    addons.forEach((addon) => map.set(addon.id, addon));
    return map;
  }, [addons]);

  useEffect(() => {
    if (typeof onSelectionChange !== "function") {
      return;
    }

    const selected = Object.entries(selections)
      .filter(([, value]) => value.selected)
      .map(([id, value]) => {
        const addon = addonsById.get(id);
        if (!addon) {
          return null;
        }

        const variant = addon.variants.find((entry) => entry.id === value.variantId)
          ?? addon.variants[0]
          ?? null;

        const variantId = variant?.id ?? null;
        const variantPrice = Number.isFinite(variant?.calculatedPrice)
          ? variant.calculatedPrice
          : addon.basePrice;

        return {
          product: {
            ...addon.rawProduct,
            price: variantPrice,
          },
          variantId,
        };
      })
      .filter(Boolean);

    onSelectionChange(selected);
  }, [selections, addonsById, onSelectionChange]);

  const toggleAddon = (addon) => {
    setSelections((prev) => {
      const current = prev[addon.id];
      const currentlySelected = current?.selected ?? false;
      const defaultVariantId = addon.defaultVariantId ?? addon.variants[0]?.id ?? null;
      return {
        ...prev,
        [addon.id]: {
          selected: !currentlySelected,
          variantId: current?.variantId ?? defaultVariantId,
        },
      };
    });
  };

  const handleVariantChange = (addon, variantId) => {
    setSelections((prev) => ({
      ...prev,
      [addon.id]: {
        selected: prev[addon.id]?.selected ?? false,
        variantId,
      },
    }));
  };

  if (loading || addons.length === 0) {
    return null;
  }

  if (error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-900/20 dark:text-red-200">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {addons.map((addon) => {
        const selection = selections[addon.id];
        const isSelected = selection?.selected ?? false;
        const selectedVariantId = selection?.variantId ?? addon.defaultVariantId ?? addon.variants[0]?.id ?? null;
        const selectedVariant = addon.variants.find((variant) => variant.id === selectedVariantId) ?? addon.variants[0] ?? null;
        const displayPrice = Number.isFinite(selectedVariant?.calculatedPrice)
          ? selectedVariant.calculatedPrice
          : addon.basePrice;
        const imageSrc = addon.image || placeholderImage;

        return (
          <div
            key={addon.id}
            className="flex items-center gap-4 rounded-lg border border-stroke p-4 dark:border-dark-3"
          >
            <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-dark-3">
              <img
                src={imageSrc}
                alt={addon.name}
                className="h-full w-full object-cover"
              />
            </div>

            <div className="flex-1">
              <h4 className="mb-1 text-sm font-medium text-dark dark:text-white">
                {addon.name}
              </h4>
              <p className="mb-2 text-xs text-body-color dark:text-dark-6">
                ${displayPrice.toFixed(2)}
              </p>

              {addon.variants.length > 1 && (
                <div className="relative">
                  <select
                    value={selectedVariantId || ''}
                    onChange={(event) => handleVariantChange(addon, event.target.value)}
                    className="w-full appearance-none rounded-lg border border-stroke bg-white px-4 py-2 pr-10 text-sm text-dark outline-hidden transition focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                  >
                    {addon.variants.map((variant) => (
                      <option key={variant.id} value={variant.id}>
                        {variant.name || 'Option'} (${(variant.calculatedPrice ?? addon.basePrice).toFixed(2)})
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="text-body-color dark:text-dark-6"
                    >
                      <path
                        d="M8 10.5C7.85 10.5 7.725 10.45 7.6 10.375L3.15 5.925C2.975 5.75 2.975 5.45 3.15 5.275C3.325 5.1 3.625 5.1 3.8 5.275L8 9.475L12.2 5.275C12.375 5.1 12.675 5.1 12.85 5.275C13.025 5.45 13.025 5.75 12.85 5.925L8.4 10.375C8.275 10.45 8.15 10.5 8 10.5Z"
                        fill="currentColor"
                      />
                    </svg>
                  </span>
                </div>
              )}
            </div>

            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleAddon(addon)}
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-stroke after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:bg-dark-3 dark:after:border-gray-600"></div>
            </label>
          </div>
        );
      })}
    </div>
  );
};

AddOns.propTypes = {
  productId: PropTypes.string,
  onSelectionChange: PropTypes.func,
};

export default AddOns;

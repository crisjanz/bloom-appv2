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

const AddOns = ({ productId, onSelectionChange, onStateChange }) => {
  const [addons, setAddons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selections, setSelections] = useState({});
  const [activeAddonId, setActiveAddonId] = useState(null);

  useEffect(() => {
    let active = true;
    setAddons([]);
    setSelections({});
    setActiveAddonId(null);

    if (!productId) {
      setLoading(false);
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

  useEffect(() => {
    if (typeof onStateChange !== "function") {
      return;
    }

    onStateChange({
      loading,
      error,
      count: addons.length,
    });
  }, [loading, error, addons, onStateChange]);

  useEffect(() => {
    if (!activeAddonId) {
      return;
    }

    if (!addonsById.has(activeAddonId)) {
      setActiveAddonId(null);
    }
  }, [activeAddonId, addonsById]);

  useEffect(() => {
    if (!activeAddonId) {
      return;
    }

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setActiveAddonId(null);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [activeAddonId]);

  const activeAddon = activeAddonId ? addonsById.get(activeAddonId) ?? null : null;

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

  const resolveAddonState = (addon) => {
    const selection = selections[addon.id];
    const isSelected = selection?.selected ?? false;
    const selectedVariantId =
      selection?.variantId ??
      addon.defaultVariantId ??
      addon.variants[0]?.id ??
      null;
    const selectedVariant =
      addon.variants.find((variant) => variant.id === selectedVariantId) ??
      addon.variants[0] ??
      null;
    const displayPrice = Number.isFinite(selectedVariant?.calculatedPrice)
      ? selectedVariant.calculatedPrice
      : addon.basePrice;

    return {
      isSelected,
      selectedVariantId,
      selectedVariant,
      displayPrice,
    };
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

  const activeState = activeAddon ? resolveAddonState(activeAddon) : null;

  if (error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-900/20 dark:text-red-200">
        {error}
      </div>
    );
  }

  if (loading || addons.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      {activeAddon && activeState ? (
        <div className="relative space-y-3 rounded-2xl border border-stroke bg-white p-4 pt-5 shadow-sm dark:border-dark-3 dark:bg-dark-2">
          <button
            type="button"
            onClick={() => setActiveAddonId(null)}
            className="absolute right-3 top-3 rounded-full p-1 text-body-color transition hover:text-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary dark:text-dark-6 dark:hover:text-white"
            aria-label="Close add-on details"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M15.3125 5.9375C15.6563 5.59375 15.6563 5.03125 15.3125 4.6875C14.9688 4.34375 14.4063 4.34375 14.0625 4.6875L10 8.75L5.9375 4.6875C5.59375 4.34375 5.03125 4.34375 4.6875 4.6875C4.34375 5.03125 4.34375 5.59375 4.6875 5.9375L8.75 10L4.6875 14.0625C4.34375 14.4062 4.34375 14.9687 4.6875 15.3125C5.03125 15.6562 5.59375 15.6562 5.9375 15.3125L10 11.25L14.0625 15.3125C14.4063 15.6562 14.9688 15.6562 15.3125 15.3125C15.6563 14.9687 15.6563 14.4062 15.3125 14.0625L11.25 10L15.3125 5.9375Z"
                fill="currentColor"
              />
            </svg>
          </button>

          <div className="flex items-start gap-3">
            <div className="relative h-[100px] w-[100px] flex-shrink-0 overflow-hidden rounded-2xl bg-gray-100 dark:bg-dark-3">
              <img
                src={activeAddon.image || placeholderImage}
                alt={activeAddon.name}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex-1">
              <h4 className="text-base font-semibold text-dark dark:text-white">
                {activeAddon.name}
              </h4>
              <p className="mt-1 text-sm font-medium text-body-color dark:text-dark-6">
                ${activeState.displayPrice.toFixed(2)}
              </p>

              {activeAddon.variants.length > 1 && (
                <div className="mt-2.5">
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-body-color dark:text-dark-6">
                    Choose an option
                  </label>
                  <div className="relative">
                    <select
                      value={activeState.selectedVariantId || ""}
                      onChange={(event) => handleVariantChange(activeAddon, event.target.value)}
                      className="w-full appearance-none rounded-xl border border-stroke bg-white px-3 py-2 pr-10 text-sm text-dark outline-hidden transition focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                    >
                      {activeAddon.variants.map((variant) => (
                        <option key={variant.id} value={variant.id}>
                          {variant.name || "Option"} (
                          {(Number.isFinite(variant.calculatedPrice) ? variant.calculatedPrice : activeAddon.basePrice).toFixed(2)})
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
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-gray-50 p-3 dark:bg-dark-3/50">
            <div>
              <p className="text-sm font-medium text-dark dark:text-white">
                Add this to my order
              </p>
              <p className="text-xs text-body-color dark:text-dark-6">
                Toggle to include {activeAddon.name}.
              </p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={activeState.isSelected}
                onChange={() => toggleAddon(activeAddon)}
                className="peer sr-only"
              />
              <div className="peer h-7 w-12 rounded-full bg-stroke after:absolute after:left-[3px] after:top-[3px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:bg-dark-3 dark:after:border-gray-600"></div>
            </label>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {addons.map((addon) => {
            const { isSelected } = resolveAddonState(addon);
            const imageSrc = addon.image || placeholderImage;

            return (
              <button
                type="button"
                key={addon.id}
                onClick={() => setActiveAddonId(addon.id)}
                className="group relative aspect-square overflow-hidden rounded-2xl bg-gray-100 transition duration-300 hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary dark:bg-dark-3"
              >
                <img
                  src={imageSrc}
                  alt={addon.name}
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                />
                {isSelected && (
                  <span className="absolute right-2 top-2 inline-flex items-center rounded-full bg-primary px-2 py-1 text-[11px] font-semibold text-white">
                    Added
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

AddOns.propTypes = {
  productId: PropTypes.string,
  onSelectionChange: PropTypes.func,
  onStateChange: PropTypes.func,
};

export default AddOns;

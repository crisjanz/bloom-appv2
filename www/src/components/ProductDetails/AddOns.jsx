import { useState, useEffect } from "react";
import { getAddons } from "../../services/addonService";
import { useCart } from "../../contexts/CartContext";
import placeholderImage from "../../assets/ecom-images/products/product-carousel-02/image-01.jpg";

const AddOns = () => {
  const [addons, setAddons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAddons, setSelectedAddons] = useState(new Set());
  const { addToCart } = useCart();

  useEffect(() => {
    async function loadAddons() {
      try {
        const addonProducts = await getAddons(6);
        setAddons(addonProducts);
      } catch (error) {
        console.error('Failed to load add-ons:', error);
      } finally {
        setLoading(false);
      }
    }

    loadAddons();
  }, []);

  const toggleAddon = (addonId) => {
    setSelectedAddons(prev => {
      const newSet = new Set(prev);
      if (newSet.has(addonId)) {
        newSet.delete(addonId);
      } else {
        newSet.add(addonId);
      }
      return newSet;
    });
  };

  const handleAddSelectedAddons = () => {
    const addonsToAdd = addons.filter(addon => selectedAddons.has(addon.id));
    addonsToAdd.forEach(addon => {
      addToCart(addon);
    });
    setSelectedAddons(new Set()); // Clear selections
  };

  if (loading) {
    return null;
  }

  if (addons.length === 0) {
    return null;
  }

  return (
    <div className="mb-8 border-t border-stroke pt-8 dark:border-dark-3">
      <h3 className="mb-6 text-xl font-semibold text-dark dark:text-white">
        Make it Extra Special
      </h3>
      <p className="mb-6 text-base text-body-color dark:text-dark-6">
        Add these special touches to your order:
      </p>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
        {addons.map((addon) => (
          <div
            key={addon.id}
            onClick={() => toggleAddon(addon.id)}
            className={`cursor-pointer overflow-hidden rounded-lg border-2 transition-all ${
              selectedAddons.has(addon.id)
                ? 'border-primary bg-primary/5'
                : 'border-stroke hover:border-primary/50 dark:border-dark-3'
            }`}
          >
            <div className="relative">
              <img
                src={addon.images?.[0] || placeholderImage}
                alt={addon.name}
                className="h-32 w-full object-cover"
              />
              {selectedAddons.has(addon.id) && (
                <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M13.5 4.5L6 12L2.5 8.5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </div>
              )}
            </div>
            <div className="p-3 text-center">
              <p className="mb-1 text-sm font-semibold text-dark dark:text-white">
                {addon.name}
              </p>
              <p className="text-sm font-medium text-primary">
                +${addon.price.toFixed(2)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {selectedAddons.size > 0 && (
        <div className="mt-6">
          <button
            onClick={handleAddSelectedAddons}
            className="w-full rounded-md bg-secondary px-6 py-3 text-center text-base font-medium text-white hover:bg-secondary/90"
          >
            Add {selectedAddons.size} Add-on{selectedAddons.size > 1 ? 's' : ''} to Cart
          </button>
        </div>
      )}
    </div>
  );
};

export default AddOns;

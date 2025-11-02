import { useState, useEffect } from "react";
import ComponentCardCollapsible from "@shared/ui/common/ComponentCardCollapsible";
import InputField from "@shared/ui/forms/input/InputField";
import Label from "@shared/ui/forms/Label";
import Button from "@shared/ui/components/ui/button/Button";

interface HeroBanner {
  id: string;
  position: number;
  title: string;
  details: string | null;
  buttonText: string;
  link: string;
  imageUrl: string;
  isActive: boolean;
}

const HeroBannersCard = () => {
  const [banners, setBanners] = useState<HeroBanner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingBannerId, setSavingBannerId] = useState<string | null>(null);

  useEffect(() => {
    loadBanners();
  }, []);

  const loadBanners = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/settings/homepage/banners');
      if (response.ok) {
        const data = await response.json();
        setBanners(data.sort((a: HeroBanner, b: HeroBanner) => a.position - b.position));
      }
    } catch (error) {
      console.error('Failed to load hero banners:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBannerUpdate = (position: number, field: keyof HeroBanner, value: any) => {
    setBanners((prev) =>
      prev.map((banner) =>
        banner.position === position ? { ...banner, [field]: value } : banner
      )
    );
  };

  const handleSaveBanner = async (banner: HeroBanner) => {
    setSavingBannerId(banner.id);
    try {
      const response = await fetch(`/api/settings/homepage/banners/${banner.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: banner.title,
          details: banner.details,
          buttonText: banner.buttonText,
          link: banner.link,
          imageUrl: banner.imageUrl,
          isActive: banner.isActive,
        }),
      });

      if (response.ok) {
        alert(`Banner ${banner.position} saved successfully`);
      } else {
        alert(`Failed to save banner ${banner.position}`);
      }
    } catch (error) {
      console.error('Failed to save banner:', error);
      alert(`Failed to save banner ${banner.position}`);
    } finally {
      setSavingBannerId(null);
    }
  };

  return (
    <ComponentCardCollapsible title="Hero Banners (3 Slots)" defaultOpen={false}>
      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <div className="space-y-6">
          {banners.map((banner) => (
            <div key={banner.id} className="border-b pb-6 last:border-b-0 last:pb-0">
              <h3 className="text-lg font-semibold mb-4">Banner {banner.position}</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor={`title-${banner.position}`}>Title</Label>
                  <InputField
                    id={`title-${banner.position}`}
                    type="text"
                    value={banner.title}
                    onChange={(e) => handleBannerUpdate(banner.position, 'title', e.target.value)}
                    placeholder="Enter banner title"
                  />
                </div>

                <div>
                  <Label htmlFor={`details-${banner.position}`}>Details (Optional)</Label>
                  <textarea
                    id={`details-${banner.position}`}
                    value={banner.details || ""}
                    onChange={(e) => handleBannerUpdate(banner.position, 'details', e.target.value)}
                    className="w-full rounded border border-stroke bg-transparent py-3 px-5 outline-none transition focus:border-primary dark:border-form-strokedark dark:bg-form-input"
                    rows={2}
                    placeholder="Enter banner details"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`buttonText-${banner.position}`}>Button Text</Label>
                    <InputField
                      id={`buttonText-${banner.position}`}
                      type="text"
                      value={banner.buttonText}
                      onChange={(e) => handleBannerUpdate(banner.position, 'buttonText', e.target.value)}
                      placeholder="Shop Now"
                    />
                  </div>

                  <div>
                    <Label htmlFor={`link-${banner.position}`}>Link URL</Label>
                    <InputField
                      id={`link-${banner.position}`}
                      type="text"
                      value={banner.link}
                      onChange={(e) => handleBannerUpdate(banner.position, 'link', e.target.value)}
                      placeholder="/products or https://example.com"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor={`imageUrl-${banner.position}`}>Image URL</Label>
                  <InputField
                    id={`imageUrl-${banner.position}`}
                    type="text"
                    value={banner.imageUrl}
                    onChange={(e) => handleBannerUpdate(banner.position, 'imageUrl', e.target.value)}
                    placeholder="https://example.com/banner.jpg or /images/banner.jpg"
                  />
                  {banner.imageUrl && (
                    <div className="mt-2">
                      <img
                        src={banner.imageUrl}
                        alt={`Banner ${banner.position} preview`}
                        className="h-32 w-auto rounded border border-stroke object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`isActive-${banner.position}`}
                    checked={banner.isActive}
                    onChange={(e) => handleBannerUpdate(banner.position, 'isActive', e.target.checked)}
                    className="h-5 w-5"
                  />
                  <Label htmlFor={`isActive-${banner.position}`} className="mb-0">
                    Show this banner
                  </Label>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={() => handleSaveBanner(banner)}
                    disabled={savingBannerId === banner.id}
                    className="bg-primary text-white"
                  >
                    {savingBannerId === banner.id ? 'Saving...' : `Save Banner ${banner.position}`}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </ComponentCardCollapsible>
  );
};

export default HeroBannersCard;

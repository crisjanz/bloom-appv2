import { useState, useEffect } from "react";
import ComponentCardCollapsible from "@shared/ui/common/ComponentCardCollapsible";
import InputField from "@shared/ui/forms/input/InputField";
import Label from "@shared/ui/forms/Label";
import Select from "@shared/ui/forms/Select";
import Button from "@shared/ui/components/ui/button/Button";

interface AnnouncementBannerData {
  message: string;
  bgColor: string;
  textColor: string;
  fontSize: string;
  fontWeight: string;
  isActive: boolean;
  link: string;
}

const AnnouncementBannerCard = () => {
  const [formData, setFormData] = useState<AnnouncementBannerData>({
    message: "",
    bgColor: "#f8d7da",
    textColor: "#721c24",
    fontSize: "base",
    fontWeight: "normal",
    isActive: false,
    link: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/settings/homepage');
      if (response.ok) {
        const data = await response.json();
        if (data.announcementBanner) {
          setFormData(data.announcementBanner);
        }
      }
    } catch (error) {
      console.error('Failed to load announcement banner settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/settings/homepage', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ announcementBanner: formData }),
      });

      if (response.ok) {
        alert('Announcement banner saved successfully');
      } else {
        alert('Failed to save announcement banner');
      }
    } catch (error) {
      console.error('Failed to save announcement banner:', error);
      alert('Failed to save announcement banner');
    } finally {
      setIsSaving(false);
    }
  };

  const fontSizeOptions = [
    { value: "sm", label: "Small" },
    { value: "base", label: "Base" },
    { value: "lg", label: "Large" },
    { value: "xl", label: "Extra Large" },
  ];

  const fontWeightOptions = [
    { value: "normal", label: "Normal" },
    { value: "medium", label: "Medium" },
    { value: "semibold", label: "Semibold" },
    { value: "bold", label: "Bold" },
  ];

  return (
    <ComponentCardCollapsible title="Announcement Banner" defaultOpen={true}>
      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <div className="space-y-4">
          <div>
            <Label htmlFor="message">Message</Label>
            <textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="w-full rounded border border-stroke bg-transparent py-3 px-5 outline-none transition focus:border-primary dark:border-form-strokedark dark:bg-form-input"
              rows={3}
              placeholder="Enter announcement message"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="bgColor">Background Color</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  id="bgColor"
                  value={formData.bgColor}
                  onChange={(e) => setFormData({ ...formData, bgColor: e.target.value })}
                  className="h-11 w-14 rounded border border-stroke"
                />
                <InputField
                  id="bgColorText"
                  type="text"
                  value={formData.bgColor}
                  onChange={(e) => setFormData({ ...formData, bgColor: e.target.value })}
                  placeholder="#f8d7da"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="textColor">Text Color</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  id="textColor"
                  value={formData.textColor}
                  onChange={(e) => setFormData({ ...formData, textColor: e.target.value })}
                  className="h-11 w-14 rounded border border-stroke"
                />
                <InputField
                  id="textColorText"
                  type="text"
                  value={formData.textColor}
                  onChange={(e) => setFormData({ ...formData, textColor: e.target.value })}
                  placeholder="#721c24"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fontSize">Font Size</Label>
              <Select
                id="fontSize"
                value={formData.fontSize}
                onChange={(value) => setFormData({ ...formData, fontSize: value })}
                options={fontSizeOptions}
              />
            </div>

            <div>
              <Label htmlFor="fontWeight">Font Weight</Label>
              <Select
                id="fontWeight"
                value={formData.fontWeight}
                onChange={(value) => setFormData({ ...formData, fontWeight: value })}
                options={fontWeightOptions}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="link">Link URL (Optional)</Label>
            <InputField
              id="link"
              type="text"
              value={formData.link}
              onChange={(e) => setFormData({ ...formData, link: e.target.value })}
              placeholder="/sales or https://example.com"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="h-5 w-5"
            />
            <Label htmlFor="isActive" className="mb-0">Show announcement banner on website</Label>
          </div>

          {formData.message && (
            <div className="border-t pt-4">
              <Label>Preview</Label>
              <div
                style={{
                  backgroundColor: formData.bgColor,
                  color: formData.textColor,
                  fontSize: formData.fontSize === 'sm' ? '14px' : formData.fontSize === 'base' ? '16px' : formData.fontSize === 'lg' ? '18px' : '20px',
                  fontWeight: formData.fontWeight,
                  padding: '12px 20px',
                  textAlign: 'center',
                  borderRadius: '4px',
                }}
              >
                {formData.message}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-primary text-white"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      )}
    </ComponentCardCollapsible>
  );
};

export default AnnouncementBannerCard;

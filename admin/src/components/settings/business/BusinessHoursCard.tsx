import { useState, useEffect } from "react";
import ComponentCardCollapsible from "../../common/ComponentCardCollapsible";
import InputField from "../../form/input/InputField";
import Label from "../../form/Label";
import Button from "../../ui/button/Button";
import Select from "../../form/Select";

interface BusinessHours {
  id?: string;
  timezone: string;
  mondayOpen: string;
  mondayClose: string;
  mondayEnabled: boolean;
  tuesdayOpen: string;
  tuesdayClose: string;
  tuesdayEnabled: boolean;
  wednesdayOpen: string;
  wednesdayClose: string;
  wednesdayEnabled: boolean;
  thursdayOpen: string;
  thursdayClose: string;
  thursdayEnabled: boolean;
  fridayOpen: string;
  fridayClose: string;
  fridayEnabled: boolean;
  saturdayOpen: string;
  saturdayClose: string;
  saturdayEnabled: boolean;
  sundayOpen: string;
  sundayClose: string;
  sundayEnabled: boolean;
}

const BusinessHoursCard = () => {
  const [formData, setFormData] = useState<BusinessHours>({
    timezone: "America/Vancouver",
    mondayOpen: "09:00",
    mondayClose: "17:00",
    mondayEnabled: true,
    tuesdayOpen: "09:00",
    tuesdayClose: "17:00",
    tuesdayEnabled: true,
    wednesdayOpen: "09:00",
    wednesdayClose: "17:00",
    wednesdayEnabled: true,
    thursdayOpen: "09:00",
    thursdayClose: "17:00",
    thursdayEnabled: true,
    fridayOpen: "09:00",
    fridayClose: "17:00",
    fridayEnabled: true,
    saturdayOpen: "09:00",
    saturdayClose: "17:00",
    saturdayEnabled: true,
    sundayOpen: "10:00",
    sundayClose: "16:00",
    sundayEnabled: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const days = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' },
  ];

const timezones = [
  { value: "America/Vancouver", label: "Pacific Time (Vancouver)" },
  { value: "America/Edmonton", label: "Mountain Time (Edmonton)" },
  { value: "America/Toronto", label: "Eastern Time (Toronto)" },
  { value: "America/New_York", label: "Eastern Time (New York)" },
  { value: "America/Chicago", label: "Central Time (Chicago)" },
  { value: "America/Denver", label: "Mountain Time (Denver)" },
  { value: "America/Los_Angeles", label: "Pacific Time (Los Angeles)" },
];

  useEffect(() => {
    loadBusinessHours();
  }, []);

  const loadBusinessHours = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/settings/business-hours');
      if (response.ok) {
        const data = await response.json();
        setFormData({
          timezone: data.timezone || "America/Vancouver",
          mondayOpen: data.mondayOpen || "09:00",
          mondayClose: data.mondayClose || "17:00",
          mondayEnabled: data.mondayEnabled !== false,
          tuesdayOpen: data.tuesdayOpen || "09:00",
          tuesdayClose: data.tuesdayClose || "17:00",
          tuesdayEnabled: data.tuesdayEnabled !== false,
          wednesdayOpen: data.wednesdayOpen || "09:00",
          wednesdayClose: data.wednesdayClose || "17:00",
          wednesdayEnabled: data.wednesdayEnabled !== false,
          thursdayOpen: data.thursdayOpen || "09:00",
          thursdayClose: data.thursdayClose || "17:00",
          thursdayEnabled: data.thursdayEnabled !== false,
          fridayOpen: data.fridayOpen || "09:00",
          fridayClose: data.fridayClose || "17:00",
          fridayEnabled: data.fridayEnabled !== false,
          saturdayOpen: data.saturdayOpen || "09:00",
          saturdayClose: data.saturdayClose || "17:00",
          saturdayEnabled: data.saturdayEnabled !== false,
          sundayOpen: data.sundayOpen || "10:00",
          sundayClose: data.sundayClose || "16:00",
          sundayEnabled: data.sundayEnabled === true,
        });
      }
    } catch (error) {
      console.error('Failed to load business hours:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof BusinessHours, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/settings/business-hours', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        console.log('Business hours saved successfully');
        await loadBusinessHours();
      } else {
        console.error('Failed to save business hours');
      }
    } catch (error) {
      console.error('Error saving business hours:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const copyHoursToAll = (sourceDay: string) => {
    const openField = `${sourceDay}Open` as keyof BusinessHours;
    const closeField = `${sourceDay}Close` as keyof BusinessHours;
    const enabledField = `${sourceDay}Enabled` as keyof BusinessHours;
    
    const updates: Partial<BusinessHours> = {};
    
    days.forEach(day => {
      if (day.key !== sourceDay) {
        updates[`${day.key}Open` as keyof BusinessHours] = formData[openField] as string;
        updates[`${day.key}Close` as keyof BusinessHours] = formData[closeField] as string;
        updates[`${day.key}Enabled` as keyof BusinessHours] = formData[enabledField] as boolean;
      }
    });

    setFormData(prev => ({ ...prev, ...updates }));
  };

  if (isLoading) {
    return (
      <ComponentCardCollapsible title="Business Hours" desc="Store operating hours and timezone">
        <div className="animate-pulse">Loading business hours...</div>
      </ComponentCardCollapsible>
    );
  }

  return (
    <ComponentCardCollapsible 
      title="Business Hours" 
      desc="Store operating hours and timezone"
      defaultOpen={false}
    >
      <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6">
        {/* Timezone */}
       <div>
  <Label htmlFor="timezone">Timezone</Label>
  <Select
    options={timezones}
    placeholder="Select Timezone"
    value={formData.timezone}
    onChange={(value) => handleInputChange('timezone', value)}
    className="dark:bg-dark-900"
  />
</div>

        {/* Hours for each day */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-800 dark:text-white">Weekly Schedule</h3>
          
          {days.map(day => (
            <div key={day.key} className="grid grid-cols-12 gap-4 items-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
              {/* Day name */}
              <div className="col-span-2">
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {day.label}
                </span>
              </div>

              {/* Enabled toggle */}
              <div className="col-span-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData[`${day.key}Enabled` as keyof BusinessHours] as boolean}
                    onChange={(e) => handleInputChange(`${day.key}Enabled` as keyof BusinessHours, e.target.checked)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Open</span>
                </label>
              </div>

              {/* Open time */}
              <div className="col-span-3">
                <InputField
                  type="time"
                  value={formData[`${day.key}Open` as keyof BusinessHours] as string}
                  onChange={(e) => handleInputChange(`${day.key}Open` as keyof BusinessHours, e.target.value)}
                  disabled={!(formData[`${day.key}Enabled` as keyof BusinessHours] as boolean)}
                />
              </div>

              {/* Close time */}
              <div className="col-span-3">
                <InputField
                  type="time"
                  value={formData[`${day.key}Close` as keyof BusinessHours] as string}
                  onChange={(e) => handleInputChange(`${day.key}Close` as keyof BusinessHours, e.target.value)}
                  disabled={!(formData[`${day.key}Enabled` as keyof BusinessHours] as boolean)}
                />
              </div>

              {/* Copy button */}
              <div className="col-span-2">
                <button
                  type="button"
                  onClick={() => copyHoursToAll(day.key)}
                  className="text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 px-2 py-1 rounded text-gray-600 dark:text-gray-300"
                >
                  Copy to all
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isSaving}
            className="bg-primary hover:bg-primary/90 text-white px-6 py-2"
          >
            {isSaving ? 'Saving...' : 'Save Business Hours'}
          </Button>
        </div>
      </form>
    </ComponentCardCollapsible>
  );
};

export default BusinessHoursCard;
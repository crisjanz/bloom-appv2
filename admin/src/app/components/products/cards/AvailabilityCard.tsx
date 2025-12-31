import { FC } from "react";
import ComponentCard from "@shared/ui/common/ComponentCard";
import InputField from "@shared/ui/forms/input/InputField";
import Checkbox from "@shared/ui/forms/input/Checkbox";
import Select from "@shared/ui/forms/Select";
import DatePicker from "@shared/ui/forms/date-picker";

type Props = {
  availabilityType: string;
  holidayPreset: string;
  availableFrom: string;
  availableTo: string;
  notAvailableFrom: string;
  notAvailableUntil: string;
  isTemporarilyUnavailable: boolean;
  unavailableUntil: string;
  unavailableMessage: string;
  onChange: (field: string, value: any) => void;
};

const AvailabilityCard: FC<Props> = ({
  availabilityType,
  holidayPreset,
  availableFrom,
  availableTo,
  notAvailableFrom,
  notAvailableUntil,
  isTemporarilyUnavailable,
  unavailableUntil,
  unavailableMessage,
  onChange,
}) => {
  const availabilityOptions = [
    { value: "always", label: "Always Available" },
    { value: "seasonal", label: "Seasonal" },
    { value: "manual-unavailable", label: "Manual Not Available" }
  ];

  const holidayOptions = [
    { value: "christmas", label: "Christmas (Dec 1 – Dec 26)" },
    { value: "valentines", label: "Valentine's Day (Feb 1 – Feb 14)" },
    { value: "easter", label: "Easter (based on year)" },
    { value: "mothers-day", label: "Mother's Day (May 1 – May 14)" },
    { value: "thanksgiving", label: "Thanksgiving (Oct 1 – Oct 14)" },
    { value: "custom", label: "Custom Holiday" }
  ];

  const getHolidayDates = (preset: string, year: number = new Date().getFullYear()) => {
    switch (preset) {
      case "christmas":
        return {
          from: `${year}-12-01`,
          to: `${year}-12-26`
        };
      case "valentines":
        return {
          from: `${year}-02-01`,
          to: `${year}-02-14`
        };
      case "mothers-day":
        return {
          from: `${year}-05-01`,
          to: `${year}-05-14`
        };
      case "thanksgiving":
        return {
          from: `${year}-10-01`,
          to: `${year}-10-14`
        };
      case "easter":
        // Easter calculation algorithm
        const a = year % 19;
        const b = Math.floor(year / 100);
        const c = year % 100;
        const d = Math.floor(b / 4);
        const e = b % 4;
        const f = Math.floor((b + 8) / 25);
        const g = Math.floor((b - f + 1) / 3);
        const h = (19 * a + b - d - g + 15) % 30;
        const i = Math.floor(c / 4);
        const k = c % 4;
        const l = (32 + 2 * e + 2 * i - h - k) % 7;
        const m = Math.floor((a + 11 * h + 22 * l) / 451);
        const month = Math.floor((h + l - 7 * m + 114) / 31);
        const day = ((h + l - 7 * m + 114) % 31) + 1;
        
        const easterDate = new Date(year, month - 1, day);
        const twoWeeksBefore = new Date(easterDate);
        twoWeeksBefore.setDate(easterDate.getDate() - 14);
        
        return {
          from: twoWeeksBefore.toISOString().split('T')[0],
          to: easterDate.toISOString().split('T')[0]
        };
      default:
        return { from: "", to: "" };
    }
  };

  const handleHolidayPresetChange = (preset: string) => {
    onChange("holidayPreset", preset);
    
    if (preset !== "custom") {
      const dates = getHolidayDates(preset);
      
      // For seasonal: set available dates
      if (availabilityType === "seasonal") {
        onChange("availableFrom", dates.from);
        onChange("availableTo", dates.to);
      }
      // For manual not available: set not available dates
      else if (availabilityType === "manual-unavailable") {
        onChange("notAvailableFrom", dates.from);
        onChange("notAvailableUntil", dates.to);
      }
    }
  };

  return (
    <ComponentCard title="Availability">
      {/* Section 1: Availability Type */}
      <div className="mb-5.5">
        <label className="mb-2.5 block text-sm font-medium text-black dark:text-white">
          Availability Type
        </label>
        <Select
          options={availabilityOptions}
          placeholder="Select availability type"
          value={availabilityType}
          onChange={(value) => onChange("availabilityType", value)}
          className="focus:border-brand-500"
        />
      </div>

      {/* Section 2A: Seasonal Options (only if seasonal selected) */}
      {availabilityType === "seasonal" && (
        <div className="mb-5.5 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h4 className="text-sm font-medium text-black dark:text-white mb-3">
            Seasonal Settings
          </h4>
          
          <div className="mb-4">
            <label className="mb-2.5 block text-sm font-medium text-black dark:text-white">
              Holiday Preset
            </label>
            <Select
              options={holidayOptions}
              placeholder="Select holiday preset"
              value={holidayPreset}
              onChange={handleHolidayPresetChange}
              className="focus:border-brand-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
<DatePicker
  id="seasonal-available-from"
  label="Available From"
  placeholder="Select start date"
  defaultDate={availableFrom || undefined} // Fix here too
  onChange={(selectedDates) => {
    if (selectedDates.length > 0) {
      const date = selectedDates[0].toISOString().split('T')[0];
      onChange("availableFrom", date);
    }
  }}
/>
<DatePicker
  id="seasonal-available-to"
  label="Available Until"
  placeholder="Select end date"
  defaultDate={availableTo || undefined} // Fix here too
  onChange={(selectedDates) => {
    if (selectedDates.length > 0) {
      const date = selectedDates[0].toISOString().split('T')[0];
      onChange("availableTo", date);
    }
  }}
/>
          </div>
        </div>
      )}

      {/* Section 2B: Manual Not Available Options (only if manual-unavailable selected) */}
      {availabilityType === "manual-unavailable" && (
        <div className="mb-5.5 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <h4 className="text-sm font-medium text-black dark:text-white mb-3">
            Not Available Period
          </h4>
          
          <div className="mb-4">
            <label className="mb-2.5 block text-sm font-medium text-black dark:text-white">
              Holiday Preset (Optional)
            </label>
            <Select
              options={holidayOptions}
              placeholder="Select holiday preset"
              value={holidayPreset}
              onChange={handleHolidayPresetChange}
              className="focus:border-brand-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DatePicker
        id="manual-not-available-from"
        label="Not Available From"
        placeholder="Select start date"
        defaultDate={notAvailableFrom || undefined} // Fix: use undefined instead of empty string
        onChange={(selectedDates) => {
          if (selectedDates.length > 0) {
            const date = selectedDates[0].toISOString().split('T')[0];
            onChange("notAvailableFrom", date);
          }
        }}
      />
      <DatePicker
        id="manual-not-available-until"
        label="Not Available Until"
        placeholder="Select end date"
        defaultDate={notAvailableUntil || undefined} // Fix: use undefined instead of empty string
        onChange={(selectedDates) => {
          if (selectedDates.length > 0) {
            const date = selectedDates[0].toISOString().split('T')[0];
            onChange("notAvailableUntil", date);
          }
        }}
      />
    </div>
  </div>
)}


{/* Section 3: Universal Temporary Unavailable */}
<div className="mb-5.5 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
  <div className="flex items-center mb-3">
    <Checkbox
      label="Mark as temporarily unavailable"
      id="isTemporarilyUnavailable"
      checked={isTemporarilyUnavailable}
      onChange={(checked) => onChange("isTemporarilyUnavailable", checked)} // Fixed: pass boolean directly
      className="checked:bg-brand-500"
    />
  </div>

  {isTemporarilyUnavailable && (
 <DatePicker
  id="temporarily-unavailable-until"
  label="Unavailable Until"
  placeholder="Select date when available again"
  defaultDate={unavailableUntil || undefined} // Fix here too
  onChange={(selectedDates) => {
    if (selectedDates.length > 0) {
      const date = selectedDates[0].toISOString().split('T')[0];
      onChange("unavailableUntil", date);
    }
  }}
/>
  )}
</div>

      {/* Section 4: Universal Not Available Message */}
      <InputField
        label="Not Available Message"
        name="unavailableMessage"
        type="text"
        value={unavailableMessage}
        onChange={(e) => onChange("unavailableMessage", e.target.value)}
        placeholder="e.g., Waiting on white lilies"
        className="focus:border-brand-500"
      />
    </ComponentCard>
  );
};

export default AvailabilityCard;
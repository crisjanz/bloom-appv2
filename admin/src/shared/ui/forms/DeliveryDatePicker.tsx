import { useEffect, useState, useRef } from "react";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";
import Label from "./Label";
import { CalenderIcon } from "@shared/assets/icons";
import { useBusinessTimezone } from "@shared/hooks/useBusinessTimezone";

// ✅ Updated custom styles with better tooltip positioning
const customStyles = `
  .flatpickr-day.delivery-disabled {
    background-color: #fef2f2 !important;
    border-color: #fecaca !important;
    color: #dc2626 !important;
    cursor: not-allowed !important;
    position: relative;
  }
  
  .flatpickr-day.delivery-disabled:hover {
    background-color: #fee2e2 !important;
    border-color: #fca5a5 !important;
  }
  
  .dark .flatpickr-day.delivery-disabled {
    background-color: #431b1b !important;
    border-color: #991b1b !important;
    color: #ef4444 !important;
  }
  
  .dark .flatpickr-day.delivery-disabled:hover {
    background-color: #7f1d1d !important;
    border-color: #dc2626 !important;
  }
  
  /* Enhanced tooltip styling - better positioning */
  .flatpickr-day.delivery-disabled:hover::before {
    content: attr(title);
    position: absolute;
    bottom: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%);
    background-color: #1f2937;
    color: white;
    padding: 6px 10px;
    border-radius: 6px;
    font-size: 12px;
    white-space: nowrap;
    z-index: 10000;
    pointer-events: none;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }
  
  .flatpickr-day.delivery-disabled:hover::after {
    content: '';
    position: absolute;
    bottom: calc(100% + 2px);
    left: 50%;
    transform: translateX(-50%);
    border: 6px solid transparent;
    border-top-color: #1f2937;
    z-index: 10000;
    pointer-events: none;
  }
  
  /* Make sure tooltip appears above everything */
  .flatpickr-calendar {
    z-index: 9999;
  }
`;

interface BusinessHours {
  [key: string]: boolean;
}

interface Holiday {
  id?: string;
  name: string;
  startDate: string;
  endDate: string;
  isOpen: boolean;
}

interface DeliveryException {
  date: string;
  noDelivery: boolean;
  noPickup: boolean;
}

type Props = {
  id: string;
  label?: string;
  placeholder?: string;
  value?: string;
  onChange: (date: string) => void;
  allowPastDates?: boolean;
};

export default function DeliveryDatePicker({
  id,
  label,
  placeholder,
  value,
  onChange,
  allowPastDates = false,
}: Props) {
  const { timezone, getBusinessDateString } = useBusinessTimezone();
  const [businessHours, setBusinessHours] = useState<BusinessHours>({});
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [exceptions, setExceptions] = useState<DeliveryException[]>([]);
  const [disabledDates, setDisabledDates] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const flatpickrRef = useRef<flatpickr.Instance | null>(null);

  // Inject custom styles
  useEffect(() => {
    const styleId = `delivery-datepicker-styles-${id}`;
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = customStyles;
      document.head.appendChild(style);
    }

    return () => {
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, [id]);

  // Load delivery settings ONCE
  useEffect(() => {
    loadDeliverySettings();
  }, []);

  const loadDeliverySettings = async () => {
    try {
      const [businessHoursRes, holidaysRes, exceptionsRes] = await Promise.all([
        fetch('/api/settings/business-hours'),
        fetch('/api/settings/holidays'),
        fetch('/api/settings/delivery-exceptions')
      ]);

      if (businessHoursRes.ok) {
        const hoursData = await businessHoursRes.json();
        setBusinessHours({
          monday: hoursData.mondayEnabled,
          tuesday: hoursData.tuesdayEnabled,
          wednesday: hoursData.wednesdayEnabled,
          thursday: hoursData.thursdayEnabled,
          friday: hoursData.fridayEnabled,
          saturday: hoursData.saturdayEnabled,
          sunday: hoursData.sundayEnabled,
        });
      }

      if (holidaysRes.ok) {
        const holidaysData = await holidaysRes.json();
        setHolidays(holidaysData.holidays || []);
      }

      if (exceptionsRes.ok) {
        const exceptionsData = await exceptionsRes.json();
        setExceptions(exceptionsData.exceptions || []);
      }

      setIsLoaded(true);
    } catch (error) {
      console.error('Failed to load delivery settings:', error);
      setIsLoaded(true);
    }
  };

  // Calculate disabled dates with reasons
  useEffect(() => {
    if (!isLoaded) return;
    
    const disabled: Array<{ date: string; reason: 'business-closed' | 'holiday' | 'exception' }> = [];
    const today = new Date();
    
    for (let i = 0; i < 90; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateString = date.getFullYear() + '-' + 
    String(date.getMonth() + 1).padStart(2, '0') + '-' + 
    String(date.getDate()).padStart(2, '0');
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

      // Check business hours
      if (!businessHours[dayName]) {
        disabled.push({ date: dateString, reason: 'business-closed' });
        continue;
      }

      // Check holidays
      const holiday = holidays.find(h => 
        dateString >= h.startDate && dateString <= h.endDate && !h.isOpen
      );
      if (holiday) {
        disabled.push({ date: dateString, reason: 'holiday' });
        continue;
      }

      // Check exceptions
      const exception = exceptions.find(ex => 
        ex.date === dateString && ex.noDelivery
      );
      if (exception) {
        disabled.push({ date: dateString, reason: 'exception' });
      }
    }

    setDisabledDates(disabled.map(d => d.date));
    (window as any)[`disabledDatesInfo_${id}`] = disabled;
  }, [businessHours, holidays, exceptions, isLoaded, id]);

  // Initialize flatpickr ONCE when settings and timezone are loaded
  useEffect(() => {
    if (!isLoaded || !timezone || flatpickrRef.current) return;
    
    const today = getBusinessDateString(new Date());
    
    const instance = flatpickr(`#${id}`, {
      mode: "single",
      static: false,
      monthSelectorType: "static",
      dateFormat: "Y-m-d",
      defaultDate: value,
      minDate: allowPastDates ? undefined : today,
      disable: disabledDates.map(date => new Date(date + 'T00:00:00')),
      clickOpens: true,
      allowInput: false,
onDayCreate: function(dObj, dStr, fp, dayElem) {
  const _d = dayElem.dateObj;
  const dateStr = `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, '0')}-${String(_d.getDate()).padStart(2, '0')}`;
  const disabledInfo = (window as any)[`disabledDatesInfo_${id}`] || [];
  const disabledItem = disabledInfo.find((item: any) => item.date === dateStr);
  
  if (disabledItem) {
    dayElem.classList.add('delivery-disabled');
    dayElem.classList.add(disabledItem.reason);
    
    // ✅ Enhanced tooltips with more detail
    let tooltip = 'No delivery available';
    switch (disabledItem.reason) {
      case 'business-closed':
        tooltip = '🔒 Business Closed';
        break;
      case 'holiday':
        tooltip = '🎉 Holiday';
        break;
      case 'exception':
        tooltip = '❌ No Delivery';
        break;
    }
    dayElem.title = tooltip;
    // ✅ Remove this line - it was preventing hover
    // dayElem.style.pointerEvents = 'none';
    
    // ✅ Instead, prevent clicking but allow hover
    dayElem.style.cursor = 'not-allowed';
    dayElem.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    });
  }
},
      onChange: (selectedDates) => {
        if (selectedDates.length > 0) {
          const d = selectedDates[0];
          const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          onChange(date);
        }
      },
    });

    flatpickrRef.current = Array.isArray(instance) ? instance[0] : instance;
    setPickerReady(true);

    return () => {
      if (flatpickrRef.current) {
        flatpickrRef.current.destroy();
        flatpickrRef.current = null;
      }
      setPickerReady(false);
      delete (window as any)[`disabledDatesInfo_${id}`];
    };
  }, [isLoaded, timezone, getBusinessDateString]);

  // Update disabled dates WITHOUT recreating the picker
  useEffect(() => {
    if (!flatpickrRef.current || !isLoaded) return;
    
flatpickrRef.current.set('disable', disabledDates.map(date => new Date(date + 'T00:00:00')));
    flatpickrRef.current.redraw();
  }, [disabledDates, isLoaded]);

  // Sync value to picker after initialization or when value changes
  const [pickerReady, setPickerReady] = useState(false);
  useEffect(() => {
    if (!flatpickrRef.current || !value) return;

    flatpickrRef.current.setDate(value, false);
  }, [value, pickerReady]);

  return (
    <div>
      {label && <Label htmlFor={id}>{label}</Label>}

      <div className="relative">
        <input
          id={id}
          placeholder={placeholder}
          value={value || ""}
          readOnly
          tabIndex={-1}
          className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:focus:border-brand-800 cursor-pointer"
        />

        <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-gray-400">
          <CalenderIcon className="size-6" />
        </span>
      </div>
      
      {!isLoaded && (
        <div className="text-xs text-gray-500 mt-1">Loading delivery settings...</div>
      )}
    </div>
  );
}

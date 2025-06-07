import { useEffect, useState } from "react";

interface CountryCode {
  code: string;
  label: string;
}

interface PhoneInputProps {
  countries: CountryCode[];
  value?: string;
  placeholder?: string;
  onChange?: (rawPhoneNumber: string) => void;
  selectPosition?: "start" | "end" | "none";
  type?: string;
  id?: string;
}

const formatPhoneNumber = (value: string, selectedCountry: string) => {
  // If it starts with +, keep it as international format
  if (value.startsWith('+')) return value;
  
  // Format based on country
  if (selectedCountry === "CA" || selectedCountry === "US") {
    const digits = value.replace(/\D/g, "").slice(0, 10);
    const match = digits.match(/^(\d{3})(\d{3})(\d{0,4})$/);
    if (match) {
      return `(${match[1]}) ${match[2]}${match[3] ? `-${match[3]}` : ""}`;
    } else if (digits.length >= 6) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    } else if (digits.length >= 3) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    } else {
      return digits;
    }
  }
  
  // For other countries, just return the digits (you can add specific formatting later)
  return value.replace(/[^\d+\-\s()]/g, '');
};

const cleanPhoneNumber = (value: string): string => {
  if (value.startsWith('+')) {
    return '+' + value.slice(1).replace(/\D/g, '');
  }
  return value.replace(/\D/g, '');
};

const PhoneInput: React.FC<PhoneInputProps> = ({
  countries,
  value = "",
  placeholder = "+1 (555) 000-0000",
  onChange,
  selectPosition = "start",
  type = "tel",
  id,
}) => {
  const [selectedCountry, setSelectedCountry] = useState<string>("CA");
  const [displayValue, setDisplayValue] = useState<string>("");

  const countryCodes: Record<string, string> = countries.reduce(
    (acc, { code, label }) => ({ ...acc, [code]: label }),
    {}
  );

  // Sync with parent value
  useEffect(() => {
    if (value.startsWith('+')) {
      // International number - keep as is
      setDisplayValue(value);
    } else {
      // Format according to selected country
      const formatted = formatPhoneNumber(value, selectedCountry);
      setDisplayValue(formatted);
    }
  }, [value, selectedCountry]);

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCountry = e.target.value;
    setSelectedCountry(newCountry);
    
    // Clear the phone number when country changes (unless it's international)
    if (!displayValue.startsWith('+') && onChange) {
      onChange("");
    }
  };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    
    // If user types + at the beginning, treat as international
    if (input.startsWith('+')) {
      setDisplayValue(input);
      const cleaned = cleanPhoneNumber(input);
      if (onChange) {
        onChange(cleaned);
      }
      return;
    }
    
    // Otherwise format according to country
    const formatted = formatPhoneNumber(input, selectedCountry);
    setDisplayValue(formatted);
    
    // Send clean phone number back to parent
    const cleaned = cleanPhoneNumber(input);
    if (onChange) {
      onChange(cleaned);
    }
  };

  // Handle different selectPosition options
  if (selectPosition === "none") {
    return (
      <input
        type={type}
        id={id}
        value={displayValue}
        onChange={handlePhoneNumberChange}
        placeholder={placeholder}
        className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent py-3 px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
      />
    );
  }

  return (
    <div className="relative flex">
      {/* Country dropdown: Start */}
      {selectPosition === "start" && (
        <div className="absolute z-10">
          <select
            value={selectedCountry}
            onChange={handleCountryChange}
            className="appearance-none bg-none rounded-l-lg border-0 border-r border-gray-200 bg-transparent py-3 pl-3.5 pr-8 leading-tight text-gray-700 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:text-gray-400 dark:bg-gray-900"
          >
            {countries.map((country) => (
              <option
                key={country.code}
                value={country.code}
                className="text-gray-700 dark:bg-gray-900 dark:text-gray-400"
              >
                {country.label}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 flex items-center text-gray-700 pointer-events-none bg-none right-3 dark:text-gray-400">
            <svg
              className="stroke-current"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M4.79175 7.396L10.0001 12.6043L15.2084 7.396"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      )}

      {/* Phone input */}
      <input
        type={type}
        id={id}
        value={displayValue}
        onChange={handlePhoneNumberChange}
        placeholder={placeholder}
        className={`dark:bg-dark-900 h-11 w-full ${
          selectPosition === "start" ? "pl-[84px]" : "pr-[84px]"
        } rounded-lg border border-gray-300 bg-transparent py-3 px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800`}
      />

      {/* Country dropdown: End */}
      {selectPosition === "end" && (
        <div className="absolute right-0 z-10">
          <select
            value={selectedCountry}
            onChange={handleCountryChange}
            className="appearance-none bg-none rounded-r-lg border-0 border-l border-gray-200 bg-transparent py-3 pl-3.5 pr-8 leading-tight text-gray-700 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:text-gray-400 dark:bg-gray-900"
          >
            {countries.map((country) => (
              <option
                key={country.code}
                value={country.code}
                className="text-gray-700 dark:bg-gray-900 dark:text-gray-400"
              >
                {country.label}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 flex items-center text-gray-700 pointer-events-none right-3 dark:text-gray-400">
            <svg
              className="stroke-current"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M4.79175 7.396L10.0001 12.6043L15.2084 7.396"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhoneInput;
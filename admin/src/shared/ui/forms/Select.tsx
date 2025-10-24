import { useState } from "react";

interface Option {
  value: string;
  label: string;
  depth?: number; // For hierarchical indentation
}

interface SelectProps {
  id?: string;
  name?: string;
  label?: string;
  options: Option[];
  placeholder?: string;
  onChange: (value: string) => void;
  className?: string;
  defaultValue?: string;
  value?: string; // Add controlled value prop
  disabled?: boolean;
}

const Select: React.FC<SelectProps> = ({
  id,
  name,
  label,
  options,
  placeholder = "Select an option",
  onChange,
  className = "",
  defaultValue = "",
  value, // Add value prop for controlled component
  disabled = false,
}) => {
  // Use controlled value if provided, otherwise use internal state
  const [selectedValue, setSelectedValue] = useState<string>(defaultValue);
  const currentValue = value !== undefined ? value : selectedValue;

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    if (value === undefined) {
      setSelectedValue(newValue); // Only update internal state if not controlled
    }
    onChange(newValue); // Always trigger parent handler
  };

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label
          htmlFor={id}
          className="text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {label}
        </label>
      )}
      <div className="relative">
      <select
        className={`h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 pr-11 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-3 focus:ring-[#597485]/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 ${
          currentValue
            ? "text-gray-800 dark:text-white/90"
            : "text-gray-400 dark:text-gray-400"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
        value={currentValue}
        onChange={handleChange}
        disabled={disabled}
        id={id}
        name={name}
        style={{
          borderColor: currentValue ? '#597485' : undefined
        }}
        onFocus={(e) => e.target.style.borderColor = '#597485'}
        onBlur={(e) => e.target.style.borderColor = currentValue ? '#597485' : ''}
      >
        {/* Placeholder option */}
        <option
          value=""
          disabled
          className="text-gray-700 dark:bg-gray-900 dark:text-gray-400"
        >
          {placeholder}
        </option>
        {/* Map over options */}
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            className="text-gray-700 dark:bg-gray-900 dark:text-gray-400"
          >
            {/* Add indentation for hierarchical categories */}
            {option.depth ? '→'.repeat(option.depth) + ' ' : ''}{option.label}
          </option>
        ))}
      </select>
      {/* Custom dropdown arrow */}
      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
        <svg
          className="h-5 w-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      </div>
    </div>
  );
};

export default Select;

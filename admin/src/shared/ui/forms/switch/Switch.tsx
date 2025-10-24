import { useState } from "react";

interface SwitchProps {
  id?: string;
  name?: string;
  label?: string;
  ariaLabel?: string;
  checked?: boolean; // Controlled mode
  defaultChecked?: boolean; // Uncontrolled mode
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
  color?: "blue" | "gray"; // Added prop to toggle color theme
}

const Switch: React.FC<SwitchProps> = ({
  id,
  name,
  label,
  ariaLabel,
  checked,
  defaultChecked = false,
  disabled = false,
  onChange,
  color = "blue", // Default to blue color
}) => {
  // Use controlled mode if 'checked' prop is provided, otherwise use uncontrolled mode
  const isControlled = checked !== undefined;
  const [internalChecked, setInternalChecked] = useState(defaultChecked);
  
  const currentChecked = isControlled ? checked : internalChecked;

  const handleToggle = () => {
    if (disabled) return;
    const newCheckedState = !currentChecked;
    
    if (!isControlled) {
      setInternalChecked(newCheckedState);
    }
    
    if (onChange) {
      onChange(newCheckedState);
    }
  };

  const switchColors =
    color === "blue"
      ? {
          background: currentChecked
            ? "bg-brand-500 "
            : "bg-gray-200 dark:bg-white/10", // Blue version
          knob: currentChecked
            ? "translate-x-full bg-white"
            : "translate-x-0 bg-white",
        }
      : {
          background: currentChecked
            ? "bg-gray-800 dark:bg-white/10"
            : "bg-gray-200 dark:bg-white/10", // Gray version
          knob: currentChecked
            ? "translate-x-full bg-white"
            : "translate-x-0 bg-white",
        };

  const switchId = id ?? name;
  const computedAriaLabel = !label ? ariaLabel : undefined;

  return (
    <label
      htmlFor={switchId}
      className={`flex select-none items-center gap-3 text-sm font-medium ${
        disabled ? "text-gray-400" : "text-gray-700 dark:text-gray-400"
      } ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
    >
      <input
        id={switchId}
        name={name}
        type="checkbox"
        checked={currentChecked}
        onChange={handleToggle}
        disabled={disabled}
        className="sr-only"
        aria-label={computedAriaLabel}
      />
      <div
        role="switch"
        aria-checked={currentChecked}
        aria-label={computedAriaLabel}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleToggle();
          }
        }}
        className="relative focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/70 rounded-full"
        onClick={handleToggle}
      >
        <div
          className={`block transition duration-150 ease-linear h-6 w-11 rounded-full ${
            disabled
              ? "bg-gray-100 pointer-events-none dark:bg-gray-800"
              : switchColors.background
          }`}
        ></div>
        <div
          className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full shadow-theme-sm duration-150 ease-linear transform ${switchColors.knob}`}
        ></div>
      </div>
      {label && <span>{label}</span>}
    </label>
  );
};

export default Switch;

import { useEffect, useId, useState } from "react";

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
  const generatedId = useId();
  const resolvedId = id ?? name ?? generatedId;

  const isControlled = typeof checked === "boolean";
  const [internalChecked, setInternalChecked] = useState<boolean>(
    isControlled ? Boolean(checked) : Boolean(defaultChecked),
  );

  useEffect(() => {
    if (isControlled) {
      setInternalChecked(Boolean(checked));
    }
  }, [checked, isControlled]);

  const currentChecked = internalChecked;

  const emitChange = (next: boolean) => {
    if (!isControlled) {
      setInternalChecked(next);
    }
    onChange?.(next);
  };

  const handleToggle = () => {
    if (disabled) return;
    emitChange(!currentChecked);
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

  return (
    <label
      htmlFor={resolvedId}
      className={`flex select-none items-center gap-3 text-sm font-medium ${
        disabled ? "text-gray-400" : "text-gray-700 dark:text-gray-400"
      } ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
    >
      <input
        id={resolvedId}
        name={name}
        type="checkbox"
        className="sr-only"
        checked={currentChecked}
        readOnly
        aria-label={ariaLabel}
      />
      <button
        type="button"
        role="switch"
        aria-checked={currentChecked}
        aria-label={ariaLabel}
        onClick={handleToggle}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleToggle();
          }
        }}
        disabled={disabled}
        className="relative flex h-6 w-11 items-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/70"
      >
        <span
          className={`absolute inset-0 rounded-full transition-colors duration-150 ease-linear ${
            disabled
              ? "bg-gray-100 dark:bg-gray-800"
              : switchColors.background
          }`}
        />
        <span
          className={`pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-theme-sm transition-transform duration-150 ease-linear ${switchColors.knob}`}
        />
      </button>
      {label && <span>{label}</span>}
    </label>
  );
};

export default Switch;

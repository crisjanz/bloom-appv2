import React, { forwardRef, InputHTMLAttributes } from "react";

type BaseInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size">;

interface InputFieldProps extends BaseInputProps {
  type?: "text" | "number" | "email" | "password" | "date" | "time" | "tel" | string;
  className?: string;
  success?: boolean;
  error?: boolean | string;
  hint?: string;
  label?: string;
}

const InputField = forwardRef<HTMLInputElement, InputFieldProps>(
  ({
    type = "text",
    id,
    name,
    placeholder,
    value,
    onChange,
    onBlur,
    min,
    max,
    step,
    autoFocus,
    className = "",
    disabled = false,
    required = false,
    success = false,
    error = false,
    hint,
    label,
    ...props
  }, ref) => {
    const hasError = Boolean(error);
    const errorMessage = typeof error === "string" ? error : undefined;

    let inputClasses = `h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 ${className}`;

    if (disabled) {
      inputClasses += ` text-gray-500 border-gray-300 opacity-40 bg-gray-100 cursor-not-allowed dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700`;
    } else if (hasError) {
      inputClasses += ` border-error-500 focus:border-error-300 focus:ring-error-500/20 dark:text-error-400 dark:border-error-500 dark:focus:border-error-800`;
    } else if (success) {
      inputClasses += ` border-success-500 focus:border-success-300 focus:ring-success-500/20 dark:text-success-400 dark:border-success-500 dark:focus:border-success-800`;
    } else {
      inputClasses += ` bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800`;
    }

    return (
      <div className="w-full">
        {label && (
          <label 
            htmlFor={id}
            className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        
        <div className="relative">
          <input
            ref={ref}
            type={type}
            id={id}
            name={name}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            required={required}
            autoFocus={autoFocus}
            className={inputClasses}
            {...props}
          />

          {(hint || errorMessage) && (
            <p
              className={`mt-1.5 text-xs ${
                hasError
                  ? "text-error-500"
                  : success
                  ? "text-success-500"
                  : "text-gray-500"
              }`}
            >
              {errorMessage ?? hint}
            </p>
          )}
        </div>
      </div>
    );
  }
);

InputField.displayName = "InputField";

export default InputField;

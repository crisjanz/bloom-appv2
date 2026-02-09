import PropTypes from "prop-types";

export const MobileInput = ({
  label,
  name,
  value,
  onChange,
  type = "text",
  error,
  placeholder,
  required = false,
}) => (
  <div className="w-full">
    <div className="flex items-center border-b border-stroke/30 py-3 dark:border-dark-3/30">
      <label className="w-[35%] shrink-0 pr-3 text-sm font-medium text-dark dark:text-white">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-base text-dark outline-hidden placeholder:text-body-color/40 dark:text-white dark:placeholder:text-dark-6/40"
      />
    </div>
    {error && <p className="text-red-500 -mt-1 pb-2 pl-2 text-xs">{error}</p>}
  </div>
);

MobileInput.propTypes = {
  label: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onChange: PropTypes.func.isRequired,
  type: PropTypes.string,
  error: PropTypes.string,
  placeholder: PropTypes.string,
  required: PropTypes.bool,
};

export const MobileSelect = ({ label, name, value, onChange, options, required = false }) => (
  <div className="w-full">
    <div className="flex items-center border-b border-stroke/30 py-3 dark:border-dark-3/30">
      <label className="w-[35%] shrink-0 pr-3 text-sm font-medium text-dark dark:text-white">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <select
        name={name}
        value={value}
        onChange={onChange}
        className="flex-1 bg-transparent text-base text-dark outline-hidden dark:text-white"
      >
        {!value && <option value="">Select...</option>}
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  </div>
);

MobileSelect.propTypes = {
  label: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  options: PropTypes.array.isRequired,
  required: PropTypes.bool,
};

export const MobileTextArea = ({ label, name, value, onChange, placeholder, maxLength }) => {
  const remaining = maxLength ? maxLength - value.length : null;

  return (
    <div className="w-full">
      <div className="flex border-b border-stroke/30 py-3 dark:border-dark-3/30">
        <label className="w-[35%] shrink-0 pr-3 pt-1 text-sm font-medium text-dark dark:text-white">
          {label}
        </label>
        <div className="flex-1">
          <textarea
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            maxLength={maxLength}
            rows="3"
            className="w-full resize-none bg-transparent text-base text-dark outline-hidden placeholder:text-body-color/40 dark:text-white dark:placeholder:text-dark-6/40"
          ></textarea>
          {maxLength && (
            <p className="mt-1 text-right text-xs text-body-color dark:text-dark-6">
              {remaining}/{maxLength}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

MobileTextArea.propTypes = {
  label: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  maxLength: PropTypes.number,
};

export const MobileSectionHeader = ({ children }) => (
  <div className="bg-gray-50 px-4 py-2 dark:bg-dark-3/20">
    <h4 className="text-xs font-semibold uppercase tracking-wide text-body-color dark:text-dark-6">
      {children}
    </h4>
  </div>
);

MobileSectionHeader.propTypes = {
  children: PropTypes.node.isRequired,
};

export const MobileStepActions = ({
  primaryLabel,
  onPrimary,
  primaryDisabled,
  secondaryLabel,
  onSecondary,
}) => (
  <div className="mt-4 flex flex-col gap-3">
    {secondaryLabel && (
      <button
        type="button"
        onClick={onSecondary}
        className="w-full rounded-full border border-stroke/80 py-3 text-sm font-semibold text-dark transition hover:border-primary hover:text-primary dark:text-white"
      >
        {secondaryLabel}
      </button>
    )}
    <button
      type="button"
      onClick={onPrimary}
      disabled={primaryDisabled}
      className="w-full rounded-full bg-primary py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-primary/60"
    >
      {primaryLabel}
    </button>
  </div>
);

MobileStepActions.propTypes = {
  primaryLabel: PropTypes.string.isRequired,
  onPrimary: PropTypes.func.isRequired,
  primaryDisabled: PropTypes.bool,
  secondaryLabel: PropTypes.string,
  onSecondary: PropTypes.func,
};

import PropTypes from "prop-types";

const SavedRecipientControls = ({
  variant,
  options,
  loading,
  error,
  selectedOption,
  onSelectOption,
  recipientModifiedAfterAutofill,
}) => {
  const hasOptions = options.length > 0;
  const shouldRender = loading || hasOptions || Boolean(error);
  if (!shouldRender) return null;

  if (variant === "mobile") {
    return (
      <div className="mb-4 bg-white dark:bg-dark-2 px-4 py-3">
        <label className="block text-sm font-medium text-dark dark:text-white mb-2">
          Saved Recipients
          {selectedOption !== "new" && hasOptions && (
            <span className="ml-2 text-xs text-primary">
              {recipientModifiedAfterAutofill ? "(edited)" : "✓"}
            </span>
          )}
        </label>
        <select
          className="w-full h-12 rounded-md border border-stroke bg-transparent px-4 text-base text-dark outline-hidden focus:border-primary dark:border-dark-3 dark:text-white appearance-none"
          value={selectedOption}
          onChange={(event) => onSelectOption(event.target.value)}
          disabled={loading || !hasOptions}
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '20px' }}
        >
          <option value="new">+ New recipient</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {loading && <p className="mt-2 text-sm text-body-color">Loading saved recipients…</p>}
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      </div>
    );
  }

  // Desktop variant
  return (
    <div className="w-full px-3">
      <div className="mb-6">
        <label className="mb-2.5 block text-base font-medium text-dark dark:text-white">
          Saved recipient
          {selectedOption !== "new" && hasOptions && (
            <span className="ml-2 text-xs text-primary">
              {recipientModifiedAfterAutofill ? "(modified)" : "(applied)"}
            </span>
          )}
        </label>
        <select
          className="w-full rounded-md border border-stroke bg-transparent px-5 py-3 font-medium text-body-color outline-hidden transition focus:border-primary dark:border-dark-3 dark:text-dark-6"
          value={selectedOption}
          onChange={(event) => onSelectOption(event.target.value)}
          disabled={loading || !hasOptions}
        >
          <option value="new">New recipient</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {loading && <p className="text-sm text-body-color mt-1">Loading saved recipients…</p>}
        {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
      </div>
    </div>
  );
};

SavedRecipientControls.propTypes = {
  variant: PropTypes.oneOf(["desktop", "mobile"]).isRequired,
  options: PropTypes.array.isRequired,
  loading: PropTypes.bool.isRequired,
  error: PropTypes.string,
  selectedOption: PropTypes.string.isRequired,
  onSelectOption: PropTypes.func.isRequired,
  recipientModifiedAfterAutofill: PropTypes.bool.isRequired,
};

export default SavedRecipientControls;

import PropTypes from "prop-types";

const presetAmounts = [50, 100, 150, 200];

const AmountSelector = ({
  selectedAmount,
  onSelect,
  customAmount,
  onCustomAmountChange,
  min = 25,
  max = 300,
  error,
  disabled,
}) => {
  const formatCurrency = (value) =>
    new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
      maximumFractionDigits: 0,
    }).format(value);

  const handlePresetClick = (value) => {
    if (disabled) return;
    onSelect(value);
    onCustomAmountChange("");
  };

  const handleCustomChange = (event) => {
    onCustomAmountChange(event.target.value);
  };

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Choose your amount</h2>
        <span className="text-sm text-slate-500">
          ${min} - ${max}
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {presetAmounts.map((amount) => {
          const isSelected = !customAmount && selectedAmount === amount;
          return (
            <button
              key={amount}
              type="button"
              disabled={disabled}
              onClick={() => handlePresetClick(amount)}
              className={`rounded-xl border px-4 py-3 text-left transition ${
                isSelected
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50"
              } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
            >
              <span className="text-base font-semibold">{formatCurrency(amount)}</span>
              <p className="text-xs text-slate-500">Popular choice</p>
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        <label htmlFor="custom-amount" className="text-sm font-medium text-slate-700">
          Custom amount
        </label>
        <div className="mt-2 flex items-center gap-3">
          <span className="text-lg font-semibold text-slate-500">$</span>
          <input
            id="custom-amount"
            type="number"
            min={min}
            max={max}
            step="0.01"
            value={customAmount}
            disabled={disabled}
            onChange={handleCustomChange}
            placeholder={`Enter amount (${min}-${max})`}
            className="w-full rounded-lg border border-slate-200 px-4 py-2 font-semibold text-slate-900 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-50"
          />
        </div>
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      </div>
    </div>
  );
};

AmountSelector.propTypes = {
  selectedAmount: PropTypes.number.isRequired,
  onSelect: PropTypes.func.isRequired,
  customAmount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onCustomAmountChange: PropTypes.func.isRequired,
  min: PropTypes.number,
  max: PropTypes.number,
  error: PropTypes.string,
  disabled: PropTypes.bool,
};

export default AmountSelector;

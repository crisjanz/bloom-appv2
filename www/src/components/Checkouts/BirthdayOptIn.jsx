import PropTypes from "prop-types";

const months = Array.from({ length: 12 }, (_, i) => i + 1);
const days = Array.from({ length: 31 }, (_, i) => i + 1);

const BirthdayOptIn = ({ value, onToggle, onChange, errors, compact = false }) => (
  <div className={compact ? "space-y-3" : "space-y-4 rounded-md border border-stroke/60 p-4 dark:border-dark-3"}>
    <label className="flex items-start gap-3">
      <input
        type="checkbox"
        checked={value.optIn}
        onChange={(e) => onToggle(e.target.checked)}
        className="mt-1 h-4 w-4 rounded border border-stroke text-primary focus:ring-primary"
      />
      <div>
        <p className="text-sm font-semibold text-dark dark:text-white">Birthday treat (optional)</p>
        <p className="text-xs text-body-color dark:text-dark-6">
          Want a little surprise from us on your birthday?
        </p>
      </div>
    </label>

    {value.optIn && (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-body-color dark:text-dark-6">Month</label>
          <select
            value={value.month}
            onChange={(e) => onChange("month", e.target.value)}
            className="w-full rounded-md border border-stroke bg-transparent px-3 py-2 text-sm text-dark outline-hidden focus:border-primary dark:border-dark-3 dark:text-white"
          >
            <option value="">Month</option>
            {months.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          {errors?.birthdayMonth && <p className="text-xs text-red-500">{errors.birthdayMonth}</p>}
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-body-color dark:text-dark-6">Day</label>
          <select
            value={value.day}
            onChange={(e) => onChange("day", e.target.value)}
            className="w-full rounded-md border border-stroke bg-transparent px-3 py-2 text-sm text-dark outline-hidden focus:border-primary dark:border-dark-3 dark:text-white"
          >
            <option value="">Day</option>
            {days.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          {errors?.birthdayDay && <p className="text-xs text-red-500">{errors.birthdayDay}</p>}
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-body-color dark:text-dark-6">Year (optional)</label>
          <input
            type="number"
            value={value.year}
            onChange={(e) => onChange("year", e.target.value)}
            placeholder="1990"
            className="w-full rounded-md border border-stroke bg-transparent px-3 py-2 text-sm text-dark outline-hidden focus:border-primary dark:border-dark-3 dark:text-white"
          />
        </div>
      </div>
    )}
  </div>
);

BirthdayOptIn.propTypes = {
  value: PropTypes.shape({
    optIn: PropTypes.bool.isRequired,
    month: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    day: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    year: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }).isRequired,
  onToggle: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  errors: PropTypes.object,
  compact: PropTypes.bool,
};

export default BirthdayOptIn;

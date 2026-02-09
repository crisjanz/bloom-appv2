import PropTypes from "prop-types";

export const InputGroup = ({
  labelTitle,
  type,
  placeholder,
  fullColumn,
  name,
  value,
  onChange,
  error,
  required = false,
}) => (
  <div className={`${fullColumn ? "w-full px-3" : "w-full px-3 md:w-1/2"}`}>
    <div className="mb-6">
      {labelTitle && (
        <label className="mb-2.5 block text-base font-medium text-dark dark:text-white">
          {labelTitle}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <input
        type={type}
        placeholder={placeholder}
        name={name}
        value={value}
        onChange={onChange}
        className={`w-full rounded-md border bg-transparent px-5 py-3 font-medium text-body-color outline-hidden transition focus:border-primary dark:border-dark-3 dark:text-dark-6 ${
          error ? "border-red-500" : "border-stroke"
        }`}
      />
      {error && <p className="text-red-500 mt-1 text-sm">{error}</p>}
    </div>
  </div>
);

InputGroup.propTypes = {
  labelTitle: PropTypes.string,
  type: PropTypes.string.isRequired,
  placeholder: PropTypes.string,
  fullColumn: PropTypes.bool,
  name: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onChange: PropTypes.func.isRequired,
  error: PropTypes.string,
  required: PropTypes.bool,
};

export const SelectGroup = ({ fullColumn, labelTitle, name, value, onChange, options, required = false }) => (
  <div className={`${fullColumn ? "w-full px-3" : "w-full px-3 md:w-1/2"}`}>
    <div className="mb-6">
      <label className="mb-2.5 block text-base font-medium text-dark dark:text-white">
        {labelTitle}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className="relative">
        <select
          name={name}
          value={value}
          onChange={onChange}
          className="w-full appearance-none rounded-md border border-stroke bg-transparent px-5 py-3 font-medium text-dark-5 outline-hidden transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-[#F5F7FD] dark:border-dark-3 dark:text-dark-6"
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <span className="absolute right-4 top-1/2 mt-[-2px] h-[10px] w-[10px] -translate-y-1/2 rotate-45 border-b-2 border-r-2 border-body-color dark:border-dark-6"></span>
      </div>
    </div>
  </div>
);

SelectGroup.propTypes = {
  fullColumn: PropTypes.bool,
  labelTitle: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  options: PropTypes.array.isRequired,
  required: PropTypes.bool,
};

export const TextAreaGroup = ({
  labelTitle,
  placeholder,
  name,
  value,
  onChange,
  children,
  maxLength,
}) => {
  const remaining = maxLength ? maxLength - value.length : null;

  return (
    <div className="w-full px-3">
      <div className="mb-6">
        {labelTitle && (
          <label className="mb-2.5 block text-base font-medium text-dark dark:text-white">
            {labelTitle}
          </label>
        )}
        <textarea
          placeholder={placeholder}
          name={name}
          value={value}
          onChange={onChange}
          maxLength={maxLength}
          rows="4"
          className="w-full rounded-md border border-stroke bg-transparent p-5 font-medium text-body-color outline-hidden transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-[#F5F7FD] dark:border-dark-3 dark:text-dark-6"
        ></textarea>
        {maxLength && (
          <p className="mt-2 text-right text-sm text-body-color dark:text-dark-6">
            {remaining}/{maxLength}
          </p>
        )}
        {children}
      </div>
    </div>
  );
};

TextAreaGroup.propTypes = {
  labelTitle: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  placeholder: PropTypes.string,
  name: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  children: PropTypes.node,
  maxLength: PropTypes.number,
};

export const CheckboxGroup = ({ labelTitle, name, checked, onChange }) => (
  <div className="w-full px-3">
    <div className="mb-5">
      <label
        htmlFor={name}
        className="flex cursor-pointer select-none items-center text-body-color dark:text-dark-6"
      >
        <div className="relative">
          <input
            type="checkbox"
            id={name}
            name={name}
            checked={checked}
            onChange={onChange}
            className="sr-only"
          />
          <div
            className={`mr-4 flex h-5 w-5 mt-2 items-center justify-center rounded border ${
              checked ? "border-primary bg-primary" : "border-stroke dark:border-dark-3"
            }`}
          >
            <span className={`${checked ? "opacity-100" : "opacity-0"}`}>
              <svg
                width="11"
                height="8"
                viewBox="0 0 11 8"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M10.0915 0.951972L10.0867 0.946075L10.0813 0.940568C9.90076 0.753564 9.61034 0.753146 9.42927 0.939309L4.16201 6.22962L1.58507 3.63469C1.40401 3.44841 1.11351 3.44879 0.932892 3.63584C0.755703 3.81933 0.755703 4.10875 0.932892 4.29224L0.932878 4.29225L0.934851 4.29424L3.58046 6.95832C3.73676 7.11955 3.94983 7.2 4.1473 7.2C4.36196 7.2 4.55963 7.11773 4.71406 6.9584L10.0468 1.60234C10.2436 1.4199 10.2421 1.1339 10.0915 0.951972ZM4.2327 6.30081L4.2317 6.2998C4.23206 6.30015 4.23237 6.30049 4.23269 6.30082L4.2327 6.30081Z"
                  fill="white"
                  stroke="white"
                  strokeWidth="0.4"
                ></path>
              </svg>
            </span>
          </div>
        </div>
        <span className="text-dark dark:text-white text-sm mt-2 font-medium">{labelTitle}</span>
      </label>
    </div>
  </div>
);

CheckboxGroup.propTypes = {
  labelTitle: PropTypes.oneOfType([PropTypes.string, PropTypes.node]).isRequired,
  name: PropTypes.string.isRequired,
  checked: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};

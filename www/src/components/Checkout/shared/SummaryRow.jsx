import PropTypes from "prop-types";

const SummaryRow = ({ label, value }) => (
  <div className="mb-4 flex items-center justify-between">
    <div className="px-1">
      <p className="text-base text-dark dark:text-white">{label}</p>
    </div>
    <div className="px-1">
      <p className="text-base font-medium text-dark dark:text-white">{value}</p>
    </div>
  </div>
);

SummaryRow.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
};

export default SummaryRow;

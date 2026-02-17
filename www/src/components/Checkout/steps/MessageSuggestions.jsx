import PropTypes from 'prop-types';

const categoryLabelMap = {
  BIRTHDAY: 'Birthday',
  ANNIVERSARY: 'Anniversary',
  SYMPATHY: 'Sympathy',
  THANK_YOU: 'Thank You',
  LOVE: 'Love & Romance',
  GET_WELL: 'Get Well',
  CONGRATULATIONS: 'Congratulations',
  OTHER: 'Other',
};

const normalizeCategoryLabel = (label) => {
  if (!label) return 'Other';
  return categoryLabelMap[label] || label.replace(/_/g, ' ');
};

const MessageSuggestions = ({ suggestions, selectedOccasion, onSelectSuggestion }) => {
  if (!Array.isArray(suggestions) || !suggestions.length) {
    return null;
  }

  const filtered = selectedOccasion
    ? suggestions.filter((item) => item.label === selectedOccasion)
    : suggestions;

  if (!filtered.length) {
    return (
      <p className="rounded-md border border-stroke px-4 py-3 text-sm text-body-color dark:border-dark-3 dark:text-dark-6">
        No suggestions are available for this occasion yet.
      </p>
    );
  }

  const grouped = filtered.reduce((acc, item) => {
    const key = item.label || 'OTHER';
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-4 rounded-md border border-stroke bg-gray-50 p-4 dark:border-dark-3 dark:bg-dark">
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category}>
          <h4 className="mb-2 text-sm font-semibold text-dark dark:text-white">
            {normalizeCategoryLabel(category)}
          </h4>
          <div className="space-y-2">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectSuggestion(item.message || '')}
                className="w-full rounded-md border border-stroke bg-white px-3 py-2 text-left text-sm text-body-color transition hover:border-primary hover:text-dark dark:border-dark-3 dark:bg-dark-2 dark:text-dark-6 dark:hover:text-white"
              >
                {item.message}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

MessageSuggestions.propTypes = {
  suggestions: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string,
      message: PropTypes.string,
    }),
  ).isRequired,
  selectedOccasion: PropTypes.string,
  onSelectSuggestion: PropTypes.func.isRequired,
};

export default MessageSuggestions;

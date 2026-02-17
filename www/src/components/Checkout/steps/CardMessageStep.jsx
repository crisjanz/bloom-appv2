import PropTypes from 'prop-types';
import MessageSuggestions from './MessageSuggestions.jsx';
import { occasionOptions } from '../shared/constants';

const CardMessageStep = ({
  occasion,
  cardMessage,
  onOccasionChange,
  onCardMessageChange,
  suggestions,
  showSuggestions,
  onToggleSuggestions,
  isAuthenticated,
  rememberDate,
  onRememberDateChange,
  onBack,
  onContinue,
}) => {
  const remaining = 250 - (cardMessage || '').length;
  const hasSuggestions = Array.isArray(suggestions) && suggestions.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <label className="mb-2.5 block text-sm font-semibold text-dark dark:text-white">
          Occasion
        </label>
        <div className="relative">
          <select
            name="occasion"
            value={occasion || ''}
            onChange={onOccasionChange}
            className="h-12 w-full appearance-none rounded-md border border-stroke bg-transparent px-4 text-sm text-dark outline-hidden transition focus:border-primary dark:border-dark-3 dark:text-white"
          >
            {occasionOptions.map((option) => (
              <option key={option.value || 'none'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-4 top-1/2 h-[9px] w-[9px] -translate-y-1/2 rotate-45 border-b-2 border-r-2 border-body-color" />
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <label className="text-sm font-semibold text-dark dark:text-white">Card message</label>
          {hasSuggestions && (
            <button
              type="button"
              onClick={onToggleSuggestions}
              className="text-sm font-medium text-primary hover:underline"
            >
              {showSuggestions ? 'Hide ideas' : 'Message ideas'}
            </button>
          )}
        </div>

        <textarea
          name="cardMessage"
          value={cardMessage || ''}
          onChange={onCardMessageChange}
          maxLength={250}
          rows={5}
          placeholder="Write your personal note (optional)"
          className="w-full rounded-md border border-stroke bg-transparent p-4 text-sm text-dark outline-hidden transition focus:border-primary dark:border-dark-3 dark:text-white"
        />
        <p className="mt-1 text-right text-xs text-body-color dark:text-dark-6">{remaining}/250</p>
      </div>

      {showSuggestions && hasSuggestions && (
        <MessageSuggestions
          suggestions={suggestions}
          selectedOccasion={occasion}
          onSelectSuggestion={onCardMessageChange}
        />
      )}

      {isAuthenticated && (
        <label className="flex cursor-pointer items-start gap-3 rounded-md border border-stroke p-3 dark:border-dark-3">
          <input
            type="checkbox"
            checked={rememberDate}
            onChange={(event) => onRememberDateChange(event.target.checked)}
            className="mt-1 h-4 w-4 rounded border border-stroke text-primary focus:ring-primary"
          />
          <div>
            <p className="text-sm font-semibold text-dark dark:text-white">Remind me next year</p>
            <p className="text-xs text-body-color dark:text-dark-6">Remember this date for future flower reminders.</p>
          </div>
        </label>
      )}

      <div className="flex flex-wrap justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full border border-stroke px-6 py-3 text-sm font-semibold text-dark transition hover:border-primary hover:text-primary dark:border-dark-3 dark:text-white"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary/90"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

CardMessageStep.propTypes = {
  occasion: PropTypes.string,
  cardMessage: PropTypes.string,
  onOccasionChange: PropTypes.func.isRequired,
  onCardMessageChange: PropTypes.func.isRequired,
  suggestions: PropTypes.array.isRequired,
  showSuggestions: PropTypes.bool.isRequired,
  onToggleSuggestions: PropTypes.func.isRequired,
  isAuthenticated: PropTypes.bool.isRequired,
  rememberDate: PropTypes.bool.isRequired,
  onRememberDateChange: PropTypes.func.isRequired,
  onBack: PropTypes.func.isRequired,
  onContinue: PropTypes.func.isRequired,
};

export default CardMessageStep;

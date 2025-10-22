import { ReactNode, useMemo } from 'react';
import Button from '@shared/ui/components/ui/button/Button';
import Select from '@shared/ui/forms/Select';

export interface CardMethodFieldsProps {
  provider: 'stripe' | 'square';
  mode: 'terminal' | 'manual';
  onModeChange?: (mode: 'terminal' | 'manual') => void;
  savedCards?: Array<{ id: string; label: string }>;
  selectedSavedCard?: string;
  onSelectSavedCard?: (id: string) => void;
  onProcessCard: () => void;
  disabled?: boolean;
  note?: string;
  showProcessButton?: boolean;
  children?: ReactNode;
}

const CardMethodFields = ({
  provider,
  mode,
  onModeChange,
  savedCards = [],
  selectedSavedCard,
  onSelectSavedCard,
  onProcessCard,
  disabled,
  note,
  showProcessButton = true,
  children,
}: CardMethodFieldsProps) => {
  const modeOptions = useMemo(
    () => [
      { value: 'terminal', label: 'Card Reader' },
      { value: 'manual', label: 'Manual Entry' },
    ],
    []
  );

  const savedCardOptions = useMemo(
    () => savedCards.map((card) => ({ value: card.id, label: card.label })),
    [savedCards]
  );

  return (
    <div className="space-y-3 sm:space-y-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
        <div>
          <span className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Provider</span>
          <div className="rounded-lg border border-dashed border-gray-300 p-2.5 sm:p-3 text-xs font-medium text-gray-600 dark:border-gray-700 dark:text-gray-400">
            {provider === 'stripe' ? 'Stripe' : 'Square'}
          </div>
        </div>
        {onModeChange && (
          <div>
            <span className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Capture Mode</span>
            <Select options={modeOptions} value={mode} onChange={(value) => onModeChange(value as 'terminal' | 'manual')} />
          </div>
        )}
      </div>

      {savedCardOptions.length > 0 && onSelectSavedCard && (
        <div>
          <span className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Saved Cards</span>
          <Select options={savedCardOptions} value={selectedSavedCard ?? ''} onChange={onSelectSavedCard} />
        </div>
      )}

      {note && <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{note}</p>}

      {children}

      {showProcessButton && (
        <Button onClick={onProcessCard} disabled={disabled} size="sm">
          Process Card Payment
        </Button>
      )}
    </div>
  );
};

export default CardMethodFields;

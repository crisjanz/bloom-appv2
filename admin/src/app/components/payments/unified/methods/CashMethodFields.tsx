import Button from '@shared/ui/components/ui/button/Button';
import InputField from '@shared/ui/forms/input/InputField';
import { useMemo } from 'react';
import { centsToDollars, dollarsToCents, formatCurrency } from '@shared/utils/currency';

export interface CashMethodFieldsProps {
  amountDue: number;
  amountInput: string;
  onAmountChange: (value: string) => void;
  onProcessCash: () => void;
  disabled?: boolean;
  showProcessButton?: boolean;
}

const roundPreset = (value: number, factor: number) => Math.ceil(value / factor) * factor;

const CashMethodFields = ({
  amountDue,
  amountInput,
  onAmountChange,
  onProcessCash,
  disabled,
  showProcessButton = true,
}: CashMethodFieldsProps) => {
  const amountDueDollars = centsToDollars(amountDue);
  const presets = useMemo(() => {
    if (amountDueDollars <= 0) return [];
    return [
      roundPreset(amountDueDollars, 1),
      roundPreset(amountDueDollars, 5),
      roundPreset(amountDueDollars, 10),
      roundPreset(amountDueDollars, 20),
    ];
  }, [amountDueDollars]);

  return (
    <div className="space-y-3 sm:space-y-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
      <p className="leading-relaxed">Record cash received and let the system calculate change due.</p>

      <div>
        <InputField
          label="Cash Received"
          type="number"
          step={0.01}
          min="0"
          value={amountInput}
          onChange={(event) => onAmountChange(event.target.value)}
        />
        {presets.length > 0 && (
          <div className="mt-2 sm:mt-3 grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
            {presets.map((amount, index) => (
              <button
                key={`${amount}-${index}`}
                className="rounded-lg border border-stroke px-3 py-2 text-xs font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800 transition-colors"
                onClick={() => onAmountChange(amount.toFixed(2))}
                type="button"
              >
                {formatCurrency(dollarsToCents(amount))}
              </button>
            ))}
          </div>
        )}
      </div>

      {showProcessButton && (
        <Button onClick={onProcessCash} disabled={disabled} size="sm">
          Process Cash
        </Button>
      )}
    </div>
  );
};

export default CashMethodFields;

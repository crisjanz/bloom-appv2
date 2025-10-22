import Button from '@shared/ui/components/ui/button/Button';
import TextArea from '@shared/ui/forms/input/TextArea';

export interface OfflineMethodFieldsProps {
  referenceLabel?: string;
  referenceValue: string;
  onReferenceChange: (value: string) => void;
  instructions?: string;
  requireReference?: boolean;
  onProcess?: () => void;
  disabled?: boolean;
  showProcessButton?: boolean;
  processLabel?: string;
}

const OfflineMethodFields = ({
  referenceLabel = 'Reference',
  referenceValue,
  onReferenceChange,
  instructions,
  requireReference,
  onProcess,
  disabled,
  showProcessButton = true,
  processLabel = 'Add Payment',
}: OfflineMethodFieldsProps) => (
  <div className="space-y-2.5 sm:space-y-3 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
    <div>
      <label className="mb-2 block text-xs font-semibold text-gray-600 dark:text-gray-400">
        {referenceLabel} {requireReference && <span className="text-red-500">*</span>}
      </label>
      <TextArea
        rows={2}
        value={referenceValue}
        onChange={onReferenceChange}
        placeholder={requireReference ? 'Reference is required' : 'Optional reference or note'}
      />
    </div>
    {instructions && (
      <p className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/60 rounded-lg p-2.5 sm:p-3 leading-relaxed">
        {instructions}
      </p>
    )}
    {showProcessButton && onProcess && (
      <Button onClick={onProcess} disabled={disabled} size="sm">
        {processLabel}
      </Button>
    )}
  </div>
);

export default OfflineMethodFields;

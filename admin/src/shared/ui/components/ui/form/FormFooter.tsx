import React from 'react';
import LoadingButton from '../button/LoadingButton';

export interface FormFooterProps {
  onCancel?: () => void;
  onSubmit?: () => void;
  cancelText?: string;
  submitText?: string;
  submitting?: boolean;
  submitIcon?: React.ReactNode;
  submitDisabled?: boolean;
  leftContent?: React.ReactNode;
  variant?: 'primary' | 'danger';
}

const FormFooter: React.FC<FormFooterProps> = ({
  onCancel,
  onSubmit,
  cancelText = 'Cancel',
  submitText = 'Save Changes',
  submitting = false,
  submitIcon,
  submitDisabled = false,
  leftContent,
  variant = 'primary'
}) => {
  return (
    <div className="flex items-center gap-3 pt-4" style={{ justifyContent: leftContent ? 'space-between' : 'flex-end' }}>
      {leftContent && <div>{leftContent}</div>}

      <div className="flex items-center gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            {cancelText}
          </button>
        )}

        {onSubmit && (
          <LoadingButton
            type="button"
            onClick={onSubmit}
            loading={submitting}
            loadingText="Saving..."
            variant={variant}
            icon={submitIcon}
            disabled={submitDisabled}
          >
            {submitText}
          </LoadingButton>
        )}
      </div>
    </div>
  );
};

export default FormFooter;

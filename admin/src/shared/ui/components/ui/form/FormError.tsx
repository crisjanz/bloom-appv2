import React from 'react';

export interface FormErrorProps {
  error?: string | null;
  errors?: string[];
  className?: string;
}

const FormError: React.FC<FormErrorProps> = ({
  error,
  errors,
  className = ''
}) => {
  if (!error && (!errors || errors.length === 0)) {
    return null;
  }

  const errorList = errors || (error ? [error] : []);

  return (
    <div className={`rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300 ${className}`}>
      {errorList.length === 1 ? (
        <p>{errorList[0]}</p>
      ) : (
        <ul className="list-disc list-inside space-y-1">
          {errorList.map((err, idx) => (
            <li key={idx}>{err}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default FormError;

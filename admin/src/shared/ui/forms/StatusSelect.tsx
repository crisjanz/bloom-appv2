import { useState } from "react";
import { getStatusDisplayText } from '@shared/utils/orderStatusHelpers';
import type { OrderStatus, OrderType } from '@shared/utils/orderStatusHelpers';

interface Option {
  value: string;
  label: string;
  depth?: number;
}

interface StatusSelectProps {
  options: Option[];
  placeholder?: string;
  onChange: (value: string) => void;
  className?: string;
  defaultValue?: string;
  value?: string;
  disabled?: boolean;
  orderType?: OrderType; // For smart status display
}

/**
 * Status dropdown styled to look like a Badge
 * Combines badge appearance with select functionality
 */
const StatusSelect: React.FC<StatusSelectProps> = ({
  options,
  placeholder = "Select status",
  onChange,
  className = "",
  defaultValue = "",
  value,
  disabled = false,
  orderType,
}) => {
  const [selectedValue, setSelectedValue] = useState<string>(defaultValue);

  // Normalize the value to match available options
  // Maps frontend statuses (READY_FOR_DELIVERY) to backend statuses (READY)
  const normalizeStatus = (status: string): string => {
    if (!status) return status;

    // Map frontend detailed statuses to backend simplified statuses
    const statusMap: Record<string, string> = {
      'READY_FOR_DELIVERY': 'READY',
      'READY_FOR_PICKUP': 'READY',
      'DELIVERED': 'COMPLETED',
      'PICKED_UP': 'COMPLETED',
      'PENDING_PAYMENT': 'DRAFT',
      'CONFIRMED': 'PAID',
      'IN_PRODUCTION': 'IN_DESIGN',
      'QUALITY_CHECK': 'IN_DESIGN',
      'FAILED_DELIVERY': 'REJECTED',
    };

    return statusMap[status] || status;
  };

  const rawValue = value !== undefined ? value : selectedValue;
  const currentValue = normalizeStatus(rawValue);

  // Denormalize backend status to frontend status based on orderType
  const denormalizeStatus = (status: string): string => {
    if (!status) return status;

    // Map backend statuses to frontend detailed statuses based on order type
    if (status === 'READY' && orderType) {
      return orderType === 'DELIVERY' ? 'READY_FOR_DELIVERY' : 'READY_FOR_PICKUP';
    }

    // Otherwise return as-is
    return status;
  };

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedBackendValue = e.target.value;
    const frontendValue = denormalizeStatus(selectedBackendValue);

    if (value === undefined) {
      setSelectedValue(frontendValue);
    }
    onChange(frontendValue);
  };

  // Get badge-style colors based on status
  // EXACT MATCH to Badge component's light variant colors for consistency
  const getStatusColorClasses = (status: string): string => {
    const statusUpper = status as OrderStatus;

    switch (statusUpper) {
      // DRAFT - Gray (light variant)
      case 'DRAFT':
        return 'bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-white/80';

      // PENDING_PAYMENT - Warning (yellow/orange)
      case 'PENDING_PAYMENT':
        return 'bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-orange-400';

      // PAID/CONFIRMED - Info (blue)
      case 'PAID':
      case 'CONFIRMED':
        return 'bg-blue-light-50 text-blue-light-500 dark:bg-blue-light-500/15 dark:text-blue-light-500';

      // IN_DESIGN/IN_PRODUCTION/QUALITY_CHECK - Warning (yellow/orange)
      case 'IN_DESIGN':
      case 'IN_PRODUCTION':
      case 'QUALITY_CHECK':
        return 'bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-orange-400';

      // READY statuses - Success (green) to match Badge component
      case 'READY':
      case 'READY_FOR_PICKUP':
      case 'READY_FOR_DELIVERY':
        return 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500';

      // OUT_FOR_DELIVERY - Success (green)
      case 'OUT_FOR_DELIVERY':
        return 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500';

      // COMPLETED/DELIVERED/PICKED_UP - Success (green)
      case 'COMPLETED':
      case 'DELIVERED':
      case 'PICKED_UP':
        return 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500';

      // REJECTED/CANCELLED/FAILED_DELIVERY - Error (red)
      case 'REJECTED':
      case 'CANCELLED':
      case 'FAILED_DELIVERY':
        return 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500';

      default:
        return 'bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-white/80';
    }
  };

  // Use raw value for colors (not normalized) to show correct color for detailed statuses
  const colorClasses = rawValue ? getStatusColorClasses(rawValue) : 'bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-white/60';

  return (
    <div className="relative inline-block">
      <select
        className={`inline-flex items-center px-2.5 py-0.5 justify-center gap-1 rounded-full font-medium text-sm appearance-none border-0 pr-6 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-current/30 ${colorClasses} ${
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:brightness-95"
        } ${className}`}
        value={currentValue}
        onChange={handleChange}
        disabled={disabled}
      >
        {/* Placeholder option */}
        <option
          value=""
          disabled
          className="bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-400"
        >
          {placeholder}
        </option>
        {/* Map over options */}
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            className="bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-400"
          >
            {/* Use smart display if orderType provided, otherwise use label */}
            {option.depth ? '→'.repeat(option.depth) + ' ' : ''}
            {orderType ? getStatusDisplayText(option.value as OrderStatus, orderType) : option.label}
          </option>
        ))}
      </select>
      {/* Custom dropdown arrow - positioned inside the badge */}
      <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
        <svg
          className="h-3 w-3 opacity-70"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
};

export default StatusSelect;

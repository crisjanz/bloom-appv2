import React from 'react';

export interface LoadingStateProps {
  variant?: 'spinner' | 'skeleton';
  rows?: number; // For skeleton variant
  columns?: number; // For skeleton variant
  className?: string;
}

export default function LoadingState({
  variant = 'spinner',
  rows = 5,
  columns = 6,
  className = '',
}: LoadingStateProps) {
  if (variant === 'spinner') {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  // Skeleton variant - shows placeholder rows for tables
  return (
    <div className={`animate-pulse ${className}`}>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="grid gap-4 py-3 px-4 border-b border-gray-200 dark:border-gray-800"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div key={colIndex}>
              <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded"></div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

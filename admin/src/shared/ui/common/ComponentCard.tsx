import { ReactNode } from "react";

interface ComponentCardProps {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
  desc?: ReactNode;
  headerAction?: ReactNode;
}

const ComponentCard = ({
  title,
  children,
  className = "",
  desc = "",
  headerAction,
}: ComponentCardProps) => {
  const hasHeader = Boolean(title || desc || headerAction);

  return (
    <div
      className={`rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] ${className}`}
    >
      {hasHeader && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div className="min-w-0">
            {title && (
              typeof title === "string" ? (
                <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
                  {title}
                </h3>
              ) : (
                <div className="text-base font-medium text-gray-800 dark:text-white/90">
                  {title}
                </div>
              )
            )}
            {desc && (
              <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {desc}
              </div>
            )}
          </div>
          {headerAction && <div className="flex-shrink-0">{headerAction}</div>}
        </div>
      )}

      <div
        className={`p-4 sm:px-5 sm:py-5 ${
          hasHeader ? "border-t border-gray-100 dark:border-gray-800" : ""
        }`}
      >
        <div className="space-y-3.5">{children}</div>
      </div>
    </div>
  );
};

export default ComponentCard;

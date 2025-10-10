import { useState } from "react";

interface ComponentCardCollapsibleProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  desc?: string;
  defaultOpen?: boolean;
}

const ComponentCardCollapsible: React.FC<ComponentCardCollapsibleProps> = ({
  title,
  children,
  className = "",
  desc = "",
  defaultOpen = false,
}) => {
  const [isVisible, setIsVisible] = useState(defaultOpen);

  return (
    <div
      className={`rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] ${className}`}
    >
      {/* Card Header */}
      <div className="flex justify-between items-center px-6 py-5">
        <div>
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
            {title}
          </h3>
          {desc && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {desc}
            </p>
          )}
        </div>
        <span 
          onClick={() => setIsVisible(!isVisible)}
          className="text-sm hover:underline font-medium cursor-pointer text-gray-600 dark:text-gray-300"
        >
          {isVisible ? "Hide" : "Show"}
        </span>
      </div>

      {/* Card Body */}
      <div
        className={`p-4 border-t border-gray-100 dark:border-gray-800 sm:p-6 ${isVisible ? "" : "hidden"}`}
      >
        <div className="space-y-6">{children}</div>
      </div>
    </div>
  );
};

export default ComponentCardCollapsible;
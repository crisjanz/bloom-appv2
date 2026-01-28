import { useState } from "react";

interface ComponentCardCollapsibleProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  desc?: string;
  defaultOpen?: boolean;
  isOpen?: boolean;
  onToggle?: (next: boolean) => void;
}

const ComponentCardCollapsible: React.FC<ComponentCardCollapsibleProps> = ({
  title,
  children,
  className = "",
  desc = "",
  defaultOpen = false,
  isOpen,
  onToggle,
}) => {
  const [internalVisible, setInternalVisible] = useState(defaultOpen);
  const visible = isOpen ?? internalVisible;

  const handleToggle = () => {
    if (onToggle) {
      onToggle(!visible);
    } else {
      setInternalVisible((prev) => !prev);
    }
  };

  return (
    <div
      className={`rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] ${className}`}
    >
      {/* Card Header */}
      <div
        className="flex justify-between items-center px-6 py-5 cursor-pointer"
        role="button"
        tabIndex={0}
        onClick={handleToggle}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleToggle();
          }
        }}
      >
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
          className="text-sm hover:underline font-medium cursor-pointer text-gray-600 dark:text-gray-300"
        >
          {visible ? "Hide" : "Show"}
        </span>
      </div>

      {/* Card Body */}
      <div
        className={`p-4 border-t border-gray-100 dark:border-gray-800 sm:p-6 ${visible ? "" : "hidden"}`}
      >
        <div className="space-y-6">{children}</div>
      </div>
    </div>
  );
};

export default ComponentCardCollapsible;

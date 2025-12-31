type BadgeVariant = "light" | "solid";
type BadgeSize = "sm" | "md";
type BadgeColor =
  | "primary"
  | "success"
  | "error"
  | "warning"
  | "info"
  | "light"
  | "dark";

interface BadgeProps {
  variant?: BadgeVariant; // Light or solid variant
  size?: BadgeSize; // Badge size
  color?: BadgeColor; // Badge color
  startIcon?: React.ReactNode; // Icon at the start
  endIcon?: React.ReactNode; // Icon at the end
  children: React.ReactNode; // Badge content
  className?: string; // Additional CSS classes
}

const Badge: React.FC<BadgeProps> = ({
  variant = "light",
  color = "primary",
  size = "md",
  startIcon,
  endIcon,
  children,
  className = "",
}) => {
  const baseStyles =
    "inline-flex items-center px-2.5 py-0.5 justify-center gap-1 rounded-full font-medium whitespace-nowrap border";

  // Define size styles
  const sizeStyles = {
    sm: "text-theme-xs", // Smaller padding and font size
    md: "text-sm", // Default padding and font size
  };

  // Define color styles for variants
  const variants = {
    light: {
      primary:
        "bg-brand-50 text-brand-500 border-brand-200 dark:bg-brand-500/15 dark:text-brand-400 dark:border-brand-400/30",
      success:
        "bg-success-50 text-success-600 border-success-200 dark:bg-success-500/15 dark:text-success-500 dark:border-success-500/30",
      error:
        "bg-error-50 text-error-600 border-error-200 dark:bg-error-500/15 dark:text-error-500 dark:border-error-500/30",
      warning:
        "bg-warning-50 text-warning-600 border-warning-200 dark:bg-warning-500/15 dark:text-orange-400 dark:border-orange-400/30",
      info: "bg-blue-light-50 text-blue-light-500 border-blue-light-200 dark:bg-blue-light-500/15 dark:text-blue-light-500 dark:border-blue-light-500/30",
      light: "bg-gray-100 text-gray-700 border-gray-300 dark:bg-white/5 dark:text-white/80 dark:border-white/10",
      dark: "bg-gray-500 text-white border-gray-600 dark:bg-white/5 dark:text-white dark:border-white/10",
    },
    solid: {
      primary: "bg-brand-500 text-white border-brand-600 dark:text-white dark:border-brand-600",
      success: "bg-success-500 text-white border-success-600 dark:text-white dark:border-success-600",
      error: "bg-error-500 text-white border-error-600 dark:text-white dark:border-error-600",
      warning: "bg-warning-500 text-white border-warning-600 dark:text-white dark:border-warning-600",
      info: "bg-blue-light-500 text-white border-blue-light-600 dark:text-white dark:border-blue-light-600",
      light: "bg-gray-400 text-white border-gray-500 dark:bg-white/5 dark:text-white/80 dark:border-white/10",
      dark: "bg-gray-700 text-white border-gray-800 dark:text-white dark:border-gray-800",
    },
  };

  // Get styles based on size and color variant
  const sizeClass = sizeStyles[size];
  const colorStyles = variants[variant][color];

  return (
    <span className={`${baseStyles} ${sizeClass} ${colorStyles} ${className}`}>
      {startIcon && <span className="mr-1">{startIcon}</span>}
      {children}
      {endIcon && <span className="ml-1">{endIcon}</span>}
    </span>
  );
};

export default Badge;

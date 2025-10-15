interface ReportMetricCardProps {
  label: string;
  value: string;
  description?: string;
}

const ReportMetricCard: React.FC<ReportMetricCardProps> = ({ label, value, description }) => {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">{value}</p>
      {description ? (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{description}</p>
      ) : null}
    </div>
  );
};

export default ReportMetricCard;

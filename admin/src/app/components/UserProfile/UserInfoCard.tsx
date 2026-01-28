import { useAuth } from "@app/contexts/AuthContext";

export default function UserInfoCard() {
  const { employee } = useAuth();

  if (!employee) return null;

  const fields = [
    { label: 'Name', value: employee.name },
    { label: 'Email', value: employee.email || 'Not set' },
    { label: 'Role', value: employee.type },
  ];

  return (
    <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
      <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-6">
        Account Details
      </h4>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7">
        {fields.map((field) => (
          <div key={field.label}>
            <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">
              {field.label}
            </p>
            <p className="text-sm font-medium text-gray-800 dark:text-white/90">
              {field.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

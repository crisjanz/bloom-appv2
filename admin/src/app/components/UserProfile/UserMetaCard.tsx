import { useAuth, EmployeeType } from "@app/contexts/AuthContext";

const typeLabel: Record<string, string> = {
  [EmployeeType.ADMIN]: 'Administrator',
  [EmployeeType.CASHIER]: 'Cashier',
  [EmployeeType.DESIGNER]: 'Designer',
  [EmployeeType.DRIVER]: 'Driver',
};

export default function UserMetaCard() {
  const { employee } = useAuth();

  if (!employee) return null;

  return (
    <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
      <div className="flex items-center gap-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-500 text-2xl font-bold text-white">
          {employee.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {employee.name}
          </h4>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {typeLabel[employee.type] || employee.type}
          </p>
        </div>
      </div>
    </div>
  );
}

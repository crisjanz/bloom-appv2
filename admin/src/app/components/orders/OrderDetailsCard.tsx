// src/components/orders/OrderDetailsCard.tsx
import { FC, useEffect } from "react";
import Select from "@shared/ui/forms/Select";

type Employee = {
  id: string;
  name: string;
  type: string;
};

type OrderSourceType =
  | "phone"
  | "walkin"
  | "external"
  | "website"
  | "pos";

type Props = {
  employee: string;
  setEmployee: (val: string) => void;
  employeeList: Employee[];
  orderSource?: OrderSourceType;
  setOrderSource?: (val: OrderSourceType) => void;
  onSaveDraft?: () => void;
  onLoadDrafts?: () => void;
  isSavingDraft?: boolean;
  formData?: any;
};

const OrderDetailsCard: FC<Props> = ({
  employee,
  setEmployee,
  employeeList,
  orderSource = "phone",
  setOrderSource,
  onSaveDraft,
  onLoadDrafts,
  isSavingDraft = false,
  formData,
}) => {
  const handleSaveDraft = () => {
    onSaveDraft?.();
  };

  useEffect(() => {
    if (
      (orderSource === "website" || orderSource === "pos") &&
      setOrderSource
    ) {
      setOrderSource("phone");
    }
  }, [orderSource, setOrderSource]);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
      <div className="flex flex-wrap items-center gap-4">
        {/* Employee Dropdown */}
        <div className="w-48">
          <Select
            options={employeeList.map((emp) => ({
              value: emp.id,
              label: `${emp.name}${emp.type ? ` (${emp.type})` : ""}`,
            }))}
            value={employee}
            placeholder="Select employee *"
            onChange={(value) => setEmployee(value)}
          />
        </div>

        {/* Order Source Dropdown */}
        <div className="w-52">
          <Select
            options={[
              { value: "phone", label: "Phone Order" },
              { value: "walkin", label: "Walk-in Order" },
              { value: "external", label: "External Order" },
            ]}
            value={
              orderSource === "website" || orderSource === "pos"
                ? "phone"
                : orderSource
            }
            placeholder="Select order source"
            onChange={(value) => setOrderSource?.(value as OrderSourceType)}
          />
        </div>

        {/* Draft Actions */}
        <div className="ml-auto flex gap-2">
          <button
            onClick={handleSaveDraft}
            disabled={isSavingDraft}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg disabled:opacity-50 transition-all"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            {isSavingDraft ? "Saving..." : "Save Draft"}
          </button>

          <button
            onClick={onLoadDrafts}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-all"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Load Drafts
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsCard;

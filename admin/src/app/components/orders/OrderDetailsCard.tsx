// src/components/orders/OrderDetailsCard.tsx
import { FC, useState, useEffect } from "react";
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
  onSaveDraft?: (draftData: any) => void;
  formData?: any;
};

const OrderDetailsCard: FC<Props> = ({
  employee,
  setEmployee,
  employeeList,
  orderSource = "phone",
  setOrderSource,
  onSaveDraft,
  formData,
}) => {
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [savedDrafts, setSavedDrafts] = useState<any[]>([]);
  const [showDraftsList, setShowDraftsList] = useState(false);

  // Load drafts from localStorage on mount
  useEffect(() => {
    const drafts = localStorage.getItem("orderDrafts");
    if (drafts) {
      setSavedDrafts(JSON.parse(drafts));
    }
  }, []);

  const handleSaveDraft = () => {
    const draftName = prompt("Enter a name for this draft:");
    if (!draftName) return;

    setIsSavingDraft(true);

    const draft = {
      id: `draft-${Date.now()}`,
      name: draftName,
      date: new Date().toISOString(),
      employee: employee,
      orderSource: orderSource,
      data: formData || {},
    };

    const existingDrafts = JSON.parse(
      localStorage.getItem("orderDrafts") || "[]",
    );
    const updatedDrafts = [...existingDrafts, draft];
    localStorage.setItem("orderDrafts", JSON.stringify(updatedDrafts));
    setSavedDrafts(updatedDrafts);

    if (onSaveDraft) {
      onSaveDraft(draft);
    }

    setIsSavingDraft(false);
    alert("Draft saved successfully!");
  };

  const normalizeOrderSource = (source?: string): OrderSourceType | undefined => {
    if (!source) return undefined;
    if (source === "wirein" || source === "wireout") return "external";
    return source as OrderSourceType;
  };

  const handleLoadDraft = (draftId: string) => {
    const draft = savedDrafts.find((d) => d.id === draftId);
    if (!draft) return;

    if (draft.employee) {
      setEmployee(draft.employee);
    }

    if (draft.orderSource && setOrderSource) {
      const normalizedSource = normalizeOrderSource(draft.orderSource);
      if (normalizedSource) {
        setOrderSource(normalizedSource);
      }
    }

    if (onSaveDraft && draft.data) {
      onSaveDraft(draft.data);
    }

    setShowDraftsList(false);
    alert(`Draft "${draft.name}" loaded!`);
  };

  const handleDeleteDraft = (draftId: string) => {
    const updatedDrafts = savedDrafts.filter((d) => d.id !== draftId);
    localStorage.setItem("orderDrafts", JSON.stringify(updatedDrafts));
    setSavedDrafts(updatedDrafts);
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
            onClick={() => setShowDraftsList(!showDraftsList)}
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
            Load ({savedDrafts.length})
          </button>
        </div>
      </div>

      {/* Drafts List - Compact */}
      {showDraftsList && savedDrafts.length > 0 && (
        <div className="mt-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
          <div className="space-y-1.5">
            {savedDrafts.map((draft) => (
              <div
                key={draft.id}
                className="flex items-center justify-between p-2 bg-white dark:bg-gray-700 rounded text-sm"
              >
                <span className="font-medium">{draft.name}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleLoadDraft(draft.id)}
                    className="text-brand-500 hover:underline"
                  >
                    Load
                  </button>
                  <button
                    onClick={() => handleDeleteDraft(draft.id)}
                    className="text-red-500 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetailsCard;

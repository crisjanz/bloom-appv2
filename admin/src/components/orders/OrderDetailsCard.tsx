// src/components/orders/OrderDetailsCard.tsx
import { FC, useState, useEffect } from "react";
import ComponentCard from "../common/ComponentCard";
import Select from "../form/Select";
import Radio from "../form/input/Radio";

type Employee = {
  id: string;
  name: string;
  type: string;
};

type Props = {
  employee: string;
  setEmployee: (val: string) => void;
  employeeList: Employee[];
  orderSource?: "phone" | "walkin";
  setOrderSource?: (val: "phone" | "walkin") => void;
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
    const drafts = localStorage.getItem('orderDrafts');
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

    const existingDrafts = JSON.parse(localStorage.getItem('orderDrafts') || '[]');
    const updatedDrafts = [...existingDrafts, draft];
    localStorage.setItem('orderDrafts', JSON.stringify(updatedDrafts));
    setSavedDrafts(updatedDrafts);
    
    if (onSaveDraft) {
      onSaveDraft(draft);
    }
    
    setIsSavingDraft(false);
    alert("Draft saved successfully!");
  };

  const handleLoadDraft = (draftId: string) => {
    const draft = savedDrafts.find(d => d.id === draftId);
    if (!draft) return;

    if (draft.employee) {
      setEmployee(draft.employee);
    }

    if (draft.orderSource && setOrderSource) {
      setOrderSource(draft.orderSource);
    }

    if (onSaveDraft && draft.data) {
      onSaveDraft(draft.data);
    }

    setShowDraftsList(false);
    alert(`Draft "${draft.name}" loaded!`);
  };

  const handleDeleteDraft = (draftId: string) => {
    const updatedDrafts = savedDrafts.filter(d => d.id !== draftId);
    localStorage.setItem('orderDrafts', JSON.stringify(updatedDrafts));
    setSavedDrafts(updatedDrafts);
  };

  return (
    <ComponentCard title="Order Information">
      <div className="flex flex-wrap items-center gap-4">
        {/* Employee Dropdown */}
        <div className="w-48">
          <Select
            options={employeeList.map(emp => ({
              value: emp.id,
              label: `${emp.name}${emp.type ? ` (${emp.type})` : ""}`
            }))}
            value={employee}
            placeholder="Select employee *"
            onChange={(value) => setEmployee(value)}
          />
        </div>

        {/* Radio Buttons */}
        <div className="flex items-center gap-4">
          <Radio
            id="phone-order"
            name="orderSource"
            value="phone"
            checked={orderSource === "phone"}
            label="Phone Order"
            onChange={() => setOrderSource?.("phone")}
          />
          <Radio
            id="walkin-order"
            name="orderSource"
            value="walkin"
            checked={orderSource === "walkin"}
            label="Walk-in Order"
            onChange={() => setOrderSource?.("walkin")}
          />
        </div>

        {/* Draft Actions */}
        <div className="flex gap-2 ml-auto">
          <button
            onClick={handleSaveDraft}
            disabled={isSavingDraft}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white rounded-lg hover:bg-opacity-90 disabled:opacity-50 transition-all"
            style={{ backgroundColor: '#597485' }}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            {isSavingDraft ? "Saving..." : "Save Draft"}
          </button>

          <button
            onClick={() => setShowDraftsList(!showDraftsList)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-all"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Load ({savedDrafts.length})
          </button>
        </div>
      </div>

      {/* Drafts List - Compact */}
      {showDraftsList && savedDrafts.length > 0 && (
        <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="space-y-1.5">
            {savedDrafts.map(draft => (
              <div key={draft.id} className="flex items-center justify-between p-2 bg-white dark:bg-gray-700 rounded text-sm">
                <span className="font-medium">{draft.name}</span>
                <div className="flex gap-2">
                  <button onClick={() => handleLoadDraft(draft.id)} className="text-[#597485] hover:underline">Load</button>
                  <button onClick={() => handleDeleteDraft(draft.id)} className="text-red-500 hover:underline">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </ComponentCard>
  );
};

export default OrderDetailsCard;
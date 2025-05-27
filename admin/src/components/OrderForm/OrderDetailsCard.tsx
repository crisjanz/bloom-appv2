import React from "react";

type Employee = {
  id: string;
  name: string;
  type: string;
};

type Props = {
  orderType: string;
  setOrderType: (val: "DELIVERY" | "PICKUP" | "") => void;
  employee: string;
  setEmployee: (val: string) => void;
  employeeList: Employee[];
};

export default function OrderDetailsCard({
  orderType,
  setOrderType,
  employee,
  setEmployee,
  employeeList,
}: Props) {
  return (
    <div className="bg-card rounded shadow p-4 space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div className="flex items-center gap-4">
          {/* Order Type */}
          <div>
            <select
              value={orderType}
              onChange={(e) =>
                setOrderType(e.target.value as "DELIVERY" | "PICKUP")
              }
              className="select-primary w-40 mt-1"
            >
              <option value="" disabled hidden>
                Order Type ⭵
              </option>
              <option value="DELIVERY">Delivery</option>
              <option value="PICKUP">Pickup</option>
            </select>
          </div>

          {/* Employee */}
          <div>
            <select
              value={employee}
              onChange={(e) => setEmployee(e.target.value)}
              className="select-primary w-48 mt-1"
            >
              <option value="">Select Employee*</option>
              {employeeList.map((e) => (
    <option key={e.id} value={e.id}>
      {e.name}
    </option>
    
              ))}
            </select>
            
          </div>
        </div>

        {/* Drafts (placeholder only) */}
        <div className="flex items-end gap-2">
          <button className="btn-primary py-2.5">Save Draft</button>
          <select className="select-primary w-48 mt-1">
            <option value="" disabled hidden>
              Load Draft...
            </option>
            <option>Draft #1 - May 25</option>
            <option>Draft #2 - Wedding</option>
          </select>
        </div>
      </div>
    </div>
  );
}

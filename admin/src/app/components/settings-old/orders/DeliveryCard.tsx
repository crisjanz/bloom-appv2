import { useState } from "react";
import ComponentCard from "@shared/ui/common/ComponentCard";
import InputField from "@shared/ui/forms/input/InputField";
import Label from "@shared/ui/forms/Label";
import Select from "@shared/ui/forms/Select";
import Button from "@shared/ui/components/ui/button/Button";

const DeliveryCard = () => {
  const [isCardBodyVisible, setIsCardBodyVisible] = useState(false);

  return (
    <div className="p-4">
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        {/* Custom Header */}
        <div className="flex justify-between items-center px-6 py-5">
          <div>
            <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
              Delivery Settings
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Card description here
            </p>
          </div>
          <span 
            onClick={() => setIsCardBodyVisible(!isCardBodyVisible)}
            className="text-sm hover:underline font-medium cursor-pointer text-gray-600 dark:text-gray-300"
          >
            {isCardBodyVisible ? "Hide" : "Show"}
          </span>
        </div>

        {/* Card Body - Starts Here */}
        <div
          className={`p-4 border-t border-gray-100 dark:border-gray-800 sm:p-6 ${isCardBodyVisible ? "" : "hidden"}`}
        >
          {/* Content goes here */}
        </div>
      </div>
    </div>
  );
};

export default DeliveryCard;
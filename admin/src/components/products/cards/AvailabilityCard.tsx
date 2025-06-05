// AvailabilityCard.tsx
import { FC } from "react";
import ComponentCard from "../../common/ComponentCard";
import InputField from "../../form/input/InputField";
import Checkbox from "../../form/input/Checkbox";

type Props = {
  availableFrom: string;
  availableTo: string;
  subscriptionAvailable: boolean;
  onChange: (field: string, value: any) => void;
};

const AvailabilityCard: FC<Props> = ({
  availableFrom,
  availableTo,
  subscriptionAvailable,
  onChange,
}) => (
  <ComponentCard title="Availability">
    <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
      💬 This card is not finalized — we may change how availability works.
    </p>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-5.5 mb-5.5">
      <InputField
        label="Available From"
        name="availableFrom"
        type="date"
        id="date-picker"
        value={availableFrom}
        onChange={(e) => onChange("availableFrom", e.target.value)}
      />
      <InputField
        label="Available To"
        name="availableTo"
        type="date"
        id="date-picker"
        value={availableTo}
        onChange={(e) => onChange("availableTo", e.target.value)}
      />
    </div>

    <Checkbox
      label="Available for Subscription"
      name="subscriptionAvailable"
      checked={subscriptionAvailable}
      onChange={(e) => onChange("subscriptionAvailable", e.target.checked)}
    />
  </ComponentCard>
);

export default AvailabilityCard;
// ProductInfoCard.tsx
import { FC } from "react";
import InputField from "../../form/input/InputField";
import ComponentCard from "../../common/ComponentCard";
import Textarea from "../../form/input/Textarea";


type Props = {
  title: string;
  description: string;
  onChange: (field: "title" | "description", value: string) => void;
};

const ProductInfoCard: FC<Props> = ({ title, description, onChange }) => (
   <ComponentCard title="Product Info">
<div>

    <div className="mb-5.5">
      <InputField
        label="Product Title"
        name="title"
        value={title}
        onChange={(e) => onChange("title", e.target.value)}
        placeholder="e.g. Bright and Bold"
      />
    </div>

<div className="mb-5.5">
<Textarea
  label="Product Description"
  name="description"
  placeholder="Enter product description"
  value={description}
  onChange={(value) => onChange("description", value)} // ✅ TailAdmin-style
/>
</div>

    <div className="form-file border border-dashed border-stroke p-4 text-center dark:border-strokedark">
      Drag and drop product image here
    </div>
  </div>
  </ComponentCard>
);

export default ProductInfoCard;

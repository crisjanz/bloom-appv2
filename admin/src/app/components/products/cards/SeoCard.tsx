import { FC } from "react";
import ComponentCard from "@shared/ui/common/ComponentCard";
import InputField from "@shared/ui/forms/input/InputField";
import Textarea from "@shared/ui/forms/input/TextArea";

type Props = {
  seoTitle: string;
  seoDescription: string;
  onChange: (field: string, value: string) => void;
};

const SeoCard: FC<Props> = ({ seoTitle, seoDescription, onChange }) => (
  <ComponentCard title="SEO Settings">
    <div className="mb-5.5">
      <InputField
        label="SEO Title"
        name="seoTitle"
        value={seoTitle}
        onChange={(e) => onChange("seoTitle", e.target.value)}
        placeholder="e.g. Fresh Spring Tulips – In Your Vase Flowers"
      />
    </div>

    <div className="mb-5.5">
      <Textarea
        label="Meta Description"
        name="seoDescription"
        value={seoDescription}
        onChange={(e) => onChange("seoDescription", e.target.value)}
        placeholder="This product features fresh tulips perfect for spring. Order now for local delivery in Prince George."
        rows={4}
      />
    </div>
  </ComponentCard>
);

export default SeoCard;
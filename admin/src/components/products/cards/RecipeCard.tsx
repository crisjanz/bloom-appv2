import { FC, ChangeEvent } from "react";
import ComponentCard from "../../common/ComponentCard";
import Textarea from "../../form/input/TextArea";

type Props = {
  recipe: string;
  onChange: (value: string) => void;
};

const RecipeCard: FC<Props> = ({ recipe, onChange }) => {
  // Handle both direct value and event-based onChange
  const handleChange = (input: ChangeEvent<HTMLTextAreaElement> | string) => {
    const value = typeof input === "string" ? input : input.target.value;
    onChange(value);
  };

  return (
    <ComponentCard title="Recipe Notes">
      <div className="mb-5.5">
        <Textarea
          label="Internal Recipe"
          name="recipe"
          value={recipe}
          onChange={handleChange}
          placeholder="This is for internal use only. Example: 4x red roses, 3x mini carnations, greens."
          rows={4}
        />
      </div>
    </ComponentCard>
  );
};

export default RecipeCard;
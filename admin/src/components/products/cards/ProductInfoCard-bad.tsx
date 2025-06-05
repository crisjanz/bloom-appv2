// ProductInfoCard.tsx
import { FC, useState, useRef } from "react";
import InputField from "../../form/input/InputField";
import ComponentCard from "../../common/ComponentCard";
import Textarea from "../../form/input/Textarea";

type Props = {
  title: string;
  description: string;
  onChange: (field: "title" | "description", value: string) => void;
  onImagesChange?: (files: File[]) => void; // ✅ Added this line
};

const ProductInfoCard: FC<Props> = ({ title, description, onChange, onImagesChange }) => {
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);

    if (onImagesChange) onImagesChange(files); // ✅ Avoid undefined error

    const readers = files.map(
      (file) =>
        new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        })
    );

    Promise.all(readers).then((newPreviews) => {
      setImagePreviews((prev) => [...prev, ...newPreviews]);
    });

    e.target.value = "";
  };

  return (
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
            onChange={(value) => onChange("description", value)}
          />
        </div>

        <div className="mb-5.5">
          <label className="mb-3 block text-sm font-medium text-black dark:text-white">
            Product Images
          </label>

          <div
            className="relative flex min-h-[200px] items-center justify-center rounded border border-dashed border-primary bg-white dark:bg-boxdark"
            onClick={() => inputRef.current?.click()}
          >
            {imagePreviews.length > 0 ? (
              <div className="flex flex-wrap gap-4 p-4">
                {imagePreviews.map((src, index) => (
                  <div key={index} className="relative w-32 h-32 border rounded overflow-hidden">
                    <img
                      src={src}
                      alt={`Preview ${index + 1}`}
                      className="object-cover w-full h-full"
                    />
                    <button
                      type="button"
                      className="absolute top-1 right-1 z-10 bg-black bg-opacity-50 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-opacity-80"
                      onClick={(e) => {
                        e.stopPropagation();
                        setImagePreviews((prev) => prev.filter((_, i) => i !== index));
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  <span className="font-medium text-primary underline">
                    Click to upload
                  </span>{" "}
                  or drag and drop
                </p>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  PNG, JPG up to 2MB
                </p>
              </div>
            )}
            <input
              type="file"
              multiple
              ref={inputRef}
              onChange={handleFileChange}
              accept="image/png, image/jpeg"
              className="absolute inset-0 h-full w-full opacity-0 cursor-pointer z-0"
            />
          </div>
        </div>
      </div>
    </ComponentCard>
  );
};

export default ProductInfoCard;
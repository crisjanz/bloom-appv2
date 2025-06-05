import { FC, useState, ChangeEvent, DragEvent } from "react";
import InputField from "../../form/input/InputField";
import ComponentCard from "../../common/ComponentCard";
import Textarea from "../../form/input/Textarea";

type Props = {
  title: string;
  description: string;
  onChange: (field: "title" | "description", value: string) => void;
  onImagesChange: (files: File[]) => void;
};

const ProductInfoCard: FC<Props> = ({ title, description, onChange, onImagesChange }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

const handleFileChange = (files: FileList | null) => {
  if (files && files.length > 0) {
    const fileArray = Array.from(files);
    setSelectedFiles((prevFiles) => [...prevFiles, ...fileArray]);
    onImagesChange((prevFiles) => [...prevFiles, ...fileArray]);
  }
};

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFileChange(e.target.files);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFileChange(e.dataTransfer.files);
  };

const handleRemoveFile = (index: number) => {
  const updatedFiles = selectedFiles.filter((_, i) => i !== index);
  setSelectedFiles(updatedFiles);
  onImagesChange(updatedFiles);
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
          <div
            className={`border border-dashed border-stroke p-4 text-center dark:border-strokedark ${
              isDragging ? "bg-gray-100 dark:bg-gray-800" : ""
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <label
              htmlFor="product-images"
              className="cursor-pointer block text-sm text-gray-500 dark:text-gray-400"
            >
              Drag and drop images here or click to upload
            </label>
            <input
              id="product-images"
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={handleInputChange}
            />
          </div>
          {selectedFiles.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
{selectedFiles.map((file, index) => (
  <div key={index} className="flex flex-col items-center relative">
    <img
      src={URL.createObjectURL(file)}
      alt={file.name}
      className="w-16 h-16 object-cover rounded-md"
    />
    <button
      onClick={() => handleRemoveFile(index)}
      className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
    >
      X
    </button>
    <span className="text-sm text-gray-600 dark:text-gray-300 mt-1 truncate w-16">{file.name}</span>
  </div>
))}
            </div>
          )}
        </div>
      </div>
    </ComponentCard>
  );
};

export default ProductInfoCard;
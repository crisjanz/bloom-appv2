import { FC, useState, ChangeEvent, DragEvent } from "react";
import InputField from "../../form/input/InputField";
import ComponentCard from "../../common/ComponentCard";
import Textarea from "../../form/input/Textarea";

type Props = {
  title: string;
  description: string;
  existingImages?: string[]; // URLs of existing images
  onChange: (field: "title" | "description", value: string) => void;
  onImagesChange: (files: File[]) => void;
  onExistingImageDelete?: (imageUrl: string) => void;
  setSlug: (slug: string) => void;
};

const ProductInfoCard: FC<Props> = ({ 
  title, 
  description, 
  existingImages = [], 
  onChange, 
  onImagesChange, 
  onExistingImageDelete,
  setSlug 
}) => {
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

  // ✅ Added this function for slug generation
  const handleTitleBlur = () => {
    if (title && title.trim()) {
      const generatedSlug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      console.log('Generating slug:', { title, generatedSlug });
      setSlug(generatedSlug);
    }
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
            onBlur={handleTitleBlur} // ✅ Added this
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
          
          {/* Display existing images and new uploads */}
          {(existingImages.length > 0 || selectedFiles.length > 0) && (
            <div className="mt-2">
              <div className="flex flex-wrap gap-2">
                {/* Existing images from database */}
                {existingImages.map((imageUrl, index) => (
                  <div key={`existing-${index}`} className="flex flex-col items-center relative">
                    <img
                      src={imageUrl}
                      alt={`Product image ${index + 1}`}
                      className="w-16 h-16 object-cover rounded-md border-2 border-green-200"
                    />
                    {onExistingImageDelete && (
                      <button
                        onClick={() => onExistingImageDelete(imageUrl)}
                        className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                      >
                        X
                      </button>
                    )}
                    <span className="text-xs text-green-600 mt-1">Saved</span>
                  </div>
                ))}
                
                {/* New file uploads */}
                {selectedFiles.map((file, index) => (
                  <div key={`new-${index}`} className="flex flex-col items-center relative">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="w-16 h-16 object-cover rounded-md border-2 border-blue-200"
                    />
                    <button
                      onClick={() => handleRemoveFile(index)}
                      className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                    >
                      X
                    </button>
                    <span className="text-xs text-blue-600 mt-1">New</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </ComponentCard>
  );
};

export default ProductInfoCard;
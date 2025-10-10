import { FC, useState, ChangeEvent, DragEvent } from "react";
import InputField from "@shared/ui/forms/input/InputField";
import ComponentCard from "@shared/ui/common/ComponentCard";
import Textarea from "@shared/ui/forms/input/TextArea";
import ImageCropModal from "@shared/ui/components/ui/modal/ImageCropModal";
import { uploadImage, deleteImage, fileToDataURL } from "@shared/utils/imageUploadService";

type Props = {
  title: string;
  description: string;
  existingImages?: string[]; // URLs of existing images
  onChange: (field: "title" | "description", value: string) => void;
  onImageUploaded: (imageUrl: string) => void; // Called when image is uploaded
  onImageDeleted: (imageUrl: string) => void; // Called when image is deleted
  setSlug: (slug: string) => void;
};

const ProductInfoCard: FC<Props> = ({
  title,
  description,
  existingImages = [],
  onChange,
  onImageUploaded,
  onImageDeleted,
  setSlug
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [imageToEdit, setImageToEdit] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0]; // Handle one file at a time for cropping

    try {
      // Convert file to data URL for cropping
      const dataUrl = await fileToDataURL(file);
      setImageToEdit(dataUrl);
      setCropModalOpen(true);
    } catch (error) {
      console.error('Error loading image:', error);
      alert('Failed to load image');
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
    // Reset input so same file can be selected again
    e.target.value = '';
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
    handleFileSelect(e.dataTransfer.files);
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setCropModalOpen(false);
    setImageToEdit(null);
    setIsUploading(true);

    try {
      console.log('📤 Uploading cropped image to Supabase...');
      const imageUrl = await uploadImage(croppedBlob, 'products');
      console.log('✅ Image uploaded:', imageUrl);

      onImageUploaded(imageUrl);
      alert('Image uploaded successfully!');
    } catch (error) {
      console.error('❌ Upload failed:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteImage = async (imageUrl: string) => {
    if (!confirm('Delete this image?')) return;

    try {
      console.log('🗑️ Deleting image from Supabase...');
      await deleteImage(imageUrl, 'products');
      console.log('✅ Image deleted');

      onImageDeleted(imageUrl);
    } catch (error) {
      console.error('❌ Delete failed:', error);
      alert('Failed to delete image. Please try again.');
    }
  };

  const handleTitleBlur = () => {
    if (title && title.trim()) {
      const generatedSlug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      setSlug(generatedSlug);
    }
  };

  return (
    <>
      <ComponentCard title="Product Info">
        <div>
          <div className="mb-5.5">
            <InputField
              label="Product Title"
              name="title"
              value={title}
              onChange={(e) => onChange("title", e.target.value)}
              onBlur={handleTitleBlur}
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

            {/* Upload Area */}
            <div
              className={`border border-dashed border-stroke p-4 text-center dark:border-strokedark ${
                isDragging ? "bg-gray-100 dark:bg-gray-800" : ""
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center gap-3">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-stroke bg-white dark:border-strokedark dark:bg-boxdark">
                  <svg
                    className="fill-current"
                    width="28"
                    height="28"
                    viewBox="0 0 28 28"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M14 2.33334V25.6667M2.33334 14H25.6667"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm">
                    <label
                      htmlFor="product-image"
                      className="cursor-pointer text-primary hover:underline"
                    >
                      Click to upload
                    </label>{" "}
                    or drag and drop
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Images will be cropped before upload
                  </p>
                </div>
                <input
                  type="file"
                  id="product-image"
                  className="sr-only"
                  accept="image/*"
                  onChange={handleInputChange}
                />
              </div>
            </div>

            {/* Uploading Indicator */}
            {isUploading && (
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center gap-3">
                <svg
                  className="animate-spin h-5 w-5 text-blue-600"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <span className="text-sm text-blue-600 dark:text-blue-400">
                  Uploading image...
                </span>
              </div>
            )}

            {/* Existing Images */}
            {existingImages.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
                {existingImages.map((imageUrl, index) => (
                  <div
                    key={index}
                    className="group relative aspect-square overflow-hidden rounded-lg border border-stroke dark:border-strokedark"
                  >
                    <img
                      src={imageUrl}
                      alt={`Product ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleDeleteImage(imageUrl)}
                      className="absolute top-2 right-2 rounded-full bg-red-600 p-2 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-700"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </ComponentCard>

      {/* Crop Modal */}
      {cropModalOpen && imageToEdit && (
        <ImageCropModal
          image={imageToEdit}
          onCropComplete={handleCropComplete}
          onCancel={() => {
            setCropModalOpen(false);
            setImageToEdit(null);
          }}
        />
      )}
    </>
  );
};

export default ProductInfoCard;

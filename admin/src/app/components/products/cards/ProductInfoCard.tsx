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
  onImagesReordered: (newOrder: string[]) => void; // Called when images are reordered
  setSlug: (slug: string) => void;
  productId?: string; // Product ID for immediate database updates
};

const ProductInfoCard: FC<Props> = ({
  title,
  description,
  existingImages = [],
  onChange,
  onImageUploaded,
  onImageDeleted,
  onImagesReordered,
  setSlug,
  productId
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [imageToEdit, setImageToEdit] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [editingExistingImage, setEditingExistingImage] = useState<string | null>(null); // URL of image being re-cropped

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
    console.log('📁 File input changed:', e.target.files);
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

  const updateDatabaseImages = async (newImages: string[]) => {
    if (!productId) return; // Can't update if no product ID

    try {
      console.log('💾 Updating database with images:', newImages);
      const response = await fetch(`/api/products/${productId}/images`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: newImages }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Database update error:', errorData);
        throw new Error('Failed to update database');
      }

      console.log('✅ Database updated');
    } catch (error) {
      console.error('❌ Database update failed:', error);
      // Don't show alert - this is background operation
    }
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setCropModalOpen(false);
    setImageToEdit(null);
    setIsUploading(true);

    try {
      console.log('📤 Uploading cropped image to Supabase...');
      const imageUrl = await uploadImage(croppedBlob, 'products');
      console.log('✅ Image uploaded:', imageUrl);

      let updatedImages = [...existingImages];

      // If re-cropping an existing image, delete the old one first
      if (editingExistingImage) {
        console.log('🗑️ Deleting old image:', editingExistingImage);
        await deleteImage(editingExistingImage, 'products');
        updatedImages = updatedImages.filter(img => img !== editingExistingImage);
        onImageDeleted(editingExistingImage);
        setEditingExistingImage(null);
      }

      // Add new image
      updatedImages.push(imageUrl);
      onImageUploaded(imageUrl);

      // Update database immediately
      await updateDatabaseImages(updatedImages);

      alert('Image uploaded successfully!');
    } catch (error) {
      console.error('❌ Upload failed:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleEditExistingImage = (imageUrl: string) => {
    console.log('✏️ Editing existing image:', imageUrl);
    setEditingExistingImage(imageUrl);
    setImageToEdit(imageUrl); // Load the existing image URL directly into crop modal
    setCropModalOpen(true);
  };

  const handleDeleteImage = async (imageUrl: string) => {
    if (!confirm('Delete this image?')) return;

    try {
      console.log('🗑️ Deleting image from Supabase...');
      await deleteImage(imageUrl, 'products');
      console.log('✅ Image deleted');

      // Remove from state
      onImageDeleted(imageUrl);

      // Update database immediately
      const updatedImages = existingImages.filter(img => img !== imageUrl);
      await updateDatabaseImages(updatedImages);

    } catch (error) {
      console.error('❌ Delete failed:', error);
      alert('Failed to delete image. Please try again.');
    }
  };

  const handleMoveImageLeft = async (index: number) => {
    if (index === 0) return; // Can't move first image left

    const newImages = [...existingImages];
    // Swap with previous image
    [newImages[index - 1], newImages[index]] = [newImages[index], newImages[index - 1]];

    // Update parent state
    onImagesReordered(newImages);

    // Update database immediately
    await updateDatabaseImages(newImages);
  };

  const handleMoveImageRight = async (index: number) => {
    if (index === existingImages.length - 1) return; // Can't move last image right

    const newImages = [...existingImages];
    // Swap with next image
    [newImages[index], newImages[index + 1]] = [newImages[index + 1], newImages[index]];

    // Update parent state
    onImagesReordered(newImages);

    // Update database immediately
    await updateDatabaseImages(newImages);
  };

  const handleTitleBlur = () => {
    if (title && title.trim()) {
      const generatedSlug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      setSlug(generatedSlug);
    }
  };

  console.log('🔵 ProductInfoCard rendering', { title, existingImages });

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
              className={`border border-dashed border-stroke p-6 text-center dark:border-strokedark transition-colors ${
                isDragging ? "bg-gray-100 dark:bg-gray-800 border-primary" : ""
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                type="file"
                id="product-image"
                accept="image/*"
                onChange={handleInputChange}
                style={{ display: 'none' }}
              />

              <div className="flex flex-col items-center gap-3">
                <svg
                  className="h-12 w-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>

                <div>
                  <button
                    type="button"
                    onClick={() => {
                      console.log('🟢 Button clicked!');
                      document.getElementById('product-image')?.click();
                    }}
                    className="text-primary font-medium hover:underline"
                  >
                    Click to upload
                  </button>
                  <span className="text-gray-600 dark:text-gray-400"> or drag and drop</span>
                </div>

                <p className="text-xs text-gray-500">
                  Images will be cropped before upload
                </p>
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
                    className="group relative aspect-square overflow-hidden rounded-lg border border-stroke dark:border-strokedark cursor-pointer"
                    onClick={() => handleEditExistingImage(imageUrl)}
                  >
                    <img
                      src={imageUrl}
                      alt={`Product ${index + 1}`}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                    {/* Edit icon overlay */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center">
                      <svg
                        className="h-8 w-8 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </div>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent triggering edit
                        handleDeleteImage(imageUrl);
                      }}
                      className="absolute top-2 right-2 rounded-full bg-red-600 p-2 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-700 z-10"
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

                    {/* Left arrow button - only show if not first image */}
                    {index > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveImageLeft(index);
                        }}
                        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-[#597485] p-2 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-[#4a6270] z-10"
                        title="Move left"
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
                            d="M15 19l-7-7 7-7"
                          />
                        </svg>
                      </button>
                    )}

                    {/* Right arrow button - only show if not last image */}
                    {index < existingImages.length - 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveImageRight(index);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-[#597485] p-2 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-[#4a6270] z-10"
                        title="Move right"
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
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </button>
                    )}
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

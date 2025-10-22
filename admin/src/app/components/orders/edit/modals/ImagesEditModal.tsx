import { useState, ChangeEvent, DragEvent } from 'react';
import { SaveIcon } from '@shared/assets/icons';
import Label from '@shared/ui/forms/Label';
// MIGRATION: Use domain hook for image operations
import { useOrderImages } from '@domains/orders/hooks/useOrderImages';

interface ImagesEditModalProps {
  images: string[];
  onChange: (images: string[]) => void;
  onSave: (images?: string[]) => void; // Modified to accept optional images parameter
  onCancel: () => void;
  saving: boolean;
}

const ImagesEditModal: React.FC<ImagesEditModalProps> = ({
  images,
  onChange,
  onSave,
  onCancel,
  saving
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [currentImages, setCurrentImages] = useState<string[]>([...images]);
  
  // MIGRATION: Use domain hook for image operations
  const { uploading, error: uploadError, uploadImages } = useOrderImages();

  const handleFileChange = (files: FileList | null) => {
    if (files && files.length > 0) {
      const fileArray = Array.from(files);
      setSelectedFiles(fileArray);
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

  const handleRemoveExistingImage = (index: number) => {
    const updatedImages = currentImages.filter((_, i) => i !== index);
    setCurrentImages(updatedImages);
    onChange(updatedImages);
  };

  const handleRemoveFile = (index: number) => {
    const updatedFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(updatedFiles);
  };

  // MIGRATION: Handle upload using domain hook
  const handleUploadAndSave = async () => {
    try {
      let finalImages = [...currentImages];
      
      // If there are files to upload, upload them first
      if (selectedFiles.length > 0) {
        const result = await uploadImages(selectedFiles);
        
        if (result.success) {
          finalImages = [...currentImages, ...result.imageUrls];
          console.log('Final images after upload:', finalImages);
        } else {
          console.error('Upload failed:', result);
          alert('Failed to upload images: ' + (result.error || 'Unknown error'));
          return;
        }
      }
      
      // Update parent state
      onChange(finalImages);
      
      // Pass images directly to onSave
      onSave(finalImages);
      
    } catch (error) {
      console.error('Error uploading images:', error);
      alert('Failed to upload images: ' + (uploadError || 'Unknown error'));
    }
  };

  // Handle save without upload (just saving current state)
  const handleSaveOnly = () => {
    onChange(currentImages);
    onSave(currentImages);
  };

  return (
    <div className="space-y-4">
      {/* Existing Images */}
      {currentImages.length > 0 && (
        <div>
          <Label>Current Images</Label>
          <div className="grid grid-cols-3 gap-4 mt-2">
            {currentImages.map((imageUrl, index) => (
              <div key={index} className="relative">
                <img
                  src={imageUrl}
                  alt={`Order image ${index + 1}`}
                  className="w-full h-24 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                />
                <button
                  onClick={() => handleRemoveExistingImage(index)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload New Images */}
      <div>
        <Label>Add New Images</Label>
        <div
          className={`border border-dashed border-gray-300 dark:border-gray-600 p-6 text-center rounded-lg mt-2 ${
            isDragging ? "bg-gray-100 dark:bg-gray-800" : ""
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <label
            htmlFor="order-images"
            className="cursor-pointer block text-sm text-gray-500 dark:text-gray-400"
          >
            Drag and drop images here or click to upload
          </label>
          <input
            id="order-images"
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={handleInputChange}
          />
        </div>

        {/* Preview Selected Files */}
        {selectedFiles.length > 0 && (
          <div className="mt-4">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Selected Files ({selectedFiles.length})
            </div>
            <div className="grid grid-cols-3 gap-4">
              {selectedFiles.map((file, index) => (
                <div key={index} className="relative">
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="w-full h-24 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                  />
                  <button
                    onClick={() => handleRemoveFile(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                  >
                    ×
                  </button>
                  <div className="text-xs text-gray-600 dark:text-gray-300 mt-1 truncate">
                    {file.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Error display for upload errors */}
      {uploadError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-red-600 text-sm font-medium">Upload Error</p>
          <p className="text-red-500 text-sm">{uploadError}</p>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
        
        {/* Show different buttons based on whether there are files to upload */}
        {selectedFiles.length > 0 ? (
          <button
            onClick={handleUploadAndSave}
            disabled={saving || uploading}
            className="px-4 py-2 bg-[#597485] text-white rounded-lg hover:bg-[#4e6575] transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Uploading...
              </>
            ) : saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              <>
                <SaveIcon className="w-4 h-4" />
                Upload & Save
              </>
            )}
          </button>
        ) : (
          <button
            onClick={handleSaveOnly}
            disabled={saving}
            className="px-4 py-2 bg-[#597485] text-white rounded-lg hover:bg-[#4e6575] transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              <>
                <SaveIcon className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default ImagesEditModal;
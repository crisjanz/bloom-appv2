/**
 * Image Upload Service
 * Handles secure image uploads through backend API with cropping support
 *
 * Pattern for all image uploads across the application:
 * 1. User selects image
 * 2. ImageCropModal opens
 * 3. User crops image
 * 4. Image uploads securely through backend API
 * 5. Returns public URL for display
 *
 * SECURITY: All uploads go through the backend API which:
 * - Uses secure service role key (never exposed to client)
 * - Validates file type and size
 * - Prevents unauthorized uploads/deletes
 */

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export type UploadCallback = (progress: UploadProgress) => void;

/**
 * Upload image securely through backend API
 * @param blob - Image blob (from crop or direct file)
 * @param folder - Folder path ('products' or 'orders')
 * @param fileName - Optional custom file name (ignored, server generates secure name)
 * @param onProgress - Optional progress callback
 * @returns Public URL of uploaded image
 */
export async function uploadImage(
  blob: Blob,
  folder: 'products' | 'orders',
  fileName?: string,
  onProgress?: UploadCallback
): Promise<string> {
  try {
    console.log('📤 Uploading image through secure backend API...');

    // Create FormData with image blob and folder
    const formData = new FormData();
    formData.append('image', blob, 'image.jpg');
    formData.append('folder', folder);

    // Upload through secure backend endpoint
    const response = await fetch('/api/products/images/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Upload failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Image uploaded successfully:', data.url);

    // Simulate progress callback
    if (onProgress) {
      onProgress({ loaded: blob.size, total: blob.size, percentage: 100 });
    }

    return data.url;
  } catch (error) {
    console.error('❌ Error uploading image:', error);
    throw error;
  }
}

/**
 * Delete image securely through backend API
 * @param imageUrl - Public URL of the image to delete
 * @param folder - Folder path ('products' or 'orders')
 */
export async function deleteImage(
  imageUrl: string,
  folder: 'products' | 'orders'
): Promise<void> {
  try {
    console.log('🗑️ Deleting image through secure backend API...');

    const response = await fetch('/api/products/images', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ imageUrl, folder }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Delete failed: ${response.status}`);
    }

    console.log('✅ Image deleted successfully');
  } catch (error) {
    console.error('❌ Error deleting image:', error);
    throw error;
  }
}

/**
 * Compress image blob to reduce file size
 * @param blob - Original image blob
 * @param maxWidth - Maximum width in pixels
 * @param quality - JPEG quality (0-1)
 * @returns Compressed image blob
 */
export async function compressImage(
  blob: Blob,
  maxWidth: number = 1920,
  quality: number = 0.85
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(blob);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Scale down if image is too large
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (compressedBlob) => {
          if (compressedBlob) {
            resolve(compressedBlob);
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image'));
    };

    img.src = objectUrl;
  });
}

/**
 * Convert File to data URL for preview
 * @param file - File object
 * @returns Data URL string
 */
export function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

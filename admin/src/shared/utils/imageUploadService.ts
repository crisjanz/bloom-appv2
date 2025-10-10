/**
 * Image Upload Service
 * Handles immediate image uploads to Supabase with cropping support
 *
 * Pattern for all image uploads across the application:
 * 1. User selects image
 * 2. ImageCropModal opens
 * 3. User crops image
 * 4. Image uploads immediately to Supabase
 * 5. Returns public URL for display
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'https://iohmuzityuugpypvlkft.supabase.co',
  import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvaG11eml0eXV1Z3B5cHZsa2Z0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMDgwMjQsImV4cCI6MjA3NTY4NDAyNH0.HLVNyztxCCrwiE1iEucO0KpXfzAozem1vyLf79EzFWI'
);

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export type UploadCallback = (progress: UploadProgress) => void;

/**
 * Upload image to Supabase storage
 * @param blob - Image blob (from crop or direct file)
 * @param folder - Folder path ('products' or 'orders')
 * @param fileName - Optional custom file name
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
    // Generate unique file name
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 9);
    const finalFileName = fileName || `${timestamp}-${randomStr}.jpg`;
    const filePath = `${folder}/${finalFileName}`;

    console.log('📤 Uploading image to Supabase:', filePath);

    // Upload to Supabase
    const { error } = await supabase.storage
      .from('images')
      .upload(filePath, blob, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('❌ Supabase upload error:', error);
      throw new Error(`Upload failed: ${error.message}`);
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('images')
      .getPublicUrl(filePath);

    console.log('✅ Image uploaded successfully:', publicUrlData.publicUrl);

    // Simulate progress callback (Supabase doesn't provide real-time progress)
    if (onProgress) {
      onProgress({ loaded: blob.size, total: blob.size, percentage: 100 });
    }

    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('❌ Error uploading image:', error);
    throw error;
  }
}

/**
 * Delete image from Supabase storage
 * @param imageUrl - Public URL of the image to delete
 * @param folder - Folder path ('products' or 'orders')
 */
export async function deleteImage(
  imageUrl: string,
  folder: 'products' | 'orders'
): Promise<void> {
  try {
    // Extract file name from URL
    const urlParts = imageUrl.split('/');
    const fileName = urlParts[urlParts.length - 1];
    const filePath = `${folder}/${fileName}`;

    console.log('🗑️ Deleting image from Supabase:', filePath);

    const { error } = await supabase.storage
      .from('images')
      .remove([filePath]);

    if (error) {
      console.error('❌ Supabase delete error:', error);
      throw new Error(`Delete failed: ${error.message}`);
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

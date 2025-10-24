/**
 * React Hook for Order Image Upload
 * Handles uploading order images directly to Cloudflare R2
 */

import { useState, useCallback } from 'react'
import { uploadImage as uploadToR2 } from '@shared/utils/cloudflareR2Service'

interface UploadResult {
  success: boolean;
  imageUrls: string[];
  error?: string;
}

export const useOrderImages = () => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadImages = useCallback(async (files: File[]): Promise<UploadResult> => {
    try {
      setUploading(true);
      setError(null);

      if (!files || files.length === 0) {
        return {
          success: true,
          imageUrls: []
        };
      }

      console.log(`🖼️ Uploading ${files.length} order image(s) to Cloudflare R2...`);

      const uploads = await Promise.all(
        files.map((file) => uploadToR2(file, 'orders'))
      );

      console.log(`✅ Upload completed with ${uploads.length} image(s)`);

      return {
        success: true,
        imageUrls: uploads
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown upload error';
      console.error('❌ Image upload error:', errorMessage);
      setError(errorMessage);

      return {
        success: false,
        imageUrls: [],
        error: errorMessage
      };
    } finally {
      setUploading(false);
    }
  }, []);

  return {
    uploading,
    error,
    uploadImages
  };
};

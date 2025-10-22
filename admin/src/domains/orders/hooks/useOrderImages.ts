/**
 * React Hook for Order Image Upload
 * Handles uploading order images with polling for background processing
 */

import { useState, useCallback } from 'react'

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

      // Create FormData to send files
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('images', file);
      });

      console.log(`🖼️ Uploading ${files.length} order images...`);

      // Start upload
      const uploadResponse = await fetch('/api/orders/upload-images', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.statusText}`);
      }

      const uploadResult = await uploadResponse.json();

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Upload failed');
      }

      const { uploadId } = uploadResult;
      console.log(`📤 Upload started with ID: ${uploadId}`);

      // Poll for completion since upload happens in background
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds timeout

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

        const statusResponse = await fetch(`/api/orders/upload-status/${uploadId}`);

        if (!statusResponse.ok) {
          throw new Error(`Status check failed: ${statusResponse.statusText}`);
        }

        const status = await statusResponse.json();

        if (!status.success) {
          throw new Error(status.error || 'Status check failed');
        }

        if (status.status === 'completed') {
          console.log(`✅ Upload completed with ${status.imageUrls?.length || 0} images`);
          return {
            success: true,
            imageUrls: status.imageUrls || []
          };
        }

        if (status.status === 'failed') {
          throw new Error(status.error || 'Upload failed');
        }

        // Still uploading, continue polling
        attempts++;
        console.log(`⏳ Upload in progress... (${attempts}/${maxAttempts})`);
      }

      throw new Error('Upload timeout - took longer than 30 seconds');

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

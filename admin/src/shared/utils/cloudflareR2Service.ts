/**
 * Cloudflare R2 Image Upload Service
 * Replaces Supabase storage with Cloudflare R2
 */

interface UploadResponse {
  url: string;
  key: string;
}

// Auto-detect API URL based on current host
const API_BASE_URL = import.meta.env.VITE_API_URL ||
  `http://${window.location.hostname}:4000`;

/**
 * Upload image to Cloudflare R2 via backend API
 */
export async function uploadImage(
  blob: Blob,
  folder: 'products' | 'orders' | 'events'
): Promise<string> {
  try {
    const formData = new FormData();
    formData.append('file', blob);
    formData.append('folder', folder);

    const response = await fetch(`${API_BASE_URL}/api/images/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Image upload failed');
    }

    const data: UploadResponse = await response.json();
    return data.url; // Returns full CDN URL: https://cdn.hellobloom.ca/products/abc123.jpg
  } catch (error) {
    console.error('Image upload error:', error);
    throw error;
  }
}

/**
 * Delete image from Cloudflare R2 via backend API
 */
export async function deleteImage(imageUrl: string, folder: string): Promise<void> {
  try {
    // Extract key from full URL
    const cdnUrl = import.meta.env.VITE_CLOUDFLARE_R2_PUBLIC_URL || 'https://cdn.hellobloom.ca';
    const key = imageUrl.replace(cdnUrl + '/', '');

    const response = await fetch(`${API_BASE_URL}/api/images/delete`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ key }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Image delete failed');
    }
  } catch (error) {
    console.error('Image delete error:', error);
    throw error;
  }
}

/**
 * Convert File to Data URL for preview
 */
export function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

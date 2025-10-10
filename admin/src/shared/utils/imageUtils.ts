// Utility functions for Supabase image optimization
export const getOptimizedImageUrl = (
  originalUrl: string, 
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'avif' | 'auto';
    resize?: 'cover' | 'contain' | 'fill';
  } = {}
): string => {
  if (!originalUrl || !originalUrl.includes('supabase.co')) {
    return originalUrl;
  }

  const {
    width = 400,
    height,
    quality = 80,
    format = 'webp',
    resize = 'cover'
  } = options;

  const params = new URLSearchParams();
  
  // Core optimizations
  params.append('width', width.toString());
  if (height) params.append('height', height.toString());
  params.append('quality', quality.toString());
  params.append('format', format);
  params.append('resize', resize);

  return `${originalUrl}?${params.toString()}`;
};

// Preset configurations for common use cases
export const IMAGE_PRESETS = {
  thumbnail: { width: 150, height: 150, quality: 70 },
  card: { width: 300, height: 200, quality: 80 },
  modal: { width: 600, height: 400, quality: 85 },
  fullscreen: { width: 1200, quality: 90 },
  avatar: { width: 100, height: 100, quality: 75 }
};

export const getPresetImageUrl = (url: string, preset: keyof typeof IMAGE_PRESETS) => {
  return getOptimizedImageUrl(url, IMAGE_PRESETS[preset]);
};
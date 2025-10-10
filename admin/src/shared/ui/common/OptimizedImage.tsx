import React, { useState } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  fallback?: string;
  loadingClassName?: string;
  sizes?: string; // Responsive sizes
}

export default function OptimizedImage({ 
  src, 
  alt, 
  className = '', 
  fallback = '/images/placeholder.jpg',
  loadingClassName = 'animate-pulse bg-gray-200 dark:bg-gray-700',
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Return original URL for now (no transformations on free plan)
  const getOptimizedUrl = (originalUrl: string) => {
    return originalUrl;
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  if (hasError) {
    return (
      <img
        src={fallback}
        alt={alt}
        className={className}
        loading="lazy"
      />
    );
  }

  return (
    <div className="relative">
      {isLoading && (
        <div className={`absolute inset-0 ${loadingClassName} ${className}`} />
      )}
      <img
        src={getOptimizedUrl(src)} // Ready for transformations when Pro account is enabled
        alt={alt}
        className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        loading="lazy"
        decoding="async"
        sizes={sizes}
        onLoad={handleLoad}
        onError={handleError}
        // Preload critical images
        fetchPriority="auto"
      />
    </div>
  );
}
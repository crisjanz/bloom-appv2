// Image preloading utility for critical images
export class ImagePreloader {
  private cache = new Set<string>();

  preload(urls: string[]): Promise<void[]> {
    const promises = urls.map(url => this.preloadSingle(url));
    return Promise.all(promises);
  }

  preloadSingle(url: string): Promise<void> {
    if (this.cache.has(url)) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.cache.add(url);
        resolve();
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  // Preload images when user hovers over product cards
  preloadOnHover(imageUrls: string[]) {
    return (event: React.MouseEvent) => {
      if (event.type === 'mouseenter') {
        this.preload(imageUrls);
      }
    };
  }
}

export const imagePreloader = new ImagePreloader();
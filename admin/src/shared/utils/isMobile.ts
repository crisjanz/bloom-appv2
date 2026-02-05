/**
 * Detect if the user is on a mobile or tablet device
 */
export function isMobileDevice(): boolean {
  // Check user agent for mobile indicators
  const userAgent = navigator.userAgent.toLowerCase();
  const mobileKeywords = ['iphone', 'ipad', 'android', 'mobile', 'webos', 'blackberry'];

  const isMobileUA = mobileKeywords.some(keyword => userAgent.includes(keyword));

  // Check for touch capability
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  // iPadOS 13+ reports as Mac, detect via touch + Mac combo
  const isIPad = isTouchDevice && /macintosh/.test(userAgent) && navigator.maxTouchPoints > 1;

  // Treat touch devices with tablet-sized screens as mobile too (up to 1024px)
  const isTabletOrSmaller = window.innerWidth <= 1024;

  return isMobileUA || isIPad || (isTouchDevice && isTabletOrSmaller);
}

/**
 * Check if user is likely a field worker (mobile + accessing specific URLs)
 */
export function isFieldWorker(): boolean {
  return isMobileDevice();
}

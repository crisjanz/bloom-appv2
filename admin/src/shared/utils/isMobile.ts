/**
 * Detect if the user is on a mobile device
 */
export function isMobileDevice(): boolean {
  // Check user agent for mobile indicators
  const userAgent = navigator.userAgent.toLowerCase();
  const mobileKeywords = ['iphone', 'ipad', 'android', 'mobile', 'webos', 'blackberry'];

  const isMobileUA = mobileKeywords.some(keyword => userAgent.includes(keyword));

  // Check for touch capability and small screen
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isSmallScreen = window.innerWidth <= 768;

  return isMobileUA || (isTouchDevice && isSmallScreen);
}

/**
 * Check if user is likely a field worker (mobile + accessing specific URLs)
 */
export function isFieldWorker(): boolean {
  return isMobileDevice();
}

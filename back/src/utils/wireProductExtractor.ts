/**
 * Utility functions for extracting product codes and URLs from wire-in order descriptions
 */

export interface WireProductInfo {
  productCode: string | null;
  externalUrl: string | null;
  source: string | null;
  fullDescription: string;
}

/**
 * Extract wire product information from FTD/Teleflora/wire-in product descriptions
 *
 * Examples:
 * - "TWR14-4A Teleflora's Festive Pines" → TWR14-4A (Teleflora)
 * - "The FTD B9-5140s-Winter Wonders Wreath" → B9-5140s (FTD)
 * - "PHOTO at petals.ca/ch77aa-s | As similar..." → ch77aa-s (External)
 */
export function extractWireProductInfo(description: string): WireProductInfo {
  if (!description) {
    return {
      productCode: null,
      externalUrl: null,
      source: null,
      fullDescription: ''
    };
  }

  let productCode: string | null = null;
  let externalUrl: string | null = null;
  let source: string | null = null;

  // Pattern 1: Teleflora codes (TWR14-4A, BQ1-3456, BF123-11D, etc.)
  // Format: 2-3 uppercase letters, followed by digits, dash, more digits, optional letter
  const telefloraMatch = description.match(/\b([A-Z]{2,3}\d{1,2}-\d+[A-Z]?)\b/);
  if (telefloraMatch) {
    productCode = telefloraMatch[1];
    source = 'Teleflora';
  }

  // Pattern 2: FTD codes (B9-5140s, C12-3456, S21-4540d, etc.)
  // Format: Single uppercase letter, digits, dash, digits, optional lowercase letter
  if (!productCode) {
    const ftdMatch = description.match(/\b([A-Z]\d{1,2}-\d+[a-z]?)\b/);
    if (ftdMatch) {
      productCode = ftdMatch[1];
      source = 'FTD';
    }
  }

  // Pattern 3: URLs (petals.ca/XXXXX, ftdi.com/products/XXXXX, etc.)
  // Extract the code from URL and also save the full URL
  const urlMatch = description.match(/(petals\.ca\/([\w-]+)|ftdi\.com\/[\w/-]+([\w-]+))/i);
  if (urlMatch) {
    externalUrl = `https://${urlMatch[1]}`;

    // Extract code from petals.ca URL (e.g., ch77aa-s from petals.ca/ch77aa-s)
    if (!productCode && urlMatch[2]) {
      productCode = urlMatch[2];
      source = 'Petals.ca';
    }
  }

  // Pattern 4: Generic product code patterns at start of description
  // Sometimes codes don't match patterns above but appear at the start like "CH77AA-S Description..."
  if (!productCode) {
    const genericMatch = description.match(/^([A-Z0-9]{4,12}[-]?[A-Z0-9]{0,6})\s/);
    if (genericMatch) {
      productCode = genericMatch[1];
      source = 'Unknown';
    }
  }

  return {
    productCode,
    externalUrl,
    source,
    fullDescription: description
  };
}

/**
 * Normalize product code for consistent storage
 * - Uppercase
 * - Remove extra spaces/dashes
 */
export function normalizeProductCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, '');
}

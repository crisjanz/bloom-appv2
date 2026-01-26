import { PrismaClient } from '@prisma/client';

// Characters that are easy to read and won't be confused
// Excludes: 0, O, I, 1, L (too similar)
const SKU_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/**
 * Generate a random 6-character SKU
 */
export const generateSkuCode = (): string => {
  let sku = '';
  for (let i = 0; i < 6; i++) {
    sku += SKU_CHARS.charAt(Math.floor(Math.random() * SKU_CHARS.length));
  }
  return sku;
};

/**
 * Generate a unique SKU that doesn't exist in the database
 * Retries up to maxAttempts times if collision occurs
 */
export const generateUniqueSku = async (
  prisma: PrismaClient,
  maxAttempts = 10
): Promise<string> => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const sku = generateSkuCode();

    const existing = await prisma.productVariant.findUnique({
      where: { sku },
      select: { id: true },
    });

    if (!existing) {
      return sku;
    }
  }

  throw new Error('Failed to generate unique SKU after maximum attempts');
};

/**
 * Generate multiple unique SKUs at once
 */
export const generateUniqueSkus = async (
  prisma: PrismaClient,
  count: number
): Promise<string[]> => {
  const skus: string[] = [];
  const existingSkus = new Set<string>();

  // Get all existing SKUs to avoid DB calls for each one
  const allVariants = await prisma.productVariant.findMany({
    select: { sku: true },
  });
  allVariants.forEach((v) => existingSkus.add(v.sku));

  let attempts = 0;
  const maxAttempts = count * 10;

  while (skus.length < count && attempts < maxAttempts) {
    const sku = generateSkuCode();

    if (!existingSkus.has(sku) && !skus.includes(sku)) {
      skus.push(sku);
      existingSkus.add(sku);
    }

    attempts++;
  }

  if (skus.length < count) {
    throw new Error('Failed to generate enough unique SKUs');
  }

  return skus;
};

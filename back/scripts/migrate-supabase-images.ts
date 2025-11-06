#!/usr/bin/env tsx
/**
 * Migration script to remove Supabase image URLs from Product.images
 *
 * This script:
 * 1. Finds all products with Supabase URLs in their images array
 * 2. Filters out Supabase URLs, keeping only Cloudflare R2 URLs
 * 3. Updates the database with cleaned image arrays
 *
 * Run with: npx tsx scripts/migrate-supabase-images.ts
 */

import prisma from '../src/lib/prisma';

const SUPABASE_PATTERN = 'supabase.co';

async function migrateImages() {
  console.log('🔍 Finding products with Supabase image URLs...\n');

  // Get all products
  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      images: true,
    },
  });

  let updatedCount = 0;
  let warningCount = 0;

  for (const product of products) {
    const images = product.images as string[];

    if (!images || images.length === 0) {
      continue;
    }

    // Check if any images contain Supabase URLs
    const hasSupabase = images.some((url) => url.includes(SUPABASE_PATTERN));

    if (!hasSupabase) {
      continue;
    }

    // Filter out Supabase URLs, keep only R2 URLs
    const cleanedImages = images.filter((url) => !url.includes(SUPABASE_PATTERN));

    console.log(`📦 ${product.name}`);
    console.log(`   Before: ${images.length} images (${images.filter(u => u.includes(SUPABASE_PATTERN)).length} Supabase)`);
    console.log(`   After:  ${cleanedImages.length} images (R2 only)`);

    if (cleanedImages.length === 0) {
      console.log(`   ⚠️  WARNING: No R2 images found - this product will have no images!`);
      console.log(`   Images to remove:`);
      images.forEach((url, i) => console.log(`      ${i + 1}. ${url}`));
      warningCount++;
    }

    // Update the product
    await prisma.product.update({
      where: { id: product.id },
      data: { images: cleanedImages },
    });

    updatedCount++;
    console.log(`   ✅ Updated\n`);
  }

  console.log('\n📊 Migration Summary:');
  console.log(`   Total products: ${products.length}`);
  console.log(`   Updated: ${updatedCount}`);
  console.log(`   Warnings (no R2 images): ${warningCount}`);

  if (warningCount > 0) {
    console.log(`\n⚠️  ${warningCount} product(s) now have no images and will need to be re-uploaded.`);
  }

  console.log('\n✅ Migration complete!');
}

migrateImages()
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

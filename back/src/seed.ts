// src/seed.ts
import { prisma } from './prisma.js';


async function seed() {
  console.log('🌱 Seeding database...');

  const category = await prisma.category.upsert({
    where: { name: 'Everyday' },
    update: {},
    create: {
      name: 'Everyday',
    },
  });

  const reportingCategory = await prisma.reportingCategory.upsert({
    where: { name: 'Bouquets' },
    update: {},
    create: {
      name: 'Bouquets',
    },
  });

  const product = await prisma.product.create({
    data: {
      name: 'Tulip Delight',
      slug: 'tulip-delight',
      description: 'A cheerful tulip arrangement for any occasion.',
      status: 'DRAFT',
      categoryId: category.id,
      reportingCategoryId: reportingCategory.id,
      recipeNotes: '6 tulips, eucalyptus, glass vase',
      productType: 'MAIN',
      inventoryMode: 'OWN',
      visibility: 'BOTH',
      showOnHomepage: true,
      isSubscriptionAvailable: false,
      isActive: true,
      variants: {
        create: [
          {
            name: 'Standard',
            sku: 'TULIP-STD',
            price: 3999,
            isDefault: true,
          },
        ],
      },
    },
  });

  console.log(`✅ Seeded product: ${product.name}`);
  process.exit(0);
}

seed().catch((e) => {
  console.error('❌ Seeding failed:', e);
  process.exit(1);
});

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create or update ShopProfile
  const shopProfile = await prisma.shopProfile.upsert({
    where: { id: 'default-shop' },
    update: {},
    create: {
      id: 'default-shop',
      googleGeminiApiKey: process.env.GOOGLE_GEMINI_API_KEY || null,
      settings: {},
    },
  });

  console.log('✅ ShopProfile created/updated:', shopProfile.id);
  console.log('   Gemini API Key:', shopProfile.googleGeminiApiKey ? 'Set' : 'Not set');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

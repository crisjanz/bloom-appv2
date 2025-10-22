import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updatePhone() {
  const newPhone = '+16042175706';

  const settings = await prisma.ftdSettings.updateMany({
    data: {
      notifyPhoneNumber: newPhone,
    },
  });

  console.log(`✅ Updated FTD notification phone to: ${newPhone}`);

  await prisma.$disconnect();
}

updatePhone().catch(console.error);

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updatePhone() {
  const newPhone = '+12507991010'; // Replace with your shop's phone number

  const settings = await prisma.ftdSettings.updateMany({
    data: {
      notifyPhoneNumber: newPhone,
    },
  });

  console.log(`✅ Updated FTD notification phone to: ${newPhone}`);

  await prisma.$disconnect();
}

updatePhone().catch(console.error);

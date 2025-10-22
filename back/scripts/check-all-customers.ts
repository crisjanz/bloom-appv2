import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCustomers() {
  const customers = await prisma.customer.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
    },
    orderBy: { createdAt: 'asc' },
    take: 10,
  });

  console.log('\n=== First 10 Customers ===');
  customers.forEach((c, i) => {
    console.log(`${i + 1}. ${c.firstName} ${c.lastName} - Phone: ${c.phone || '(null)'} - ID: ${c.id}`);
  });

  await prisma.$disconnect();
}

checkCustomers().catch(console.error);

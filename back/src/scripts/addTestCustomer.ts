// back/scripts/addTestCustomer.ts
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const customer = await prisma.customer.create({
    data: {
      firstName: "Cris",
      lastName: "Janz",
      phone: "2501234567",
      email: "cris@example.com",
      notes: "Test customer",
    },
  });

  console.log("✅ Created test customer:", customer);
}

main()
  .catch((e) => {
    console.error("❌ Error creating customer:", e);
  })
  .finally(() => {
    prisma.$disconnect();
  });
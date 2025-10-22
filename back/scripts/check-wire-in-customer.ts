import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCustomer() {
  console.log('\n=== Wire-In Default Customer ===');
  const wireInCustomer = await prisma.customer.findFirst({
    where: { phone: 'wire-in-default' }
  });

  if (wireInCustomer) {
    console.log('Found existing wire-in customer:');
    console.log('  ID:', wireInCustomer.id);
    console.log('  Name:', wireInCustomer.firstName, wireInCustomer.lastName);
    console.log('  Phone:', wireInCustomer.phone);
    console.log('  Email:', wireInCustomer.email);
  } else {
    console.log('No wire-in-default customer found');
  }

  console.log('\n=== Check FTD Raw Data ===');
  const ftdOrder = await prisma.ftdOrder.findUnique({
    where: { externalId: 'Z5210L-9004' },
    select: { ftdRawData: true }
  });

  if (ftdOrder?.ftdRawData) {
    const raw = ftdOrder.ftdRawData as any;
    console.log('\nLine Items:');
    if (raw.lineItems && Array.isArray(raw.lineItems)) {
      raw.lineItems.forEach((item: any, i: number) => {
        console.log(`\n  Item ${i + 1}:`);
        console.log('    productFirstChoiceDescription:', item.productFirstChoiceDescription);
        console.log('    productCode:', item.productCode);
        console.log('    productDescription:', item.productDescription);
        console.log('    occasionType:', item.occasionType);
      });
    } else {
      console.log('  No lineItems found in raw data');
    }
  }

  await prisma.$disconnect();
}

checkCustomer().catch(console.error);

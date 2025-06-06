const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanup() {
  try {
    console.log('Deleting test products...');
    
    // Delete in correct order due to foreign keys
    await prisma.variantOption.deleteMany({});
    console.log('✅ Deleted variant options');
    
    await prisma.productVariant.deleteMany({});
    console.log('✅ Deleted product variants');
    
    await prisma.productOptionValue.deleteMany({});
    console.log('✅ Deleted product option values');
    
    await prisma.productOption.deleteMany({});
    console.log('✅ Deleted product options');
    
    await prisma.product.deleteMany({});
    console.log('✅ Deleted all products');
    
    console.log('🎉 All test products deleted successfully!');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanup();
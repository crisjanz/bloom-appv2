import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  transactionOptions: {
    maxWait: 30000, // 30 seconds max wait to start a transaction
    timeout: 60000, // 60 seconds timeout for transaction to complete
  },
});

export default prisma;

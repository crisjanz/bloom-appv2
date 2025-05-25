import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.address.delete({ where: { id } });
    res.status(204).end();
  } catch (err) {
    console.error("Failed to delete address:", err);
    res.status(500).json({ error: "Failed to delete address" });
  }
});

export default router;

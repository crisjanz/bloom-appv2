import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        variants: true,
      },
    });

    const simplified = products.map((p: any) => ({
      id: p.id,
      name: p.name,
      price: p.variants[0]?.price ?? 0,
      status: p.status,
    }));

    res.json(simplified);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load products' });
  }
});

export default router;

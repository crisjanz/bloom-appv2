import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/supplies — list all supplies sorted by name
router.get('/', async (_req, res) => {
  try {
    const supplies = await prisma.supply.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(supplies);
  } catch (error) {
    console.error('Failed to fetch supplies:', error);
    res.status(500).json({ message: 'Failed to fetch supplies' });
  }
});

// POST /api/supplies — create a new supply
router.post('/', async (req, res) => {
  try {
    const { name, imageUrl, shop, backShelf, boxed } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ message: 'Name is required' });
    }

    const supply = await prisma.supply.create({
      data: {
        name: name.trim(),
        imageUrl: imageUrl || null,
        shop: Number(shop) || 0,
        backShelf: Number(backShelf) || 0,
        boxed: Number(boxed) || 0,
      },
    });

    res.status(201).json(supply);
  } catch (error) {
    console.error('Failed to create supply:', error);
    res.status(500).json({ message: 'Failed to create supply' });
  }
});

// PUT /api/supplies/:id — update a supply
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid ID' });

    const { name, imageUrl, shop, backShelf, boxed } = req.body;

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = String(name).trim();
    if (imageUrl !== undefined) data.imageUrl = imageUrl || null;
    if (shop !== undefined) data.shop = Number(shop) || 0;
    if (backShelf !== undefined) data.backShelf = Number(backShelf) || 0;
    if (boxed !== undefined) data.boxed = Number(boxed) || 0;

    const supply = await prisma.supply.update({
      where: { id },
      data,
    });

    res.json(supply);
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return res.status(404).json({ message: 'Supply not found' });
    }
    console.error('Failed to update supply:', error);
    res.status(500).json({ message: 'Failed to update supply' });
  }
});

// DELETE /api/supplies/:id — delete a supply
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid ID' });

    await prisma.supply.delete({ where: { id } });
    res.json({ success: true });
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return res.status(404).json({ message: 'Supply not found' });
    }
    console.error('Failed to delete supply:', error);
    res.status(500).json({ message: 'Failed to delete supply' });
  }
});

export default router;

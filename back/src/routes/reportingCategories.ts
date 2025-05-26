import express from 'express';
import prisma from "../lib/prisma";


const router = express.Router();


// GET all reporting categories
router.get('/', async (req, res) => {
  try {
    const categories = await prisma.reportingCategory.findMany();
    res.json(categories);
  } catch (err) {
    console.error('Failed to fetch reporting categories:', err);
    res.status(500).json({ error: 'Failed to load reporting categories' });
  }
});

export default router;

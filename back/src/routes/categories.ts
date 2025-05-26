import express from 'express';
import prisma from "../lib/prisma";


const router = express.Router();


// GET all categories
router.get('/', async (req, res) => {
  try {
    const categories = await prisma.category.findMany();
    res.json(categories);
  } catch (err) {
    console.error('Failed to fetch categories:', err);
    res.status(500).json({ error: 'Failed to load categories' });
  }
});

// POST new category
router.post('/', async (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    const created = await prisma.category.create({
      data: { name },
    });
    res.status(201).json(created);
  } catch (err) {
    console.error('Failed to create category:', err);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// UPDATE category by ID
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
  
    if (!name) return res.status(400).json({ error: 'Name is required' });
  
    try {
      const updated = await prisma.category.update({
        where: { id },
        data: { name },
      });
  
      res.json(updated);
    } catch (err) {
      console.error('Update category failed:', err);
      res.status(500).json({ error: 'Failed to update category' });
    }
  });
  
  // DELETE category by ID
  router.delete('/:id', async (req, res) => {
    const { id } = req.params;
  
    try {
      await prisma.category.delete({ where: { id } });
      res.status(204).end();
    } catch (err) {
      console.error('Delete category failed:', err);
      res.status(500).json({ error: 'Failed to delete category' });
    }
  });
  

export default router;

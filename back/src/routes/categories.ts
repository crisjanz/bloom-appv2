import express from 'express';
import prisma from "../lib/prisma";

const router = express.Router();

// GET all categories - updated to support product count
router.get('/', async (req, res) => {
  const includeCount = req.query.include === 'count';
  
  try {
    const categories = await prisma.category.findMany({
      ...(includeCount && {
        include: {
          _count: {
            select: { products: true }
          }
        }
      }),
      orderBy: { name: 'asc' }
    });
    res.json(categories);
  } catch (err) {
    console.error('Failed to fetch categories:', err);
    res.status(500).json({ error: 'Failed to load categories' });
  }
});

// NEW: GET products in a specific category
router.get('/:id/products', async (req, res) => {
  const { id } = req.params;
  
  try {
    const products = await prisma.product.findMany({
      where: { categoryId: id },
      select: {
        id: true,
        name: true,
        isActive: true
      },
      orderBy: { name: 'asc' }
    });
    res.json(products);
  } catch (err) {
    console.error('Failed to fetch category products:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// POST new category
router.post('/', async (req, res) => {
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    const created = await prisma.category.create({
      data: { name: name.trim() },
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

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    const updated = await prisma.category.update({
      where: { id },
      data: { name: name.trim() },
    });

    res.json(updated);
  } catch (err) {
    console.error('Update category failed:', err);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// DELETE category by ID - updated with safety check
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Check if category has products
    const productCount = await prisma.product.count({
      where: { categoryId: id }
    });
    
    if (productCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete category with ${productCount} products. Please move or delete the products first.` 
      });
    }

    await prisma.category.delete({ where: { id } });
    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    console.error('Delete category failed:', err);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

export default router;
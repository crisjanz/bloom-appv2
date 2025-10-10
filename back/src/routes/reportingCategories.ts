// reportingCategories.ts
import express from 'express';
import prisma from "../lib/prisma";

const router = express.Router();

// GET all reporting categories
router.get('/', async (req, res) => {
  try {
    const categories = await prisma.reportingCategory.findMany({
      orderBy: {
        name: 'asc'
      }
    });
    res.json({
      success: true,
      categories
    });
  } catch (err) {
    console.error('Failed to fetch reporting categories:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to load reporting categories'
    });
  }
});

// POST - Create new reporting category
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;

    // Validate required field
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Category name is required'
      });
    }

    // Check if category with same name already exists
    const existingCategory = await prisma.reportingCategory.findUnique({
      where: { name: name.trim() }
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        error: 'A category with this name already exists'
      });
    }

    const category = await prisma.reportingCategory.create({
      data: {
        name: name.trim()
      }
    });

    res.status(201).json({
      success: true,
      category
    });
  } catch (error) {
    console.error('Error creating reporting category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create reporting category'
    });
  }
});

// DELETE - Delete reporting category
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category exists
    const existingCategory = await prisma.reportingCategory.findUnique({
      where: { id },
      include: {
        products: true
      }
    });

    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    // Check if category has products assigned
    if (existingCategory.products && existingCategory.products.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete category "${existingCategory.name}" because it has ${existingCategory.products.length} product(s) assigned. Please reassign or remove those products first.`
      });
    }

    await prisma.reportingCategory.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting reporting category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete reporting category'
    });
  }
});

export default router;

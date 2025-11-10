import express from 'express';
import prisma from "../lib/prisma";

const router = express.Router();

// GET all categories - hierarchical structure with optional tree format
router.get('/', async (req, res) => {
  const includeCount = req.query.include === 'count';
  const asTree = req.query.tree === 'true';
  
  try {
    const categories = await prisma.category.findMany({
      include: {
        parent: true,
        children: {
          include: {
            children: true, // Support 3 levels: parent > child > grandchild
            ...(includeCount && {
              _count: { select: { products: true } }
            })
          },
          orderBy: { sortOrder: 'asc' }
        },
        ...(includeCount && {
          _count: { select: { products: true } }
        })
      },
      orderBy: { sortOrder: 'asc' }
    });

    if (asTree) {
      // Return only top-level categories with nested children
      const tree = categories.filter(cat => cat.parentId === null);
      res.json(tree);
    } else {
      // Return flat list for dropdowns (with hierarchy info)
      const flatCategories = categories.map(cat => ({
        ...cat,
        fullName: buildCategoryPath(cat, categories),
        depth: cat.level - 1
      }));
      res.json(flatCategories);
    }
  } catch (err) {
    console.error('Failed to fetch categories:', err);
    res.status(500).json({ error: 'Failed to load categories' });
  }
});

// Helper function to build category path (e.g., "Electronics > Phones > Smartphones")
function buildCategoryPath(category: any, allCategories: any[]): string {
  if (!category.parentId) return category.name;
  
  const parent = allCategories.find(c => c.id === category.parentId);
  if (!parent) return category.name;
  
  return `${buildCategoryPath(parent, allCategories)} > ${category.name}`;
}

// GET category by slug
router.get('/by-slug/:slug', async (req, res) => {
  const { slug } = req.params;

  try {
    const category = await prisma.category.findUnique({
      where: { slug },
      include: {
        parent: true,
        children: true,
        _count: { select: { products: true } }
      }
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json(category);
  } catch (err) {
    console.error('Failed to fetch category by slug:', err);
    res.status(500).json({ error: 'Failed to fetch category' });
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

// POST new category (supports hierarchy)
router.post('/', async (req, res) => {
  const { name, parentId } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    // Validate parent category and calculate level
    let level = 1;
    if (parentId) {
      const parent = await prisma.category.findUnique({ where: { id: parentId } });
      if (!parent) {
        return res.status(400).json({ error: 'Parent category not found' });
      }
      if (parent.level >= 3) {
        return res.status(400).json({ error: 'Maximum category depth (3 levels) exceeded' });
      }
      level = parent.level + 1;
    }

    // Generate slug from name
    const slug = name.trim().toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
      .replace(/\s+/g, '-') // Replace spaces with dashes
      .replace(/-+/g, '-') // Remove duplicate dashes
      .trim();

    const created = await prisma.category.create({
      data: {
        name: name.trim(),
        slug: slug || `category-${Date.now()}`, // Fallback if slug is empty
        parentId: parentId || null,
        level
      },
      include: {
        parent: true,
        children: true
      }
    });
    res.status(201).json(created);
  } catch (err: any) {
    console.error('Failed to create category:', err);
    if (err.code === 'P2002') { // Unique constraint violation
      res.status(400).json({ error: 'Category name already exists in this level' });
    } else {
      res.status(500).json({ error: 'Failed to create category' });
    }
  }
});

// UPDATE category by ID (supports moving in hierarchy)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, parentId } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    // Validate parent change
    let level = 1;
    if (parentId) {
      // Check if parent exists
      const parent = await prisma.category.findUnique({ where: { id: parentId } });
      if (!parent) {
        return res.status(400).json({ error: 'Parent category not found' });
      }

      // Check depth limit
      if (parent.level >= 3) {
        return res.status(400).json({ error: 'Maximum category depth (3 levels) exceeded' });
      }

      // Prevent circular reference (can't be parent of itself or its ancestors)
      if (parentId === id) {
        return res.status(400).json({ error: 'Category cannot be parent of itself' });
      }

      level = parent.level + 1;
    }

    // Generate new slug if name changed
    const slug = name.trim().toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();

    const updated = await prisma.category.update({
      where: { id },
      data: {
        name: name.trim(),
        slug: slug || `category-${Date.now()}`,
        parentId: parentId || null,
        level
      },
      include: {
        parent: true,
        children: true
      }
    });

    res.json(updated);
  } catch (err: any) {
    console.error('Update category failed:', err);
    if (err.code === 'P2002') {
      res.status(400).json({ error: 'Category name already exists in this level' });
    } else {
      res.status(500).json({ error: 'Failed to update category' });
    }
  }
});

// DELETE category by ID - hierarchical safety check
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

    // Check if category has child categories
    const childCount = await prisma.category.count({
      where: { parentId: id }
    });
    
    if (childCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete category with ${childCount} subcategories. Please move or delete the subcategories first.` 
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
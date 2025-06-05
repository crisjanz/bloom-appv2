import express from 'express';
import prisma from "../lib/prisma";


const router = express.Router();


// ✅ Updated GET route only
router.get("/", async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        variants: true,
        category: true, // ✅ Required for filtering by category
      },
    });
    res.json(products);
  } catch (err) {
    console.error("Failed to fetch products:", err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// POST new product
router.post('/', async (req, res) => {
    const { name, slug, status, visibility, categoryId, reportingCategoryId } = req.body;

  try {
    const product = await prisma.product.create({
      data: {
        name,
        slug,
        status,
        visibility,
        description: 'Placeholder description',
        isActive: true,
        productType: 'MAIN',
        inventoryMode: 'OWN',
        category: { connect: { id: categoryId } },
        reportingCategory: { connect: { id: reportingCategoryId } },
        
      },
    });

    res.status(201).json(product);
  } catch (err) {
    console.error('Create product error:', err);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// GET product by ID (no type annotation to avoid TS overload issue)
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (err) {
    console.error('Error fetching product:', err);
    res.status(500).json({ error: 'Failed to load product' });
  }
});

// UPDATE product by ID
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, slug, status, visibility } = req.body;
  
    try {
      const updated = await prisma.product.update({
        where: { id },
        data: {
          name,
          slug,
          status,
          visibility,
        },
      });
  
      res.json(updated);
    } catch (err) {
      console.error('Error updating product:', err);
      res.status(500).json({ error: 'Failed to update product' });
    }
  });
  

export default router;

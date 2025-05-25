import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// GET all products
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
      price: p.variants.length > 0 ? p.variants[0].price : 0,
      status: p.status ?? 'UNKNOWN',
    }));

    res.json(simplified);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load products' });
  }
});

// POST new product
router.post('/', async (req, res) => {
  const { name, slug, status, visibility } = req.body;

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
        category: { connect: { id: '2e82e023-fc75-4267-a400-6a3c1ab87030' } },
        reportingCategory: { connect: { id: '26813aca-d6d2-4b89-9fda-c1660b3d233b' } },
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

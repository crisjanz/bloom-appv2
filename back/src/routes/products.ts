import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import multer from 'multer';
import prisma from '../lib/prisma';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

// Debug route to confirm router
router.get('/ping', (req, res) => {
  console.log('Ping route hit');
  res.json({ message: 'Pong' });
});

// Test route for Supabase bucket
router.get('/test-supabase', async (req, res) => {
  try {
    console.log('Test-supabase route hit');
    console.log('Supabase URL:', process.env.SUPABASE_URL);
    console.log('Supabase Key:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing');

    const { data, error } = await supabase.storage.from('product-images').list();
    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }
    res.json({ buckets: data });
  } catch (err: any) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Test route error:', err);
    res.status(500).json({ error: message });
  }
});

// Search Endpoint
router.get('/search', async (req, res) => {
  const { q } = req.query;
  if (!q) {
    return res.status(400).json({ error: 'Search query is required' });
  }
  try {
    const products = await prisma.product.findMany({
      where: {
        name: {
          contains: q as string,
          mode: 'insensitive',
        },
      },
      include: {
        category: true,
        variants: true,
      },
      take: 10,
    });
    res.json(
      products.map((product) => ({
        id: product.id,
        name: product.name,
        categoryId: product.category?.id,
        categoryName: product.category?.name,
        defaultPrice: product.variants[0]?.price || 0,
      }))
    );
  } catch (err) {
    console.error('Product search failed:', err);
    res.status(500).json({ error: 'Failed to search products' });
  }
});

// GET all products
router.get('/', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        variants: true,
        category: true,
      },
    });
    res.json(products);
  } catch (err) {
    console.error('Failed to fetch products:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// POST new product
router.post('/', upload.array('images'), async (req, res) => {
  const {
    title,
    slug,
    status,
    visibility,
    categoryId,
    reportingCategoryId,
    description,
    price,
    inventory,
    recipe,
    isTaxable,
    isActive,
    isFeatured,
    availableFrom,
    availableTo,
    subscriptionAvailable,
    seoTitle,
    seoDescription,
  } = req.body;
  const name = title;
  console.log('🧾 Incoming product body:', req.body);
  const files = (req as any).files as Express.Multer.File[];
  try {
    // Validate required fields
    if (!categoryId || !reportingCategoryId) {
      console.error('Missing required fields:', { categoryId, reportingCategoryId });
      return res.status(400).json({ error: 'Category and reporting category are required' });
    }
    if (!title) {
      console.error('Missing title');
      return res.status(400).json({ error: 'Title is required' });
    }

    let imageUrls: string[] = [];
    if (files && files.length > 0) {
      for (const file of files) {
        const filePath = `products/${Date.now()}-${file.originalname}`;
        const { error } = await supabase.storage
          .from('product-images')
          .upload(filePath, file.buffer, {
            contentType: file.mimetype,
          });
        if (error) {
          console.error('Supabase upload error:', error);
          throw error;
        }
        const { data: publicUrlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);
        imageUrls.push(publicUrlData.publicUrl);
      }
    }

    console.log('Attempting Prisma create with data:', {
      name,
      slug,
      status,
      visibility,
      description,
      categoryId,
      reportingCategoryId,
      imageUrls,
      price,
      inventory,
    });

    const product = await prisma.product.create({
      data: {
        name,
        slug,
        status,
        visibility,
        description: description || 'Placeholder description',
        isActive: isActive === 'true',
        productType: 'MAIN',
        inventoryMode: 'OWN',
        images: imageUrls,
        recipeNotes: recipe || null,
        isSubscriptionAvailable: subscriptionAvailable === 'true',
        showOnHomepage: isFeatured === 'true',
        category: { connect: { id: categoryId } },
        reportingCategory: { connect: { id: reportingCategoryId } },
        variants: {
          create: {
            name: 'Default',
            sku: `${slug}-default`,
            price: Math.round(parseFloat(price || '0') * 100), // Store price in cents
            stockLevel: parseInt(inventory || '0'),
            trackInventory: parseInt(inventory || '0') > 0,
            isDefault: true,
          },
        },
      },
    });

    console.log('Product created:', product);
    res.status(201).json({ id: product.id });
  } catch (err: any) {
    console.error('Create product error:', err);
    res.status(500).json({ error: err.message || 'Failed to create product' });
  }
});

// GET product by ID
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
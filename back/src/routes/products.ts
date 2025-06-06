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

const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

router.get('/ping', (req, res) => {
  console.log('Ping route hit');
  res.json({ message: 'Pong' });
});

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


router.post('/', upload.array('images'), async (req, res) => {
  const {
    title,
    slug,
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
    availabilityType,
    holidayPreset,
    notAvailableFrom,
    notAvailableUntil,
    isTemporarilyUnavailable,
    unavailableUntil,
    unavailableMessage,
    optionGroups: optionGroupsJson,
    variants: variantsJson,
  } = req.body;
  
  const name = title;
  
  try {
    if (!categoryId || !reportingCategoryId) {
      console.error('Missing required fields:', { categoryId, reportingCategoryId });
      return res.status(400).json({ error: 'Category and reporting category are required' });
    }
    if (!title) {
      console.error('Missing title');
      return res.status(400).json({ error: 'Title is required' });
    }

    let imageUrls: string[] = [];
    const files = (req as any).files as Express.Multer.File[];
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

    const optionGroups = optionGroupsJson ? JSON.parse(optionGroupsJson) : [];
    const variants = variantsJson ? JSON.parse(variantsJson) : [];
    const basePrice = parseFloat(price || '0') * 100;

    const optionGroupMap: { [name: string]: { id: string; values: { [label: string]: string } } } = {};
    for (const group of optionGroups) {
      const option = await prisma.productOption.create({
        data: {
          id: group.id,
          name: group.name,
          impactVariants: group.impactsVariants,
          values: {
            create: group.values.map((value: string, index: number) => ({
              id: generateUUID(),
              label: value,
              sortOrder: index,
            })),
          },
        },
        include: { values: true },
      });
      optionGroupMap[group.name] = {
        id: option.id,
        values: Object.fromEntries(
          option.values.map((v: { label: string; id: string }) => [v.label, v.id])
        ),
      };
    }

    const product = await prisma.product.create({
      data: {
        name,
        slug,
        visibility,
        description: description || 'Placeholder description',
        isActive: typeof isActive === 'string' ? JSON.parse(isActive) : (isActive !== undefined ? isActive : true),
        isTaxable: typeof isTaxable === 'string' ? JSON.parse(isTaxable) : (isTaxable !== undefined ? isTaxable : true),
        showOnHomepage: typeof isFeatured === 'string' ? JSON.parse(isFeatured) : (isFeatured !== undefined ? isFeatured : false),
        productType: 'MAIN',
        inventoryMode: 'OWN',
        images: imageUrls,
        recipeNotes: recipe || null,
        
        availabilityType: availabilityType || 'always',
        holidayPreset: (holidayPreset && holidayPreset.trim() !== '') ? holidayPreset : null,
        availableFrom: (availableFrom && availableFrom.trim() !== '') ? new Date(availableFrom) : null,
        availableTo: (availableTo && availableTo.trim() !== '') ? new Date(availableTo) : null,
        notAvailableFrom: (notAvailableFrom && notAvailableFrom.trim() !== '') ? new Date(notAvailableFrom) : null,
        notAvailableUntil: (notAvailableUntil && notAvailableUntil.trim() !== '') ? new Date(notAvailableUntil) : null,
        isTemporarilyUnavailable: typeof isTemporarilyUnavailable === 'string' ? JSON.parse(isTemporarilyUnavailable) : (isTemporarilyUnavailable !== undefined ? isTemporarilyUnavailable : false),
        unavailableUntil: (unavailableUntil && unavailableUntil.trim() !== '') ? new Date(unavailableUntil) : null,
        unavailableMessage: (unavailableMessage && unavailableMessage.trim() !== '') ? unavailableMessage : null,
        
        category: { connect: { id: categoryId } },
        reportingCategory: { connect: { id: reportingCategoryId } },
        variants: {
          create: variants.length > 0
            ? variants.map((variant: any) => ({
                id: variant.id,
                name: variant.name,
                sku: variant.sku || null,
                price: basePrice + (variant.priceDifference || 0),
                stockLevel: variant.stockLevel || 0,
                trackInventory: variant.trackInventory || false,
                isDefault: false,
                options: {
                  create: variant.name
                    .split(' - ')
                    .map((value: string) => {
                      const group = optionGroups.find((g: any) =>
                        g.values.includes(value)
                      );
                      if (!group) {
                        throw new Error(`Option value ${value} not found in groups`);
                      }
                      const valueId = optionGroupMap[group.name].values[value];
                      if (!valueId) {
                        throw new Error(`Value ID for ${value} not found`);
                      }
                      return {
                        optionValueId: valueId,
                      };
                    }),
                },
              }))
            : [{
                name: 'Default',
                sku: `${slug}-default`,
                price: basePrice,
                stockLevel: parseInt(inventory || '0'),
                trackInventory: parseInt(inventory || '0') > 0,
                isDefault: true,
              }],
        },
      },
    });

    res.status(201).json({ id: product.id });
  } catch (err: any) {
    console.error('Create product error:', err.message, err.stack);
    res.status(500).json({ error: err.message || 'Failed to create product' });
  }
});

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

router.put('/:id', upload.array('images'), async (req, res) => {
  const { id } = req.params;
  const {
    title,
    name,
    slug,
    visibility,
    description,
    categoryId,
    reportingCategoryId,
    isTaxable,
    isActive,
    isFeatured,
    inventory,
    recipe,
    price,
    availabilityType,
    holidayPreset,
    availableFrom,
    availableTo,
    notAvailableFrom,
    notAvailableUntil,
    isTemporarilyUnavailable,
    unavailableUntil,
    unavailableMessage,
    seoTitle,
    seoDescription
  } = req.body;
  
  try {
    const productName = name || title;
    const basePrice = parseFloat(price || '0') * 100;

    // Handle image uploads for updates (if any new images)
    let imageUrls: string[] = [];
    const files = (req as any).files as Express.Multer.File[];
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

    const updateData: any = {
      name: productName,
      slug,
      visibility,
      description,
      categoryId,
      reportingCategoryId,
      isActive: typeof isActive === 'string' ? JSON.parse(isActive) : (isActive !== undefined ? isActive : true),
      isTaxable: typeof isTaxable === 'string' ? JSON.parse(isTaxable) : (isTaxable !== undefined ? isTaxable : true),
      showOnHomepage: typeof isFeatured === 'string' ? JSON.parse(isFeatured) : (isFeatured !== undefined ? isFeatured : false),
      recipeNotes: recipe || null,
      
      availabilityType: availabilityType || 'always',
      holidayPreset: (holidayPreset && holidayPreset.trim() !== '') ? holidayPreset : null,
      availableFrom: (availableFrom && availableFrom.trim() !== '') ? new Date(availableFrom) : null,
      availableTo: (availableTo && availableTo.trim() !== '') ? new Date(availableTo) : null,
      notAvailableFrom: (notAvailableFrom && notAvailableFrom.trim() !== '') ? new Date(notAvailableFrom) : null,
      notAvailableUntil: (notAvailableUntil && notAvailableUntil.trim() !== '') ? new Date(notAvailableUntil) : null,
      isTemporarilyUnavailable: typeof isTemporarilyUnavailable === 'string' ? JSON.parse(isTemporarilyUnavailable) : (isTemporarilyUnavailable !== undefined ? isTemporarilyUnavailable : false),
      unavailableUntil: (unavailableUntil && unavailableUntil.trim() !== '') ? new Date(unavailableUntil) : null,
      unavailableMessage: (unavailableMessage && unavailableMessage.trim() !== '') ? unavailableMessage : null,
    };

    // Only update images if new ones were uploaded
    if (imageUrls.length > 0) {
      updateData.images = imageUrls;
    }

    const updated = await prisma.product.update({
      where: { id },
      data: updateData,
    });

    // Update the default variant price if provided - fixed the TypeScript error
    if (price) {
      await prisma.productVariant.updateMany({
        where: { 
          productId: id,
          isDefault: true 
        },
        data: {
          price: basePrice,
          stockLevel: inventory ? parseInt(inventory) : undefined,
        },
      });
    }

    res.json(updated);
  } catch (err: any) {
    console.error('Error updating product:', err);
    res.status(500).json({ error: 'Failed to update product', details: err.message });
  }
});

export default router;
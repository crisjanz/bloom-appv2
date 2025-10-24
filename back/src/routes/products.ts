import { Router } from 'express';
import multer from 'multer';
import prisma from '../lib/prisma';
import { uploadToR2, deleteFromR2 } from '../utils/r2Client';

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
        reportingCategory: true,
        variants: true,
      },
      take: 10,
    });
    res.json(
      products.map((product) => {
        const defaultVariant = product.variants.find(v => v.isDefault);
        const basePrice = defaultVariant ? defaultVariant.price : 0;
        
        const transformedVariants = product.variants.map(variant => ({
          ...variant,
          // Calculate final price for display components (like POS)
          calculatedPrice: variant.isDefault 
            ? basePrice / 100 
            : (basePrice + (variant.priceDifference || 0)) / 100,
          // Keep priceDifference in cents for consistency
          priceDifference: variant.priceDifference || 0
        }));

        return {
          id: product.id,
          name: product.name,
          categoryId: product.category?.id,
          categoryName: product.category?.name,
          reportingCategoryId: product.reportingCategory?.id,
          reportingCategoryName: product.reportingCategory?.name,
          defaultPrice: basePrice / 100,
          variants: transformedVariants
        };
      })
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
        variants: {
          orderBy: { isDefault: 'desc' } // Default variant first
        },
        category: true,
      },
    });
    
    // Transform products for frontend consumption (same as single product GET)
    const transformedProducts = products.map(product => {
      const defaultVariant = product.variants.find(v => v.isDefault);
      const basePrice = defaultVariant ? defaultVariant.price : 0;
      
      const transformedVariants = product.variants.map(variant => ({
        ...variant,
        // Calculate final price for display components (like POS)
        calculatedPrice: variant.isDefault 
          ? basePrice / 100 
          : (basePrice + (variant.priceDifference || 0)) / 100,
        // Keep priceDifference in cents for consistency
        priceDifference: variant.priceDifference || 0
      }));

      return {
        ...product,
        price: basePrice / 100, // Convert cents to dollars for base price
        variants: transformedVariants
      };
    });
    
    res.json(transformedProducts);
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
    if (req.body.images) {
      try {
        const parsed = typeof req.body.images === 'string' ? JSON.parse(req.body.images) : req.body.images;
        if (Array.isArray(parsed)) {
          imageUrls = parsed.filter((url: unknown) => typeof url === 'string') as string[];
        }
      } catch (error) {
        console.warn('⚠️ Failed to parse product images from request body, ignoring provided value.');
      }
    }

    const files = (req as any).files as Express.Multer.File[] | undefined;

    if (files && files.length > 0) {
      console.log(`📤 Uploading ${files.length} product image(s) to Cloudflare R2...`);
      for (const file of files) {
        const { url } = await uploadToR2({
          folder: 'products',
          buffer: file.buffer,
          mimeType: file.mimetype,
          originalName: file.originalname,
        });
        imageUrls.push(url);
      }
    }

    const optionGroups = optionGroupsJson
      ? (typeof optionGroupsJson === 'string' ? JSON.parse(optionGroupsJson) : optionGroupsJson)
      : [];
    const variants = variantsJson
      ? (typeof variantsJson === 'string' ? JSON.parse(variantsJson) : variantsJson)
      : [];
    const basePrice = parseFloat(price || '0') * 100;

    console.log('🔍 Variants data received:', {
      variantsJson,
      parsedVariants: variants,
      basePrice,
      optionGroups
    });

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
        images: imageUrls, // Start with empty array
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
          create: [
            // Always create default variant for base price
            {
              name: 'Default',
              sku: `${slug}-default`,
              price: basePrice,
              priceDifference: null, // No difference for base variant
              stockLevel: parseInt(inventory || '0'),
              trackInventory: parseInt(inventory || '0') > 0,
              isDefault: true,
            },
            // Add additional variants if provided
            ...variants.map((variant: any) => ({
              name: variant.name,
              sku: variant.sku || `${slug}-${variant.name.toLowerCase().replace(/\s+/g, '-')}`,
              price: 0, // Don't store calculated price - calculate when needed
              priceDifference: variant.priceDifference || 0, // Store the actual difference
              stockLevel: variant.stockLevel || 0,
              trackInventory: variant.trackInventory || false,
              isDefault: false,
            }))
          ],
        },
      },
    });

    console.log('✅ Product created successfully:', {
      productId: product.id,
      basePrice: basePrice / 100,
      variantCount: variants.length,
      imageCount: imageUrls.length,
    });

    res.status(201).json({ 
      id: product.id,
      images: imageUrls,
      message: 'Product created successfully'
    });
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
      include: {
        variants: {
          orderBy: { isDefault: 'desc' } // Default variant first
        },
        category: true,
        // TODO: Add option groups loading if needed for edit mode
        // We'll need to reconstruct option groups from variant names
      }
    });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Get base price from default variant and prepare variants for frontend
    const defaultVariant = product.variants.find(v => v.isDefault);
    const basePrice = defaultVariant ? defaultVariant.price : 0;
    
    const transformedVariants = product.variants
      .filter(v => !v.isDefault) // Exclude default variant from variants list
      .map(variant => ({
        ...variant,
        // priceDifference is stored in cents, keep as cents for frontend
        priceDifference: variant.priceDifference || 0,
        // Calculate final price for display components (like POS)
        calculatedPrice: (basePrice + (variant.priceDifference || 0)) / 100
      }));

    const responseProduct = {
      ...product,
      price: basePrice / 100, // Convert cents to dollars for base price
      variants: transformedVariants,
      optionGroups: [] // TODO: Reconstruct option groups from variants if needed
    };

    console.log('🔍 Loading product for edit:', {
      productId: id,
      basePrice: basePrice / 100,
      variantCount: transformedVariants.length,
      variants: transformedVariants.map(v => ({
        name: v.name,
        storedPriceDifference: v.priceDifference,
        calculatedPrice: v.calculatedPrice
      }))
    });

    res.json(responseProduct);
  } catch (err) {
    console.error('Error fetching product:', err);
    res.status(500).json({ error: 'Failed to load product' });
  }
});

router.put('/:id', async (req, res) => {
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
    seoDescription,
    optionGroups,
    variants,
    images  // Image URLs (already uploaded to Supabase)
  } = req.body;

  try {
    const productName = name || title;
    const basePrice = parseFloat(price || '0') * 100;
    
    console.log('🔍 PUT - Product update:', {
      productId: id,
      variants,
      basePrice,
      optionGroups,
      imageCount: images?.length || 0
    });

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

    // Update images (already uploaded to Cloudflare R2 via immediate upload)
    if (images) {
      try {
        const parsedImages = typeof images === 'string' ? JSON.parse(images) : images;
        if (Array.isArray(parsedImages)) {
          updateData.images = parsedImages;
        }
      } catch (parseError) {
        console.warn('⚠️ Failed to parse product images during update, ignoring provided value.');
      }
    }

    // Delete existing variants and their associated data
    await prisma.productVariant.deleteMany({
      where: { productId: id }
    });
    
    // Delete existing product options (this will cascade delete option values)
    await prisma.productOption.deleteMany({
      where: { 
        // Find options that were created for this product
        // Since we don't have a direct productId on ProductOption,
        // we'll delete all options that might be orphaned
        // This is safe since we're recreating them immediately after
        id: {
          in: optionGroups.map((g: any) => g.id)
        }
      }
    });

    // Create option groups if provided
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

    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...updateData,
        variants: {
          create: [
            // Always create default variant for base price
            {
              name: 'Default',
              sku: `${slug}-default`,
              price: basePrice,
              priceDifference: null, // No difference for base variant
              stockLevel: parseInt(inventory || '0'),
              trackInventory: parseInt(inventory || '0') > 0,
              isDefault: true,
            },
            // Add additional variants if provided
            ...variants.map((variant: any) => ({
              name: variant.name,
              sku: variant.sku || `${slug}-${variant.name.toLowerCase().replace(/\s+/g, '-')}`,
              price: 0, // Don't store calculated price - calculate when needed
              priceDifference: variant.priceDifference || 0, // Store the actual difference
              stockLevel: variant.stockLevel || 0,
              trackInventory: variant.trackInventory || false,
              isDefault: false,
            }))
          ],
        },
      },
    });

    console.log('✅ Product updated successfully:', {
      productId: id,
      basePrice: basePrice / 100,
      variantCount: variants.length,
      optionGroupCount: optionGroups.length
    });

    res.json(updated);
  } catch (err: any) {
    console.error('Error updating product:', err);
    res.status(500).json({ error: 'Failed to update product', details: err.message });
  }
});

// PATCH route for updating only images (immediate upload)
router.patch('/:id/images', async (req, res) => {
  const { id } = req.params;
  const { images } = req.body;

  try {
    console.log(`🖼️ Updating images for product ${id}:`, images);

    await prisma.product.update({
      where: { id },
      data: { images: images || [] }
    });

    console.log(`✅ Images updated for product ${id}`);
    res.json({ success: true, images });
  } catch (error) {
    console.error('❌ Error updating images:', error);
    res.status(500).json({
      error: 'Failed to update images',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Secure image upload endpoint
router.post('/images/upload', upload.single('image'), async (req, res) => {
  try {
    const file = req.file;
    const { folder } = req.body; // 'products' or 'orders'

    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // Validate folder
    const allowedFolders = ['products', 'orders', 'events', 'general'];
    if (!folder || !allowedFolders.includes(folder)) {
      return res.status(400).json({ error: `Invalid folder. Must be one of ${allowedFolders.join(', ')}` });
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.mimetype)) {
      return res.status(400).json({ error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed' });
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB' });
    }

    const { url, key } = await uploadToR2({
      folder,
      buffer: file.buffer,
      mimeType: file.mimetype,
      originalName: file.originalname,
    });

    console.log('✅ Image uploaded to Cloudflare R2:', url);

    res.json({ url, key });
  } catch (error) {
    console.error('❌ Error uploading image:', error);
    res.status(500).json({
      error: 'Failed to upload image',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Secure image delete endpoint
router.delete('/images', async (req, res) => {
  try {
    const { imageUrl, folder } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: 'No image URL provided' });
    }

    // Validate folder
    const allowedFolders = ['products', 'orders', 'events', 'general'];
    if (!folder || !allowedFolders.includes(folder)) {
      return res.status(400).json({ error: `Invalid folder. Must be one of ${allowedFolders.join(', ')}` });
    }

    const cdnBase = (process.env.CLOUDFLARE_R2_PUBLIC_URL || 'https://cdn.hellobloom.ca').replace(/\/$/, '');
    const normalizedUrl = imageUrl.startsWith(cdnBase) ? imageUrl.slice(cdnBase.length + 1) : imageUrl;
    const fileName = normalizedUrl.split('/').pop();
    const key = folder && fileName ? `${folder}/${fileName}` : normalizedUrl;

    console.log('🗑️ Deleting image from Cloudflare R2:', key);

    await deleteFromR2(key);

    console.log('✅ Image deleted successfully from Cloudflare R2');

    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error deleting image:', error);
    res.status(500).json({
      error: 'Failed to delete image',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;

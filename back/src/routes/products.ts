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
    const { data, error } = await supabase.storage.from('images').list();
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

    // Create product first without images for immediate response
    const imageUrls: string[] = [];
    const files = (req as any).files as Express.Multer.File[];

    const optionGroups = optionGroupsJson ? JSON.parse(optionGroupsJson) : [];
    const variants = variantsJson ? JSON.parse(variantsJson) : [];
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
      variantCount: variants.length
    });

    // Respond immediately to user
    res.status(201).json({ 
      id: product.id,
      message: files && files.length > 0 ? `Product created. Uploading ${files.length} images in background...` : 'Product created successfully'
    });

    // Upload images in background and update product
    if (files && files.length > 0) {
      console.log(`📤 Starting background image upload for product ${product.id} (${files.length} files)`);
      
      uploadProductImages(files, product.id)
        .then((uploadedUrls) => {
          console.log(`✅ Background image upload completed for product ${product.id}:`, uploadedUrls);
        })
        .catch((error) => {
          console.error(`❌ Background image upload failed for product ${product.id}:`, error);
          // TODO: In production, you might want to:
          // - Log to monitoring service
          // - Store failure for retry
          // - Send admin notification
        });
    }
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

    // Update images (already uploaded to Supabase via immediate upload)
    if (images && Array.isArray(images)) {
      updateData.images = images;
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

// Background upload function for product images
async function uploadProductImages(files: Express.Multer.File[], productId: string): Promise<string[]> {
  const imageUrls: string[] = [];
  
  console.log(`📤 Starting background upload for product ${productId} (${files.length} files)`);
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filePath = `products/${Date.now()}-${i}-${file.originalname}`;
    
    console.log(`📤 Uploading file ${i + 1}/${files.length}: ${filePath}`);
    
    const { error } = await supabase.storage
      .from('images')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        cacheControl: '3600', // Cache for 1 hour
        upsert: false
      });

    if (error) {
      console.error(`❌ Supabase upload error for file ${i + 1}:`, error);
      throw error;
    }

    const { data: publicUrlData } = supabase.storage
      .from('images')
      .getPublicUrl(filePath);
    
    imageUrls.push(publicUrlData.publicUrl);
    console.log(`✅ File ${i + 1}/${files.length} uploaded: ${publicUrlData.publicUrl}`);
  }
  
  // Update the product with the uploaded image URLs
  console.log(`🔄 Updating product ${productId} with ${imageUrls.length} image URLs`);
  await prisma.product.update({
    where: { id: productId },
    data: { images: imageUrls }
  });
  
  console.log(`✅ Product ${productId} updated with images successfully`);
  return imageUrls;
}

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
    if (!folder || !['products', 'orders'].includes(folder)) {
      return res.status(400).json({ error: 'Invalid folder. Must be "products" or "orders"' });
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

    // Generate unique file name
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 9);
    const extension = file.mimetype.split('/')[1];
    const fileName = `${timestamp}-${randomStr}.${extension}`;
    const filePath = `${folder}/${fileName}`;

    console.log('📤 Uploading image to Supabase:', filePath);

    // Upload to Supabase using secure service role key
    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('❌ Supabase upload error:', uploadError);
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('images')
      .getPublicUrl(filePath);

    console.log('✅ Image uploaded successfully:', publicUrlData.publicUrl);

    res.json({ url: publicUrlData.publicUrl });
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
    if (!folder || !['products', 'orders'].includes(folder)) {
      return res.status(400).json({ error: 'Invalid folder. Must be "products" or "orders"' });
    }

    // Extract file name from URL
    const urlParts = imageUrl.split('/');
    const fileName = urlParts[urlParts.length - 1];
    const filePath = `${folder}/${fileName}`;

    console.log('🗑️ Deleting image from Supabase:', filePath);

    const { error: deleteError } = await supabase.storage
      .from('images')
      .remove([filePath]);

    if (deleteError) {
      console.error('❌ Supabase delete error:', deleteError);
      throw new Error(`Delete failed: ${deleteError.message}`);
    }

    console.log('✅ Image deleted successfully');

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
import { Router } from 'express';
import multer from 'multer';
import { Prisma } from '@prisma/client';
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

type ProductWithVariantOptions = Prisma.ProductGetPayload<{
  include: {
    category: true;
    reportingCategory: true;
    variants: {
      orderBy: { isDefault: Prisma.SortOrder };
      include: {
        options: {
          include: {
            optionValue: {
              include: { option: true };
            };
          };
        };
      };
    };
    addonGroups: {
      include: {
        group: {
          select: {
            id: true;
            name: true;
            isDefault: true;
          };
        };
      };
    };
  };
}>;

type OptionValueSummary = {
  id: string;
  label: string;
  sortOrder: number;
  priceAdjustment: number;
};

type OptionSummary = {
  id: string;
  name: string;
  impactsVariants: boolean;
  optionType: string | null;
  displayAs: string | null;
  values: OptionValueSummary[];
};

type ProductOptionStructure = {
  allOptions: OptionSummary[];
  pricingOptions: OptionSummary[];
  customizationOptions: OptionSummary[];
};

type VariantSummary = {
  id: string;
  name: string;
  sku: string;
  priceDifference: number;
  calculatedPrice: number;
  stockLevel: number | null;
  trackInventory: boolean;
  isDefault: boolean;
  isManuallyEdited: boolean;
  optionValueIds: string[];
  optionValues: Array<{
    optionId: string;
    optionName: string;
    valueId: string;
    valueLabel: string;
  }>;
};

const OPTION_TYPE_PRICING = 'PRICING_TIER';

const parseCurrencyToCents = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.round(value * 100);
  }

  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
      return Math.round(parsed * 100);
    }
  }

  return 0;
};

const parseIdArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(
        value
          .filter((item): item is string => typeof item === 'string')
          .map((item) => item.trim())
          .filter((item) => item.length > 0)
      )
    );
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parseIdArray(parsed);
      }
    } catch {
      // fall back to comma splitting
    }

    return Array.from(
      new Set(
        value
          .split(',')
          .map((item) => item.trim())
          .filter((item) => item.length > 0)
      )
    );
  }

  return [];
};

const extractOptionMetadata = (option: Prisma.ProductOptionGetPayload<{}>): {
  optionType: string | null;
  displayAs: string | null;
} => {
  const unsafeOption = option as Prisma.ProductOptionGetPayload<{}> & {
    optionType?: string | null;
    displayAs?: string | null;
  };

  return {
    optionType: unsafeOption.optionType ?? null,
    displayAs: unsafeOption.displayAs ?? null,
  };
};

const buildOptionStructure = (product: ProductWithVariantOptions): ProductOptionStructure => {
  const map = new Map<string, OptionSummary>();

  for (const variant of product.variants) {
    for (const variantOption of variant.options ?? []) {
      const optionValue = variantOption.optionValue;
      const option = optionValue.option;
      const { optionType, displayAs } = extractOptionMetadata(option);

      if (!map.has(option.id)) {
        map.set(option.id, {
          id: option.id,
          name: option.name,
          impactsVariants: Boolean(option.impactsVariants),
          optionType,
          displayAs,
          values: [],
        });
      }

      const optionSummary = map.get(option.id)!;
      const exists = optionSummary.values.some((value) => value.id === optionValue.id);

      if (!exists) {
        optionSummary.values.push({
          id: optionValue.id,
          label: optionValue.label,
          sortOrder: optionValue.sortOrder ?? 0,
          priceAdjustment: optionValue.priceAdjustment ?? 0,
        });
      }
    }
  }

  const allOptions = Array.from(map.values()).map((option) => ({
    ...option,
    values: option.values.sort((a, b) => a.sortOrder - b.sortOrder),
  }));

  const pricingOptions = allOptions.filter(
    (option) =>
      option.optionType === OPTION_TYPE_PRICING
  );

  const customizationOptions = allOptions.filter(
    (option) => !pricingOptions.some((pricing) => pricing.id === option.id)
  );

  return {
    allOptions,
    pricingOptions,
    customizationOptions,
  };
};

const buildVariantSummaries = (
  product: ProductWithVariantOptions
): { basePriceCents: number; variants: VariantSummary[] } => {
  const defaultVariant =
    product.variants.find((variant) => variant.isDefault) ?? product.variants[0];

  const basePriceCents = defaultVariant?.price ?? 0;

  const variants: VariantSummary[] = product.variants.map((variant) => {
    const priceCents =
      variant.isDefault && variant.price !== null && variant.price !== undefined
        ? variant.price
        : basePriceCents + (variant.priceDifference ?? 0);

    const priceDifference = priceCents - basePriceCents;

    const optionValues = (variant.options ?? []).map((variantOption) => ({
      optionId: variantOption.optionValue.optionId,
      optionName: variantOption.optionValue.option.name,
      valueId: variantOption.optionValue.id,
      valueLabel: variantOption.optionValue.label,
    }));

    return {
      id: variant.id,
      name: variant.name,
      sku: variant.sku,
      priceDifference,
      calculatedPrice: priceCents / 100,
      stockLevel: variant.stockLevel,
      trackInventory: variant.trackInventory,
      isDefault: variant.isDefault,
      isManuallyEdited: variant.isManuallyEdited ?? false,
      optionValueIds: optionValues.map((value) => value.valueId),
      optionValues,
    };
  });

  return {
    basePriceCents,
    variants,
  };
};

const transformProductResponse = (product: ProductWithVariantOptions) => {
  const optionStructure = buildOptionStructure(product);
  const { basePriceCents, variants } = buildVariantSummaries(product);
  const defaultVariant = variants.find((variant) => variant.isDefault) ?? variants[0];

  // Don't filter out default variant - return ALL variants
  const variantList = variants
    .map((variant) => ({
      id: variant.id,
      name: variant.name,
      sku: variant.sku,
      priceDifference: variant.priceDifference,
      calculatedPrice: variant.calculatedPrice,
      stockLevel: variant.stockLevel,
      trackInventory: variant.trackInventory,
      isDefault: variant.isDefault,
      isManuallyEdited: variant.isManuallyEdited,
      optionValueIds: variant.optionValueIds,
      optionValues: variant.optionValues,
    }));

  const {
    variants: _unusedVariants,
    addonGroups: addonGroupLinks,
    ...productRest
  } = product;

  const addOnGroups = (addonGroupLinks ?? []).map((link) => ({
    assignmentId: link.id,
    groupId: link.groupId,
    group: link.group
      ? {
          id: link.group.id,
          name: link.group.name,
          isDefault: link.group.isDefault,
        }
      : null,
  }));

  return {
    ...productRest,
    price: basePriceCents / 100,
    baseVariant: defaultVariant,
    variants: variantList,
    optionStructure,
    addOnGroups,
    addOnGroupIds: addOnGroups.map((group) => group.groupId),
  };
};

type OptionGroupInput = {
  id: string;
  name: string;
  values: string[];
  impactsVariants: boolean;
  optionType?: string;
};

type VariantInput = {
  id?: string;
  name: string;
  sku?: string;
  priceDifference?: number;
  stockLevel?: number;
  trackInventory?: boolean;
  isManuallyEdited?: boolean;
  optionValueIds?: string[];
  optionValues?: Array<{
    optionId: string;
    optionName: string;
    valueId: string;
    valueLabel: string;
  }>;
};

type PersistedOptionGroup = {
  id: string;
  impactsVariants: boolean;
  valueLabelToId: Record<string, string>;
  orderedValueIds: string[];
};

const createProductOptions = async (
  client: Prisma.TransactionClient,
  optionGroups: OptionGroupInput[]
): Promise<Map<string, PersistedOptionGroup>> => {
  const optionGroupMap = new Map<string, PersistedOptionGroup>();

  for (const group of optionGroups) {
    if (!group.values?.length) {
      continue;
    }

    const option = await client.productOption.create({
      data: {
        id: group.id,
        name: group.name,
        impactsVariants: group.impactsVariants,
        optionType: group.optionType || null,
        values: {
          create: group.values.map((value, index) => {
            // Support both string values (old format) and object values (new format)
            const label = typeof value === 'string' ? value : (value as any)?.label || '';
            const priceAdjustment = typeof value === 'object' && value !== null && (value as any).priceAdjustment
              ? Math.round((value as any).priceAdjustment * 100) // Convert dollars to cents
              : 0;

            return {
              id: generateUUID(),
              label,
              sortOrder: index,
              priceAdjustment,
            };
          }),
        },
      },
      include: { values: true },
    });

    optionGroupMap.set(group.id, {
      id: option.id,
      impactsVariants: group.impactsVariants,
      valueLabelToId: Object.fromEntries(
        option.values.map((value) => [value.label, value.id])
      ),
      orderedValueIds: option.values.map((value) => value.id),
    });
  }

  return optionGroupMap;
};

const resolveVariantOptionValueIds = (
  variant: VariantInput,
  impactingGroups: OptionGroupInput[],
  optionMap: Map<string, PersistedOptionGroup>
): string[] => {
  if (!impactingGroups.length) {
    return [];
  }

  // If variant has optionValues with labels, use those to map to new IDs
  // Don't use optionValueIds directly as they may be stale from a previous version
  if (Array.isArray(variant.optionValues) && variant.optionValues.length) {
    return variant.optionValues.map((optionValue) => {
      const option = optionMap.get(optionValue.optionId);
      if (!option) {
        throw new Error(`Option with ID "${optionValue.optionId}" not found in optionMap.`);
      }

      const newValueId = option.valueLabelToId[optionValue.valueLabel];
      if (!newValueId) {
        throw new Error(
          `Option value "${optionValue.valueLabel}" not found in option "${optionValue.optionName}".`
        );
      }

      return newValueId;
    });
  }

  const labels = (variant.name || '')
    .split(' - ')
    .map((label) => label.trim())
    .filter(Boolean);

  const isDefaultVariantName =
    !variant.name ||
    variant.name === 'Default' ||
    variant.name.toLowerCase() === 'standard' ||
    variant.name.toLowerCase() === 'base';

  const fallbackToFirstValues = () => {
    return impactingGroups.map((group) => {
      const option = optionMap.get(group.id);
      if (!option || option.orderedValueIds.length === 0) {
        throw new Error(
          `Option group "${group.name}" is missing selectable values.`
        );
      }
      return option.orderedValueIds[0];
    });
  };

  if (labels.length !== impactingGroups.length) {
    if (isDefaultVariantName) {
      return fallbackToFirstValues();
    }

    throw new Error(
      `Variant "${variant.name}" does not match expected option combination. ` +
        `Expected ${impactingGroups.length} values, received ${labels.length}.`
    );
  }

  return impactingGroups.map((group, index) => {
    const option = optionMap.get(group.id);
    if (!option) {
      throw new Error(`Option group ${group.name} missing persisted mapping.`);
    }

    const label = labels[index];
    const optionValueId = option.valueLabelToId[label];
    if (!optionValueId) {
      if (isDefaultVariantName && option.orderedValueIds.length > 0) {
        return option.orderedValueIds[0];
      }

      throw new Error(
        `Option value "${label}" not found within group "${group.name}".`
      );
    }

    return optionValueId;
  });
};

const createProductVariants = async ({
  client,
  productId,
  productSlug,
  basePriceCents,
  baseInventory,
  optionGroups,
  optionMap,
  variants,
}: {
  client: Prisma.TransactionClient;
  productId: string;
  productSlug: string;
  basePriceCents: number;
  baseInventory: number;
  optionGroups: OptionGroupInput[];
  optionMap: Map<string, PersistedOptionGroup>;
  variants: VariantInput[];
}) => {
  const impactingGroups = optionGroups.filter((group) => group.impactsVariants);
  const sanitizedVariants = Array.isArray(variants) ? variants : [];

  const variantEntries: VariantInput[] = sanitizedVariants.length
    ? sanitizedVariants
    : [
        {
          name: 'Default',
          sku: `${productSlug}-default`,
          priceDifference: 0,
          stockLevel: baseInventory,
          trackInventory: baseInventory > 0,
        },
      ];

  let defaultVariantIndex = variantEntries.findIndex(
    (variant) => Number(variant.priceDifference ?? 0) === 0
  );
  if (defaultVariantIndex === -1) {
    defaultVariantIndex = 0;
  }

  const usedCombinationKeys = new Set<string>();
  const usedSkus = new Set<string>();

  for (let index = 0; index < variantEntries.length; index += 1) {
    const variant = variantEntries[index];
    const isDefault = index === defaultVariantIndex;

    const rawPriceDifference = Number(variant.priceDifference ?? 0);
    const priceDifferenceCents = isDefault ? 0 : rawPriceDifference;
    const priceCents = basePriceCents + priceDifferenceCents;
    const stockLevel =
      variant.stockLevel !== undefined && variant.stockLevel !== null
        ? Number(variant.stockLevel)
        : null;
    const trackInventory = Boolean(variant.trackInventory);
    const optionValueIds = resolveVariantOptionValueIds(
      variant,
      impactingGroups,
      optionMap
    );

    console.log(`🔍 Variant ${index} (${variant.name}):`, {
      optionValueIds,
      hasOptionValues: !!variant.optionValues,
      hasOptionValueIds: !!variant.optionValueIds,
      priceDifference: priceDifferenceCents,
    });

    const combinationKey = optionValueIds.join('|');
    if (combinationKey && usedCombinationKeys.has(combinationKey)) {
      console.log(`⚠️  Skipping duplicate variant: ${variant.name} (key: ${combinationKey})`);
      continue;
    }
    if (combinationKey) {
      usedCombinationKeys.add(combinationKey);
    }

    const baseSku =
      variant.sku ||
      `${productSlug}-${(variant.name || `variant-${index + 1}`)
        .toLowerCase()
        .replace(/\s+/g, '-')}`;

    let finalSku = baseSku;
    let dedupeCounter = 1;
    while (usedSkus.has(finalSku)) {
      finalSku = `${baseSku}-${dedupeCounter}`;
      dedupeCounter += 1;
    }
    usedSkus.add(finalSku);

    await client.productVariant.create({
      data: {
        productId,
        name: variant.name || `Variant ${index + 1}`,
        sku: finalSku,
        price: priceCents,
        priceDifference: priceDifferenceCents,
        stockLevel,
        trackInventory,
        isDefault,
        isManuallyEdited: Boolean(variant.isManuallyEdited),
        options: {
          create: optionValueIds.map((optionValueId) => ({
            optionValueId,
          })),
        },
      },
    });
  }
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
        addonGroups: {
          select: { groupId: true },
        },
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
          variants: transformedVariants,
          addOnGroupIds: product.addonGroups?.map((link) => link.groupId) ?? [],
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
          orderBy: { isDefault: 'desc' },
          include: {
            options: {
              include: {
                optionValue: {
                  include: { option: true },
                },
              },
            },
          },
        },
        category: true,
        reportingCategory: true,
        addonGroups: {
          include: {
            group: {
              select: {
                id: true,
                name: true,
                isDefault: true,
              },
            },
          },
        },
      },
    });

    res.json(products.map((product) => transformProductResponse(product)));
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
    productType,
    optionGroups: optionGroupsJson,
    variants: variantsJson,
    addOnGroupIds: addOnGroupIdsRaw,
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

    const optionGroupInputs: OptionGroupInput[] = optionGroupsJson
      ? (typeof optionGroupsJson === 'string'
          ? JSON.parse(optionGroupsJson)
          : optionGroupsJson)
      : [];
    const variantInputs: VariantInput[] = variantsJson
      ? (typeof variantsJson === 'string' ? JSON.parse(variantsJson) : variantsJson)
      : [];
    const basePrice = parseCurrencyToCents(price || 0);
    const addOnGroupIds = parseIdArray(addOnGroupIdsRaw);

    if (addOnGroupIds.length > 0) {
      const groups = await prisma.addOnGroup.findMany({
        where: { id: { in: addOnGroupIds } },
        select: { id: true },
      });

      const foundIds = new Set(groups.map((group) => group.id));
      const missingGroupIds = addOnGroupIds.filter((groupId) => !foundIds.has(groupId));

      if (missingGroupIds.length > 0) {
        return res.status(400).json({
          error: `Add-on groups not found: ${missingGroupIds.join(', ')}`,
        });
      }
    }

    console.log('🔍 Variants data received:', {
      variantsJson,
      parsedVariants: variantInputs,
      basePrice,
      optionGroups: optionGroupInputs,
    });

    const baseInventory = parseInt(inventory || '0', 10) || 0;

    const product = await prisma.$transaction(async (tx) => {
      const createdProduct = await tx.product.create({
        data: {
          name,
          slug,
          visibility,
          description: description || 'Placeholder description',
          isActive:
            typeof isActive === 'string'
              ? JSON.parse(isActive)
              : isActive !== undefined
              ? isActive
              : true,
          isTaxable:
            typeof isTaxable === 'string'
              ? JSON.parse(isTaxable)
              : isTaxable !== undefined
              ? isTaxable
              : true,
          showOnHomepage:
            typeof isFeatured === 'string'
              ? JSON.parse(isFeatured)
              : isFeatured !== undefined
              ? isFeatured
              : false,
          productType: productType || 'MAIN',
          inventoryMode: 'OWN',
          images: imageUrls,
          recipeNotes: recipe || null,

          availabilityType: availabilityType || 'always',
          holidayPreset: holidayPreset?.trim() ? holidayPreset : null,
          availableFrom: availableFrom?.trim() ? new Date(availableFrom) : null,
          availableTo: availableTo?.trim() ? new Date(availableTo) : null,
          notAvailableFrom: notAvailableFrom?.trim()
            ? new Date(notAvailableFrom)
            : null,
          notAvailableUntil: notAvailableUntil?.trim()
            ? new Date(notAvailableUntil)
            : null,
          isTemporarilyUnavailable:
            typeof isTemporarilyUnavailable === 'string'
              ? JSON.parse(isTemporarilyUnavailable)
              : isTemporarilyUnavailable !== undefined
              ? isTemporarilyUnavailable
              : false,
          unavailableUntil: unavailableUntil?.trim()
            ? new Date(unavailableUntil)
            : null,
          unavailableMessage: unavailableMessage?.trim()
            ? unavailableMessage
            : null,

          category: { connect: { id: categoryId } },
          reportingCategory: { connect: { id: reportingCategoryId } },
        },
      });

      const optionGroupMap = await createProductOptions(tx, optionGroupInputs);

      await createProductVariants({
        client: tx,
        productId: createdProduct.id,
        productSlug: createdProduct.slug,
        basePriceCents: basePrice,
        baseInventory,
        optionGroups: optionGroupInputs,
        optionMap: optionGroupMap,
        variants: variantInputs,
      });

      if (
        addOnGroupIds.length > 0 &&
        (productType || 'MAIN') === 'MAIN'
      ) {
        await tx.productAddOnGroup.createMany({
          data: addOnGroupIds.map((groupId) => ({
            productId: createdProduct.id,
            groupId,
          })),
          skipDuplicates: true,
        });
      }

      return createdProduct;
    });

    console.log('✅ Product created successfully:', {
      productId: product.id,
      basePrice: basePrice / 100,
      variantCount: variantInputs.length || 1,
      optionGroupCount: optionGroupInputs.length,
      imageCount: imageUrls.length,
    });

    res.status(201).json({
      id: product.id,
      images: imageUrls,
      message: 'Product created successfully',
    });
  } catch (err: any) {
    console.error('Create product error:', err.message, err.stack);
    res.status(500).json({ error: err.message || 'Failed to create product' });
  }
});

// GET /api/products/frequently-sold - Get top selling products
router.get('/frequently-sold', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 8;

    // Get products with most order items from completed orders
    const frequentlySold = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: {
          status: {
            in: ['COMPLETED', 'PAID', 'READY', 'OUT_FOR_DELIVERY']
          }
        }
      },
      _count: {
        productId: true
      },
      orderBy: {
        _count: {
          productId: 'desc'
        }
      },
      take: limit
    });

    // Fetch full product details
    const productIds = frequentlySold.map(item => item.productId);
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        isActive: true
      },
      include: {
        category: true,
        variants: {
          where: { isDefault: true },
          take: 1
        }
      }
    });

    // Sort products by frequency
    const sortedProducts = products.sort((a, b) => {
      const aIndex = productIds.indexOf(a.id);
      const bIndex = productIds.indexOf(b.id);
      return aIndex - bIndex;
    });

    res.json(sortedProducts);
  } catch (error) {
    console.error('Error fetching frequently sold products:', error);
    res.status(500).json({ error: 'Failed to fetch frequently sold products' });
  }
});

router.get('/:id/option-structure', async (req, res) => {
  const { id } = req.params;

  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        variants: {
          orderBy: { isDefault: 'desc' },
          include: {
            options: {
              include: {
                optionValue: {
                  include: { option: true },
                },
              },
            },
          },
        },
        category: true,
        reportingCategory: true,
        addonGroups: {
          include: {
            group: {
              select: {
                id: true,
                name: true,
                isDefault: true,
              },
            },
          },
        },
      },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const optionStructure = buildOptionStructure(product);

    res.json(optionStructure);
  } catch (error) {
    console.error('Error loading product option structure:', error);
    res.status(500).json({ error: 'Failed to load option structure' });
  }
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        variants: {
          orderBy: { isDefault: 'desc' },
          include: {
            options: {
              include: {
                optionValue: {
                  include: { option: true },
                },
              },
            },
          },
        },
        category: true,
        reportingCategory: true,
        addonGroups: {
          include: {
            group: {
              select: {
                id: true,
                name: true,
                isDefault: true,
              },
            },
          },
        },
      }
    });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const responseProduct = transformProductResponse(product);

    console.log('🔍 Loading product for edit:', {
      productId: id,
      basePrice: responseProduct.price,
      variantCount: responseProduct.variants.length,
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
    productType,
    images,  // Image URLs (already uploaded to R2)
    addOnGroupIds: addOnGroupIdsRaw,
  } = req.body;

  try {
    const productName = name || title;
    const basePrice = parseCurrencyToCents(price || 0);

    const existingProduct = await prisma.product.findUnique({
      where: { id },
      select: { productType: true },
    });

    if (!existingProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    console.log('🔍 PUT - Product update:', {
      productId: id,
      variants,
      basePrice,
      optionGroups,
      imageCount: images?.length || 0
    });

    const updateData: Prisma.ProductUpdateInput = {
      name: productName,
      slug,
      visibility,
      description,
      isActive:
        typeof isActive === 'string'
          ? JSON.parse(isActive)
          : isActive !== undefined
          ? isActive
          : true,
      isTaxable:
        typeof isTaxable === 'string'
          ? JSON.parse(isTaxable)
          : isTaxable !== undefined
          ? isTaxable
          : true,
      showOnHomepage:
        typeof isFeatured === 'string'
          ? JSON.parse(isFeatured)
          : isFeatured !== undefined
          ? isFeatured
          : false,
      productType: productType || existingProduct.productType,
      recipeNotes: recipe || null,

      availabilityType: availabilityType || 'always',
      holidayPreset: holidayPreset?.trim() ? holidayPreset : null,
      availableFrom: availableFrom?.trim() ? new Date(availableFrom) : null,
      availableTo: availableTo?.trim() ? new Date(availableTo) : null,
      notAvailableFrom: notAvailableFrom?.trim()
        ? new Date(notAvailableFrom)
        : null,
      notAvailableUntil: notAvailableUntil?.trim()
        ? new Date(notAvailableUntil)
        : null,
      isTemporarilyUnavailable:
        typeof isTemporarilyUnavailable === 'string'
          ? JSON.parse(isTemporarilyUnavailable)
          : isTemporarilyUnavailable !== undefined
          ? isTemporarilyUnavailable
          : false,
      unavailableUntil: unavailableUntil?.trim()
        ? new Date(unavailableUntil)
        : null,
      unavailableMessage: unavailableMessage?.trim()
        ? unavailableMessage
        : null,
    };

    if (categoryId) {
      updateData.category = { connect: { id: categoryId } };
    }

    if (reportingCategoryId) {
      updateData.reportingCategory = { connect: { id: reportingCategoryId } };
    }

    // Update images (already uploaded to Cloudflare R2 via immediate upload)
    if (images) {
      try {
        const parsedImages = typeof images === 'string' ? JSON.parse(images) : images;
        if (Array.isArray(parsedImages)) {
          (updateData.images as unknown as { set: string[] }) = { set: parsedImages };
        }
      } catch (parseError) {
        console.warn('⚠️ Failed to parse product images during update, ignoring provided value.');
      }
    }

    const optionGroupInputs: OptionGroupInput[] = typeof optionGroups === 'string'
      ? JSON.parse(optionGroups)
      : Array.isArray(optionGroups)
      ? optionGroups
      : [];
    const variantInputs: VariantInput[] = typeof variants === 'string'
      ? JSON.parse(variants)
      : Array.isArray(variants)
      ? variants
      : [];
    const baseInventory = parseInt(inventory || '0', 10) || 0;
    const addOnGroupIds = parseIdArray(addOnGroupIdsRaw);
    const resolvedProductType = (productType || existingProduct.productType) as string;

    if (resolvedProductType === 'MAIN' && addOnGroupIds.length > 0) {
      const groups = await prisma.addOnGroup.findMany({
        where: { id: { in: addOnGroupIds } },
        select: { id: true },
      });

      const foundIds = new Set(groups.map((group) => group.id));
      const missingGroupIds = addOnGroupIds.filter((groupId) => !foundIds.has(groupId));

      if (missingGroupIds.length > 0) {
        return res.status(400).json({
          error: `Add-on groups not found: ${missingGroupIds.join(', ')}`,
        });
      }
    }

    const updatedProduct = await prisma.$transaction(async (tx) => {
      const existingOptionIds = await tx.variantOption.findMany({
        where: { variant: { productId: id } },
        select: {
          optionValue: {
            select: { optionId: true },
          },
        },
      });

      await tx.variantOption.deleteMany({
        where: { variant: { productId: id } },
      });

      await tx.productVariant.deleteMany({
        where: { productId: id },
      });

      const optionIdsToDelete = Array.from(
        new Set(existingOptionIds.map((entry) => entry.optionValue.optionId))
      );

      if (optionIdsToDelete.length) {
        await tx.productOptionValue.deleteMany({
          where: {
            optionId: { in: optionIdsToDelete },
          },
        });

        await tx.productOption.deleteMany({
          where: {
            id: { in: optionIdsToDelete },
          },
        });
      }

      const updated = await tx.product.update({
        where: { id },
        data: updateData,
      });

      const optionMap = await createProductOptions(tx, optionGroupInputs);

      await createProductVariants({
        client: tx,
        productId: updated.id,
        productSlug: updated.slug,
        basePriceCents: basePrice,
        baseInventory,
        optionGroups: optionGroupInputs,
        optionMap,
        variants: variantInputs,
      });

      if (resolvedProductType !== 'MAIN') {
        await tx.productAddOnGroup.deleteMany({
          where: { productId: id },
        });
      } else {
        const existingAssignments = await tx.productAddOnGroup.findMany({
          where: { productId: id },
          select: { groupId: true },
        });

        const existingIds = new Set(
          existingAssignments.map((assignment) => assignment.groupId)
        );
        const incomingIds = new Set(addOnGroupIds);

        const groupsToRemove = [...existingIds].filter(
          (groupId) => !incomingIds.has(groupId)
        );
        const groupsToAdd = addOnGroupIds.filter(
          (groupId) => !existingIds.has(groupId)
        );

        if (groupsToRemove.length > 0) {
          await tx.productAddOnGroup.deleteMany({
            where: {
              productId: id,
              groupId: { in: groupsToRemove },
            },
          });
        }

        if (groupsToAdd.length > 0) {
          await tx.productAddOnGroup.createMany({
            data: groupsToAdd.map((groupId) => ({
              productId: id,
              groupId,
            })),
            skipDuplicates: true,
          });
        }
      }

      return updated;
    });

    console.log('✅ Product updated successfully:', {
      productId: id,
      basePrice: basePrice / 100,
      variantCount: variantInputs.length || 1,
      optionGroupCount: optionGroupInputs.length,
    });

    res.json(updatedProduct);
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

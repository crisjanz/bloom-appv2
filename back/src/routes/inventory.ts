import { Router } from 'express';
import { Prisma, PrintJobType } from '@prisma/client';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { generateOrderQRCode } from '../utils/qrCodeGenerator';
import { buildInventorySheetPdf } from '../templates/inventory-sheet-pdf';
import { buildPriceLabelsPdf, PriceLabelItem } from '../templates/price-label-pdf';
import { storePdf } from '../utils/pdfStorage';
import { printService } from '../services/printService';

const router = Router();

const LOW_STOCK_THRESHOLD = 5;
const QR_PREFIX = 'BLOOM:SKU:';

const queryBoolean = z.preprocess((value) => {
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }
  if (typeof value === 'boolean') {
    return value;
  }
  return false;
}, z.boolean());

const listQuerySchema = z.object({
  search: z.string().trim().optional(),
  categoryId: z.string().trim().optional(),
  lowStockOnly: queryBoolean.default(false),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
  sortBy: z.enum(['name', 'sku', 'stock']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

const lookupQuerySchema = z.object({
  sku: z.string().trim().min(1),
});

const variantIdParamSchema = z.object({
  variantId: z.string().min(1),
});

const adjustBodySchema = z.object({
  stockLevel: z.number().int().min(0).optional(),
  delta: z.number().int().optional(),
}).refine((payload) => payload.stockLevel !== undefined || payload.delta !== undefined, {
  message: 'Provide stockLevel or delta',
});

const bulkAdjustSchema = z.object({
  adjustments: z.array(
    z.object({
      variantId: z.string().min(1),
      stockLevel: z.number().int().min(0).optional(),
      delta: z.number().int().optional(),
    }).refine((item) => item.stockLevel !== undefined || item.delta !== undefined, {
      message: 'Each adjustment must include stockLevel or delta',
    })
  ).min(1).max(500),
});

const reportQuerySchema = z.object({
  categoryId: z.string().trim().optional(),
  lowStockOnly: queryBoolean.default(false),
  sortBy: z.enum(['name', 'sku', 'stock']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

const singleLabelQuerySchema = z.object({
  quantity: z.coerce.number().int().min(1).max(200).default(1),
});

const labelRequestSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(200).optional(),
});

const batchLabelsSchema = z.object({
  variantIds: z.array(z.string().min(1)).optional(),
  labels: z.array(labelRequestSchema).optional(),
}).refine((payload) => {
  return (payload.variantIds && payload.variantIds.length > 0) || (payload.labels && payload.labels.length > 0);
}, {
  message: 'Provide variantIds or labels',
});

const inventoryInclude = {
  product: {
    select: {
      id: true,
      name: true,
      images: true,
      categoryId: true,
      category: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
} satisfies Prisma.ProductVariantInclude;

type InventoryVariant = Prisma.ProductVariantGetPayload<{
  include: typeof inventoryInclude;
}>;

const normalizeSku = (rawSku: string) => {
  const trimmed = rawSku.trim();
  if (trimmed.toUpperCase().startsWith(QR_PREFIX)) {
    return trimmed.slice(QR_PREFIX.length).trim();
  }
  return trimmed;
};

const buildWhere = (filters: {
  search?: string;
  categoryId?: string;
  lowStockOnly?: boolean;
}): Prisma.ProductVariantWhereInput => {
  const and: Prisma.ProductVariantWhereInput[] = [];

  if (filters.search) {
    and.push({
      OR: [
        { sku: { contains: filters.search, mode: 'insensitive' } },
        { name: { contains: filters.search, mode: 'insensitive' } },
        {
          product: {
            name: { contains: filters.search, mode: 'insensitive' },
          },
        },
      ],
    });
  }

  if (filters.categoryId) {
    and.push({
      product: {
        OR: [
          { categoryId: filters.categoryId },
          { categoryLinks: { some: { categoryId: filters.categoryId } } },
        ],
      },
    });
  }

  if (filters.lowStockOnly) {
    and.push({
      trackInventory: true,
      stockLevel: {
        lte: LOW_STOCK_THRESHOLD,
      },
    });
  }

  if (and.length === 0) {
    return {};
  }

  return { AND: and };
};

const buildOrderBy = (
  sortBy: 'name' | 'sku' | 'stock',
  sortOrder: 'asc' | 'desc'
): Prisma.ProductVariantOrderByWithRelationInput[] => {
  switch (sortBy) {
    case 'sku':
      return [{ sku: sortOrder }];
    case 'stock':
      return [{ stockLevel: sortOrder }, { sku: 'asc' }];
    case 'name':
    default:
      return [{ product: { name: sortOrder } }, { name: sortOrder }];
  }
};

const mapInventoryItem = (variant: InventoryVariant) => {
  const productName = variant.product?.name || 'Unnamed Product';
  const variantName = variant.name || productName;

  return {
    id: variant.id,
    variantId: variant.id,
    productId: variant.productId,
    sku: variant.sku,
    productName,
    variantName,
    price: variant.price,
    stockLevel: variant.stockLevel,
    trackInventory: variant.trackInventory,
    categoryId: variant.product?.category?.id || variant.product?.categoryId || null,
    categoryName: variant.product?.category?.name || null,
    imageUrl: variant.featuredImageUrl || variant.product?.images?.[0] || null,
    updatedAt: variant.updatedAt.toISOString(),
  };
};

const mapSortLabel = (sortBy: 'name' | 'sku' | 'stock', sortOrder: 'asc' | 'desc') => {
  const suffix = sortOrder === 'asc' ? 'A-Z' : 'Z-A';
  if (sortBy === 'sku') return `SKU (${suffix})`;
  if (sortBy === 'stock') return `Stock (${sortOrder === 'asc' ? 'Low-High' : 'High-Low'})`;
  return `Name (${suffix})`;
};

const loadVariantById = async (variantId: string) => {
  return prisma.productVariant.findUnique({
    where: { id: variantId },
    include: inventoryInclude,
  });
};

router.get('/', async (req, res) => {
  try {
    const query = listQuerySchema.parse(req.query);
    const where = buildWhere(query);
    const orderBy = buildOrderBy(query.sortBy, query.sortOrder);
    const skip = (query.page - 1) * query.pageSize;

    const [count, variants] = await Promise.all([
      prisma.productVariant.count({ where }),
      prisma.productVariant.findMany({
        where,
        include: inventoryInclude,
        orderBy,
        skip,
        take: query.pageSize,
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(count / query.pageSize));

    res.json({
      items: variants.map(mapInventoryItem),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        totalItems: count,
        totalPages,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }

    console.error('Failed to load inventory list:', error);
    res.status(500).json({ error: 'Failed to load inventory list' });
  }
});

router.get('/lookup', async (req, res) => {
  try {
    const { sku } = lookupQuerySchema.parse(req.query);
    const normalizedSku = normalizeSku(sku);

    const variant = await prisma.productVariant.findFirst({
      where: {
        sku: {
          equals: normalizedSku,
          mode: 'insensitive',
        },
      },
      include: inventoryInclude,
    });

    if (!variant) {
      return res.status(404).json({ error: 'Product variant not found' });
    }

    res.json(mapInventoryItem(variant));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }

    console.error('Failed to lookup inventory variant:', error);
    res.status(500).json({ error: 'Failed to lookup inventory variant' });
  }
});

router.post('/bulk-adjust', async (req, res) => {
  try {
    const payload = bulkAdjustSchema.parse(req.body);
    const variantIds = Array.from(new Set(payload.adjustments.map((item) => item.variantId)));

    const existingVariants = await prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      select: { id: true, stockLevel: true },
    });

    const existingIds = new Set(existingVariants.map((variant) => variant.id));
    const missingIds = variantIds.filter((id) => !existingIds.has(id));
    if (missingIds.length > 0) {
      return res.status(404).json({
        error: `Missing variants: ${missingIds.join(', ')}`,
      });
    }

    const currentStockById = new Map(
      existingVariants.map((variant) => [variant.id, variant.stockLevel ?? 0])
    );

    await prisma.$transaction(async (tx) => {
      for (const item of payload.adjustments) {
        const currentStock = currentStockById.get(item.variantId) ?? 0;
        const requestedStock = item.stockLevel ?? currentStock + (item.delta ?? 0);
        const nextStock = Math.max(0, requestedStock);

        await tx.productVariant.update({
          where: { id: item.variantId },
          data: {
            stockLevel: nextStock,
            trackInventory: true,
          },
        });
      }
    });

    const updatedVariants = await prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: inventoryInclude,
    });

    res.json({
      updatedCount: updatedVariants.length,
      items: updatedVariants.map(mapInventoryItem),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }

    console.error('Failed to bulk adjust inventory:', error);
    res.status(500).json({ error: 'Failed to bulk adjust inventory' });
  }
});

router.get('/report', async (req, res) => {
  try {
    const query = reportQuerySchema.parse(req.query);
    const where = buildWhere(query);
    const orderBy = buildOrderBy(query.sortBy, query.sortOrder);

    const [variants, storeSettings, category] = await Promise.all([
      prisma.productVariant.findMany({
        where,
        include: inventoryInclude,
        orderBy,
      }),
      prisma.storeSettings.findFirst({
        select: {
          storeName: true,
        },
      }),
      query.categoryId
        ? prisma.category.findUnique({
            where: { id: query.categoryId },
            select: { name: true },
          })
        : Promise.resolve(null),
    ]);

    const sheetItems = variants.map((variant) => ({
      sku: variant.sku,
      productName: variant.product?.name || 'Unnamed Product',
      variantName: variant.name || '',
      currentStock: variant.stockLevel,
      trackInventory: variant.trackInventory,
    }));

    const pdfBuffer = await buildInventorySheetPdf(sheetItems, {
      shopName: storeSettings?.storeName || 'In Your Vase Flowers',
      generatedAt: new Date(),
      categoryName: category?.name || null,
      lowStockOnly: query.lowStockOnly,
      sortLabel: mapSortLabel(query.sortBy, query.sortOrder),
    });

    const stored = await storePdf(pdfBuffer, 'inventory-count-sheet');

    res.json({
      pdfUrl: stored.url,
      storage: stored.storage,
      itemCount: sheetItems.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }

    console.error('Failed to generate inventory report:', error);
    res.status(500).json({ error: 'Failed to generate inventory report' });
  }
});

router.get('/qr/:variantId', async (req, res) => {
  try {
    const { variantId } = variantIdParamSchema.parse(req.params);
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      select: {
        id: true,
        sku: true,
      },
    });

    if (!variant) {
      return res.status(404).json({ error: 'Variant not found' });
    }

    const qrValue = `${QR_PREFIX}${variant.sku}`;
    const qrCode = await generateOrderQRCode(qrValue);

    res.json({
      variantId: variant.id,
      sku: variant.sku,
      qrValue,
      qrCode,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }

    console.error('Failed to generate inventory QR:', error);
    res.status(500).json({ error: 'Failed to generate inventory QR' });
  }
});

router.get('/label/:variantId', async (req, res) => {
  try {
    const { variantId } = variantIdParamSchema.parse(req.params);
    const { quantity } = singleLabelQuerySchema.parse(req.query);

    const variant = await loadVariantById(variantId);
    if (!variant) {
      return res.status(404).json({ error: 'Variant not found' });
    }

    const qrCodeDataUrl = await generateOrderQRCode(`${QR_PREFIX}${variant.sku}`);
    const labels: PriceLabelItem[] = [
      {
        productName: variant.product?.name || 'Product',
        variantName: variant.name || '',
        sku: variant.sku,
        priceCents: variant.price,
        qrCodeDataUrl,
        quantity,
      },
    ];

    const pdfBuffer = await buildPriceLabelsPdf(labels);
    const stored = await storePdf(pdfBuffer, `inventory-label-${variant.sku}`);

    res.json({
      pdfUrl: stored.url,
      storage: stored.storage,
      labelCount: quantity,
      variantCount: 1,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }

    console.error('Failed to generate inventory label:', error);
    res.status(500).json({ error: 'Failed to generate inventory label' });
  }
});

router.post('/labels', async (req, res) => {
  try {
    const payload = batchLabelsSchema.parse(req.body);
    const quantityMap = new Map<string, number>();

    if (payload.variantIds) {
      for (const variantId of payload.variantIds) {
        const current = quantityMap.get(variantId) || 0;
        quantityMap.set(variantId, current + 1);
      }
    }

    if (payload.labels) {
      for (const label of payload.labels) {
        const current = quantityMap.get(label.variantId) || 0;
        quantityMap.set(label.variantId, current + (label.quantity || 1));
      }
    }

    const variantIds = Array.from(quantityMap.keys());
    if (variantIds.length === 0) {
      return res.status(400).json({ error: 'No variants provided' });
    }

    const variants = await prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: inventoryInclude,
    });

    const variantMap = new Map(variants.map((variant) => [variant.id, variant]));
    const missingIds = variantIds.filter((id) => !variantMap.has(id));
    if (missingIds.length > 0) {
      return res.status(404).json({
        error: `Missing variants: ${missingIds.join(', ')}`,
      });
    }

    const labelItems: PriceLabelItem[] = await Promise.all(
      variantIds.map(async (variantId) => {
        const variant = variantMap.get(variantId)!;
        const qrCodeDataUrl = await generateOrderQRCode(`${QR_PREFIX}${variant.sku}`);
        return {
          productName: variant.product?.name || 'Product',
          variantName: variant.name || '',
          sku: variant.sku,
          priceCents: variant.price,
          qrCodeDataUrl,
          quantity: quantityMap.get(variantId) || 1,
        };
      })
    );

    const labelCount = labelItems.reduce((sum, item) => sum + item.quantity, 0);
    const pdfBuffer = await buildPriceLabelsPdf(labelItems);
    const stored = await storePdf(pdfBuffer, 'inventory-labels-batch');

    res.json({
      pdfUrl: stored.url,
      storage: stored.storage,
      labelCount,
      variantCount: labelItems.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }

    console.error('Failed to generate inventory labels batch:', error);
    res.status(500).json({ error: 'Failed to generate inventory labels batch' });
  }
});

// Print labels via print agent (for mobile/remote printing)
router.post('/labels/print', async (req, res) => {
  try {
    const payload = batchLabelsSchema.parse(req.body);
    const quantityMap = new Map<string, number>();

    if (payload.variantIds) {
      for (const variantId of payload.variantIds) {
        const current = quantityMap.get(variantId) || 0;
        quantityMap.set(variantId, current + 1);
      }
    }

    if (payload.labels) {
      for (const label of payload.labels) {
        const current = quantityMap.get(label.variantId) || 0;
        quantityMap.set(label.variantId, current + (label.quantity || 1));
      }
    }

    const variantIds = Array.from(quantityMap.keys());
    if (variantIds.length === 0) {
      return res.status(400).json({ error: 'No variants provided' });
    }

    const variants = await prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: inventoryInclude,
    });

    const variantMap = new Map(variants.map((variant) => [variant.id, variant]));
    const missingIds = variantIds.filter((id) => !variantMap.has(id));
    if (missingIds.length > 0) {
      return res.status(404).json({
        error: `Missing variants: ${missingIds.join(', ')}`,
      });
    }

    const labelItems: PriceLabelItem[] = await Promise.all(
      variantIds.map(async (variantId) => {
        const variant = variantMap.get(variantId)!;
        const qrCodeDataUrl = await generateOrderQRCode(`${QR_PREFIX}${variant.sku}`);
        return {
          productName: variant.product?.name || 'Product',
          variantName: variant.name || '',
          sku: variant.sku,
          priceCents: variant.price,
          qrCodeDataUrl,
          quantity: quantityMap.get(variantId) || 1,
        };
      })
    );

    const labelCount = labelItems.reduce((sum, item) => sum + item.quantity, 0);
    const pdfBuffer = await buildPriceLabelsPdf(labelItems);

    // Queue print job via print agent
    const result = await printService.queuePrintJob({
      type: PrintJobType.LABEL,
      order: {
        pdfBase64: pdfBuffer.toString('base64'),
        labelCount,
        variantCount: labelItems.length,
        items: labelItems.map((item) => ({
          productName: item.productName,
          sku: item.sku,
          quantity: item.quantity,
        })),
      } as any,
      template: 'price-label-v1',
      priority: 5,
    });

    res.json({
      ...result,
      labelCount,
      variantCount: labelItems.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }

    console.error('Failed to queue label print job:', error);
    res.status(500).json({ error: 'Failed to queue label print job' });
  }
});

router.patch('/:variantId', async (req, res) => {
  try {
    const { variantId } = variantIdParamSchema.parse(req.params);
    const payload = adjustBodySchema.parse(req.body);

    const variant = await loadVariantById(variantId);
    if (!variant) {
      return res.status(404).json({ error: 'Variant not found' });
    }

    const currentStock = variant.stockLevel ?? 0;
    const requestedStock = payload.stockLevel ?? currentStock + (payload.delta ?? 0);
    const nextStock = Math.max(0, requestedStock);

    const updatedVariant = await prisma.productVariant.update({
      where: { id: variantId },
      data: {
        stockLevel: nextStock,
        trackInventory: true,
      },
      include: inventoryInclude,
    });

    res.json(mapInventoryItem(updatedVariant));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }

    console.error('Failed to adjust inventory:', error);
    res.status(500).json({ error: 'Failed to adjust inventory' });
  }
});

export default router;

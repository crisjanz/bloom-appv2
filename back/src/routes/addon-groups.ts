import { Router } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';

const router = Router();

const PRODUCT_SUMMARY_SELECT = {
  id: true,
  name: true,
  productType: true,
  isActive: true,
  isTaxable: true,
  reportingCategoryId: true,
  images: true,
  variants: {
    select: {
      id: true,
      name: true,
      price: true,
      priceDifference: true,
      isDefault: true,
    },
  },
} as const;

type ProductSummary = Prisma.ProductGetPayload<{ select: typeof PRODUCT_SUMMARY_SELECT }>;

type AddOnGroupWithRelations = Prisma.AddOnGroupGetPayload<{
  include: {
    products: {
      include: {
        product: { select: typeof PRODUCT_SUMMARY_SELECT };
      };
    };
    addOns: true;
  };
}>;

type AddOnGroupWithLinksOnly = Prisma.AddOnGroupGetPayload<{
  include: {
    products: true;
    addOns: true;
  };
}>;

const isTruthyString = (value: unknown) =>
  typeof value === 'string' && ['1', 'true', 'yes'].includes(value.toLowerCase());

const serializeProduct = (product: ProductSummary | null) => {
  if (!product) {
    return null;
  }

  const defaultVariant = product.variants?.find((variant) => variant.isDefault) ?? product.variants?.[0];
  const price = typeof defaultVariant?.price === 'number'
    ? defaultVariant.price / 100
    : null;

  const variantSummaries = (product.variants ?? []).map((variant) => {
    const rawPriceCents = typeof variant.price === 'number' ? variant.price : null;
    const rawDiffCents = typeof variant.priceDifference === 'number' ? variant.priceDifference : null;
    const calculatedPrice = typeof rawPriceCents === 'number'
      ? rawPriceCents / 100
      : rawDiffCents !== null
        ? (price ?? 0) + rawDiffCents / 100
        : price ?? 0;

    return {
      id: variant.id,
      name: (variant as any).name ?? '',
      isDefault: Boolean((variant as any).isDefault ?? false),
      price: typeof rawPriceCents === 'number' ? rawPriceCents / 100 : null,
      priceDifference: typeof rawDiffCents === 'number' ? rawDiffCents / 100 : null,
      calculatedPrice,
    };
  });

  return {
    id: product.id,
    name: product.name,
    productType: product.productType,
    isActive: product.isActive,
    isTaxable: Boolean(product.isTaxable ?? true),
    reportingCategoryId: product.reportingCategoryId ?? null,
    price,
    variants: variantSummaries,
    images: Array.isArray(product.images) ? product.images : [],
    thumbnail: Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : null,
  };
};

const collectAddonProductMap = async (groups: Array<AddOnGroupWithRelations | AddOnGroupWithLinksOnly>) => {
  const addonIds = new Set<string>();

  for (const group of groups) {
    for (const link of group.addOns) {
      if (link.addonProductId) {
        addonIds.add(link.addonProductId);
      }
    }
  }

  if (addonIds.size === 0) {
    return new Map<string, ProductSummary>();
  }

  const products = await prisma.product.findMany({
    where: { id: { in: Array.from(addonIds) } },
    select: PRODUCT_SUMMARY_SELECT,
  });

  return new Map(products.map((product) => [product.id, product]));
};

const serializeGroup = (
  group: AddOnGroupWithRelations | AddOnGroupWithLinksOnly,
  addonMap: Map<string, ProductSummary>,
  includeDetails: boolean
) => {
  const base = {
    id: group.id,
    name: group.name,
    isDefault: group.isDefault,
    productCount: group.products.length,
    addOnCount: group.addOns.length,
  };

  if (!includeDetails) {
    return base;
  }

  const detailedProducts = group.products.map((assignment: any) => ({
    assignmentId: assignment.id,
    productId: assignment.productId,
    product: assignment.product ? serializeProduct(assignment.product) : null,
  }));

  const detailedAddOns = group.addOns.map((assignment) => {
    const product = addonMap.get(assignment.addonProductId) ?? null;
    return {
      assignmentId: assignment.id,
      productId: assignment.addonProductId,
      product: serializeProduct(product),
    };
  });

  return {
    ...base,
    products: detailedProducts,
    addOns: detailedAddOns,
  };
};

const loadGroupPayload = async (groupId: string, includeDetails: boolean) => {
  const group = await prisma.addOnGroup.findUnique({
    where: { id: groupId },
    include: {
      products: includeDetails
        ? {
            include: {
              product: { select: PRODUCT_SUMMARY_SELECT },
            },
          }
        : true,
      addOns: true,
    },
  });

  if (!group) {
    return null;
  }

  const addonMap = includeDetails ? await collectAddonProductMap([group]) : new Map();
  return serializeGroup(group as AddOnGroupWithRelations, addonMap, includeDetails);
};

router.get('/', async (req, res) => {
  const includeDetails = isTruthyString(req.query.includeProducts) || isTruthyString(req.query.include);

  try {
    const groups = await prisma.addOnGroup.findMany({
      orderBy: { name: 'asc' },
      include: {
        products: includeDetails
          ? {
              include: {
                product: { select: PRODUCT_SUMMARY_SELECT },
              },
            }
          : true,
        addOns: true,
      },
    });

    const addonMap = includeDetails ? await collectAddonProductMap(groups) : new Map();
    const payload = groups.map((group) =>
      serializeGroup(group as AddOnGroupWithRelations, addonMap, includeDetails)
    );

    res.json(payload);
  } catch (error) {
    console.error('Failed to load add-on groups:', error);
    res.status(500).json({ error: 'Failed to load add-on groups' });
  }
});

router.get('/options', async (_req, res) => {
  try {
    const [mainProducts, addonProducts] = await Promise.all([
      prisma.product.findMany({
        where: { productType: 'MAIN' },
        select: PRODUCT_SUMMARY_SELECT,
        orderBy: { name: 'asc' },
      }),
      prisma.product.findMany({
        where: { productType: 'ADDON' },
        select: PRODUCT_SUMMARY_SELECT,
        orderBy: { name: 'asc' },
      }),
    ]);

    res.json({
      mainProducts: mainProducts.map((product) => serializeProduct(product)),
      addonProducts: addonProducts.map((product) => serializeProduct(product)),
    });
  } catch (error) {
    console.error('Failed to load add-on options:', error);
    res.status(500).json({ error: 'Failed to load add-on options' });
  }
});

router.get('/by-product/:productId', async (req, res) => {
  const { productId } = req.params;

  try {
    // Get explicitly assigned groups
    const assignments = await prisma.productAddOnGroup.findMany({
      where: { productId },
      select: { groupId: true },
    });

    const assignedGroupIds = assignments.map((a) => a.groupId);

    // Get default groups (available to all products)
    const defaultGroups = await prisma.addOnGroup.findMany({
      where: { isDefault: true },
      select: { id: true },
    });

    const defaultGroupIds = defaultGroups.map((g) => g.id);

    // Merge and deduplicate
    const groupIds = Array.from(new Set([...assignedGroupIds, ...defaultGroupIds]));

    if (groupIds.length === 0) {
      return res.json([]);
    }

    const groups = await Promise.all(
      groupIds.map((groupId) => loadGroupPayload(groupId, true))
    );

    res.json(groups.filter(Boolean));
  } catch (error) {
    console.error(`Failed to load add-on groups for product ${productId}:`, error);
    res.status(500).json({ error: 'Failed to load add-on groups for product' });
  }
});

router.get('/:id', async (req, res) => {
  const includeDetails = isTruthyString(req.query.includeProducts) || isTruthyString(req.query.include);

  try {
    const payload = await loadGroupPayload(req.params.id, includeDetails);
    if (!payload) {
      return res.status(404).json({ error: 'Add-on group not found' });
    }

    res.json(payload);
  } catch (error) {
    console.error(`Failed to load add-on group ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to load add-on group' });
  }
});

router.post('/', async (req, res) => {
  const { name, isDefault, productIds, addonProductIds } = req.body ?? {};
  const trimmedName = typeof name === 'string' ? name.trim() : '';

  if (!trimmedName) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const mainProductIds = Array.isArray(productIds)
    ? Array.from(new Set(productIds.filter((id) => typeof id === 'string' && id.trim().length > 0)))
    : [];
  const addonIds = Array.isArray(addonProductIds)
    ? Array.from(new Set(addonProductIds.filter((id) => typeof id === 'string' && id.trim().length > 0)))
    : [];

  try {
    if (mainProductIds.length > 0) {
      const mainProducts = await prisma.product.findMany({
        where: { id: { in: mainProductIds } },
        select: { id: true, productType: true },
      });

      const foundIds = new Set(mainProducts.map((product) => product.id));
      const missing = mainProductIds.filter((id) => !foundIds.has(id));
      if (missing.length > 0) {
        return res.status(400).json({ error: `Products not found: ${missing.join(', ')}` });
      }

      const invalid = mainProducts.filter((product) => product.productType !== 'MAIN');
      if (invalid.length > 0) {
        return res.status(400).json({
          error: `Only main products can be assigned to groups. Invalid: ${invalid
            .map((product) => product.id)
            .join(', ')}`,
        });
      }
    }

    if (addonIds.length > 0) {
      const addonProducts = await prisma.product.findMany({
        where: { id: { in: addonIds } },
        select: { id: true, productType: true },
      });

      const foundAddonIds = new Set(addonProducts.map((product) => product.id));
      const missingAddons = addonIds.filter((id) => !foundAddonIds.has(id));
      if (missingAddons.length > 0) {
        return res.status(400).json({ error: `Add-on products not found: ${missingAddons.join(', ')}` });
      }

      const invalidAddons = addonProducts.filter((product) => product.productType !== 'ADDON');
      if (invalidAddons.length > 0) {
        return res.status(400).json({
          error: `Only add-on products can be attached. Invalid: ${invalidAddons
            .map((product) => product.id)
            .join(', ')}`,
        });
      }
    }

    const group = await prisma.$transaction(async (tx) => {
      const created = await tx.addOnGroup.create({
        data: {
          name: trimmedName,
          isDefault: Boolean(isDefault),
        },
      });

      if (mainProductIds.length > 0) {
        await tx.productAddOnGroup.createMany({
          data: mainProductIds.map((productId) => ({
            productId,
            groupId: created.id,
          })),
          skipDuplicates: true,
        });
      }

      if (addonIds.length > 0) {
        await tx.addOnProduct.createMany({
          data: addonIds.map((addonProductId) => ({
            addonProductId,
            groupId: created.id,
          })),
          skipDuplicates: true,
        });
      }

      return created;
    });

    const payload = await loadGroupPayload(group.id, true);
    res.status(201).json(payload);
  } catch (error) {
    console.error('Failed to create add-on group:', error);
    res.status(500).json({ error: 'Failed to create add-on group' });
  }
});

router.put('/:id', async (req, res) => {
  const { name, isDefault } = req.body ?? {};
  const trimmedName = typeof name === 'string' ? name.trim() : '';

  if (!trimmedName) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    const updated = await prisma.addOnGroup.update({
      where: { id: req.params.id },
      data: {
        name: trimmedName,
        isDefault: typeof isDefault === 'boolean' ? isDefault : undefined,
      },
    });

    const payload = await loadGroupPayload(updated.id, true);
    res.json(payload);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Add-on group not found' });
    }

    console.error(`Failed to update add-on group ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to update add-on group' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const assignmentCount = await prisma.productAddOnGroup.count({
      where: { groupId: req.params.id },
    });

    if (assignmentCount > 0) {
      return res.status(400).json({ error: 'Remove product assignments before deleting this group' });
    }

    await prisma.addOnProduct.deleteMany({ where: { groupId: req.params.id } });
    const deleted = await prisma.addOnGroup.delete({ where: { id: req.params.id } });

    res.json({ success: true, id: deleted.id });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Add-on group not found' });
    }

    console.error(`Failed to delete add-on group ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to delete add-on group' });
  }
});

router.post('/:id/products', async (req, res) => {
  const { productIds } = req.body ?? {};

  if (!Array.isArray(productIds) || productIds.length === 0) {
    return res.status(400).json({ error: 'productIds array is required' });
  }

  const uniqueIds = Array.from(new Set(productIds.filter((id) => typeof id === 'string' && id.trim().length > 0)));
  if (uniqueIds.length === 0) {
    return res.status(400).json({ error: 'No valid productIds provided' });
  }

  try {
    const groupExists = await prisma.addOnGroup.count({ where: { id: req.params.id } });
    if (!groupExists) {
      return res.status(404).json({ error: 'Add-on group not found' });
    }

    const products = await prisma.product.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, productType: true },
    });

    const foundIds = new Set(products.map((product) => product.id));
    const missing = uniqueIds.filter((id) => !foundIds.has(id));
    if (missing.length > 0) {
      return res.status(400).json({ error: `Products not found: ${missing.join(', ')}` });
    }

    const invalid = products.filter((product) => product.productType !== 'MAIN');
    if (invalid.length > 0) {
      return res.status(400).json({
        error: `Only main products can be assigned. Invalid: ${invalid.map((product) => product.id).join(', ')}`,
      });
    }

    await prisma.$transaction(async (tx) => {
      const existing = await tx.productAddOnGroup.findMany({
        where: {
          groupId: req.params.id,
          productId: { in: uniqueIds },
        },
        select: { productId: true },
      });

      const existingIds = new Set(existing.map((item) => item.productId));
      const toCreate = uniqueIds.filter((id) => !existingIds.has(id));

      if (toCreate.length > 0) {
        await tx.productAddOnGroup.createMany({
          data: toCreate.map((productId) => ({
            groupId: req.params.id,
            productId,
          })),
          skipDuplicates: true,
        });
      }
    });

    const payload = await loadGroupPayload(req.params.id, true);
    res.json(payload);
  } catch (error) {
    console.error(`Failed to assign products to add-on group ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to assign products to group' });
  }
});

router.delete('/:id/products/:productId', async (req, res) => {
  try {
    await prisma.productAddOnGroup.deleteMany({
      where: {
        groupId: req.params.id,
        productId: req.params.productId,
      },
    });

    const payload = await loadGroupPayload(req.params.id, true);
    if (!payload) {
      return res.status(404).json({ error: 'Add-on group not found' });
    }

    res.json(payload);
  } catch (error) {
    console.error(
      `Failed to remove product ${req.params.productId} from add-on group ${req.params.id}:`,
      error
    );
    res.status(500).json({ error: 'Failed to remove product from group' });
  }
});

router.post('/:id/addons', async (req, res) => {
  const { addonProductIds } = req.body ?? {};

  if (!Array.isArray(addonProductIds) || addonProductIds.length === 0) {
    return res.status(400).json({ error: 'addonProductIds array is required' });
  }

  const uniqueIds = Array.from(
    new Set(addonProductIds.filter((id) => typeof id === 'string' && id.trim().length > 0))
  );
  if (uniqueIds.length === 0) {
    return res.status(400).json({ error: 'No valid addonProductIds provided' });
  }

  try {
    const groupExists = await prisma.addOnGroup.count({ where: { id: req.params.id } });
    if (!groupExists) {
      return res.status(404).json({ error: 'Add-on group not found' });
    }

    const addons = await prisma.product.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, productType: true },
    });

    const foundIds = new Set(addons.map((product) => product.id));
    const missing = uniqueIds.filter((id) => !foundIds.has(id));
    if (missing.length > 0) {
      return res.status(400).json({ error: `Add-on products not found: ${missing.join(', ')}` });
    }

    const invalid = addons.filter((product) => product.productType !== 'ADDON');
    if (invalid.length > 0) {
      return res.status(400).json({
        error: `Only add-on products can be attached. Invalid: ${invalid
          .map((product) => product.id)
          .join(', ')}`,
      });
    }

    await prisma.$transaction(async (tx) => {
      const existing = await tx.addOnProduct.findMany({
        where: {
          groupId: req.params.id,
          addonProductId: { in: uniqueIds },
        },
        select: { addonProductId: true },
      });

      const existingIds = new Set(existing.map((item) => item.addonProductId));
      const toCreate = uniqueIds.filter((id) => !existingIds.has(id));

      if (toCreate.length > 0) {
        await tx.addOnProduct.createMany({
          data: toCreate.map((addonProductId) => ({
            groupId: req.params.id,
            addonProductId,
          })),
          skipDuplicates: true,
        });
      }
    });

    const payload = await loadGroupPayload(req.params.id, true);
    res.json(payload);
  } catch (error) {
    console.error(`Failed to attach add-ons to add-on group ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to attach add-ons to group' });
  }
});

router.delete('/:id/addons/:addonProductId', async (req, res) => {
  try {
    await prisma.addOnProduct.deleteMany({
      where: {
        groupId: req.params.id,
        addonProductId: req.params.addonProductId,
      },
    });

    const payload = await loadGroupPayload(req.params.id, true);
    if (!payload) {
      return res.status(404).json({ error: 'Add-on group not found' });
    }

    res.json(payload);
  } catch (error) {
    console.error(
      `Failed to remove add-on ${req.params.addonProductId} from add-on group ${req.params.id}:`,
      error
    );
    res.status(500).json({ error: 'Failed to remove add-on from group' });
  }
});

export default router;

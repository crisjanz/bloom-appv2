import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// Get all discounts
router.get('/', async (req, res) => {
  try {
    const discounts = await prisma.discount.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        usages: {
          take: 5,
          orderBy: { usedAt: 'desc' }
        }
      }
    });
    res.json(discounts);
  } catch (error) {
    console.error('Failed to fetch discounts:', error);
    res.status(500).json({ error: 'Failed to fetch discounts' });
  }
});

// Get gift QR discounts (latest first)
router.get('/qr', async (req, res) => {
  try {
    const limitRaw = parseInt(req.query.limit?.toString() || '100', 10);
    const limit = Math.min(Math.max(limitRaw || 100, 1), 200);

    const discounts = await prisma.discount.findMany({
      where: {
        name: 'Gift QR',
        triggerType: 'COUPON_CODE'
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    res.json(discounts);
  } catch (error) {
    console.error('Failed to fetch gift QR discounts:', error);
    res.status(500).json({ error: 'Failed to fetch gift QR discounts' });
  }
});

// Get single discount
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const discount = await prisma.discount.findUnique({
      where: { id },
      include: {
        usages: {
          orderBy: { usedAt: 'desc' }
        }
      }
    });

    if (!discount) {
      return res.status(404).json({ error: 'Discount not found' });
    }

    res.json(discount);
  } catch (error) {
    console.error('Failed to fetch discount:', error);
    res.status(500).json({ error: 'Failed to fetch discount' });
  }
});

// Create new discount
router.post('/', async (req, res) => {
  try {
    console.log('📝 Creating discount with data:', JSON.stringify(req.body, null, 2));
    
    const {
      name,
      description,
      code,
      discountType,
      triggerType,
      value,
      applicableProducts,
      applicableCategories,
      minimumQuantity,
      maximumQuantity,
      minimumOrder,
      buyXGetYFree,
      autoApply,
      priority,
      stackable,
      usageLimit,
      perCustomerLimit,
      startDate,
      endDate,
      posOnly,
      webOnly,
      enabled
    } = req.body;

    // Validation
    if (!name) {
      return res.status(400).json({ 
        error: 'Discount name is required' 
      });
    }

    if (!discountType) {
      return res.status(400).json({ 
        error: 'Discount type is required' 
      });
    }

    if (!triggerType) {
      return res.status(400).json({ 
        error: 'Trigger type is required' 
      });
    }

    if (triggerType === 'COUPON_CODE' && !code) {
      return res.status(400).json({ 
        error: 'Coupon code is required for coupon-based discounts' 
      });
    }

    if (discountType !== 'FREE_SHIPPING' && (value === undefined || value === null || value === '')) {
      return res.status(400).json({ 
        error: 'Value is required for this discount type' 
      });
    }

    // Validate discount type enum
    const validDiscountTypes = ['FIXED_AMOUNT', 'PERCENTAGE', 'FREE_SHIPPING', 'SALE_PRICE', 'BUY_X_GET_Y_FREE'];
    if (!validDiscountTypes.includes(discountType)) {
      return res.status(400).json({ 
        error: 'Invalid discount type' 
      });
    }

    // Validate trigger type enum
    const validTriggerTypes = ['COUPON_CODE', 'AUTOMATIC_PRODUCT', 'AUTOMATIC_CATEGORY'];
    if (!validTriggerTypes.includes(triggerType)) {
      return res.status(400).json({ 
        error: 'Invalid trigger type' 
      });
    }

    // Check for duplicate codes
    if (code) {
      const existingDiscount = await prisma.discount.findFirst({
        where: { 
          code,
          enabled: true
        }
      });
      
      if (existingDiscount) {
        return res.status(400).json({ 
          error: 'A discount with this code already exists' 
        });
      }
    }

    const discount = await prisma.discount.create({
      data: {
        name,
        description,
        code: code || null,
        discountType,
        triggerType,
        value: value || 0,
        applicableProducts: applicableProducts || [],
        applicableCategories: applicableCategories || [],
        minimumQuantity,
        maximumQuantity,
        minimumOrder,
        buyXGetYFree,
        autoApply: autoApply || false,
        priority: priority || 1,
        stackable: stackable || false,
        usageLimit,
        perCustomerLimit,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        posOnly: posOnly || false,
        webOnly: webOnly || false,
        enabled: enabled !== undefined ? enabled : true
      }
    });

    console.log('✅ Discount created:', discount.name);
    res.status(201).json(discount);
  } catch (error: any) {
    console.error('Failed to create discount:', error);
    
    // Provide more specific error messages
    if (error?.code === 'P2002') {
      // Prisma unique constraint violation
      return res.status(400).json({ 
        error: 'A discount with this code already exists' 
      });
    }
    
    if (error?.message) {
      return res.status(500).json({ 
        error: `Database error: ${error.message}` 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to create discount. Please check your input and try again.' 
    });
  }
});

// Update discount
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if discount exists
    const existingDiscount = await prisma.discount.findUnique({
      where: { id }
    });

    if (!existingDiscount) {
      return res.status(404).json({ error: 'Discount not found' });
    }

    // Check for duplicate codes if code is being updated
    if (updateData.code && updateData.code !== existingDiscount.code) {
      const duplicateDiscount = await prisma.discount.findFirst({
        where: { 
          code: updateData.code,
          enabled: true,
          id: { not: id }
        }
      });
      
      if (duplicateDiscount) {
        return res.status(400).json({ 
          error: 'A discount with this code already exists' 
        });
      }
    }

    // Clean the update data to match Prisma schema
    const {
      name,
      description,
      code,
      discountType,
      triggerType,
      value,
      applicableProducts,
      applicableCategories,
      minimumQuantity,
      maximumQuantity,
      minimumOrder,
      buyXGetYFree,
      autoApply,
      priority,
      stackable,
      usageLimit,
      perCustomerLimit,
      startDate,
      endDate,
      posOnly,
      webOnly,
      enabled,
      // Remove these fields that don't exist in schema
      buyQuantity,
      getQuantity,
      freeType,
      ...otherFields
    } = updateData;

    const updatedDiscount = await prisma.discount.update({
      where: { id },
      data: {
        name,
        description,
        code: code || null,
        discountType,
        triggerType,
        value: value || 0,
        applicableProducts: applicableProducts || [],
        applicableCategories: applicableCategories || [],
        minimumQuantity,
        maximumQuantity,
        minimumOrder,
        buyXGetYFree,
        autoApply: autoApply || false,
        priority: priority || 1,
        stackable: stackable || false,
        usageLimit,
        perCustomerLimit,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        posOnly: posOnly || false,
        webOnly: webOnly || false,
        enabled: enabled !== undefined ? enabled : true,
        updatedAt: new Date()
      }
    });

    console.log('✅ Discount updated:', updatedDiscount.name);
    res.json(updatedDiscount);
  } catch (error: any) {
    console.error('Failed to update discount:', error);
    
    // Provide more specific error messages
    if (error?.code === 'P2002') {
      // Prisma unique constraint violation
      return res.status(400).json({ 
        error: 'A discount with this code already exists' 
      });
    }
    
    if (error?.message) {
      return res.status(500).json({ 
        error: `Database error: ${error.message}` 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to update discount. Please check your input and try again.' 
    });
  }
});

// Patch discount (for status changes)
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { enabled } = req.body;

    const updatedDiscount = await prisma.discount.update({
      where: { id },
      data: {
        enabled,
        updatedAt: new Date()
      }
    });

    console.log(`✅ Discount ${enabled ? 'enabled' : 'disabled'}:`, updatedDiscount.name);
    res.json(updatedDiscount);
  } catch (error) {
    console.error('Failed to update discount status:', error);
    res.status(500).json({ error: 'Failed to update discount status' });
  }
});

// Delete discount
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if discount exists
    const existingDiscount = await prisma.discount.findUnique({
      where: { id }
    });

    if (!existingDiscount) {
      return res.status(404).json({ error: 'Discount not found' });
    }

    await prisma.discount.delete({
      where: { id }
    });

    console.log('✅ Discount deleted:', existingDiscount.name);
    res.json({ message: 'Discount deleted successfully' });
  } catch (error) {
    console.error('Failed to delete discount:', error);
    res.status(500).json({ error: 'Failed to delete discount' });
  }
});

// Validate discount code (for checkout)
router.post('/validate', async (req, res) => {
  try {
    const { code, cartItems, customerId } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Discount code is required' });
    }

    const discount = await prisma.discount.findFirst({
      where: {
        code,
        enabled: true,
        triggerType: 'COUPON_CODE'
      }
    });

    if (!discount) {
      return res.status(404).json({ error: 'Invalid discount code' });
    }

    // Check date validity
    const now = new Date();
    if (discount.startDate && discount.startDate > now) {
      return res.status(400).json({ error: 'Discount is not yet active' });
    }
    if (discount.endDate && discount.endDate < now) {
      return res.status(400).json({ error: 'Discount has expired' });
    }

    // Check usage limits
    if (discount.usageLimit && discount.usageCount >= discount.usageLimit) {
      return res.status(400).json({ error: 'Discount usage limit reached' });
    }

    // Check per-customer limit
    if (discount.perCustomerLimit && customerId) {
      const customerUsage = await prisma.discountUsage.count({
        where: {
          discountId: discount.id,
          customerId
        }
      });

      if (customerUsage >= discount.perCustomerLimit) {
        return res.status(400).json({ error: 'You have reached the usage limit for this discount' });
      }
    }

    // Calculate cart total
    const cartTotal = cartItems ? cartItems.reduce((total: number, item: any) => {
      return total + (item.price * item.quantity);
    }, 0) : 0;

    // Check minimum order requirement
    if (discount.minimumOrder && cartTotal < discount.minimumOrder) {
      return res.status(400).json({ 
        error: `Minimum order of $${discount.minimumOrder.toFixed(2)} required` 
      });
    }

    // Check applicable products/categories
    if (discount.applicableProducts.length > 0) {
      const hasApplicableProducts = cartItems.some((item: any) => 
        discount.applicableProducts.includes(item.id)
      );
      
      if (!hasApplicableProducts) {
        return res.status(400).json({ 
          error: 'This discount does not apply to items in your cart' 
        });
      }
    }

    if (discount.applicableCategories.length > 0) {
      const hasApplicableCategories = cartItems.some((item: any) => {
        const itemCategoryIds = item.categoryIds || (item.categoryId ? [item.categoryId] : []);
        return itemCategoryIds.some((catId: string) => discount.applicableCategories.includes(catId));
      });

      if (!hasApplicableCategories) {
        return res.status(400).json({
          error: 'This discount does not apply to items in your cart'
        });
      }
    }

    // Calculate discount amount
    let discountAmount = 0;
    
    switch (discount.discountType) {
      case 'FIXED_AMOUNT':
        discountAmount = Math.min(discount.value, cartTotal);
        break;
      case 'PERCENTAGE':
        discountAmount = (cartTotal * discount.value) / 100;
        break;
      case 'FREE_SHIPPING':
        discountAmount = 0; // Handled separately in delivery calculation
        break;
      case 'SALE_PRICE':
        // For sale price, calculate difference from regular price
        discountAmount = 0; // This would need product-specific logic
        break;
      case 'BUY_X_GET_Y_FREE':
        // TODO: Implement buy X get Y logic
        discountAmount = 0;
        break;
      default:
        discountAmount = 0;
    }

    res.json({
      valid: true,
      discount: {
        id: discount.id,
        name: discount.name,
        discountType: discount.discountType,
        value: discount.value,
        minimumOrder: discount.minimumOrder
      },
      discountAmount
    });
  } catch (error) {
    console.error('Failed to validate discount:', error);
    res.status(500).json({ error: 'Failed to validate discount' });
  }
});

// Auto-apply discounts based on cart contents
router.post('/auto-apply', async (req, res) => {
  try {
    console.log('🛒 Auto-apply request received:', JSON.stringify(req.body, null, 2));
    const { cartItems, customerId } = req.body;

    if (!cartItems || cartItems.length === 0) {
      console.log('❌ No cart items provided');
      return res.json({ discounts: [] });
    }

    // Find all automatic discounts that are enabled and active
    const now = new Date();
    const automaticDiscounts = await prisma.discount.findMany({
      where: {
        enabled: true,
        triggerType: { in: ['AUTOMATIC_PRODUCT', 'AUTOMATIC_CATEGORY'] },
        OR: [
          { startDate: null },
          { startDate: { lte: now } }
        ],
        AND: [
          {
            OR: [
              { endDate: null },
              { endDate: { gte: now } }
            ]
          }
        ]
      }
    });

    console.log('🎯 Found automatic discounts:', automaticDiscounts.length);
    console.log('📋 Automatic discounts details:', automaticDiscounts.map(d => ({
      id: d.id,
      name: d.name,
      triggerType: d.triggerType,
      applicableProducts: d.applicableProducts,
      applicableCategories: d.applicableCategories,
      discountType: d.discountType,
      value: d.value
    })));

    const applicableDiscounts = [];

    for (const discount of automaticDiscounts) {
      console.log(`\n🔍 Checking discount: ${discount.name} (${discount.triggerType})`);
      let isApplicable = false;

      // Check if discount applies to current cart
      if (discount.triggerType === 'AUTOMATIC_PRODUCT' && discount.applicableProducts.length > 0) {
        console.log('🎯 Checking AUTOMATIC_PRODUCT discount');
        console.log('📦 Applicable products:', discount.applicableProducts);
        console.log('🛒 Cart product IDs:', cartItems.map((item: any) => item.id));
        
        // Check if any cart items match the applicable products
        isApplicable = cartItems.some((item: any) => 
          discount.applicableProducts.includes(item.id)
        );
        console.log('✅ Product match found:', isApplicable);
      } else if (discount.triggerType === 'AUTOMATIC_CATEGORY' && discount.applicableCategories.length > 0) {
        console.log('🎯 Checking AUTOMATIC_CATEGORY discount');
        console.log('📦 Applicable categories:', discount.applicableCategories);
        console.log('🛒 Cart category IDs:', cartItems.map((item: any) => item.categoryIds || [item.categoryId]));

        // Check if any cart items match the applicable categories (supports multi-category)
        isApplicable = cartItems.some((item: any) => {
          const itemCategoryIds = item.categoryIds || (item.categoryId ? [item.categoryId] : []);
          return itemCategoryIds.some((catId: string) => discount.applicableCategories.includes(catId));
        });
        console.log('✅ Category match found:', isApplicable);
      } else if (discount.applicableProducts.length === 0 && discount.applicableCategories.length === 0) {
        console.log('🎯 No restrictions - applies to all products');
        // Apply to all products if no specific restrictions
        isApplicable = true;
      }

      if (isApplicable) {
        // Calculate cart total
        const cartTotal = cartItems.reduce((total: number, item: any) => {
          return total + (item.price * item.quantity);
        }, 0);

        // Check minimum order requirement
        if (discount.minimumOrder && cartTotal < discount.minimumOrder) {
          continue;
        }

        // Check usage limits
        if (discount.usageLimit && discount.usageCount >= discount.usageLimit) {
          continue;
        }

        // Check per-customer limit
        if (discount.perCustomerLimit && customerId) {
          const customerUsage = await prisma.discountUsage.count({
            where: {
              discountId: discount.id,
              customerId
            }
          });

          if (customerUsage >= discount.perCustomerLimit) {
            continue;
          }
        }

        // Calculate discount amount
        let discountAmount = 0;
        
        switch (discount.discountType) {
          case 'FIXED_AMOUNT':
            discountAmount = Math.min(discount.value, cartTotal);
            break;
          case 'PERCENTAGE':
            discountAmount = (cartTotal * discount.value) / 100;
            break;
          case 'FREE_SHIPPING':
            discountAmount = 0; // Handled separately
            break;
          default:
            discountAmount = 0;
        }

        // Only add discounts with valid amounts
        if (discountAmount > 0) {
          applicableDiscounts.push({
            id: discount.id,
            name: discount.name,
            discountType: discount.discountType,
            value: discount.value,
            discountAmount: Math.round(discountAmount * 100) / 100 // Round to 2 decimal places
          });
        }
      }
    }

    console.log('✅ Applicable automatic discounts:', applicableDiscounts.length);
    res.json({ discounts: applicableDiscounts });
  } catch (error: any) {
    console.error('Failed to check automatic discounts:', error);
    res.status(500).json({ error: 'Failed to check automatic discounts' });
  }
});

export default router;

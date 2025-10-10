import express from 'express';
import { PrismaClient, OrderStatus } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import multer from 'multer';
import { calculateTax } from '../utils/taxCalculator';

const router = express.Router();
const prisma = new PrismaClient();
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const upload = multer({ storage: multer.memoryStorage() });

// Get all orders with filtering and search
router.get('/list', async (req, res) => {
  try {
    const { status, search, limit = 50, offset = 0 } = req.query;

    // Build where clause for filtering
    const where: any = {};

    // Status filter
    if (status && status !== 'ALL') {
      where.status = status as OrderStatus;
    }

    // Search filter
    if (search) {
      const searchTerm = search as string;
      where.OR = [
        // Search by order number (if it's a number)
        ...(isNaN(Number(searchTerm)) ? [] : [{
          id: {
            equals: searchTerm
          }
        }]),
        // Search by customer name
        {
          customer: {
            OR: [
              {
                firstName: {
                  contains: searchTerm,
                  mode: 'insensitive' as const
                }
              },
              {
                lastName: {
                  contains: searchTerm,
                  mode: 'insensitive' as const
                }
              }
            ]
          }
        },
        // Search by recipient name
        {
          recipient: {
            OR: [
              {
                firstName: {
                  contains: searchTerm,
                  mode: 'insensitive' as const
                }
              },
              {
                lastName: {
                  contains: searchTerm,
                  mode: 'insensitive' as const
                }
              }
            ]
          }
        }
      ];
    }

    // Fetch orders with related data
    const orders = await prisma.order.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        },
        recipient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            company: true,
            phone: true,
            address1: true,
            address2: true,
            city: true,
            province: true,
            postalCode: true,
            country: true
          }
        },
        orderItems: {
          select: {
            id: true,
            customName: true,
            unitPrice: true,
            quantity: true,
            rowTotal: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc' // Most recent first
      },
      take: Number(limit),
      skip: Number(offset)
    });

    // Get total count for pagination
    const totalCount = await prisma.order.count({ where });

    res.json({
      success: true,
      orders,
      pagination: {
        total: totalCount,
        limit: Number(limit),
        offset: Number(offset),
        hasMore: Number(offset) + Number(limit) < totalCount
      }
    });

  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      error: 'Failed to fetch orders',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get single order by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        recipient: true,
        orderItems: true,
        employee: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!order) {
      return res.status(404).json({
        error: 'Order not found'
      });
    }

    res.json({
      success: true,
      order
    });

  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({
      error: 'Failed to fetch order',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/upload-images', upload.array('images'), async (req, res) => {
  try {
    let imageUrls: string[] = [];
    const files = (req as any).files as Express.Multer.File[];
    
    if (files && files.length > 0) {
      for (const file of files) {
        const filePath = `orders/${Date.now()}-${file.originalname}`;
        const { error } = await supabase.storage
          .from('images')
          .upload(filePath, file.buffer, {
            contentType: file.mimetype,
          });

        if (error) {
          console.error('Supabase upload error:', error);
          throw error;
        }

        const { data: publicUrlData } = supabase.storage
          .from('images')
          .getPublicUrl(filePath);
        
        imageUrls.push(publicUrlData.publicUrl);
      }
    }

    res.json({
      success: true,
      imageUrls
    });

  } catch (error) {
    console.error('Error uploading order images:', error);
    res.status(500).json({
      error: 'Failed to upload images',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update order - handles updating both order and underlying database records
router.put('/:id/update', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Start a transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // First, get the current order to access related IDs
      const currentOrder = await tx.order.findUnique({
        where: { id },
        include: {
          customer: true,
          recipient: true
        }
      });

      if (!currentOrder) {
        throw new Error('Order not found');
      }

      let orderUpdateData: any = {};

      // Handle customer updates
      if (updateData.customer) {
        // Update the actual customer record in the database
        await tx.customer.update({
          where: { id: currentOrder.customerId },
          data: {
            firstName: updateData.customer.firstName,
            lastName: updateData.customer.lastName,
            email: updateData.customer.email,
            phone: updateData.customer.phone,
          }
        });
        
        // Note: No need to update order.customerId as it's still the same customer
      }

      // Handle recipient/address updates
      if (updateData.recipient) {
        if (currentOrder.recipientId && updateData.updateDatabase) {
          // Update the existing address record
          await tx.address.update({
            where: { id: currentOrder.recipientId },
            data: {
              firstName: updateData.recipient.firstName,
              lastName: updateData.recipient.lastName,
              company: updateData.recipient.company || '',
              phone: updateData.recipient.phone,
              address1: updateData.recipient.address1,
              address2: updateData.recipient.address2 || '',
              city: updateData.recipient.city,
              province: updateData.recipient.province,
              postalCode: updateData.recipient.postalCode,
              country: updateData.recipient.country || 'CA',
            }
          });
        } else if (!currentOrder.recipientId) {
          // Create new address if none exists
          const newAddress = await tx.address.create({
            data: {
              firstName: updateData.recipient.firstName,
              lastName: updateData.recipient.lastName,
              company: updateData.recipient.company || '',
              phone: updateData.recipient.phone,
              address1: updateData.recipient.address1,
              address2: updateData.recipient.address2 || '',
              city: updateData.recipient.city,
              province: updateData.recipient.province,
              postalCode: updateData.recipient.postalCode,
              country: updateData.recipient.country || 'CA',
              customerId: currentOrder.customerId, // Link to customer
            }
          });
          orderUpdateData.recipientId = newAddress.id;
        }
      }

      // Handle delivery details updates (both flat and nested under 'delivery' section)
      const deliveryData = updateData.delivery || updateData;

      if (deliveryData.deliveryDate !== undefined) {
        orderUpdateData.deliveryDate = deliveryData.deliveryDate ? new Date(deliveryData.deliveryDate) : null;
      }
      if (deliveryData.deliveryTime !== undefined) {
        orderUpdateData.deliveryTime = deliveryData.deliveryTime;
      }
      if (deliveryData.cardMessage !== undefined) {
        orderUpdateData.cardMessage = deliveryData.cardMessage;
      }
      if (deliveryData.specialInstructions !== undefined) {
        orderUpdateData.specialInstructions = deliveryData.specialInstructions;
      }
      if (deliveryData.occasion !== undefined) {
        orderUpdateData.occasion = deliveryData.occasion;
      }
      if (deliveryData.deliveryFee !== undefined) {
        orderUpdateData.deliveryFee = deliveryData.deliveryFee;
      }

      // Handle payment/pricing updates
      if (updateData.discount !== undefined) {
        orderUpdateData.discount = updateData.discount;
      }
      if (updateData.taxBreakdown !== undefined) {
        orderUpdateData.taxBreakdown = updateData.taxBreakdown;
      }
      if (updateData.totalTax !== undefined) {
        orderUpdateData.totalTax = updateData.totalTax;
      }

      // Handle status updates
      if (updateData.status) {
        orderUpdateData.status = updateData.status as OrderStatus;
      }

      // Handle order items updates
      if (updateData.orderItems) {
        // Delete existing order items
        await tx.orderItem.deleteMany({
          where: { orderId: id }
        });

        // Create new order items
        const newOrderItems = updateData.orderItems.map((item: any) => ({
          orderId: id,
          customName: item.customName,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          rowTotal: item.unitPrice * item.quantity
        }));

        await tx.orderItem.createMany({
          data: newOrderItems
        });

        // Recalculate order totals
        const subtotal = newOrderItems.reduce((sum: number, item: any) => sum + item.rowTotal, 0);
        const currentDeliveryFee = orderUpdateData.deliveryFee !== undefined ? orderUpdateData.deliveryFee : currentOrder.deliveryFee;
        const currentDiscount = orderUpdateData.discount !== undefined ? orderUpdateData.discount : currentOrder.discount;
        const currentTotalTax = orderUpdateData.totalTax !== undefined ? orderUpdateData.totalTax : currentOrder.totalTax;
        
        orderUpdateData.paymentAmount = subtotal + currentDeliveryFee - currentDiscount + currentTotalTax;
      }

      // Handle images updates
      if (updateData.images !== undefined) {
        // For now, we'll store images as JSON array in the order
        // You might want to create a separate OrderImage table later
        orderUpdateData.images = updateData.images;
      }

      // Update the order with any changes
      if (Object.keys(orderUpdateData).length > 0) {
        await tx.order.update({
          where: { id },
          data: orderUpdateData
        });
      }

      // Return the updated order with all relations
      return await tx.order.findUnique({
        where: { id },
        include: {
          customer: true,
          recipient: true,
          orderItems: true,
          employee: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });
    });

    res.json({
      success: true,
      order: result,
      message: 'Order updated successfully'
    });

  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({
      error: 'Failed to update order',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create orders after payment confirmation
router.post('/create', async (req, res) => {
  try {
    const { customerId, orders, paymentConfirmed } = req.body;

    if (!customerId || !orders || !Array.isArray(orders)) {
      return res.status(400).json({ 
        error: 'customerId and orders array are required' 
      });
    }

    if (!paymentConfirmed) {
      return res.status(400).json({ 
        error: 'Payment must be confirmed before creating orders' 
      });
    }

    const createdOrders = [];

    for (const orderData of orders) {
      // Create recipient address if delivery
      let recipientId = null;
      if (orderData.orderType === 'DELIVERY') {
        const recipient = await prisma.address.create({
          data: {
            firstName: orderData.recipientFirstName,
            lastName: orderData.recipientLastName,
            company: orderData.recipientCompany || '',
            phone: orderData.recipientPhone,
            address1: orderData.recipientAddress.address1,
            address2: orderData.recipientAddress.address2 || '',
            city: orderData.recipientAddress.city,
            province: orderData.recipientAddress.province,
            postalCode: orderData.recipientAddress.postalCode,
            country: orderData.recipientAddress.country || 'CA',
            customerId: customerId, // Link to customer
          }
        });
        recipientId = recipient.id;
      }

      // Calculate totals
      let subtotal = 0;
      const orderItems = orderData.customProducts.map((product: any) => {
        const unitPrice = Math.round(parseFloat(product.price) * 100);
        const quantity = parseInt(product.qty);
        const rowTotal = unitPrice * quantity;
        subtotal += rowTotal;
        
        return {
          customName: product.description,
          unitPrice,
          quantity,
          rowTotal
        };
      });

      // Calculate taxes using centralized tax rates
      const taxableAmount = orderItems
        .filter((_: any, index: number) => orderData.customProducts[index].tax)
        .reduce((sum: number, item: any) => sum + item.rowTotal, 0);
      
      const taxCalculation = await calculateTax(taxableAmount);

      const totalAmount = subtotal + taxCalculation.totalAmount + Math.round(orderData.deliveryFee * 100);

      // ✅ Fixed: Use proper OrderStatus enum
      const order = await prisma.order.create({
        data: {
          type: orderData.orderType,
          status: OrderStatus.PAID, // ✅ Use enum instead of string
          customerId,
          recipientId,
          cardMessage: orderData.cardMessage || null,
          specialInstructions: orderData.deliveryInstructions || null,
          deliveryDate: orderData.deliveryDate ? new Date(orderData.deliveryDate) : null,
          deliveryTime: orderData.deliveryTime || null,
          deliveryFee: Math.round(orderData.deliveryFee * 100),
          taxBreakdown: taxCalculation.breakdown, // Dynamic tax breakdown
          totalTax: taxCalculation.totalAmount, // Total tax amount
          paymentAmount: totalAmount,
          images: [], // Initialize empty images array
          orderItems: {
            create: orderItems // ✅ This variable exists now
          }
        },
        include: {
          orderItems: true,
          recipient: true,
          customer: true
        }
      });

      createdOrders.push(order);
    }

    res.json({ 
      success: true, 
      orders: createdOrders,
      totalAmount: createdOrders.reduce((sum, order) => sum + order.paymentAmount, 0)
    });

  } catch (error) {
    console.error('Error creating orders:', error);
    res.status(500).json({ 
      error: 'Failed to create orders',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Save orders as draft (separate feature)
router.post('/save-draft', async (req, res) => {
  try {
    const { customerId, orders } = req.body;

    if (!customerId || !orders || !Array.isArray(orders)) {
      return res.status(400).json({ 
        error: 'customerId and orders array are required' 
      });
    }

    const draftOrders = [];

    for (const orderData of orders) {
      // Same logic as above but with DRAFT status
      let recipientId = null;
      if (orderData.orderType === 'DELIVERY') {
        const recipient = await prisma.address.create({
          data: {
            firstName: orderData.recipientFirstName,
            lastName: orderData.recipientLastName,
            company: orderData.recipientCompany || '',
            phone: orderData.recipientPhone,
            address1: orderData.recipientAddress.address1,
            address2: orderData.recipientAddress.address2 || '',
            city: orderData.recipientAddress.city,
            province: orderData.recipientAddress.province,
            postalCode: orderData.recipientAddress.postalCode,
            country: orderData.recipientAddress.country || 'CA',
            customerId: customerId, // Link to customer
          }
        });
        recipientId = recipient.id;
      }

      // Calculate totals (same as above)
      let subtotal = 0;
      const orderItems = orderData.customProducts.map((product: any) => {
        const unitPrice = Math.round(parseFloat(product.price) * 100);
        const quantity = parseInt(product.qty);
        const rowTotal = unitPrice * quantity;
        subtotal += rowTotal;
        
        return {
          customName: product.description,
          unitPrice,
          quantity,
          rowTotal
        };
      });

      // Calculate taxes using centralized tax rates
      const taxableAmount = orderItems
        .filter((_: any, index: number) => orderData.customProducts[index].tax)
        .reduce((sum: number, item: any) => sum + item.rowTotal, 0);
      
      const taxCalculation = await calculateTax(taxableAmount);

      const order = await prisma.order.create({
        data: {
          type: orderData.orderType,
          status: OrderStatus.DRAFT, // ✅ Use enum for DRAFT too
          customerId,
          recipientId,
          cardMessage: orderData.cardMessage || null,
          specialInstructions: orderData.deliveryInstructions || null,
          deliveryDate: orderData.deliveryDate ? new Date(orderData.deliveryDate) : null,
          deliveryTime: orderData.deliveryTime || null,
          deliveryFee: Math.round(orderData.deliveryFee * 100),
          taxBreakdown: taxCalculation.breakdown, // Dynamic tax breakdown
          totalTax: taxCalculation.totalAmount, // Total tax amount
          paymentAmount: 0, // No payment for drafts
          images: [], // Initialize empty images array
          orderItems: {
            create: orderItems
          }
        },
        include: {
          orderItems: true,
          recipient: true,
          customer: true
        }
      });

      draftOrders.push(order);
    }

    res.json({ 
      success: true, 
      drafts: draftOrders 
    });

  } catch (error) {
    console.error('Error saving drafts:', error);
    res.status(500).json({ 
      error: 'Failed to save drafts',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
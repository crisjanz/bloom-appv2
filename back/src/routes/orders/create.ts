import express from 'express';
import { PrismaClient, OrderStatus } from '@prisma/client';
import { calculateTax } from '../../utils/taxCalculator';
import { triggerStatusNotifications } from '../../utils/notificationTriggers';

const router = express.Router();
const prisma = new PrismaClient();

// Create orders after payment confirmation
router.post('/create', async (req, res) => {
  try {
    const { customerId, orders, paymentConfirmed } = req.body;

    console.log('Order creation request:', { customerId, orderCount: orders?.length, paymentConfirmed });

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
      console.log('Creating order for:', orderData.orderType);
      
      // Use existing recipient ID if provided, otherwise skip recipient creation
      // Recipients should be created/managed through the customer API, not here
      let recipientId = orderData.recipientId || null;
      
      if (orderData.orderType === 'DELIVERY' && !recipientId) {
        console.warn('⚠️ Delivery order created without recipientId - recipient should be managed via customer API');
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

      // Create order with DRAFT status first, will be updated to PAID by PT transaction
      const order = await prisma.order.create({
        data: {
          type: orderData.orderType,
          status: OrderStatus.DRAFT, // Start as DRAFT, PT transaction will update to PAID
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
            create: orderItems
          }
        },
        include: {
          orderItems: true,
          recipient: true,
          customer: true
        }
      });

      console.log('Order created:', order.id);
      createdOrders.push(order);
    }

    // Update all orders to PAID status and trigger notifications
    for (const order of createdOrders) {
      try {
        // Update order status to PAID
        const updatedOrder = await prisma.order.update({
          where: { id: order.id },
          data: { 
            status: OrderStatus.PAID,
            updatedAt: new Date()
          },
          include: {
            customer: true,
            recipient: true,
            orderItems: {
              include: {
                product: true
              }
            }
          }
        });

        console.log(`📋 Order #${order.orderNumber} status updated: DRAFT → PAID`);

        // Trigger status notifications
        await triggerStatusNotifications(updatedOrder, 'PAID', 'DRAFT');

      } catch (error) {
        console.error(`❌ Failed to update order ${order.id} to PAID or send notifications:`, error);
        // Continue with other orders even if one fails
      }
    }

    console.log(`Successfully created ${createdOrders.length} orders`);

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

// Save orders as draft
router.post('/save-draft', async (req, res) => {
  try {
    const { customerId, orders } = req.body;

    console.log('Draft order creation request:', { customerId, orderCount: orders?.length });

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

      // Calculate taxes using centralized tax rates for draft
      const taxableAmountDraft = orderItems
        .filter((_: any, index: number) => orderData.customProducts[index].tax)
        .reduce((sum: number, item: any) => sum + item.rowTotal, 0);
      
      const taxCalculationDraft = await calculateTax(taxableAmountDraft);

      const order = await prisma.order.create({
        data: {
          type: orderData.orderType,
          status: OrderStatus.DRAFT,
          customerId,
          recipientId,
          cardMessage: orderData.cardMessage || null,
          specialInstructions: orderData.deliveryInstructions || null,
          deliveryDate: orderData.deliveryDate ? new Date(orderData.deliveryDate) : null,
          deliveryTime: orderData.deliveryTime || null,
          deliveryFee: Math.round(orderData.deliveryFee * 100),
          taxBreakdown: taxCalculationDraft.breakdown, // Dynamic tax breakdown
          totalTax: taxCalculationDraft.totalAmount, // Total tax amount
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

    console.log(`Successfully created ${draftOrders.length} draft orders`);

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
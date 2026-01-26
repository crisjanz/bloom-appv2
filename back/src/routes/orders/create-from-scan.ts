import express from 'express';
import { PrismaClient, OrderStatus, OrderExternalSource } from '@prisma/client';
import { ParsedOrderData, FloranextOrderData } from '../../services/gemini-ocr';
import transactionService from '../../services/transactionService';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * Create order from scanned external order
 * POST /api/orders/create-from-scan
 */
router.post('/create-from-scan', async (req, res) => {
  try {
    const { externalSource, ...orderData }: ParsedOrderData & { externalSource?: string } = req.body;
    const resolvedSource = resolveExternalSource(externalSource, orderData.orderSource);

    if (!resolvedSource) {
      return res.status(400).json({
        success: false,
        error: 'Unsupported external source for scan',
      });
    }

    if (resolvedSource !== OrderExternalSource.FTD && resolvedSource !== OrderExternalSource.DOORDASH) {
      return res.status(400).json({
        success: false,
        error: `No scan handler configured for ${resolvedSource}`,
      });
    }

    console.log(`📸 Creating order from scanned order: ${orderData.orderNumber}`);

    // Check if order already exists
    if (orderData.orderNumber) {
      const existingOrder = await prisma.order.findUnique({
        where: { externalReference: orderData.orderNumber },
      });

      if (existingOrder) {
        return res.status(409).json({
          success: false,
          error: `Order ${orderData.orderNumber} already exists (Order #${existingOrder.orderNumber})`,
          existingOrderId: existingOrder.id,
          existingOrderNumber: existingOrder.orderNumber,
        });
      }
    }

    if (resolvedSource === OrderExternalSource.DOORDASH) {
      const order = await createDoorDashOrder(orderData, resolvedSource);

      return res.json({
        success: true,
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
        },
      });
    }

    if (!orderData.recipient || !orderData.address || !orderData.product || orderData.orderTotal == null) {
      return res.status(400).json({
        success: false,
        error: 'Missing required FTD fields from scan',
      });
    }

    // 1. Find or create SENDER customer (the florist who sent the order)
    let senderCustomer;
    if (orderData.sender) {
      senderCustomer = await findOrCreateCustomer({
        firstName: orderData.sender.shopName,
        lastName: `#${orderData.sender.shopCode}`,
        phone: orderData.sender.phone,
      });
    } else {
      // Fallback if sender info not extracted
      senderCustomer = await findOrCreateCustomer({
        firstName: 'FTD Wire-In',
        lastName: 'Customer',
        phone: '0000000000',
      });
    }

    // 2. Find or create RECIPIENT customer
    const recipientCustomer = await findOrCreateCustomer({
      firstName: orderData.recipient.firstName,
      lastName: orderData.recipient.lastName,
      phone: orderData.recipient.phone,
    });

    // 3. Find or create delivery address
    // Check if customer already has this exact address
    let deliveryAddress = await prisma.address.findFirst({
      where: {
        customerId: recipientCustomer.id,
        address1: orderData.address.address1,
        city: orderData.address.city,
        province: orderData.address.province,
        postalCode: orderData.address.postalCode,
      },
    });

    if (deliveryAddress) {
      console.log(`📍 Using existing address for customer ${recipientCustomer.id}`);
    } else {
      // Create new address for this customer
      deliveryAddress = await prisma.address.create({
        data: {
          customerId: recipientCustomer.id,
          address1: orderData.address.address1,
          address2: orderData.address.address2 || null,
          city: orderData.address.city,
          province: orderData.address.province,
          postalCode: orderData.address.postalCode,
          country: orderData.address.country,
        },
      });
      console.log(`📍 Created new address for customer ${recipientCustomer.id}`);
    }

    // 4. Calculate amounts (all in cents)
    const deliveryFee = 1500; // Always $15.00
    const totalAmount = Math.round(orderData.orderTotal * 100); // From scan
    const productPrice = totalAmount - deliveryFee; // Product = Total - $15

    // 5. Create order
    const order = await prisma.order.create({
      data: {
        type: 'DELIVERY',
        status: OrderStatus.PAID, // Wire-in orders are pre-paid
        orderSource: 'EXTERNAL',
        externalSource: resolvedSource,
        externalReference: orderData.orderNumber,
        customerId: senderCustomer.id, // Sender florist is the customer
        recipientCustomerId: recipientCustomer.id,
        deliveryAddressId: deliveryAddress.id,
        deliveryDate: orderData.deliveryDate ? new Date(orderData.deliveryDate + 'T00:00:00') : null,
        deliveryTime: orderData.deliveryTime || null,
        cardMessage: orderData.cardMessage || '',
        specialInstructions: orderData.specialInstructions || null,
        occasion: orderData.occasion || null,
        deliveryFee,
        paymentAmount: totalAmount,
        totalTax: 0, // FTD includes tax in total
        orderItems: {
          create: {
            customName: orderData.product.description,
            description: orderData.product.fullText,
            unitPrice: productPrice,
            quantity: 1,
            rowTotal: productPrice,
          },
        },
      },
      include: {
        orderItems: true,
        recipientCustomer: true,
        deliveryAddress: true,
      },
    });

    // 6. Create payment transaction
    try {
      const paymentTransaction = await transactionService.createTransaction({
        customerId: senderCustomer.id,
        employeeId: undefined,
        channel: 'WEBSITE', // Wire-in proxy
        totalAmount,
        taxAmount: 0,
        tipAmount: 0,
        notes: `Scanned FTD Order ${orderData.orderNumber}`,
        receiptEmail: undefined,
        paymentMethods: [
          {
            type: 'EXTERNAL' as any,
            provider: 'INTERNAL' as any,
            amount: totalAmount,
            providerTransactionId: orderData.orderNumber,
            providerMetadata: {
              source: orderData.orderSource,
              scannedOrder: true,
              senderShop: orderData.sender ? `${orderData.sender.shopName} #${orderData.sender.shopCode}` : 'Unknown',
            },
          },
        ],
        orderIds: [order.id],
      });

      console.log(`✅ Created order #${order.orderNumber} and PT-${paymentTransaction.transactionNumber} from scan`);
    } catch (error: any) {
      console.error(`⚠️  Failed to create PT-transaction:`, error.message);
      // Don't fail - order was created successfully
    }

    res.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
      },
    });
  } catch (error: any) {
    console.error('❌ Create from scan error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create order from scan',
    });
  }
});

async function createDoorDashOrder(orderData: ParsedOrderData, externalSource: OrderExternalSource) {
  // Get or create system DoorDash customer
  const systemCustomer = await findOrCreateCustomer({
    firstName: 'DoorDash',
    lastName: 'Pickup Orders',
    phone: '0000000001',
  });

  const totalAmount = Math.round(Number(orderData.orderTotal || 0) * 100);
  const itemsSummary =
    orderData.itemsSummary ||
    orderData.product?.fullText ||
    orderData.product?.description ||
    'DoorDash pickup';

  // Extract display name for recipient (e.g., "David J.")
  const recipientName = orderData.recipient
    ? `${orderData.recipient.firstName || ''} ${orderData.recipient.lastName || ''}`.trim()
    : null;

  const order = await prisma.order.create({
    data: {
      type: 'PICKUP',
      status: OrderStatus.PAID,
      orderSource: 'EXTERNAL',
      externalSource,
      externalReference: orderData.orderNumber || null,
      customerId: systemCustomer.id,
      recipientName: recipientName || 'Pickup Customer',
      deliveryDate: orderData.deliveryDate ? new Date(orderData.deliveryDate + 'T00:00:00') : null,
      deliveryTime: orderData.deliveryTime || null,
      cardMessage: orderData.cardMessage || null,
      specialInstructions: orderData.specialInstructions || null,
      occasion: orderData.occasion || null,
      deliveryFee: 0,
      paymentAmount: totalAmount,
      totalTax: 0,
      orderItems: {
        create: {
          customName: itemsSummary,
          description: itemsSummary,
          unitPrice: totalAmount,
          quantity: 1,
          rowTotal: totalAmount,
        },
      },
    },
    include: {
      orderItems: true,
    },
  });

  return order;
}

function resolveExternalSource(
  externalSource?: string,
  orderSource?: string
): OrderExternalSource | null {
  const candidate = (externalSource || orderSource || OrderExternalSource.FTD).toUpperCase();
  if (Object.values(OrderExternalSource).includes(candidate as OrderExternalSource)) {
    return candidate as OrderExternalSource;
  }

  return null;
}

/**
 * Normalize phone number to digits only for comparison
 */
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Find or create customer by phone + name
 */
async function findOrCreateCustomer(data: {
  firstName: string;
  lastName: string;
  phone: string;
}) {
  const normalizedPhone = normalizePhone(data.phone);

  // Search by normalized phone - find all customers and check normalized versions
  const allCustomers = await prisma.customer.findMany({
    where: {
      OR: [
        { phone: data.phone }, // Exact match
        { phone: { contains: normalizedPhone.slice(-10) } }, // Last 10 digits
      ],
    },
  });

  // Find match by comparing normalized phone numbers
  const existing = allCustomers.find(
    (c) => normalizePhone(c.phone) === normalizedPhone
  );

  if (existing) {
    console.log(`👤 Found existing customer: ${existing.firstName} ${existing.lastName} (phone: ${existing.phone})`);
    return existing;
  }

  // Create new customer with digits-only phone
  const newCustomer = await prisma.customer.create({
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      phone: normalizedPhone,
    },
  });

  console.log(`👤 Created new customer: ${newCustomer.firstName} ${newCustomer.lastName}`);
  return newCustomer;
}

/**
 * Create order from scanned Floranext web order
 * POST /api/orders/create-from-floranext
 */
router.post('/create-from-floranext', async (req, res) => {
  try {
    const orderData: FloranextOrderData = req.body;

    console.log(`📸 Creating order from Floranext web order: ${orderData.orderNumber}`);

    // Check if order already exists
    if (orderData.orderNumber) {
      const existingOrder = await prisma.order.findFirst({
        where: {
          OR: [
            { externalReference: orderData.orderNumber },
            { externalReference: `FN-${orderData.orderNumber}` },
          ],
        },
      });

      if (existingOrder) {
        return res.status(409).json({
          success: false,
          error: `Order ${orderData.orderNumber} already exists (Order #${existingOrder.orderNumber})`,
          existingOrderId: existingOrder.id,
          existingOrderNumber: existingOrder.orderNumber,
        });
      }
    }

    // 1. Parse sender name
    const senderNameParts = orderData.sender.name.trim().split(/\s+/);
    const senderFirstName = senderNameParts[0] || 'Web';
    const senderLastName = senderNameParts.slice(1).join(' ') || 'Customer';

    // 2. Find or create SENDER customer
    const senderCustomer = await findOrCreateCustomer({
      firstName: senderFirstName,
      lastName: senderLastName,
      phone: orderData.sender.phone,
    });

    // Update sender email if available
    if (orderData.sender.email && !senderCustomer.email) {
      await prisma.customer.update({
        where: { id: senderCustomer.id },
        data: { email: orderData.sender.email },
      });
    }

    // 3. Parse recipient name
    const recipientNameParts = orderData.recipient.name.trim().split(/\s+/);
    const recipientFirstName = recipientNameParts[0] || 'Recipient';
    const recipientLastName = recipientNameParts.slice(1).join(' ') || '';

    // 4. Find or create RECIPIENT customer
    const recipientCustomer = await findOrCreateCustomer({
      firstName: recipientFirstName,
      lastName: recipientLastName,
      phone: orderData.recipient.phone,
    });

    // 5. Create/find delivery address for recipient
    const isDelivery = orderData.deliveryType === 'Delivery';
    let deliveryAddress = null;

    if (isDelivery) {
      deliveryAddress = await prisma.address.findFirst({
        where: {
          customerId: recipientCustomer.id,
          address1: orderData.recipient.address,
          city: orderData.recipient.city,
          province: orderData.recipient.province,
          postalCode: orderData.recipient.postalCode,
        },
      });

      if (!deliveryAddress) {
        deliveryAddress = await prisma.address.create({
          data: {
            customerId: recipientCustomer.id,
            address1: orderData.recipient.address,
            company: orderData.recipient.company || null,
            city: orderData.recipient.city,
            province: orderData.recipient.province,
            postalCode: orderData.recipient.postalCode,
            country: orderData.recipient.country || 'CA',
          },
        });
        console.log(`📍 Created new address for recipient ${recipientCustomer.id}`);
      }
    }

    // 6. Calculate amounts (all in cents)
    const subtotalCents = Math.round(orderData.subtotal * 100);
    const deliveryFeeCents = Math.round(orderData.deliveryFee * 100);
    const gstCents = Math.round(orderData.gst * 100);
    const pstCents = Math.round(orderData.pst * 100);
    const totalTaxCents = gstCents + pstCents;
    const grandTotalCents = Math.round(orderData.grandTotal * 100);

    // 7. Create order items from products
    const orderItems = orderData.products.map((product) => ({
      customName: product.option ? `${product.name} - ${product.option}` : product.name,
      description: product.description || product.name,
      unitPrice: Math.round(product.unitPrice * 100),
      quantity: product.quantity,
      rowTotal: Math.round(product.unitPrice * product.quantity * 100),
    }));

    // 8. Create order
    const order = await prisma.order.create({
      data: {
        type: isDelivery ? 'DELIVERY' : 'PICKUP',
        status: OrderStatus.PAID, // Web orders are pre-paid
        orderSource: 'WEBSITE',
        externalSource: OrderExternalSource.OTHER,
        externalReference: `FN-${orderData.orderNumber}`,
        customerId: senderCustomer.id,
        recipientCustomerId: isDelivery ? recipientCustomer.id : null,
        recipientName: isDelivery ? null : orderData.recipient.name,
        deliveryAddressId: deliveryAddress?.id || null,
        deliveryDate: orderData.deliveryDate ? new Date(orderData.deliveryDate + 'T00:00:00') : null,
        cardMessage: orderData.cardMessage || '',
        specialInstructions: orderData.deliveryInstructions || null,
        deliveryFee: deliveryFeeCents,
        paymentAmount: grandTotalCents,
        totalTax: totalTaxCents,
        orderItems: {
          create: orderItems,
        },
      },
      include: {
        orderItems: true,
        recipientCustomer: true,
        deliveryAddress: true,
      },
    });

    // 9. Create payment transaction
    try {
      const paymentTransaction = await transactionService.createTransaction({
        customerId: senderCustomer.id,
        employeeId: undefined,
        channel: 'WEBSITE',
        totalAmount: grandTotalCents,
        taxAmount: totalTaxCents,
        tipAmount: 0,
        notes: `Floranext Web Order ${orderData.orderNumber}`,
        receiptEmail: orderData.sender.email,
        paymentMethods: [
          {
            type: 'EXTERNAL' as any,
            provider: 'INTERNAL' as any,
            amount: grandTotalCents,
            providerTransactionId: `FN-${orderData.orderNumber}`,
            providerMetadata: {
              source: 'FLORANEXT',
              paymentMethod: orderData.paymentMethod,
              scannedOrder: true,
            },
          },
        ],
        orderIds: [order.id],
      });

      console.log(`✅ Created order #${order.orderNumber} and PT-${paymentTransaction.transactionNumber} from Floranext scan`);
    } catch (error: any) {
      console.error(`⚠️  Failed to create PT-transaction:`, error.message);
    }

    res.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
      },
    });
  } catch (error: any) {
    console.error('❌ Create from Floranext scan error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create order from Floranext scan',
    });
  }
});

export default router;

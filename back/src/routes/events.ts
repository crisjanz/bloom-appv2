import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * Get list of events with filtering and search
 * GET /api/events/list
 */
router.get('/list', async (req, res) => {
  try {
    const { status, type, search, limit = '50', offset = '0' } = req.query;

    const where: any = {};

    // Status filter
    if (status && status !== 'ALL') {
      where.status = status;
    }

    // Event type filter
    if (type && type !== 'ALL') {
      where.eventType = type;
    }

    // Search filter
    if (search) {
      where.OR = [
        { eventName: { contains: search as string, mode: 'insensitive' } },
        { venue: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
        {
          customer: {
            OR: [
              { firstName: { contains: search as string, mode: 'insensitive' } },
              { lastName: { contains: search as string, mode: 'insensitive' } },
              { email: { contains: search as string, mode: 'insensitive' } },
              { phone: { contains: search as string, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const events = await prisma.event.findMany({
      where,
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        employee: {
          select: {
            name: true,
          },
        },
        items: {
          select: {
            id: true,
            category: true,
            quantity: true,
            totalPrice: true,
          },
        },
        payments: {
          select: {
            id: true,
            amount: true,
            status: true,
          },
        },
      },
      orderBy: [
        { eventDate: 'asc' },
        { createdAt: 'desc' },
      ],
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    });

    res.json({
      success: true,
      events,
      total: events.length,
    });
  } catch (error) {
    console.error('❌ Failed to fetch events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch events',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Get event by ID
 * GET /api/events/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        customer: {
          include: {
            addresses: true,
          },
        },
        employee: true,
        items: {
          include: {
            product: {
              select: {
                name: true,
                images: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        payments: {
          include: {
            employee: {
              select: {
                name: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found',
      });
    }

    res.json({
      success: true,
      event,
    });
  } catch (error) {
    console.error('❌ Failed to fetch event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch event',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Create new event
 * POST /api/events
 */
router.post('/', async (req, res) => {
  try {
    const {
      eventType,
      eventName,
      description,
      customerId,
      eventDate,
      setupDate,
      setupTime,
      venue,
      venueAddress,
      contactPerson,
      contactPhone,
      estimatedGuests,
      serviceType,
      quotedAmount,
      employeeId,
      designNotes,
      setupNotes,
      internalNotes,
      customerNotes,
      items = [],
    } = req.body;

    // Validate required fields
    if (!eventType || !eventName || !customerId || !eventDate || !venue) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: eventType, eventName, customerId, eventDate, venue',
      });
    }

    // Create event with items in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the event
      const event = await tx.event.create({
        data: {
          eventType,
          eventName,
          description,
          customerId,
          eventDate: new Date(eventDate),
          setupDate: setupDate ? new Date(setupDate) : null,
          setupTime,
          venue,
          venueAddress,
          contactPerson,
          contactPhone,
          estimatedGuests: estimatedGuests ? parseInt(estimatedGuests) : null,
          serviceType,
          quotedAmount: quotedAmount ? parseFloat(quotedAmount) : null,
          employeeId,
          designNotes,
          setupNotes,
          internalNotes,
          customerNotes,
          status: 'INQUIRY',
        },
      });

      // Create event items if provided
      if (items.length > 0) {
        const eventItems = items.map((item: any) => ({
          eventId: event.id,
          category: item.category,
          description: item.description,
          quantity: parseInt(item.quantity) || 1,
          unitPrice: parseFloat(item.unitPrice) || 0,
          totalPrice: parseFloat(item.totalPrice) || (parseFloat(item.unitPrice) || 0) * (parseInt(item.quantity) || 1),
          productionNotes: item.productionNotes,
          productId: item.productId || null,
        }));

        await tx.eventItem.createMany({
          data: eventItems,
        });
      }

      return event;
    });

    console.log(`✅ Created new event: ${result.eventName} (ID: ${result.id})`);

    res.status(201).json({
      success: true,
      event: result,
      message: 'Event created successfully',
    });
  } catch (error) {
    console.error('❌ Failed to create event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create event',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Update event
 * PUT /api/events/:id
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Remove items from update data as they're handled separately
    const { items, ...eventData } = updateData;

    // Process date fields
    if (eventData.eventDate) {
      eventData.eventDate = new Date(eventData.eventDate);
    }
    if (eventData.setupDate) {
      eventData.setupDate = new Date(eventData.setupDate);
    }

    // Process numeric fields
    if (eventData.estimatedGuests) {
      eventData.estimatedGuests = parseInt(eventData.estimatedGuests);
    }
    if (eventData.quotedAmount) {
      eventData.quotedAmount = parseFloat(eventData.quotedAmount);
    }
    if (eventData.finalAmount) {
      eventData.finalAmount = parseFloat(eventData.finalAmount);
    }

    const event = await prisma.event.update({
      where: { id },
      data: eventData,
      include: {
        customer: true,
        employee: true,
        items: true,
        payments: true,
      },
    });

    console.log(`✅ Updated event: ${event.eventName} (ID: ${event.id})`);

    res.json({
      success: true,
      event,
      message: 'Event updated successfully',
    });
  } catch (error) {
    console.error('❌ Failed to update event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update event',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Delete event
 * DELETE /api/events/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Delete event (cascade will handle items and payments)
    await prisma.event.delete({
      where: { id },
    });

    console.log(`✅ Deleted event: ${id}`);

    res.json({
      success: true,
      message: 'Event deleted successfully',
    });
  } catch (error) {
    console.error('❌ Failed to delete event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete event',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Update event status
 * PATCH /api/events/:id/status
 */
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required',
      });
    }

    const updateData: any = { 
      status,
      lastContactDate: new Date(),
    };

    // Set completion date if moving to completed status
    if (status === 'COMPLETED') {
      updateData.completedAt = new Date();
    }

    // Add notes to internal notes if provided
    if (notes) {
      const event = await prisma.event.findUnique({
        where: { id },
        select: { internalNotes: true },
      });

      const existingNotes = event?.internalNotes || '';
      const timestamp = new Date().toLocaleString();
      updateData.internalNotes = existingNotes + 
        (existingNotes ? '\n\n' : '') + 
        `[${timestamp}] Status changed to ${status}${notes ? ': ' + notes : ''}`;
    }

    const event = await prisma.event.update({
      where: { id },
      data: updateData,
    });

    console.log(`✅ Updated event status: ${event.eventName} -> ${status}`);

    res.json({
      success: true,
      event,
      message: 'Event status updated successfully',
    });
  } catch (error) {
    console.error('❌ Failed to update event status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update event status',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Get event payments
 * GET /api/events/:id/payments
 */
router.get('/:id/payments', async (req, res) => {
  try {
    const { id } = req.params;

    const payments = await prisma.eventPayment.findMany({
      where: { eventId: id },
      include: {
        employee: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      payments,
    });
  } catch (error) {
    console.error('❌ Failed to fetch event payments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch event payments',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Add event payment
 * POST /api/events/:id/payments
 */
router.post('/:id/payments', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      amount,
      paymentType,
      status = 'RECEIVED',
      description,
      reference,
      notes,
      dueDate,
      receivedDate,
      employeeId,
    } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Amount is required and must be greater than 0',
      });
    }

    if (!paymentType) {
      return res.status(400).json({
        success: false,
        error: 'Payment type is required',
      });
    }

    const paymentData: any = {
      eventId: id,
      amount: parseFloat(amount),
      paymentType,
      status,
      description,
      reference,
      notes,
      employeeId,
    };

    if (dueDate) {
      paymentData.dueDate = new Date(dueDate);
    }

    if (receivedDate) {
      paymentData.receivedDate = new Date(receivedDate);
    }

    const payment = await prisma.eventPayment.create({
      data: paymentData,
      include: {
        employee: {
          select: {
            name: true,
          },
        },
      },
    });

    console.log(`✅ Added payment for event ${id}: $${amount} (${paymentType})`);

    res.status(201).json({
      success: true,
      payment,
      message: 'Payment added successfully',
    });
  } catch (error) {
    console.error('❌ Failed to add event payment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add event payment',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Update event payment
 * PUT /api/events/:id/payments/:paymentId
 */
router.put('/:id/payments/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const updateData = req.body;

    // Process date fields
    if (updateData.dueDate) {
      updateData.dueDate = new Date(updateData.dueDate);
    }
    if (updateData.receivedDate) {
      updateData.receivedDate = new Date(updateData.receivedDate);
    }

    // Process numeric fields
    if (updateData.amount) {
      updateData.amount = parseFloat(updateData.amount);
    }

    const payment = await prisma.eventPayment.update({
      where: { id: paymentId },
      data: updateData,
      include: {
        employee: {
          select: {
            name: true,
          },
        },
      },
    });

    console.log(`✅ Updated event payment: ${paymentId}`);

    res.json({
      success: true,
      payment,
      message: 'Payment updated successfully',
    });
  } catch (error) {
    console.error('❌ Failed to update event payment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update event payment',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Delete event payment
 * DELETE /api/events/:id/payments/:paymentId
 */
router.delete('/:id/payments/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;

    await prisma.eventPayment.delete({
      where: { id: paymentId },
    });

    console.log(`✅ Deleted event payment: ${paymentId}`);

    res.json({
      success: true,
      message: 'Payment deleted successfully',
    });
  } catch (error) {
    console.error('❌ Failed to delete event payment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete event payment',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
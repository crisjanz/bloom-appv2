import { Router } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import prisma from '../lib/prisma.js';
import {
  SubscriptionBillingType,
  SubscriptionStatus,
  SubscriptionStyle,
  SubscriptionFrequency,
  SubscriptionDeliveryStatus,
  SubscriptionSource,
} from '@prisma/client';

const router = Router();

// ── Helpers ──

async function getNextSubscriptionNumber(): Promise<string> {
  const counter = await prisma.subscriptionCounter.upsert({
    where: { id: 'default' },
    create: { id: 'default', currentValue: 1, prefix: 'SUB' },
    update: { currentValue: { increment: 1 } },
  });
  return `SUB-${String(counter.currentValue).padStart(4, '0')}`;
}

function generateAccessCode(): string {
  return crypto.randomBytes(8).toString('hex');
}

function generateDeliveryDates(
  startDate: Date,
  frequency: SubscriptionFrequency,
  preferredDayOfWeek: number | null,
  customDates: Date[],
  count: number,
): Date[] {
  const dates: Date[] = [];

  if (frequency === 'CUSTOM') {
    return customDates
      .filter((d) => d >= startDate)
      .sort((a, b) => a.getTime() - b.getTime())
      .slice(0, count);
  }

  let current = new Date(startDate);

  // Adjust to preferred day of week if set
  if (preferredDayOfWeek !== null && (frequency === 'WEEKLY' || frequency === 'BIWEEKLY')) {
    const diff = (preferredDayOfWeek - current.getDay() + 7) % 7;
    if (diff > 0) current.setDate(current.getDate() + diff);
  }

  const intervalDays = frequency === 'WEEKLY' ? 7 : frequency === 'BIWEEKLY' ? 14 : 0;

  for (let i = 0; i < count; i++) {
    dates.push(new Date(current));
    if (frequency === 'MONTHLY') {
      const nextMonth = new Date(current);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      // Handle month length differences
      if (nextMonth.getDate() !== current.getDate()) {
        nextMonth.setDate(0); // Last day of previous month
      }
      current = nextMonth;
    } else {
      current = new Date(current.getTime() + intervalDays * 24 * 60 * 60 * 1000);
    }
  }

  return dates;
}

// ── Zod Schemas ──

const CreateSubscriptionSchema = z.object({
  billingType: z.nativeEnum(SubscriptionBillingType),
  style: z.nativeEnum(SubscriptionStyle),
  planId: z.string().uuid().nullable().optional(),
  colorPalette: z.string().nullable().optional(),
  defaultPriceCents: z.number().int().positive(),
  totalPrepaidCents: z.number().int().nullable().optional(),
  totalDeliveries: z.number().int().min(1).nullable().optional(),
  frequency: z.nativeEnum(SubscriptionFrequency),
  preferredDayOfWeek: z.number().int().min(0).max(6).nullable().optional(),
  customDates: z.array(z.coerce.date()).optional().default([]),
  startDate: z.coerce.date(),
  stripeCustomerId: z.string().nullable().optional(),
  stripePaymentMethodId: z.string().nullable().optional(),
  customerId: z.string().min(1),
  recipientName: z.string().min(1),
  recipientPhone: z.string().nullable().optional(),
  recipientEmail: z.string().email().nullable().optional(),
  recipientAddress: z.string().min(1),
  recipientCity: z.string().min(1),
  recipientProvince: z.string().nullable().optional(),
  recipientPostalCode: z.string().min(1),
  notes: z.string().nullable().optional(),
  source: z.nativeEnum(SubscriptionSource),
  // For initial deliveries with per-delivery products
  deliveryProducts: z.array(z.object({
    scheduledDate: z.coerce.date(),
    productId: z.string().uuid().nullable().optional(),
    productName: z.string().nullable().optional(),
    priceCents: z.number().int().positive(),
  })).optional(),
});

const UpdateSubscriptionSchema = z.object({
  planId: z.string().uuid().nullable().optional(),
  colorPalette: z.string().nullable().optional(),
  defaultPriceCents: z.number().int().positive().optional(),
  frequency: z.nativeEnum(SubscriptionFrequency).optional(),
  preferredDayOfWeek: z.number().int().min(0).max(6).nullable().optional(),
  recipientName: z.string().min(1).optional(),
  recipientPhone: z.string().nullable().optional(),
  recipientEmail: z.string().email().nullable().optional(),
  recipientAddress: z.string().min(1).optional(),
  recipientCity: z.string().min(1).optional(),
  recipientProvince: z.string().nullable().optional(),
  recipientPostalCode: z.string().min(1).optional(),
  notes: z.string().nullable().optional(),
  stripePaymentMethodId: z.string().nullable().optional(),
});

const UpdateDeliverySchema = z.object({
  scheduledDate: z.coerce.date().optional(),
  productId: z.string().uuid().nullable().optional(),
  productName: z.string().nullable().optional(),
  priceCents: z.number().int().positive().optional(),
  customNotes: z.string().nullable().optional(),
  status: z.nativeEnum(SubscriptionDeliveryStatus).optional(),
});

const CreatePlanSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  priceCents: z.number().int().positive(),
  image: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

// ══════════════════════════════════════════
// ADMIN ENDPOINTS
// ══════════════════════════════════════════

// GET /api/subscriptions — List all subscriptions
router.get('/', async (req, res) => {
  try {
    const { status, billingType, style, search, page = '1', limit = '20' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (status && status !== 'all') where.status = status;
    if (billingType && billingType !== 'all') where.billingType = billingType;
    if (style && style !== 'all') where.style = style;
    if (search) {
      where.OR = [
        { subscriptionNumber: { contains: search as string, mode: 'insensitive' } },
        { recipientName: { contains: search as string, mode: 'insensitive' } },
        { customer: { firstName: { contains: search as string, mode: 'insensitive' } } },
        { customer: { lastName: { contains: search as string, mode: 'insensitive' } } },
      ];
    }

    const [subscriptions, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        include: {
          customer: { select: { id: true, firstName: true, lastName: true, email: true } },
          plan: { select: { id: true, name: true, priceCents: true } },
          deliveries: {
            where: { status: { in: ['SCHEDULED', 'PREPARING'] } },
            orderBy: { scheduledDate: 'asc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.subscription.count({ where }),
    ]);

    res.json({
      subscriptions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({ error: 'Failed to fetch subscriptions', details: error.message });
  }
});

// GET /api/subscriptions/:id — Get subscription detail
router.get('/:id', async (req, res) => {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { id: req.params.id },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        plan: true,
        deliveries: {
          include: {
            product: { select: { id: true, name: true, images: true } },
            order: { select: { id: true, orderNumber: true, status: true } },
          },
          orderBy: { scheduledDate: 'desc' },
        },
      },
    });

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    res.json(subscription);
  } catch (error: any) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ error: 'Failed to fetch subscription', details: error.message });
  }
});

// POST /api/subscriptions — Create new subscription
router.post('/', async (req, res) => {
  try {
    const data = CreateSubscriptionSchema.parse(req.body);

    // Verify customer exists
    const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
    if (!customer) {
      return res.status(400).json({ error: 'Customer not found' });
    }

    const subscriptionNumber = await getNextSubscriptionNumber();
    const accessCode = generateAccessCode();

    const subscription = await prisma.$transaction(async (tx) => {
      const sub = await tx.subscription.create({
        data: {
          subscriptionNumber,
          billingType: data.billingType,
          style: data.style,
          planId: data.planId || null,
          colorPalette: data.colorPalette || null,
          defaultPriceCents: data.defaultPriceCents,
          totalPrepaidCents: data.totalPrepaidCents || null,
          totalDeliveries: data.totalDeliveries || null,
          frequency: data.frequency,
          preferredDayOfWeek: data.preferredDayOfWeek ?? null,
          customDates: data.customDates,
          startDate: data.startDate,
          stripeCustomerId: data.stripeCustomerId || null,
          stripePaymentMethodId: data.stripePaymentMethodId || null,
          customerId: data.customerId,
          recipientName: data.recipientName,
          recipientPhone: data.recipientPhone || null,
          recipientEmail: data.recipientEmail || null,
          recipientAddress: data.recipientAddress,
          recipientCity: data.recipientCity,
          recipientProvince: data.recipientProvince || null,
          recipientPostalCode: data.recipientPostalCode,
          accessCode,
          notes: data.notes || null,
          source: data.source,
        },
      });

      // Generate initial deliveries
      if (data.deliveryProducts && data.deliveryProducts.length > 0) {
        // Per-delivery products specified (Pick Your Own customized)
        for (const dp of data.deliveryProducts) {
          await tx.subscriptionDelivery.create({
            data: {
              subscriptionId: sub.id,
              productId: dp.productId || null,
              productName: dp.productName || null,
              priceCents: dp.priceCents,
              scheduledDate: dp.scheduledDate,
              status: 'SCHEDULED',
            },
          });
        }
      } else {
        // Auto-generate delivery dates
        const deliveryCount = data.totalDeliveries || 6; // Default 6 upcoming for recurring
        const dates = generateDeliveryDates(
          data.startDate,
          data.frequency,
          data.preferredDayOfWeek ?? null,
          data.customDates,
          deliveryCount,
        );

        for (const date of dates) {
          await tx.subscriptionDelivery.create({
            data: {
              subscriptionId: sub.id,
              priceCents: data.defaultPriceCents,
              scheduledDate: date,
              status: 'SCHEDULED',
            },
          });
        }
      }

      return sub;
    });

    const full = await prisma.subscription.findUnique({
      where: { id: subscription.id },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, email: true } },
        plan: true,
        deliveries: { orderBy: { scheduledDate: 'asc' } },
      },
    });

    res.status(201).json(full);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error creating subscription:', error);
    res.status(500).json({ error: 'Failed to create subscription', details: error.message });
  }
});

// PATCH /api/subscriptions/:id — Update subscription
router.patch('/:id', async (req, res) => {
  try {
    const data = UpdateSubscriptionSchema.parse(req.body);

    const subscription = await prisma.subscription.update({
      where: { id: req.params.id },
      data,
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, email: true } },
        plan: true,
        deliveries: { orderBy: { scheduledDate: 'desc' } },
      },
    });

    res.json(subscription);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error updating subscription:', error);
    res.status(500).json({ error: 'Failed to update subscription', details: error.message });
  }
});

// POST /api/subscriptions/:id/pause
router.post('/:id/pause', async (req, res) => {
  try {
    const subscription = await prisma.subscription.update({
      where: { id: req.params.id },
      data: { status: 'PAUSED', pausedAt: new Date() },
    });
    res.json(subscription);
  } catch (error: any) {
    console.error('Error pausing subscription:', error);
    res.status(500).json({ error: 'Failed to pause subscription', details: error.message });
  }
});

// POST /api/subscriptions/:id/resume
router.post('/:id/resume', async (req, res) => {
  try {
    const subscription = await prisma.subscription.update({
      where: { id: req.params.id },
      data: { status: 'ACTIVE', pausedAt: null },
    });
    res.json(subscription);
  } catch (error: any) {
    console.error('Error resuming subscription:', error);
    res.status(500).json({ error: 'Failed to resume subscription', details: error.message });
  }
});

// POST /api/subscriptions/:id/cancel
router.post('/:id/cancel', async (req, res) => {
  try {
    const subscription = await prisma.subscription.update({
      where: { id: req.params.id },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });

    // Cancel all future scheduled deliveries
    await prisma.subscriptionDelivery.updateMany({
      where: {
        subscriptionId: req.params.id,
        status: 'SCHEDULED',
      },
      data: { status: 'SKIPPED' },
    });

    res.json(subscription);
  } catch (error: any) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({ error: 'Failed to cancel subscription', details: error.message });
  }
});

// PATCH /api/subscriptions/:id/deliveries/:deliveryId — Update a delivery
router.patch('/:id/deliveries/:deliveryId', async (req, res) => {
  try {
    const data = UpdateDeliverySchema.parse(req.body);

    const delivery = await prisma.subscriptionDelivery.findFirst({
      where: { id: req.params.deliveryId, subscriptionId: req.params.id },
    });

    if (!delivery) {
      return res.status(404).json({ error: 'Delivery not found' });
    }

    // Check reschedule limit
    if (data.scheduledDate && delivery.rescheduleCount >= 2) {
      return res.status(400).json({ error: 'Maximum reschedules (2) reached for this delivery' });
    }

    const updateData: any = { ...data };
    if (data.scheduledDate) {
      updateData.rescheduleCount = delivery.rescheduleCount + 1;
      updateData.status = 'RESCHEDULED';
    }

    const updated = await prisma.subscriptionDelivery.update({
      where: { id: req.params.deliveryId },
      data: updateData,
      include: {
        product: { select: { id: true, name: true, images: true } },
        order: { select: { id: true, orderNumber: true, status: true } },
      },
    });

    res.json(updated);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error updating delivery:', error);
    res.status(500).json({ error: 'Failed to update delivery', details: error.message });
  }
});

// POST /api/subscriptions/:id/deliveries — Manually add a delivery
router.post('/:id/deliveries', async (req, res) => {
  try {
    const data = z.object({
      scheduledDate: z.coerce.date(),
      productId: z.string().uuid().nullable().optional(),
      productName: z.string().nullable().optional(),
      priceCents: z.number().int().positive(),
    }).parse(req.body);

    const delivery = await prisma.subscriptionDelivery.create({
      data: {
        subscriptionId: req.params.id,
        scheduledDate: data.scheduledDate,
        productId: data.productId || null,
        productName: data.productName || null,
        priceCents: data.priceCents,
        status: 'SCHEDULED',
      },
      include: {
        product: { select: { id: true, name: true, images: true } },
      },
    });

    res.status(201).json(delivery);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error adding delivery:', error);
    res.status(500).json({ error: 'Failed to add delivery', details: error.message });
  }
});

// POST /api/subscriptions/:id/generate-deliveries — Generate next batch of deliveries
router.post('/:id/generate-deliveries', async (req, res) => {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { id: req.params.id },
      include: {
        deliveries: { orderBy: { scheduledDate: 'desc' }, take: 1 },
      },
    });

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    if (subscription.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Can only generate deliveries for active subscriptions' });
    }

    // For prepaid, check if we've hit the limit
    if (subscription.billingType === 'PREPAID' && subscription.totalDeliveries) {
      const existingCount = await prisma.subscriptionDelivery.count({
        where: { subscriptionId: subscription.id, status: { not: 'SKIPPED' } },
      });
      if (existingCount >= subscription.totalDeliveries) {
        return res.status(400).json({ error: 'All prepaid deliveries already generated' });
      }
    }

    const lastDeliveryDate = subscription.deliveries[0]?.scheduledDate || subscription.startDate;
    const nextStart = new Date(lastDeliveryDate);
    // Start from the day after last delivery
    if (subscription.frequency === 'WEEKLY') nextStart.setDate(nextStart.getDate() + 7);
    else if (subscription.frequency === 'BIWEEKLY') nextStart.setDate(nextStart.getDate() + 14);
    else if (subscription.frequency === 'MONTHLY') nextStart.setMonth(nextStart.getMonth() + 1);

    const count = Math.min(6, subscription.totalDeliveries ? subscription.totalDeliveries - subscription.completedDeliveries : 6);
    const dates = generateDeliveryDates(
      nextStart,
      subscription.frequency,
      subscription.preferredDayOfWeek,
      subscription.customDates,
      count,
    );

    const deliveries = [];
    for (const date of dates) {
      const delivery = await prisma.subscriptionDelivery.create({
        data: {
          subscriptionId: subscription.id,
          priceCents: subscription.defaultPriceCents,
          scheduledDate: date,
          status: 'SCHEDULED',
        },
      });
      deliveries.push(delivery);
    }

    res.json({ generated: deliveries.length, deliveries });
  } catch (error: any) {
    console.error('Error generating deliveries:', error);
    res.status(500).json({ error: 'Failed to generate deliveries', details: error.message });
  }
});

// ══════════════════════════════════════════
// SUBSCRIPTION PLANS (Designer's Choice tiers)
// ══════════════════════════════════════════

// GET /api/subscription-plans
router.get('/plans/list', async (_req, res) => {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    res.json(plans);
  } catch (error: any) {
    console.error('Error fetching subscription plans:', error);
    res.status(500).json({ error: 'Failed to fetch plans', details: error.message });
  }
});

// POST /api/subscription-plans
router.post('/plans', async (req, res) => {
  try {
    const data = CreatePlanSchema.parse(req.body);
    const plan = await prisma.subscriptionPlan.create({
      data: {
        name: data.name,
        priceCents: data.priceCents,
        description: data.description ?? null,
        image: data.image ?? null,
        isActive: data.isActive ?? true,
        sortOrder: data.sortOrder ?? 0,
      },
    });
    res.status(201).json(plan);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error creating subscription plan:', error);
    res.status(500).json({ error: 'Failed to create plan', details: error.message });
  }
});

// PATCH /api/subscription-plans/:id
router.patch('/plans/:id', async (req, res) => {
  try {
    const data = CreatePlanSchema.partial().parse(req.body);
    const plan = await prisma.subscriptionPlan.update({
      where: { id: req.params.id },
      data,
    });
    res.json(plan);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error updating subscription plan:', error);
    res.status(500).json({ error: 'Failed to update plan', details: error.message });
  }
});

// DELETE /api/subscription-plans/:id
router.delete('/plans/:id', async (req, res) => {
  try {
    await prisma.subscriptionPlan.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting subscription plan:', error);
    res.status(500).json({ error: 'Failed to delete plan', details: error.message });
  }
});

// ══════════════════════════════════════════
// STOREFRONT ENDPOINTS (public, no auth)
// ══════════════════════════════════════════

// GET /api/storefront/subscription-plans — Get available plans
router.get('/storefront/plans', async (_req, res) => {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    res.json(plans);
  } catch (error: any) {
    console.error('Error fetching storefront plans:', error);
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

// GET /api/storefront/subscription-products — Get subscription-eligible products
router.get('/storefront/products', async (_req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { availableForSubscription: true, isActive: true },
      include: {
        variants: { where: { isDefault: true }, take: 1 },
      },
      orderBy: { name: 'asc' },
    });
    res.json(products);
  } catch (error: any) {
    console.error('Error fetching subscription products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// POST /api/storefront/subscriptions — Purchase a subscription (creates record, returns Stripe Checkout URL)
router.post('/storefront/purchase', async (req, res) => {
  try {
    const data = CreateSubscriptionSchema.parse(req.body);

    const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
    if (!customer) {
      return res.status(400).json({ error: 'Customer not found' });
    }

    const subscriptionNumber = await getNextSubscriptionNumber();
    const accessCode = generateAccessCode();

    const subscription = await prisma.$transaction(async (tx) => {
      const sub = await tx.subscription.create({
        data: {
          subscriptionNumber,
          billingType: data.billingType,
          style: data.style,
          planId: data.planId || null,
          colorPalette: data.colorPalette || null,
          defaultPriceCents: data.defaultPriceCents,
          totalPrepaidCents: data.totalPrepaidCents || null,
          totalDeliveries: data.totalDeliveries || null,
          frequency: data.frequency,
          preferredDayOfWeek: data.preferredDayOfWeek ?? null,
          customDates: data.customDates,
          startDate: data.startDate,
          customerId: data.customerId,
          recipientName: data.recipientName,
          recipientPhone: data.recipientPhone || null,
          recipientEmail: data.recipientEmail || null,
          recipientAddress: data.recipientAddress,
          recipientCity: data.recipientCity,
          recipientProvince: data.recipientProvince || null,
          recipientPostalCode: data.recipientPostalCode,
          accessCode,
          notes: data.notes || null,
          source: 'STOREFRONT',
        },
      });

      // Generate deliveries
      if (data.deliveryProducts && data.deliveryProducts.length > 0) {
        for (const dp of data.deliveryProducts) {
          await tx.subscriptionDelivery.create({
            data: {
              subscriptionId: sub.id,
              productId: dp.productId || null,
              productName: dp.productName || null,
              priceCents: dp.priceCents,
              scheduledDate: dp.scheduledDate,
              status: 'SCHEDULED',
            },
          });
        }
      } else {
        const deliveryCount = data.totalDeliveries || 6;
        const dates = generateDeliveryDates(
          data.startDate,
          data.frequency,
          data.preferredDayOfWeek ?? null,
          data.customDates,
          deliveryCount,
        );
        for (const date of dates) {
          await tx.subscriptionDelivery.create({
            data: {
              subscriptionId: sub.id,
              priceCents: data.defaultPriceCents,
              scheduledDate: date,
              status: 'SCHEDULED',
            },
          });
        }
      }

      return sub;
    });

    // TODO: Create Stripe Checkout session here for payment
    // For now, return the subscription directly
    res.status(201).json({
      subscription,
      subscriptionNumber,
      accessCode,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error creating storefront subscription:', error);
    res.status(500).json({ error: 'Failed to create subscription', details: error.message });
  }
});

// GET /api/storefront/subscriptions/lookup — Recipient portal lookup
router.get('/storefront/lookup', async (req, res) => {
  try {
    const { subscriptionNumber, postalCode, accessCode } = req.query;

    let subscription;

    if (accessCode) {
      subscription = await prisma.subscription.findUnique({
        where: { accessCode: accessCode as string },
        include: {
          plan: true,
          deliveries: {
            include: {
              product: { select: { id: true, name: true, images: true } },
            },
            orderBy: { scheduledDate: 'asc' },
          },
        },
      });
    } else if (subscriptionNumber && postalCode) {
      subscription = await prisma.subscription.findFirst({
        where: {
          subscriptionNumber: (subscriptionNumber as string).toUpperCase(),
          recipientPostalCode: {
            equals: (postalCode as string).replace(/\s/g, '').toUpperCase(),
            mode: 'insensitive',
          },
        },
        include: {
          plan: true,
          deliveries: {
            include: {
              product: { select: { id: true, name: true, images: true } },
            },
            orderBy: { scheduledDate: 'asc' },
          },
        },
      });
    } else {
      return res.status(400).json({ error: 'Provide subscriptionNumber + postalCode, or accessCode' });
    }

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    // Don't expose payment/admin details to recipient portal
    const { stripeCustomerId, stripePaymentMethodId, customerId, notes, accessCode: _ac, ...safe } = subscription;
    res.json(safe);
  } catch (error: any) {
    console.error('Error looking up subscription:', error);
    res.status(500).json({ error: 'Failed to look up subscription' });
  }
});

// PATCH /api/storefront/subscriptions/:id/deliveries/:deliveryId — Recipient updates a delivery
router.patch('/storefront/:id/deliveries/:deliveryId', async (req, res) => {
  try {
    const { accessCode } = req.query;
    if (!accessCode) {
      return res.status(401).json({ error: 'Access code required' });
    }

    // Verify access
    const subscription = await prisma.subscription.findFirst({
      where: { id: req.params.id, accessCode: accessCode as string },
    });
    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const delivery = await prisma.subscriptionDelivery.findFirst({
      where: { id: req.params.deliveryId, subscriptionId: req.params.id },
    });
    if (!delivery) {
      return res.status(404).json({ error: 'Delivery not found' });
    }

    // Only allow changes to future deliveries (2+ days out)
    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
    if (delivery.scheduledDate < twoDaysFromNow) {
      return res.status(400).json({ error: 'Cannot modify deliveries less than 2 days away' });
    }

    const data = z.object({
      scheduledDate: z.coerce.date().optional(),
      productId: z.string().uuid().nullable().optional(),
      productName: z.string().nullable().optional(),
      priceCents: z.number().int().positive().optional(),
      customNotes: z.string().nullable().optional(),
    }).parse(req.body);

    if (data.scheduledDate && delivery.rescheduleCount >= 2) {
      return res.status(400).json({ error: 'Maximum reschedules (2) reached for this delivery' });
    }

    const updateData: any = { ...data };
    if (data.scheduledDate) {
      updateData.rescheduleCount = delivery.rescheduleCount + 1;
    }

    const updated = await prisma.subscriptionDelivery.update({
      where: { id: req.params.deliveryId },
      data: updateData,
      include: {
        product: { select: { id: true, name: true, images: true } },
      },
    });

    res.json(updated);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error updating delivery (portal):', error);
    res.status(500).json({ error: 'Failed to update delivery' });
  }
});

export default router;

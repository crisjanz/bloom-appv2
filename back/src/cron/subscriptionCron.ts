import cron from 'node-cron';
import prisma from '../lib/prisma.js';
import { SubscriptionDeliveryStatus, SubscriptionFrequency, OrderType, OrderSource, PaymentStatus } from '@prisma/client';

// ── Delivery Generator ──
// Runs daily: creates upcoming Delivery records for active subscriptions (looks ahead 30 days)

export async function generateUpcomingDeliveries() {
  const startedAt = Date.now();
  let generated = 0;

  try {
    const activeSubscriptions = await prisma.subscription.findMany({
      where: { status: 'ACTIVE' },
      include: {
        deliveries: {
          orderBy: { scheduledDate: 'desc' },
          take: 1,
        },
      },
    });

    const thirtyDaysOut = new Date();
    thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30);

    for (const sub of activeSubscriptions) {
      try {
        // For prepaid, check if limit reached
        if (sub.billingType === 'PREPAID' && sub.totalDeliveries) {
          const totalGenerated = await prisma.subscriptionDelivery.count({
            where: { subscriptionId: sub.id, status: { not: 'SKIPPED' } },
          });
          if (totalGenerated >= sub.totalDeliveries) continue;
        }

        const lastDate = sub.deliveries[0]?.scheduledDate || sub.startDate;
        let nextDate = getNextDeliveryDate(lastDate, sub.frequency, sub.preferredDayOfWeek);

        // Check for existing deliveries on those dates to avoid duplicates
        const existingDates = new Set(
          (await prisma.subscriptionDelivery.findMany({
            where: { subscriptionId: sub.id },
            select: { scheduledDate: true },
          })).map((d) => d.scheduledDate.toISOString().split('T')[0])
        );

        while (nextDate <= thirtyDaysOut) {
          const dateKey = nextDate.toISOString().split('T')[0];
          if (!existingDates.has(dateKey)) {
            // For prepaid, re-check count
            if (sub.billingType === 'PREPAID' && sub.totalDeliveries) {
              const currentCount = await prisma.subscriptionDelivery.count({
                where: { subscriptionId: sub.id, status: { not: 'SKIPPED' } },
              });
              if (currentCount >= sub.totalDeliveries) break;
            }

            await prisma.subscriptionDelivery.create({
              data: {
                subscriptionId: sub.id,
                priceCents: sub.defaultPriceCents,
                scheduledDate: nextDate,
                status: 'SCHEDULED',
              },
            });
            generated++;
            existingDates.add(dateKey);
          }

          nextDate = getNextDeliveryDate(nextDate, sub.frequency, sub.preferredDayOfWeek);
        }

        // Handle CUSTOM frequency
        if (sub.frequency === 'CUSTOM' && sub.customDates.length > 0) {
          for (const customDate of sub.customDates) {
            const d = new Date(customDate);
            if (d > new Date() && d <= thirtyDaysOut) {
              const dateKey = d.toISOString().split('T')[0];
              if (!existingDates.has(dateKey)) {
                await prisma.subscriptionDelivery.create({
                  data: {
                    subscriptionId: sub.id,
                    priceCents: sub.defaultPriceCents,
                    scheduledDate: d,
                    status: 'SCHEDULED',
                  },
                });
                generated++;
              }
            }
          }
        }
      } catch (subError) {
        console.error(`[subscriptions] Error generating deliveries for ${sub.subscriptionNumber}:`, subError);
      }
    }

    const elapsed = Date.now() - startedAt;
    console.log(`[subscriptions] Delivery generation completed in ${elapsed}ms — generated=${generated}`);
  } catch (error) {
    console.error('[subscriptions] Delivery generation failed:', error);
  }
}

function getNextDeliveryDate(
  fromDate: Date,
  frequency: SubscriptionFrequency,
  preferredDayOfWeek: number | null,
): Date {
  const next = new Date(fromDate);

  switch (frequency) {
    case 'WEEKLY':
      next.setDate(next.getDate() + 7);
      break;
    case 'BIWEEKLY':
      next.setDate(next.getDate() + 14);
      break;
    case 'MONTHLY':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'CUSTOM':
      // Custom dates handled separately
      next.setFullYear(next.getFullYear() + 10); // Sentinel — won't be used
      break;
  }

  return next;
}

// ── Order Creator ──
// Runs daily: creates Orders from deliveries scheduled within X days

export async function createOrdersFromDeliveries() {
  const startedAt = Date.now();
  let created = 0;

  try {
    const daysAhead = 2; // Configurable: create orders X days before delivery
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + daysAhead);

    const deliveries = await prisma.subscriptionDelivery.findMany({
      where: {
        scheduledDate: { lte: cutoffDate },
        status: { in: ['SCHEDULED', 'RESCHEDULED'] },
        orderId: null, // No order created yet
        subscription: { status: 'ACTIVE' },
      },
      include: {
        subscription: {
          include: {
            customer: true,
            plan: true,
          },
        },
        product: {
          include: {
            variants: { where: { isDefault: true }, take: 1 },
          },
        },
      },
    });

    for (const delivery of deliveries) {
      try {
        const sub = delivery.subscription;

        // Determine product name for order item
        const productName = delivery.productName ||
          delivery.product?.name ||
          (sub.plan ? `${sub.plan.name} — Designer's Choice` : 'Subscription Delivery');

        // Build delivery note
        const prepaidInfo = sub.billingType === 'PREPAID' && sub.totalDeliveries
          ? ` (Delivery ${sub.completedDeliveries + 1} of ${sub.totalDeliveries})`
          : '';
        const subscriptionNote = `Subscription ${sub.subscriptionNumber}${prepaidInfo}`;

        const order = await prisma.$transaction(async (tx) => {
          // Create order
          const newOrder = await tx.order.create({
            data: {
              type: 'DELIVERY' as OrderType,
              status: 'PAID',
              paymentStatus: PaymentStatus.PAID,
              orderSource: 'WEBSITE' as OrderSource,
              customerId: sub.customerId,
              recipientName: sub.recipientName,
              deliveryDate: delivery.scheduledDate,
              specialInstructions: [subscriptionNote, delivery.customNotes].filter(Boolean).join(' | '),
              paymentAmount: delivery.priceCents,
              orderItems: {
                create: [{
                  productId: delivery.productId || null,
                  customName: productName,
                  unitPrice: delivery.priceCents,
                  quantity: 1,
                  rowTotal: delivery.priceCents,
                }],
              },
            },
          });

          // Link delivery to order
          await tx.subscriptionDelivery.update({
            where: { id: delivery.id },
            data: {
              orderId: newOrder.id,
              status: 'PREPARING',
            },
          });

          // For prepaid, increment completed deliveries
          if (sub.billingType === 'PREPAID') {
            const updated = await tx.subscription.update({
              where: { id: sub.id },
              data: { completedDeliveries: { increment: 1 } },
            });

            // Check if all deliveries completed
            if (sub.totalDeliveries && updated.completedDeliveries >= sub.totalDeliveries) {
              await tx.subscription.update({
                where: { id: sub.id },
                data: { status: 'COMPLETED' },
              });
            }
          }

          return newOrder;
        });

        created++;

        // TODO: For recurring billing, charge the stored card here
        // stripe.paymentIntents.create({ amount: delivery.priceCents, ... })

      } catch (deliveryError) {
        console.error(`[subscriptions] Error creating order for delivery ${delivery.id}:`, deliveryError);
      }
    }

    const elapsed = Date.now() - startedAt;
    console.log(`[subscriptions] Order creation completed in ${elapsed}ms — created=${created}`);
  } catch (error) {
    console.error('[subscriptions] Order creation failed:', error);
  }
}

// ── Start Scheduler ──

export function startSubscriptionScheduler() {
  // Delivery generator: daily at 6:00 AM Pacific
  cron.schedule('0 6 * * *', () => {
    generateUpcomingDeliveries().catch((err) =>
      console.error('[subscriptions] Delivery generation unhandled error:', err)
    );
  }, { timezone: 'America/Vancouver' });

  // Order creator: daily at 7:00 AM Pacific
  cron.schedule('0 7 * * *', () => {
    createOrdersFromDeliveries().catch((err) =>
      console.error('[subscriptions] Order creation unhandled error:', err)
    );
  }, { timezone: 'America/Vancouver' });

  console.log('[subscriptions] Cron scheduled: delivery gen at 06:00, order creation at 07:00 America/Vancouver');
}

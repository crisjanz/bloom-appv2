import express from 'express';
import { PrismaClient, OrderStatus, RouteStatus, StopStatus } from '@prisma/client';
import { z } from 'zod';
import { verifyRouteToken } from '../../utils/routeToken';
import { uploadSignature } from '../../services/signatureUpload';

const router = express.Router();
const prisma = new PrismaClient();

const deliverSchema = z.object({
  driverNotes: z.string().optional(),
  signatureDataUrl: z.string().optional(),
  recipientName: z.string().optional()
});

router.get('/route', async (req, res) => {
  const { token } = req.query;

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Missing token' });
  }

  let orderId: string;

  try {
    ({ orderId } = verifyRouteToken(token));
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        recipientCustomer: {
          select: {
            firstName: true,
            lastName: true,
            phone: true
          }
        },
        deliveryAddress: {
          select: {
            address1: true,
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
            quantity: true
          }
        },
        routeStop: {
          include: {
            route: {
              include: {
                driver: {
                  select: {
                    name: true,
                    phone: true,
                    id: true
                  }
                },
                stops: {
                  include: {
                    order: {
                      select: {
                        id: true,
                        orderNumber: true,
                        recipientCustomer: {
                          select: {
                            firstName: true,
                            lastName: true
                          }
                        },
                        deliveryAddress: {
                          select: {
                            address1: true,
                            city: true,
                            province: true,
                            postalCode: true,
                            country: true
                          }
                        }
                      }
                    }
                  },
                  orderBy: { sequence: 'asc' }
                }
              }
            }
          }
        }
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.routeStop && order.routeStop.route) {
      const route = order.routeStop.route;

      return res.json({
        type: 'route',
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          deliveryTime: order.deliveryTime,
          recipient: {
            firstName: order.recipientCustomer?.firstName || '',
            lastName: order.recipientCustomer?.lastName || '',
            phone: order.recipientCustomer?.phone || ''
          },
          address: {
            address1: order.deliveryAddress?.address1 || '',
            city: order.deliveryAddress?.city || '',
            province: order.deliveryAddress?.province || '',
            postalCode: order.deliveryAddress?.postalCode || '',
            country: order.deliveryAddress?.country || 'CA'
          },
          specialInstructions: order.specialInstructions || '',
          items: order.orderItems.map((item) => ({
            id: item.id,
            customName: item.customName || '',
            quantity: item.quantity
          }))
        },
        route: {
          id: route.id,
          name: route.name,
          status: route.status,
          driver: route.driver
            ? {
                name: route.driver.name,
                phone: route.driver.phone || ''
              }
            : null,
          stops: route.stops.map((stop) => ({
            id: stop.id,
            sequence: stop.sequence,
            isCurrent: stop.order.id === order.id,
            status: stop.status,
            order: {
              orderNumber: stop.order.orderNumber,
              recipient: stop.order.recipientCustomer
                ? {
                    firstName: stop.order.recipientCustomer.firstName,
                    lastName: stop.order.recipientCustomer.lastName
                  }
                : {
                    firstName: '',
                    lastName: ''
                  },
              address: stop.order.deliveryAddress
                ? {
                    address1: stop.order.deliveryAddress.address1,
                    city: stop.order.deliveryAddress.city,
                    province: stop.order.deliveryAddress.province,
                    postalCode: stop.order.deliveryAddress.postalCode || '',
                    country: stop.order.deliveryAddress.country || 'CA'
                  }
                : {
                    address1: '',
                    city: '',
                    province: '',
                    postalCode: '',
                    country: 'CA'
                  }
            },
            driverNotes: stop.driverNotes,
            deliveredAt: stop.deliveredAt ? stop.deliveredAt.toISOString() : null
          }))
        }
      });
    }

    return res.json({
      type: 'standalone',
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        deliveryTime: order.deliveryTime,
        deliveryDate: order.deliveryDate ? order.deliveryDate.toISOString() : '',
        recipient: {
          firstName: order.recipientCustomer?.firstName || '',
          lastName: order.recipientCustomer?.lastName || '',
          phone: order.recipientCustomer?.phone || ''
        },
        address: {
          address1: order.deliveryAddress?.address1 || '',
          city: order.deliveryAddress?.city || '',
          province: order.deliveryAddress?.province || '',
          postalCode: order.deliveryAddress?.postalCode || '',
          country: order.deliveryAddress?.country || 'CA'
        },
        specialInstructions: order.specialInstructions || '',
        cardMessage: order.cardMessage || '',
        items: order.orderItems.map((item) => ({
          id: item.id,
          customName: item.customName || '',
          quantity: item.quantity
        }))
      }
    });
  } catch (error) {
    console.error('Error handling driver route view:', error);
    return res.status(500).json({ error: 'Failed to load route' });
  }
});

router.post('/route/stop/:stopId/deliver', async (req, res) => {
  try {
    const { stopId } = req.params;
    const payload = deliverSchema.parse(req.body);

    const stop = await prisma.routeStop.findUnique({
      where: { id: stopId },
      select: {
        id: true,
        orderId: true,
        routeId: true
      }
    });

    if (!stop) {
      return res.status(404).json({ error: 'Route stop not found' });
    }

    const signatureUrl = payload.signatureDataUrl ? await uploadSignature(payload.signatureDataUrl) : null;

    const updatedStop = await prisma.$transaction(async (tx) => {
      const stopUpdate = await tx.routeStop.update({
        where: { id: stopId },
        data: {
          status: StopStatus.DELIVERED,
          deliveredAt: new Date(),
          driverNotes: payload.driverNotes ?? null,
          signatureUrl: signatureUrl ?? null,
          recipientName: payload.recipientName ?? null
        }
      });

      await tx.order.update({
        where: { id: stop.orderId },
        data: { status: OrderStatus.COMPLETED }
      });

      const routeStops = await tx.routeStop.findMany({
        where: { routeId: stop.routeId },
        select: { status: true }
      });

      const allDelivered = routeStops.every((s) => s.status === StopStatus.DELIVERED);
      const routeUpdate: Partial<{ status: RouteStatus; startedAt: Date; completedAt: Date }> = {};

      routeUpdate.status = allDelivered ? RouteStatus.COMPLETED : RouteStatus.IN_PROGRESS;

      if (routeUpdate.status === RouteStatus.IN_PROGRESS) {
        routeUpdate.startedAt = new Date();
      }

      if (routeUpdate.status === RouteStatus.COMPLETED) {
        routeUpdate.completedAt = new Date();
      }

      await tx.route.update({
        where: { id: stop.routeId },
        data: routeUpdate
      });

      return stopUpdate;
    });

    res.json(updatedStop);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }

    console.error('Error marking stop as delivered:', error);
    res.status(500).json({ error: 'Failed to mark stop as delivered' });
  }
});

export default router;

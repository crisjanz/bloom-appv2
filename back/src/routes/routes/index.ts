import express from 'express';
import { PrismaClient, OrderStatus, OrderType, RouteStatus, StopStatus } from '@prisma/client';
import { z } from 'zod';

const router = express.Router();
const prisma = new PrismaClient();

const querySchema = z.object({
  date: z.string().optional(),
  driverId: z.string().optional(),
  status: z.nativeEnum(RouteStatus).optional()
});

const createRouteSchema = z.object({
  name: z.string().optional(),
  date: z.string(),
  driverId: z.string().optional(),
  orderIds: z.array(z.string()).min(1),
  notes: z.string().optional()
});

const resequenceSchema = z.object({
  stopIds: z.array(z.string()).min(1)
});

const statusSchema = z.object({
  status: z.nativeEnum(RouteStatus)
});

const routeInclude = {
  driver: {
    select: {
      id: true,
      name: true,
      phone: true
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
              city: true
            }
          }
        }
      }
    },
    orderBy: {
      sequence: 'asc'
    }
  }
} satisfies Parameters<typeof prisma.route.findMany>[0]['include'];

type RouteWithRelations = Awaited<ReturnType<typeof prisma.route.findFirstOrThrow>> & {
  stops: Array<{
    id: string;
    sequence: number;
    status: StopStatus;
    orderId: string;
    order: {
      id: string;
      orderNumber: number;
      recipientCustomer: { firstName: string; lastName: string } | null;
      deliveryAddress: { address1: string; city: string } | null;
    };
  }>;
  driver: { id: string; name: string; phone: string | null } | null;
};

function mapRouteResponse(route: RouteWithRelations) {
  return {
    id: route.id,
    routeNumber: route.routeNumber,
    name: route.name,
    date: route.date.toISOString(),
    status: route.status,
    driver: route.driver
      ? {
          id: route.driver.id,
          name: route.driver.name,
          phone: route.driver.phone || ''
        }
      : null,
    stops: route.stops.map((stop) => ({
      id: stop.id,
      sequence: stop.sequence,
      status: stop.status,
      order: {
        id: stop.order.id,
        orderNumber: stop.order.orderNumber,
        recipientCustomer: stop.order.recipientCustomer
          ? {
              firstName: stop.order.recipientCustomer.firstName,
              lastName: stop.order.recipientCustomer.lastName
            }
          : {
              firstName: '',
              lastName: ''
            },
        deliveryAddress: stop.order.deliveryAddress
          ? {
              address1: stop.order.deliveryAddress.address1,
              city: stop.order.deliveryAddress.city
            }
          : {
              address1: '',
              city: ''
            }
      }
    }))
  };
}

router.get('/', async (req, res) => {
  try {
    const params = querySchema.parse(req.query);
    const where: Parameters<typeof prisma.route.findMany>[0]['where'] = {};

    if (params.date) {
      const start = new Date(`${params.date}T00:00:00`);
      const end = new Date(`${params.date}T23:59:59.999`);
      where.date = {
        gte: start,
        lte: end
      };
    }

    if (params.driverId) {
      where.driverId = params.driverId;
    }

    if (params.status) {
      where.status = params.status;
    }

    const routes = await prisma.route.findMany({
      where,
      include: routeInclude,
      orderBy: [
        { date: 'desc' },
        { routeNumber: 'asc' }
      ]
    });

    res.json({
      routes: routes.map(mapRouteResponse)
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }

    console.error('Error fetching routes:', error);
    res.status(500).json({ error: 'Failed to fetch routes' });
  }
});

router.post('/', async (req, res) => {
  try {
    const payload = createRouteSchema.parse(req.body);
    const routeDate = new Date(`${payload.date}T00:00:00`);

    if (payload.driverId) {
      const driver = await prisma.employee.findUnique({ where: { id: payload.driverId } });

      if (!driver) {
        return res.status(400).json({ error: 'Driver not found' });
      }
    }

    const orders = await prisma.order.findMany({
      where: { id: { in: payload.orderIds } },
      select: {
        id: true,
        orderNumber: true,
        type: true,
        routeStop: true,
        deliveryTime: true,
        createdAt: true
      }
    });

    if (orders.length !== payload.orderIds.length) {
      return res.status(400).json({ error: 'One or more orders were not found' });
    }

    const invalidType = orders.find((order) => order.type !== OrderType.DELIVERY);
    if (invalidType) {
      return res.status(400).json({ error: `Order ${invalidType.orderNumber} is not a delivery order` });
    }

    const alreadyRouted = orders.find((order) => order.routeStop);
    if (alreadyRouted) {
      return res.status(400).json({ error: `Order ${alreadyRouted.orderNumber} is already assigned to a route` });
    }

    // Basic sequencing: prioritize earliest delivery time, then creation time
    const orderedOrders = [...orders].sort((a, b) => {
      if (a.deliveryTime && b.deliveryTime && a.deliveryTime !== b.deliveryTime) {
        return a.deliveryTime.localeCompare(b.deliveryTime);
      }

      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    const createdRoute = await prisma.$transaction(async (tx) => {
      const route = await tx.route.create({
        data: {
          name: payload.name ?? null,
          date: routeDate,
          driverId: payload.driverId || null,
          notes: payload.notes ?? null
        }
      });

      await Promise.all(
        orderedOrders.map((order, index) =>
          tx.routeStop.create({
            data: {
              routeId: route.id,
              orderId: order.id,
              sequence: index + 1
            }
          })
        )
      );

      return tx.route.findUniqueOrThrow({
        where: { id: route.id },
        include: routeInclude
      });
    });

    res.status(201).json(mapRouteResponse(createdRoute as RouteWithRelations));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }

    console.error('Error creating route:', error);
    res.status(500).json({ error: 'Failed to create route' });
  }
});

router.put('/:id/resequence', async (req, res) => {
  try {
    const { id } = req.params;
    const payload = resequenceSchema.parse(req.body);

    const route = await prisma.route.findUnique({
      where: { id },
      include: {
        stops: {
          select: { id: true, sequence: true },
          orderBy: { sequence: 'asc' }
        }
      }
    });

    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }

    if (route.status === RouteStatus.COMPLETED) {
      return res.status(400).json({ error: 'Cannot resequence a completed route' });
    }

    if (payload.stopIds.length !== route.stops.length) {
      return res.status(400).json({ error: 'All route stops must be provided for resequencing' });
    }

    const routeStopIds = new Set(route.stops.map((stop) => stop.id));
    const missingStop = payload.stopIds.find((stopId) => !routeStopIds.has(stopId));

    if (missingStop) {
      return res.status(400).json({ error: 'One or more stops do not belong to this route' });
    }

    await prisma.$transaction(async (tx) => {
      await Promise.all(
        payload.stopIds.map((stopId, index) =>
          tx.routeStop.update({
            where: { id: stopId },
            data: { sequence: index + 1 }
          })
        )
      );
    });

    const updatedRoute = await prisma.route.findUniqueOrThrow({
      where: { id },
      include: routeInclude
    });

    res.json(mapRouteResponse(updatedRoute as RouteWithRelations));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }

    console.error('Error resequencing route:', error);
    res.status(500).json({ error: 'Failed to resequence route' });
  }
});

router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const payload = statusSchema.parse(req.body);

    const existing = await prisma.route.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({ error: 'Route not found' });
    }

    const data: Partial<{ status: RouteStatus; startedAt: Date | null; completedAt: Date | null }> = {
      status: payload.status
    };

    if (payload.status === RouteStatus.IN_PROGRESS && !existing.startedAt) {
      data.startedAt = new Date();
    }

    if (payload.status === RouteStatus.COMPLETED) {
      data.completedAt = new Date();
    }

    const updated = await prisma.route.update({
      where: { id },
      data
    });

    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }

    console.error('Error updating route status:', error);
    res.status(500).json({ error: 'Failed to update route status' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const route = await prisma.route.findUnique({ where: { id } });

    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }

    if (route.status !== RouteStatus.PLANNED) {
      return res.status(400).json({ error: 'Only planned routes can be deleted' });
    }

    await prisma.route.delete({ where: { id } });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting route:', error);
    res.status(500).json({ error: 'Failed to delete route' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const payload = createRouteSchema.partial().parse(req.body);

    const route = await prisma.route.findUnique({ where: { id } });

    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }

    const updated = await prisma.route.update({
      where: { id },
      data: {
        name: payload.name ?? route.name,
        driverId: payload.driverId ?? route.driverId,
        notes: payload.notes ?? route.notes
      },
      include: routeInclude
    });

    res.json(mapRouteResponse(updated as RouteWithRelations));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }

    console.error('Error updating route:', error);
    res.status(500).json({ error: 'Failed to update route' });
  }
});

export default router;

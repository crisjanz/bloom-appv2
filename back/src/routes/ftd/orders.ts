import express from "express";
import { PrismaClient, OrderExternalSource, FtdOrderStatus } from "@prisma/client";
import { fetchFtdOrders, refreshFtdOrderDetails } from "../../services/ftdMonitor";

const router = express.Router();
const prisma = new PrismaClient();

const NEEDS_ACTION_STATUSES = new Set<FtdOrderStatus>([FtdOrderStatus.NEEDS_ACTION]);
const ACCEPTED_STATUSES = new Set<FtdOrderStatus>([
  FtdOrderStatus.ACCEPTED,
  FtdOrderStatus.IN_DESIGN,
  FtdOrderStatus.READY
]);
const DELIVERED_STATUSES = new Set<FtdOrderStatus>([FtdOrderStatus.DELIVERED]);

// Stats endpoint
router.get("/stats/summary", async (_req, res) => {
  try {
    const ftdOrders = await prisma.ftdOrder.findMany({
      select: { status: true, totalAmount: true }
    });

    const totalOrders = ftdOrders.length;
    const needsAction = ftdOrders.filter((o) => NEEDS_ACTION_STATUSES.has(o.status)).length;
    const accepted = ftdOrders.filter((o) => ACCEPTED_STATUSES.has(o.status)).length;
    const delivered = ftdOrders.filter((o) => DELIVERED_STATUSES.has(o.status)).length;
    const totalRevenue = ftdOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    res.json({
      success: true,
      stats: {
        totalOrders,
        needsAction,
        accepted,
        delivered,
        totalRevenue
      }
    });
  } catch (error: any) {
    console.error("Error fetching FTD stats:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// List FTD orders
router.get("/", async (req, res) => {
  try {
    const { status, needsUpdate, deliveryDate, search } = req.query;

    const where: any = {};

    // If search is active, ONLY apply search - ignore other filters
    if (search && typeof search === 'string' && search.trim()) {
      const searchTerm = search.trim();
      where.OR = [
        { recipientFirstName: { contains: searchTerm, mode: 'insensitive' } },
        { recipientLastName: { contains: searchTerm, mode: 'insensitive' } },
        { recipientPhone: { contains: searchTerm } },
        {
          linkedOrder: {
            customer: {
              OR: [
                { firstName: { contains: searchTerm, mode: 'insensitive' } },
                { lastName: { contains: searchTerm, mode: 'insensitive' } },
                { phone: { contains: searchTerm } }
              ]
            }
          }
        },
        {
          linkedOrder: {
            recipientCustomer: {
              OR: [
                { firstName: { contains: searchTerm, mode: 'insensitive' } },
                { lastName: { contains: searchTerm, mode: 'insensitive' } },
                { phone: { contains: searchTerm } }
              ]
            }
          }
        }
      ];
    } else {
      // Only apply other filters when NOT searching
      if (status) {
        where.status = status;
      }

      if (needsUpdate === "true") {
        where.needsApproval = true;
      }

      // Filter by delivery date if provided
      if (deliveryDate && typeof deliveryDate === 'string') {
        const date = new Date(deliveryDate + 'T00:00:00');
        const nextDay = new Date(deliveryDate + 'T23:59:59');

        where.deliveryDate = {
          gte: date,
          lte: nextDay
        };
      }
    }

    const ftdOrders = await prisma.ftdOrder.findMany({
      where,
      include: {
        linkedOrder: {
          include: {
            customer: true,
            recipientCustomer: true,
            deliveryAddress: true,
            orderItems: true
          }
        }
      },
      orderBy: { deliveryDate: "asc" }
    });

    // Map FTD orders to format expected by frontend
    const orders = ftdOrders.map((ftdOrder) => {
      if (ftdOrder.linkedOrder) {
        // Return linked Bloom order with FTD metadata
        return {
          ...ftdOrder.linkedOrder,
          externalStatus: ftdOrder.status,
          needsExternalUpdate: ftdOrder.needsApproval,
          importedPayload: {
            productDescription: ftdOrder.productDescription,
            cardMessage: ftdOrder.cardMessage,
            detailedFetchedAt: ftdOrder.detailedFetchedAt
          },
          ftdOrderId: ftdOrder.id,
          // Ensure orderItems is always an array
          orderItems: ftdOrder.linkedOrder.orderItems || []
        };
      }

      // Return FTD order without linked Bloom order (draft state)
      return {
        id: ftdOrder.id,
        orderNumber: ftdOrder.externalId,
        status: "DRAFT",
        externalStatus: ftdOrder.status,
        needsExternalUpdate: ftdOrder.needsApproval,
        customer: null,
        recipientCustomer: null,
        deliveryAddress: {
          firstName: ftdOrder.recipientFirstName,
          lastName: ftdOrder.recipientLastName,
          city: ftdOrder.city,
          address1: ftdOrder.address1,
          address2: ftdOrder.address2,
          province: ftdOrder.province,
          postalCode: ftdOrder.postalCode,
          country: ftdOrder.country,
          phone: ftdOrder.recipientPhone
        },
        deliveryDate: ftdOrder.deliveryDate,
        cardMessage: ftdOrder.cardMessage,
        specialInstructions: ftdOrder.deliveryInstructions,
        paymentAmount: ftdOrder.totalAmount || 0,
        orderItems: [],
        createdAt: ftdOrder.createdAt,
        updatedAt: ftdOrder.updatedAt,
        importedPayload: {
          productDescription: ftdOrder.productDescription,
          cardMessage: ftdOrder.cardMessage
        },
        ftdOrderId: ftdOrder.id
      };
    });

    res.json({ success: true, orders });
  } catch (error: any) {
    console.error("Error fetching FTD orders:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Single FTD order
router.get("/:id", async (req, res) => {
  try {
    const ftdOrder = await prisma.ftdOrder.findUnique({
      where: { id: req.params.id },
      include: {
        linkedOrder: {
          include: {
            customer: true,
            recipientCustomer: true,
            deliveryAddress: true,
            orderItems: true
          }
        }
      }
    });

    if (!ftdOrder) {
      return res.status(404).json({ success: false, error: "FTD order not found" });
    }

    res.json({ success: true, ftdOrder });
  } catch (error: any) {
    console.error("Error fetching FTD order:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Manual sync trigger
router.post("/update", async (_req, res) => {
  try {
    await fetchFtdOrders(true, true);
    res.json({ success: true, message: "FTD orders updated (full sync)" });
  } catch (error: any) {
    console.error("Error updating FTD orders:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// NEW: Manual refresh detailed payload
router.post("/:id/refresh-details", async (req, res) => {
  try {
    const updated = await refreshFtdOrderDetails(req.params.id);

    res.json({
      success: true,
      message: "FTD order details refreshed successfully",
      ftdOrder: updated
    });
  } catch (error: any) {
    console.error("Error refreshing FTD order details:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

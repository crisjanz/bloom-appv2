import express from "express";
import { PrismaClient } from "@prisma/client";
import { fetchFtdOrders } from "../../services/ftdMonitor";

const router = express.Router();
const prisma = new PrismaClient();

// Get orders needing approval (MUST come before /:id route)
router.get("/needs-approval", async (req, res) => {
  try {
    const orders = await prisma.ftdOrder.findMany({
      where: {
        needsApproval: true,
        linkedOrderId: { not: null },
      },
      include: {
        linkedOrder: {
          include: {
            customer: true,
            deliveryAddress: true,
            orderItems: true,
          }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, orders });
  } catch (error: any) {
    console.error("Error fetching approval orders:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get FTD order statistics
router.get("/stats/summary", async (req, res) => {
  try {
    const statuses = await prisma.ftdOrder.groupBy({
      by: ['status'],
      _count: true,
    });

    const totalOrders = await prisma.ftdOrder.count();
    const needsAction = statuses.find(s => s.status === 'NEEDS_ACTION')?._count || 0;
    const accepted = statuses.find(s => s.status === 'ACCEPTED')?._count || 0;
    const delivered = statuses.find(s => s.status === 'DELIVERED')?._count || 0;

    const totalRevenue = await prisma.ftdOrder.aggregate({
      where: { status: 'DELIVERED' },
      _sum: { totalAmount: true },
    });

    res.json({
      success: true,
      stats: {
        totalOrders,
        needsAction,
        accepted,
        delivered,
        totalRevenue: totalRevenue._sum.totalAmount || 0,
        byStatus: statuses,
      }
    });
  } catch (error: any) {
    console.error("Error fetching FTD stats:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all FTD orders with filters
router.get("/", async (req, res) => {
  try {
    const { status, from, to, sendingFlorist } = req.query;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (from || to) {
      where.deliveryDate = {};
      if (from) where.deliveryDate.gte = new Date(from as string + 'T00:00:00');
      if (to) where.deliveryDate.lte = new Date(to as string + 'T23:59:59');
    }

    if (sendingFlorist) {
      where.sendingFloristCode = sendingFlorist;
    }

    const orders = await prisma.ftdOrder.findMany({
      where,
      include: {
        linkedOrder: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
          }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, orders });
  } catch (error: any) {
    console.error("Error fetching FTD orders:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single FTD order
router.get("/:id", async (req, res) => {
  try {
    const order = await prisma.ftdOrder.findUnique({
      where: { id: req.params.id },
      include: {
        linkedOrder: {
          include: {
            customer: true,
            deliveryAddress: true,
            orderItems: true,
          }
        }
      },
    });

    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    res.json({ success: true, order });
  } catch (error: any) {
    console.error("Error fetching FTD order:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update FTD order status (local tracking only, does NOT update FTD)
router.put("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, error: "Status is required" });
    }

    const order = await prisma.ftdOrder.update({
      where: { id: req.params.id },
      data: { status },
    });

    res.json({ success: true, order });
  } catch (error: any) {
    console.error("Error updating FTD order status:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Link FTD order to Bloom order
router.post("/:id/link", async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ success: false, error: "Order ID is required" });
    }

    const ftdOrder = await prisma.ftdOrder.update({
      where: { id: req.params.id },
      data: { linkedOrderId: orderId },
    });

    res.json({ success: true, ftdOrder });
  } catch (error: any) {
    console.error("Error linking FTD order:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Force refresh FTD orders (manual update button)
router.post("/update", async (req, res) => {
  try {
    console.log("🔄 Manual FTD update requested (FULL SYNC - bypassing business hours)");

    // Trigger immediate FULL sync (not delta), bypass business hours check
    await fetchFtdOrders(true, true); // forceFullSync = true, bypassBusinessHours = true

    // Return updated orders
    const orders = await prisma.ftdOrder.findMany({
      include: {
        linkedOrder: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
          }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      message: "FTD orders updated (full sync)",
      orders
    });
  } catch (error: any) {
    console.error("Error updating FTD orders:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Mark order as approved
router.post("/:id/approve", async (req, res) => {
  try {
    const ftdOrder = await prisma.ftdOrder.update({
      where: { id: req.params.id },
      data: { needsApproval: false },
      include: {
        linkedOrder: true,
      }
    });

    res.json({ success: true, ftdOrder });
  } catch (error: any) {
    console.error("Error approving FTD order:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

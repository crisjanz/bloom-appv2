import express from "express";
import axios from "axios";
import { PrismaClient, OrderExternalSource, OrderStatus } from "@prisma/client";
import { fetchFtdOrders, normalizeFtdPayload } from "../../services/ftdMonitor";

const router = express.Router();
const prisma = new PrismaClient();

const NEEDS_ACTION_STATUSES = new Set([
  "NEW",
  "VIEWED",
  "PENDING",
  "SENT",
  "FORWARDED",
  "PRINTED"
]);

const ACCEPTED_STATUSES = new Set(["ACKNOWLEDGED", "ACKNOWLEDGE_PRINT"]);
const DELIVERED_STATUSES = new Set(["DELIVERED"]);

// Get orders needing review (drafts or flagged updates)
router.get("/needs-approval", async (_req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: {
        externalSource: OrderExternalSource.FTD,
        needsExternalUpdate: true
      },
      include: {
        customer: true,
        recipientCustomer: true,
        deliveryAddress: true,
        orderItems: true
      },
      orderBy: { createdAt: "desc" }
    });

    res.json({ success: true, orders });
  } catch (error: any) {
    console.error("Error fetching FTD approvals:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Stats endpoint
router.get("/stats/summary", async (_req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { externalSource: OrderExternalSource.FTD },
      select: { externalStatus: true, paymentAmount: true }
    });

    const totalOrders = orders.length;
    const needsAction = orders.filter((o) => o.externalStatus && NEEDS_ACTION_STATUSES.has(o.externalStatus)).length;
    const accepted = orders.filter((o) => o.externalStatus && ACCEPTED_STATUSES.has(o.externalStatus)).length;
    const delivered = orders.filter((o) => o.externalStatus && DELIVERED_STATUSES.has(o.externalStatus)).length;
    const totalRevenue = orders.reduce((sum, o) => sum + (o.paymentAmount || 0), 0);

    res.json({
      success: true,
      stats: {
        totalOrders,
        needsAction,
        accepted,
        delivered,
        totalRevenue,
        byStatus: []
      }
    });
  } catch (error: any) {
    console.error("Error fetching FTD stats:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// List orders
router.get("/", async (req, res) => {
  try {
    const { status, needsUpdate } = req.query;

    const where: any = { externalSource: OrderExternalSource.FTD };

    if (status) {
      where.externalStatus = status;
    }

    if (needsUpdate === "true") {
      where.needsExternalUpdate = true;
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        customer: true,
        recipientCustomer: true,
        deliveryAddress: true,
        orderItems: true
      },
      orderBy: { createdAt: "desc" }
    });

    res.json({ success: true, orders });
  } catch (error: any) {
    console.error("Error fetching FTD orders:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Single order
router.get("/:id", async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        recipientCustomer: true,
        deliveryAddress: true,
        orderItems: true
      }
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

// Update order status manually
router.put("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, error: "Status is required" });
    }

    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { status },
      include: {
        customer: true,
        recipientCustomer: true,
        deliveryAddress: true,
        orderItems: true
      }
    });

    res.json({ success: true, order });
  } catch (error: any) {
    console.error("Error updating FTD order status:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Link an existing Bloom order to an FTD payload
router.post("/:id/link", async (req, res) => {
  try {
    const { externalId } = req.body;
    if (!externalId) {
      return res.status(400).json({ success: false, error: "externalId is required" });
    }

    const payload = await fetchSingleFtdPayload(externalId);
    if (!payload) {
      return res.status(404).json({ success: false, error: `FTD order ${externalId} not found` });
    }

    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: {
        externalSource: OrderExternalSource.FTD,
        externalReference: payload.externalId,
        importedPayload: payload.raw,
        externalStatus: payload.status,
        needsExternalUpdate: true
      },
      include: {
        customer: true,
        recipientCustomer: true,
        deliveryAddress: true,
        orderItems: true
      }
    });

    res.json({ success: true, order });
  } catch (error: any) {
    console.error("Error linking FTD order:", error);
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

// Acknowledge order updates
router.post("/:id/approve", async (req, res) => {
  try {
    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { needsExternalUpdate: false },
      include: {
        customer: true,
        recipientCustomer: true,
        deliveryAddress: true,
        orderItems: true
      }
    });
    res.json({ success: true, order });
  } catch (error: any) {
    console.error("Error acknowledging FTD order:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

async function fetchSingleFtdPayload(externalId: string) {
  const settings = await prisma.ftdSettings.findFirst();
  if (!settings) {
    throw new Error("FTD settings not configured");
  }

  const token = settings.authToken;
  if (!token) {
    throw new Error("FTD auth token missing; refresh token first");
  }

  const headers = {
    Authorization: `apiKey ${settings.apiKey}`,
    "ep-authorization": token,
    Origin: "https://mercuryhq.com",
    Referer: "https://mercuryhq.com/",
    "X-Timezone": "America/Vancouver",
    "client-context": '{"siteId":"mercuryos"}',
    "request-context": `{"authGroupName":"ADMIN_ROLE","memberCodes":["${settings.shopId}"],"shopGroups":["IN YOUR VASE FLOWERS"],"roles":["ADMIN"]}`,
    "Content-Type": "application/json",
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36"
  };

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  const url = `https://pt.ftdi.com/e/p/mercury/${settings.shopId}/orders?startDate=${startDate
    .toISOString()
    .split("T")[0]}&status=&endDate=&deltaOrders=false&listingFilter=DELIVERY_DATE&listingPage=orders`;

  const response = await axios.get(url, { headers, timeout: 30000 });
  const orders = response.data || [];
  const match = orders.find(
    (order: any) =>
      order.messageNumber === externalId ||
      order.external_id === externalId ||
      order.orderNumber === externalId
  );

  if (!match) {
    return null;
  }

  return normalizeFtdPayload(match);
}

export default router;

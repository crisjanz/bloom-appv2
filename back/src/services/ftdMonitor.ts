import axios from "axios";
import { PrismaClient, AddressType, OrderStatus, FtdOrderStatus } from "@prisma/client";
import { sendFtdOrderNotification } from "./ftdNotification";
import { isWithinBusinessHours } from "../utils/businessHours";
import transactionService from "./transactionService";

const prisma = new PrismaClient();
const axiosClient = axios.create();

let currentToken = "";
let isPolling = false;
let pollingInterval: NodeJS.Timeout | null = null;

export async function startFtdMonitor() {
  const settings = await prisma.ftdSettings.findFirst();

  if (!settings) {
    console.log("⚠️  FTD settings not found. Please configure FTD integration first.");
    return;
  }

  if (!settings.pollingEnabled) {
    console.log("ℹ️  FTD monitoring is disabled in settings");
    return;
  }

  currentToken = settings.authToken || "";

  if (pollingInterval) {
    clearInterval(pollingInterval);
  }

  console.log(`🌸 FTD Monitor started - polling every ${settings.pollingInterval}s (business hours only)`);

  const isOpen = await isWithinBusinessHours();
  const shouldInitialFetch =
    isOpen &&
    (!settings.lastSyncTime ||
      Date.now() - settings.lastSyncTime.getTime() > settings.pollingInterval * 1000);

  if (shouldInitialFetch) {
    console.log("🔄 Running initial FTD sync...");
    await fetchFtdOrders();
  } else if (!isOpen) {
    console.log("⏸️  Skipping initial fetch - outside business hours");
  } else {
    const secondsAgo = Math.floor((Date.now() - settings.lastSyncTime!.getTime()) / 1000);
    console.log(`⏭️  Skipping initial fetch - last sync was recent (${secondsAgo}s ago)`);
  }

  pollingInterval = setInterval(fetchFtdOrders, settings.pollingInterval * 1000);
  isPolling = true;
}

export async function stopFtdMonitor() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
  isPolling = false;
  console.log("🛑 FTD Monitor stopped");
}

// Main sync function - only checks status from list endpoint
export async function fetchFtdOrders(forceFullSync: boolean = false, bypassBusinessHours: boolean = false) {
  try {
    if (!bypassBusinessHours && !forceFullSync) {
      const isOpen = await isWithinBusinessHours();
      if (!isOpen) {
        console.log("⏸️  FTD polling paused - outside business hours");
        return;
      }
    }

    const settings = await prisma.ftdSettings.findFirst();
    if (!settings) {
      console.error("❌ FTD settings not found");
      return;
    }

    const tokenToUse = settings.authToken || currentToken;
    if (!tokenToUse) {
      console.error("❌ No auth token available. Please refresh token first.");
      return;
    }

    // Build headers for FTD API
    const headers = buildFtdHeaders(settings, tokenToUse);

    // Get list of orders (last 7 days + future 30 days)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7); // Last 7 days
    const startDateStr = startDate.toISOString().split("T")[0];

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30); // Next 30 days
    const endDateStr = endDate.toISOString().split("T")[0];

    const statuses = [
      "NEW", "VIEWED", "ACKNOWLEDGED", "PENDING", "SENT", "FORWARDED", "PRINTED",
      "DS_REQUESTED", "DS_REQUEST_PENDING", "ACKNOWLEDGE_PRINT", "DESIGN", "DESIGNED",
      "OUT_FOR_DELIVERY", "REJECTED", "CANCELLED", "DELIVERED", "ERROR", "FORFEITED"
    ].join(",");

    // Use delta sync for incremental updates
    const useDeltaSync = !forceFullSync && !!settings.lastSyncTime;
    let lastSyncTime = "";
    if (settings.lastSyncTime && useDeltaSync) {
      lastSyncTime = settings.lastSyncTime.toISOString().split(".")[0] + "Z";
    }

    const encodedLastSyncTime = encodeURIComponent(lastSyncTime);
    const apiUrl = `https://pt.ftdi.com/e/p/mercury/${settings.shopId}/orders?startDate=${startDateStr}&status=${statuses}&endDate=${endDateStr}&deltaOrders=${useDeltaSync}&lastSyncTime=${encodedLastSyncTime}&listingFilter=DELIVERY_DATE&listingPage=orders`;

    console.log(
      forceFullSync
        ? "🔄 Fetching FTD orders (FULL SYNC)"
        : `🔄 Fetching FTD orders (deltaSync: ${useDeltaSync}, lastSync: ${lastSyncTime || "never"})`
    );

    const res = await axios.get(apiUrl, { headers, timeout: 30000 });

    if (res.status === 401 || res.status === 403) {
      console.log("🔒 FTD token expired, refresh needed");
      return;
    }

    const orders = res.data;
    console.log(`📦 Fetched ${orders.length} FTD orders from list API`);

    let newCount = 0;
    let updatedCount = 0;

    for (const ftdListData of orders) {
      const result = await processFtdOrder(ftdListData, settings);
      if (result === "new") newCount++;
      if (result === "updated") updatedCount++;
    }

    if (newCount > 0 || updatedCount > 0) {
      console.log(`✅ Processed ${newCount} new, ${updatedCount} updated FTD orders`);
    }

    await prisma.ftdSettings.updateMany({
      data: { lastSyncTime: new Date() }
    });
  } catch (err: any) {
    if (err.code === "ECONNABORTED") {
      console.error("⏱️  FTD API request timeout");
    } else {
      console.error("❌ FTD fetch error:", err.message);
    }
  }
}

// Process single FTD order from list endpoint
async function processFtdOrder(ftdListData: any, settings: { shopId: string }): Promise<"new" | "updated" | "unchanged"> {
  const externalId = ftdListData.messageNumber || ftdListData.external_id;

  if (!externalId) {
    console.warn("⚠️ FTD order missing messageNumber, skipping");
    return "unchanged";
  }

  // Skip outgoing orders - use direction field
  if (ftdListData.direction !== "INBOUND") {
    console.log(`↩️ Skipping non-inbound FTD order ${externalId} (direction: ${ftdListData.direction})`);
    return "unchanged";
  }

  const existing = await prisma.ftdOrder.findUnique({
    where: { externalId },
    include: { linkedOrder: true }
  });

  if (!existing) {
    // NEW ORDER - Fetch detailed payload ONCE
    const orderItemId = ftdListData.orderItemId || externalId;
    console.log(`🆕 New FTD order ${externalId} - fetching detailed payload (orderItemId: ${orderItemId})...`);
    const detailed = await fetchDetailedPayload(orderItemId, settings.shopId);

    if (!detailed) {
      console.error(`❌ Could not fetch detailed payload for ${orderItemId}`);
      return "unchanged";
    }

    const ftdOrder = await createFtdOrder(externalId, ftdListData, detailed, settings);

    // Send notification
    await sendFtdOrderNotification({
      externalId: ftdOrder.externalId,
      recipientFirstName: ftdOrder.recipientFirstName,
      recipientLastName: ftdOrder.recipientLastName,
      city: ftdOrder.city,
      deliveryDate: ftdOrder.deliveryDate,
      productDescription: ftdOrder.productDescription,
      totalAmount: ftdOrder.totalAmount,
      cardMessage: ftdOrder.cardMessage,
      deliveryInstructions: ftdOrder.deliveryInstructions
    });

    // Auto-create Bloom order for ALL inbound orders (not just ACCEPTED)
    await autoCreateBloomOrder(ftdOrder);

    return "new";
  }

  // EXISTING ORDER - Align both FTD + Bloom status every poll
  const newStatus = mapFtdStatus(ftdListData.status);
  const statusChanged = existing.status !== newStatus;

  const updated = await prisma.ftdOrder.update({
    where: { id: existing.id },
    data: {
      ...(statusChanged ? { status: newStatus } : {}),
      lastCheckedAt: new Date()
    },
    include: { linkedOrder: true }
  });

  if (statusChanged) {
    console.log(`🔄 FTD ${existing.externalId}: ${existing.status} → ${newStatus}`);
  }

  if (!updated.linkedOrderId) {
    await autoCreateBloomOrder(updated);
    const reloaded = await prisma.ftdOrder.findUnique({
      where: { id: updated.id },
      include: { linkedOrder: true }
    });
    if (reloaded?.linkedOrderId) {
      await syncBloomOrderStatus(reloaded);
    }
  } else {
    await syncBloomOrderStatus(updated);
  }

  return statusChanged ? "updated" : "unchanged";
}

// Create new FTD order from detailed payload
async function createFtdOrder(externalId: string, listData: any, detailedData: any, settings: { shopId: string }) {
  const status = mapFtdStatus(listData.status);

  // Extract from DETAILED payload (source of truth)
  const recipientInfo = detailedData.recipientInfo || {};
  const deliveryInfo = detailedData.deliveryInfo || {};

  // Merge delivery instructions (specialInstructions + deliveryInstructions)
  const specialInstructions = detailedData.specialInstructions || "";
  const deliveryInstructions = deliveryInfo.deliveryInstructions || "";
  const mergedInstructions = [specialInstructions, deliveryInstructions]
    .filter(Boolean)
    .join("\n")
    .trim() || null;

  const ftdOrder = await prisma.ftdOrder.create({
    data: {
      externalId,
      ftdOrderNumber: parseOrderNumber(detailedData.erosOrderNumber || detailedData.messageNumber),
      status,

      // Recipient info from detail endpoint
      recipientFirstName: cleanString(recipientInfo.firstName),
      recipientLastName: cleanString(recipientInfo.lastName),
      recipientPhone: recipientInfo.phone,
      recipientEmail: recipientInfo.email,

      // Address from detail endpoint
      address1: recipientInfo.addressLine1,
      address2: recipientInfo.addressLine2,
      city: recipientInfo.city,
      province: recipientInfo.state,
      postalCode: recipientInfo.zip,
      country: recipientInfo.country || "CA",
      addressType: AddressType.RESIDENCE, // Default, FTD doesn't provide this

      // Delivery info
      deliveryDate: parseDate(deliveryInfo.deliveryDate),
      deliveryTime: null, // FTD doesn't provide specific time
      deliveryInstructions: mergedInstructions,

      // Order content from detail endpoint
      cardMessage: cleanString(deliveryInfo.cardMessage),
      occasion: null, // Don't use FTD occasion field - card message already captured above
      productDescription: buildProductDescription(detailedData),
      productCode: detailedData.orderItemId,

      // Pricing
      totalAmount: extractTotalAmount(detailedData),

      // FTD metadata (use from detail endpoint for full info)
      sendingFloristCode: detailedData.sendingMember?.memberCode || listData.sendingMember?.memberCode,

      // Store full detailed payload
      ftdRawData: detailedData,
      detailedFetchedAt: new Date(),
      lastCheckedAt: new Date()
    }
  });

  console.log(`✨ Created FTD order ${externalId} (${status})`);
  return ftdOrder;
}

// Auto-create Bloom order from FTD order
async function autoCreateBloomOrder(ftdOrder: any) {
  try {
    // Get or create sending florist customer with FULL details
    const rawData = ftdOrder.ftdRawData as any;
    const sendingMember = rawData?.sendingMember || {};
    const floristCode = ftdOrder.sendingFloristCode || "unknown";
    const floristPhone = sendingMember.phone || `ftd-${floristCode}`;

    let senderCustomer = await prisma.customer.findFirst({
      where: { phone: floristPhone }
    });

    if (!senderCustomer) {
      senderCustomer = await prisma.customer.create({
        data: {
          firstName: sendingMember.businessName || "FTD Florist",
          lastName: `#${floristCode}`,
          phone: floristPhone,
          email: sendingMember.email,
          notes: [
            `FTD sending florist: ${sendingMember.businessName || floristCode}`,
            sendingMember.addressLine1 ? `Address: ${sendingMember.addressLine1}, ${sendingMember.city}, ${sendingMember.state} ${sendingMember.zip}` : "",
            sendingMember.email ? `Email: ${sendingMember.email}` : ""
          ]
            .filter(Boolean)
            .join("\n")
        }
      });
      console.log(`👤 Created FTD florist customer: ${sendingMember.businessName || floristCode}`);
    }

    // Get or create recipient customer
    let recipientCustomer = await findOrCreateRecipientCustomer(ftdOrder);

    // Create delivery address
    const deliveryAddress = await prisma.address.create({
      data: {
        firstName: ftdOrder.recipientFirstName || "",
        lastName: ftdOrder.recipientLastName || "",
        address1: ftdOrder.address1 || "",
        address2: ftdOrder.address2,
        city: ftdOrder.city || "",
        province: ftdOrder.province || "",
        postalCode: ftdOrder.postalCode || "",
        country: ftdOrder.country || "CA",
        phone: ftdOrder.recipientPhone,
        addressType: ftdOrder.addressType || AddressType.RESIDENCE,
        customerId: recipientCustomer.id
      }
    });

    const productDescription = ftdOrder.productDescription || 'Imported FTD product';

    // Map FTD status to Bloom OrderStatus
    const bloomStatus = mapFtdStatusToBloomStatus(ftdOrder.status);

    // Calculate delivery fee and product price
    // FTD total includes everything - we split it: $15 delivery + remaining for product
    const ftdTotal = ftdOrder.totalAmount || 0; // Already in cents
    const deliveryFee = 1500; // $15.00 flat rate in cents
    const productPrice = Math.max(0, ftdTotal - deliveryFee); // Product = Total - Delivery

    // Create Bloom order
    const bloomOrder = await prisma.order.create({
      data: {
        type: "DELIVERY",
        status: bloomStatus,
        orderSource: "WIREIN",
        customerId: senderCustomer.id,
        recipientCustomerId: recipientCustomer.id,
        deliveryAddressId: deliveryAddress.id,
        deliveryDate: ftdOrder.deliveryDate,
        deliveryTime: ftdOrder.deliveryTime,
        cardMessage: ftdOrder.cardMessage,
        specialInstructions: ftdOrder.deliveryInstructions,
        occasion: null, // Don't use FTD occasion - card message already set above
        deliveryFee: deliveryFee, // $15.00 flat rate
        paymentAmount: ftdTotal, // Keep FTD total
        totalTax: 0, // FTD handles taxes
        orderItems: {
          create: {
            customName: 'FTD Imported Product',
            description: productDescription,
            unitPrice: productPrice, // Total minus delivery fee
            quantity: 1,
            rowTotal: productPrice // Total minus delivery fee
          }
        }
      }
    });

    // Link FTD order to Bloom order
    await prisma.ftdOrder.update({
      where: { id: ftdOrder.id },
      data: {
        linkedOrderId: bloomOrder.id,
        needsApproval: false
      }
    });

    // Create payment transaction for FTD order
    // NOTE: All amounts stored in cents for consistency
    try {
      const paymentTransaction = await transactionService.createTransaction({
        customerId: senderCustomer.id,
        employeeId: undefined, // FTD orders are automated
        channel: 'WEBSITE', // Use WEBSITE as proxy for wire-in orders
        totalAmount: ftdOrder.totalAmount || 0, // Already in cents
        taxAmount: 0, // FTD includes tax in total
        tipAmount: 0,
        notes: `FTD Wire-In Order ${ftdOrder.externalId}`,
        receiptEmail: undefined,
        paymentMethods: [{
          type: 'FTD' as any, // FTD wire-in payment (pre-paid via FTD network)
          provider: 'INTERNAL' as any,
          amount: ftdOrder.totalAmount || 0, // Already in cents
          providerTransactionId: ftdOrder.externalId,
          providerMetadata: {
            source: 'FTD',
            ftdOrderId: ftdOrder.id,
            sendingFlorist: floristCode
          }
        }],
        orderIds: [bloomOrder.id]
      });

      console.log(`💳 Created PT-transaction ${paymentTransaction.transactionNumber} for FTD order ${ftdOrder.externalId} ($${(ftdOrder.totalAmount / 100).toFixed(2)})`);
    } catch (error: any) {
      console.error(`⚠️  Failed to create PT-transaction for FTD order ${ftdOrder.externalId}:`, error.message);
      // Don't throw - order was created successfully, transaction is just for reporting
    }

    console.log(`✅ Created Bloom Order #${bloomOrder.orderNumber} from FTD ${ftdOrder.externalId}`);
    return bloomOrder;
  } catch (error: any) {
    console.error("Failed to auto-create Bloom order:", error.message);
    throw error;
  }
}

async function syncBloomOrderStatus(ftdOrder: any) {
  if (!ftdOrder.linkedOrderId) return;

  const desiredBloomStatus = mapFtdStatusToBloomStatus(ftdOrder.status);
  const currentBloomStatus = ftdOrder.linkedOrder?.status;

  if (!currentBloomStatus || currentBloomStatus !== desiredBloomStatus) {
    await prisma.order.update({
      where: { id: ftdOrder.linkedOrderId },
      data: { status: desiredBloomStatus }
    });
    console.log(
      `✅ Synced Bloom order ${ftdOrder.linkedOrderId} status: ${currentBloomStatus || "UNKNOWN"} → ${desiredBloomStatus}`
    );
  }
}

// Find or create recipient customer
async function findOrCreateRecipientCustomer(ftdOrder: any) {
  if (ftdOrder.recipientPhone) {
    let customer = await prisma.customer.findFirst({
      where: { phone: ftdOrder.recipientPhone }
    });

    if (customer) return customer;
  }

  // Try name match with city
  if (ftdOrder.recipientFirstName && ftdOrder.recipientLastName) {
    const candidates = await prisma.customer.findMany({
      where: {
        firstName: { equals: ftdOrder.recipientFirstName, mode: "insensitive" },
        lastName: { equals: ftdOrder.recipientLastName, mode: "insensitive" }
      },
      include: { addresses: true }
    });

    if (candidates.length === 1) return candidates[0];

    if (candidates.length > 1 && ftdOrder.city) {
      const cityMatch = candidates.find((c) =>
        c.addresses.some((a) => a.city?.toLowerCase() === ftdOrder.city?.toLowerCase())
      );
      if (cityMatch) return cityMatch;
    }
  }

  // Create new customer
  const customer = await prisma.customer.create({
    data: {
      firstName: ftdOrder.recipientFirstName || "Recipient",
      lastName: ftdOrder.recipientLastName || "",
      phone: ftdOrder.recipientPhone,
      email: ftdOrder.recipientEmail
    }
  });

  console.log(`👤 Created recipient customer: ${customer.firstName} ${customer.lastName}`);
  return customer;
}

// Fetch detailed payload from FTD API (called ONCE per order or manually)
export async function fetchDetailedPayload(orderItemId: string, shopId: string) {
  const settings = await prisma.ftdSettings.findFirst();
  if (!settings || !settings.authToken) {
    console.error("❌ FTD settings or token missing");
    return null;
  }

  try {
    // Correct detail endpoint: /mercury/{shopId}/orders/{orderItemId}
    const detailUrl = `https://pt.ftdi.com/e/p/mercury/${shopId}/orders/${orderItemId}`;
    const res = await axiosClient.get(detailUrl, {
      params: {
        deliveryMethod: "FLORIST_PARTNER"
      },
      headers: buildFtdHeaders(settings, settings.authToken),
      timeout: 30000
    });

    const data = res.data;
    // Response structure: { orderItems: [...] }
    if (data && data.orderItems && Array.isArray(data.orderItems) && data.orderItems.length > 0) {
      console.log(`✅ Fetched detailed payload for ${orderItemId}`);
      return data.orderItems[0]; // Return first orderItem
    }

    console.warn(`⚠️ No detailed payload found for ${orderItemId}`);
    return null;
  } catch (error: any) {
    console.error(`Failed to fetch detailed payload for ${orderItemId}:`, error.message);
    return null;
  }
}

// Manually refresh detailed payload for an existing FTD order
export async function refreshFtdOrderDetails(ftdOrderId: string) {
  const ftdOrder = await prisma.ftdOrder.findUnique({
    where: { id: ftdOrderId }
  });

  if (!ftdOrder) {
    throw new Error("FTD order not found");
  }

  const settings = await prisma.ftdSettings.findFirst();
  if (!settings) {
    throw new Error("FTD settings not found");
  }

  // Get orderItemId from stored payload
  const rawData = ftdOrder.ftdRawData as any;
  const orderItemId = rawData?.orderItemId || ftdOrder.productCode || ftdOrder.externalId;

  console.log(`🔄 Manually refreshing details for FTD order ${ftdOrder.externalId} (orderItemId: ${orderItemId})...`);
  const detailed = await fetchDetailedPayload(orderItemId, settings.shopId);

  if (!detailed) {
    throw new Error("Could not fetch detailed payload");
  }

  // Update ALL detail fields from fresh payload
  const recipientInfo = detailed.recipientInfo || {};
  const deliveryInfo = detailed.deliveryInfo || {};

  // Merge delivery instructions
  const specialInstructions = detailed.specialInstructions || "";
  const deliveryInstructions = deliveryInfo.deliveryInstructions || "";
  const mergedInstructions = [specialInstructions, deliveryInstructions]
    .filter(Boolean)
    .join("\n")
    .trim() || null;

  const updated = await prisma.ftdOrder.update({
    where: { id: ftdOrderId },
    data: {
      recipientFirstName: cleanString(recipientInfo.firstName),
      recipientLastName: cleanString(recipientInfo.lastName),
      recipientPhone: recipientInfo.phone,
      recipientEmail: recipientInfo.email,
      address1: recipientInfo.addressLine1,
      address2: recipientInfo.addressLine2,
      city: recipientInfo.city,
      province: recipientInfo.state,
      postalCode: recipientInfo.zip,
      country: recipientInfo.country || "CA",
      deliveryDate: parseDate(deliveryInfo.deliveryDate),
      deliveryTime: null,
      deliveryInstructions: mergedInstructions,
      cardMessage: cleanString(deliveryInfo.cardMessage),
      occasion: null, // Don't use FTD occasion - card message already captured above
      productDescription: buildProductDescription(detailed),
      totalAmount: extractTotalAmount(detailed),
      ftdRawData: detailed,
      detailedFetchedAt: new Date()
    }
  });

  console.log(`✅ Refreshed details for FTD order ${ftdOrder.externalId}`);
  return updated;
}

// Helper: Build FTD API headers
function buildFtdHeaders(settings: { apiKey: string; shopId: string }, token: string) {
  return {
    Authorization: `apiKey ${settings.apiKey}`,
    "ep-authorization": token,
    Origin: "https://mercuryhq.com",
    Referer: "https://mercuryhq.com/",
    "X-Timezone": "America/Vancouver",
    "Content-Type": "application/json",
    "client-context": '{"siteId":"mercuryos"}',
    "request-context": `{"authGroupName":"ADMIN_ROLE","memberCodes":["${settings.shopId}"],"shopGroups":["IN YOUR VASE FLOWERS"],"roles":["ADMIN"]}`,
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
  };
}

// Helper: Map FTD status to our enum
function mapFtdStatus(ftdStatus: string): FtdOrderStatus {
  const statusMap: Record<string, FtdOrderStatus> = {
    NEW: FtdOrderStatus.NEEDS_ACTION,
    VIEWED: FtdOrderStatus.NEEDS_ACTION,
    PENDING: FtdOrderStatus.NEEDS_ACTION,
    ACKNOWLEDGED: FtdOrderStatus.ACCEPTED,
    SENT: FtdOrderStatus.ACCEPTED,
    FORWARDED: FtdOrderStatus.ACCEPTED,
    PRINTED: FtdOrderStatus.ACCEPTED,
    ACKNOWLEDGE_PRINT: FtdOrderStatus.ACCEPTED,
    DESIGN: FtdOrderStatus.IN_DESIGN,
    DESIGNED: FtdOrderStatus.READY,
    DS_REQUESTED: FtdOrderStatus.OUT_FOR_DELIVERY,
    DS_REQUEST_PENDING: FtdOrderStatus.OUT_FOR_DELIVERY,
    OUT_FOR_DELIVERY: FtdOrderStatus.OUT_FOR_DELIVERY,
    DELIVERED: FtdOrderStatus.DELIVERED,
    REJECTED: FtdOrderStatus.REJECTED,
    CANCELLED: FtdOrderStatus.CANCELLED,
    ERROR: FtdOrderStatus.CANCELLED,
    FORFEITED: FtdOrderStatus.CANCELLED
  };

  return statusMap[ftdStatus] || FtdOrderStatus.NEEDS_ACTION;
}

// Helper: Map FTD status to Bloom OrderStatus
function mapFtdStatusToBloomStatus(ftdStatus: FtdOrderStatus): OrderStatus {
  const statusMap: Record<FtdOrderStatus, OrderStatus> = {
    [FtdOrderStatus.NEEDS_ACTION]: OrderStatus.DRAFT,
    [FtdOrderStatus.ACCEPTED]: OrderStatus.PAID,
    [FtdOrderStatus.IN_DESIGN]: OrderStatus.IN_DESIGN,
    [FtdOrderStatus.READY]: OrderStatus.IN_DESIGN,
    [FtdOrderStatus.OUT_FOR_DELIVERY]: OrderStatus.OUT_FOR_DELIVERY,
    [FtdOrderStatus.DELIVERED]: OrderStatus.COMPLETED,
    [FtdOrderStatus.REJECTED]: OrderStatus.CANCELLED,
    [FtdOrderStatus.CANCELLED]: OrderStatus.CANCELLED
  };

  return statusMap[ftdStatus] || OrderStatus.DRAFT;
}

// Helper: Check if order is outgoing
function isOutgoingFtdOrder(ftdData: any, shopId?: string | null) {
  const direction = (ftdData?.direction || ftdData?.orderDirection || "").toString().toLowerCase();
  if (direction === "outgoing" || direction === "sent") {
    return true;
  }

  if (!shopId) return false;

  const normalize = (value: any) => (value ? value.toString().trim().toUpperCase() : "");
  const ourCode = normalize(shopId);
  const sendingCode = normalize(ftdData?.sendingMember?.memberCode || ftdData?.sendingMemberCode);
  const receivingCode = normalize(ftdData?.receivingMember?.memberCode || ftdData?.receivingMemberCode);

  if (sendingCode && sendingCode === ourCode) {
    if (!receivingCode || receivingCode !== ourCode) {
      return true;
    }
  }

  return false;
}

// Helper: Build product description (merge first + second choice)
function buildProductDescription(detailedData: any): string {
  const lineItems = detailedData.lineItems || [];

  if (lineItems.length === 0) {
    return "FTD Wire Order";
  }

  return lineItems
    .map((item: any) => {
      const firstChoice = item.productFirstChoiceDescription || "";
      const secondChoice = item.productSecondChoiceDescription || "";

      // Merge both descriptions
      const parts = [firstChoice, secondChoice].filter(Boolean);

      if (parts.length === 0) {
        return item.productFirstChoiceCode || "FTD Wire Order";
      }

      return parts.join(" | ");
    })
    .join(", ");
}

// Helper: Extract total amount from price array (returns cents)
function extractTotalAmount(detailedData: any): number {
  const priceArray = detailedData.price || [];
  const orderTotal = priceArray.find((p: any) => p.name === "orderTotal");
  if (orderTotal && orderTotal.value) {
    const dollars = typeof orderTotal.value === "number" ? orderTotal.value : parseFloat(orderTotal.value) || 0;
    // Convert dollars to cents (FTD API returns dollars like 85.00, we store as 8500 cents)
    return Math.round(dollars * 100);
  }
  return 0;
}

// Helper: Clean string values
function cleanString(value: any): string | null {
  if (!value) return null;
  const cleaned = value.toString().trim().replace(/^[,\s]+|[,\s]+$/g, "");
  return cleaned || null;
}

// Helper: Parse order number
function parseOrderNumber(value: any): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

// Helper: Parse date
function parseDate(rawDate?: string | null): Date | null {
  if (!rawDate || typeof rawDate !== "string") return null;
  const isoString = rawDate.includes("T") ? rawDate : `${rawDate}T00:00:00`;
  const parsed = new Date(isoString);
  return isNaN(parsed.getTime()) ? null : parsed;
}

// Helper: Map address type
function mapAddressType(ftdAddressType: string | undefined): AddressType {
  if (!ftdAddressType) return AddressType.RESIDENCE;

  const typeMap: Record<string, AddressType> = {
    Residence: AddressType.RESIDENCE,
    Business: AddressType.BUSINESS,
    Church: AddressType.CHURCH,
    School: AddressType.SCHOOL,
    "Funeral Home": AddressType.FUNERAL_HOME
  };

  return typeMap[ftdAddressType] || AddressType.RESIDENCE;
}

// Update auth token (called by auth service)
export function setAuthToken(token: string) {
  currentToken = token;
  console.log("🔁 FTD auth token updated");
}

// Get current polling status
export function getMonitorStatus() {
  return {
    isPolling,
    currentToken: currentToken ? "••••••••" : null
  };
}

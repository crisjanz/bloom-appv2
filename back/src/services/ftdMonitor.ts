import axios from "axios";
import { PrismaClient, AddressType, FtdOrderStatus, FtdSettings } from "@prisma/client";
import { sendFtdOrderNotification } from "./ftdNotification";
import { isWithinBusinessHours } from "../utils/businessHours";

const prisma = new PrismaClient();

let currentToken = "";
let isPolling = false;
let pollingInterval: NodeJS.Timeout | null = null;

export async function startFtdMonitor() {
  // Load settings
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

  // Clear any existing interval
  if (pollingInterval) {
    clearInterval(pollingInterval);
  }

  // Start polling
  console.log(`🌸 FTD Monitor started - polling every ${settings.pollingInterval}s (business hours only)`);

  // Check business hours before initial fetch
  const isOpen = await isWithinBusinessHours();

  // Only do initial fetch if:
  // 1. Within business hours, AND
  // 2. Last sync was more than polling interval ago (avoid redundant API calls on restart)
  const shouldInitialFetch = isOpen && (!settings.lastSyncTime ||
    (Date.now() - settings.lastSyncTime.getTime() > settings.pollingInterval * 1000));

  if (shouldInitialFetch) {
    console.log("🔄 Running initial FTD sync...");
    await fetchFtdOrders();
  } else if (!isOpen) {
    console.log("⏸️  Skipping initial fetch - outside business hours");
  } else {
    console.log(`⏭️  Skipping initial fetch - last sync was recent (${Math.floor((Date.now() - settings.lastSyncTime!.getTime()) / 1000)}s ago)`);
  }

  // Set up recurring fetch (business hours check happens inside fetchFtdOrders)
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

export async function fetchFtdOrders(forceFullSync: boolean = false, bypassBusinessHours: boolean = false) {
  try {
    // Check business hours (unless this is a manual sync)
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

    // Use token from database if available (in case it was refreshed)
    const tokenToUse = settings.authToken || currentToken;

    if (!tokenToUse) {
      console.error("❌ No auth token available. Please refresh token first.");
      return;
    }

    console.log(`🔑 Using token: ${tokenToUse.substring(0, 50)}...`);

    const headers = {
      "Authorization": `apiKey ${settings.apiKey}`,
      "ep-authorization": tokenToUse,
      "Origin": "https://mercuryhq.com",
      "Referer": "https://mercuryhq.com/",
      "X-Timezone": "America/Vancouver",
      "client-context": '{"siteId":"mercuryos"}',
      "request-context": `{"authGroupName":"ADMIN_ROLE","memberCodes":["${settings.shopId}"],"shopGroups":["IN YOUR VASE FLOWERS"],"roles":["ADMIN"]}`,
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
    };

    // Build status query parameter with all FTD statuses
    const statuses = [
      'NEW', 'VIEWED', 'ACKNOWLEDGED', 'PENDING', 'SENT', 'FORWARDED', 'PRINTED',
      'DS_REQUESTED', 'DS_REQUEST_PENDING', 'ACKNOWLEDGE_PRINT', 'DESIGN', 'DESIGNED',
      'OUT_FOR_DELIVERY', 'REJECTED', 'CANCELLED', 'DELIVERED', 'ERROR', 'FORFEITED'
    ].join(',');

    // Use delta sync unless force full sync requested (manual update button)
    const useDeltaSync = !forceFullSync && !!settings.lastSyncTime;

    // Format lastSyncTime without milliseconds (Mercury HQ format: 2025-10-18T01:49:46Z)
    let lastSyncTime = '';
    if (settings.lastSyncTime && useDeltaSync) {
      lastSyncTime = settings.lastSyncTime.toISOString().split('.')[0] + 'Z';
    }

    // For initial sync or full sync, get last 30 days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    const startDateStr = startDate.toISOString().split('T')[0];

    // Build API URL with delta sync parameters
    // URL-encode the lastSyncTime parameter
    const encodedLastSyncTime = encodeURIComponent(lastSyncTime);
    const apiUrl = `https://pt.ftdi.com/e/p/mercury/${settings.shopId}/orders?startDate=${startDateStr}&status=${statuses}&endDate=&deltaOrders=${useDeltaSync}&lastSyncTime=${encodedLastSyncTime}&listingFilter=DELIVERY_DATE&listingPage=orders`;

    if (forceFullSync) {
      console.log(`🔄 Fetching FTD orders (FULL SYNC - manual update)`);
    } else {
      console.log(`🔄 Fetching FTD orders (deltaSync: ${useDeltaSync}, lastSync: ${lastSyncTime || 'never'})`);
    }

    const res = await axios.get(apiUrl, { headers, timeout: 30000 });

    if (res.status === 401 || res.status === 403) {
      console.log("🔒 FTD token expired, refresh needed");
      return;
    }

    const orders = res.data;
    console.log(`📦 Fetched ${orders.length} FTD orders from API ${useDeltaSync ? '(delta sync)' : '(full sync)'}`);

    let newCount = 0;
    let updatedCount = 0;

    for (const ftdOrder of orders) {
      const result = await processFtdOrder(ftdOrder, settings);
      if (result === 'new') newCount++;
      if (result === 'updated') updatedCount++;
    }

    if (newCount > 0 || updatedCount > 0) {
      console.log(`✅ Processed ${newCount} new, ${updatedCount} updated FTD orders`);
    }

    // Update lastSyncTime for delta polling
    await prisma.ftdSettings.updateMany({
      data: {
        lastSyncTime: new Date(),
      },
    });

  } catch (err: any) {
    if (err.code === 'ECONNABORTED') {
      console.error("⏱️  FTD API request timeout");
    } else {
      console.error("❌ FTD fetch error:", err.message);
    }
  }
}

async function processFtdOrder(ftdData: any, settings: FtdSettings): Promise<'new' | 'updated' | 'unchanged'> {
  const newStatus = mapFtdStatus(ftdData.status);

  // Use messageNumber as the unique external ID
  const externalId = ftdData.messageNumber || ftdData.external_id;

  if (!externalId) {
    console.warn('⚠️ FTD order missing messageNumber, skipping');
    return 'unchanged';
  }

  const { data: orderData, orderTotal, productDesc } = mapFtdDataToOrderFields(ftdData, externalId, newStatus);
  const isOutgoing = isOutgoingFtdOrder(ftdData, settings?.shopId);

  const existing = await prisma.ftdOrder.findUnique({
    where: { externalId },
  });

  if (!existing) {
    console.log('📝 Creating order with data:', {
      externalId,
      firstName: orderData.recipientFirstName,
      lastName: orderData.recipientLastName,
      city: orderData.city,
      orderTotal,
      productDesc: (productDesc || '').substring(0, 50),
      isOutgoing,
    });

    let newOrder = await prisma.ftdOrder.create({
      data: {
        externalId,
        ...orderData,
        ftdRawData: ftdData,
        lastCheckedAt: new Date(),
      },
    });

    console.log(`✨ New FTD order: ${newOrder.externalId} (${newOrder.status})${isOutgoing ? " [Outgoing]" : ""}`);

    if (isOutgoing) {
      const linkedOrderId = await tryAutoLinkBloomOrder(newOrder);
      if (linkedOrderId) {
        newOrder = (await prisma.ftdOrder.findUnique({ where: { id: newOrder.id } })) || newOrder;
      } else {
        console.log(`↩️ Outgoing FTD ${newOrder.externalId} captured. Link manually if needed.`);
      }
    } else {
      await sendFtdOrderNotification(newOrder).catch(err => {
        console.error("Failed to send notification:", err.message);
      });

      if (newOrder.status === FtdOrderStatus.ACCEPTED) {
        console.log(`🎯 Auto-creating Bloom order for new ACCEPTED FTD ${newOrder.externalId}...`);
        await autoCreateBloomOrder(newOrder).catch(err => {
          console.error("Failed to auto-create Bloom order:", err.message);
        });
      }
    }

    return 'new';
  }

  const oldStatus = existing.status;
  const statusChanged = oldStatus !== newStatus;
  const dataChanged = hasOrderFieldChanges(existing, orderData);

  let updatedOrder;

  if (statusChanged || dataChanged) {
    updatedOrder = await prisma.ftdOrder.update({
      where: { id: existing.id },
      data: {
        ...orderData,
        ftdRawData: ftdData,
        lastCheckedAt: new Date(),
      },
    });

    if (statusChanged) {
      console.log(`🔄 FTD order ${existing.externalId}: ${oldStatus} → ${newStatus}`);
    } else {
      console.log(`✏️  Updated FTD order ${existing.externalId} details (status ${newStatus})`);
    }
  } else {
    updatedOrder = await prisma.ftdOrder.update({
      where: { id: existing.id },
      data: {
        lastCheckedAt: new Date(),
        ftdRawData: ftdData,
      },
    });
  }

  if (isOutgoing) {
    if (!updatedOrder.linkedOrderId) {
      const linkedOrderId = await tryAutoLinkBloomOrder(updatedOrder);
      if (linkedOrderId) {
        updatedOrder = (await prisma.ftdOrder.findUnique({ where: { id: updatedOrder.id } })) || updatedOrder;
      }
    }
  } else if (!updatedOrder.linkedOrderId && newStatus === FtdOrderStatus.ACCEPTED) {
    const action = statusChanged ? "Auto-creating" : "Backfill: Creating";
    console.log(`🎯 ${action} Bloom order for FTD ${updatedOrder.externalId}...`);
    await autoCreateBloomOrder(updatedOrder).catch(err => {
      console.error("Failed to auto-create Bloom order:", err.message);
    });
    updatedOrder = (await prisma.ftdOrder.findUnique({ where: { id: updatedOrder.id } })) || updatedOrder;
  }

  if (updatedOrder.linkedOrderId &&
      oldStatus !== FtdOrderStatus.DELIVERED &&
      newStatus === FtdOrderStatus.DELIVERED) {
    console.log(`✅ Auto-updating Bloom order for FTD ${updatedOrder.externalId}...`);
    await autoUpdateBloomOrderStatus(updatedOrder.linkedOrderId, 'COMPLETED').catch(err => {
      console.error("Failed to update Bloom order status:", err.message);
    });
  }

  return statusChanged || dataChanged ? 'updated' : 'unchanged';
}

function mapFtdDataToOrderFields(ftdData: any, externalId: string, status: FtdOrderStatus) {
  const orderTotal = ftdData.price?.find((p: any) => p.name === 'orderTotal')?.value ?? 0;

  const productDesc = ftdData.lineItems
    ?.map((item: any) => {
      const desc = item.productName || item.productCode || item.productFirstChoiceDescription || 'FTD Product';
      if (typeof desc === "string" && desc.includes('ons: Select Size')) {
        return item.productCode || 'FTD Wire Order';
      }
      return desc;
    })
    .join(', ') || 'FTD Wire Order';

  const orderData = {
    status,
    ftdOrderNumber: parseFtdOrderNumber(ftdData, externalId),

    recipientFirstName: ftdData.recipientInfo?.firstName ?? null,
    recipientLastName: ftdData.recipientInfo?.lastName ?? null,
    recipientPhone: ftdData.recipientInfo?.phone ?? null,
    recipientEmail: ftdData.recipientInfo?.email ?? null,

    address1: ftdData.recipientInfo?.addressLine1 ?? null,
    address2: ftdData.recipientInfo?.addressLine2 ?? null,
    city: ftdData.recipientInfo?.city ?? null,
    province: ftdData.recipientInfo?.state ?? null,
    postalCode: ftdData.recipientInfo?.zip ?? null,
    country: ftdData.recipientInfo?.country || "CA",
    addressType: mapAddressType(ftdData.recipientInfo?.addressType),

    deliveryDate: getDeliveryDate(ftdData.deliveryInfo?.deliveryDate),
    deliveryTime: null,
    deliveryInstructions: ftdData.deliveryInfo?.deliveryInstructions ?? null,

    cardMessage: ftdData.cardMessage ?? null,
    occasion: ftdData.deliveryInfo?.occasion ?? null,
    productDescription: productDesc,
    productCode: ftdData.orderItemId ?? null,

    totalAmount: orderTotal,
    sendingFloristCode: ftdData.sendingMember?.memberCode ?? null,
  };

  return { data: orderData, orderTotal, productDesc };
}

function parseFtdOrderNumber(ftdData: any, externalId: string): number | null {
  const directValue = ftdData.orderNumber ?? ftdData.ftdOrderNumber ?? null;

  if (typeof directValue === "number" && !Number.isNaN(directValue)) {
    return directValue;
  }

  if (typeof directValue === "string") {
    const parsed = parseInt(directValue, 10);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  if (typeof externalId === "string") {
    for (const part of externalId.split('-')) {
      const parsed = parseInt(part, 10);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

function getDeliveryDate(rawDate?: string | null) {
  if (!rawDate || typeof rawDate !== "string") {
    return null;
  }

  const isoString = rawDate.includes('T') ? rawDate : `${rawDate}T00:00:00`;
  const parsed = new Date(isoString);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function hasOrderFieldChanges(existing: any, newData: Record<string, any>) {
  const fields = [
    'ftdOrderNumber',
    'recipientFirstName',
    'recipientLastName',
    'recipientPhone',
    'recipientEmail',
    'address1',
    'address2',
    'city',
    'province',
    'postalCode',
    'country',
    'addressType',
    'deliveryDate',
    'deliveryTime',
    'deliveryInstructions',
    'cardMessage',
    'occasion',
    'productDescription',
    'productCode',
    'totalAmount',
    'sendingFloristCode',
  ];

  return fields.some((field) => {
    const oldValue = existing[field];
    const newValue = newData[field];

    if (oldValue instanceof Date || newValue instanceof Date) {
      const oldTime = oldValue ? new Date(oldValue).getTime() : null;
      const newTime = newValue ? new Date(newValue).getTime() : null;
      return oldTime !== newTime;
    }

    return oldValue !== newValue;
  });
}

function isOutgoingFtdOrder(ftdData: any, shopId?: string | null) {
  const direction = (ftdData?.direction || ftdData?.orderDirection || '').toString().toLowerCase();
  if (direction === 'outgoing' || direction === 'sent') {
    return true;
  }

  if (!shopId) {
    return false;
  }

  const normalize = (value: any) => value ? value.toString().trim().toUpperCase() : '';

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

async function tryAutoLinkBloomOrder(ftdOrder: any): Promise<string | null> {
  if (ftdOrder.linkedOrderId) {
    return ftdOrder.linkedOrderId;
  }

  if (!ftdOrder.deliveryDate) {
    return null;
  }

  const deliveryDate = new Date(ftdOrder.deliveryDate);
  if (Number.isNaN(deliveryDate.getTime())) {
    return null;
  }

  const dayStart = new Date(deliveryDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const candidateOrders = await prisma.order.findMany({
    where: {
      type: 'DELIVERY',
      orderSource: { not: 'WIREIN' },
      deliveryDate: {
        gte: dayStart,
        lt: dayEnd,
      },
      ftdOrders: {
        none: {},
      },
    },
    include: {
      recipientCustomer: true,
      deliveryAddress: true,
    },
  });

  if (candidateOrders.length === 0) {
    return null;
  }

  const normalizedPhone = normalizePhone(ftdOrder.recipientPhone);

  let chosenOrder = null;

  if (normalizedPhone) {
    const phoneMatches = candidateOrders.filter(order => {
      const candidatePhone = normalizePhone(order.recipientCustomer?.phone);
      return candidatePhone && candidatePhone === normalizedPhone;
    });

    if (phoneMatches.length === 1) {
      chosenOrder = phoneMatches[0];
    } else if (phoneMatches.length > 1) {
      return null; // Ambiguous - let manual linking handle it
    }
  }

  if (!chosenOrder) {
    const normalizedFirst = normalizeString(ftdOrder.recipientFirstName);
    const normalizedLast = normalizeString(ftdOrder.recipientLastName);

    if (normalizedFirst || normalizedLast) {
      let nameMatches = candidateOrders.filter(order => {
        const customer = order.recipientCustomer;
        const candidateFirst = normalizeString(customer?.firstName);
        const candidateLast = normalizeString(customer?.lastName);

        if (normalizedFirst && candidateFirst !== normalizedFirst) {
          return false;
        }
        if (normalizedLast && candidateLast !== normalizedLast) {
          return false;
        }
        return true;
      });

      if (nameMatches.length > 1) {
        const city = normalizeString(ftdOrder.city);
        if (city) {
          nameMatches = nameMatches.filter(order => normalizeString(order.deliveryAddress?.city) === city);
        }
      }

      if (nameMatches.length === 1) {
        chosenOrder = nameMatches[0];
      }
    }
  }

  if (!chosenOrder) {
    return null;
  }

  await prisma.ftdOrder.update({
    where: { id: ftdOrder.id },
    data: {
      linkedOrderId: chosenOrder.id,
      needsApproval: false,
    },
  });

  console.log(`🔗 Linked outgoing FTD ${ftdOrder.externalId} to Bloom Order #${chosenOrder.orderNumber}`);
  return chosenOrder.id;
}

function normalizePhone(phone?: string | null) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 7 ? digits : '';
}

function normalizeString(value?: string | null) {
  return value ? value.trim().toLowerCase() : '';
}

// Map FTD status to our enum (based on actual Mercury HQ statuses)
function mapFtdStatus(ftdStatus: string): FtdOrderStatus {
  const statusMap: Record<string, FtdOrderStatus> = {
    // Needs Action (incoming orders)
    'NEW': FtdOrderStatus.NEEDS_ACTION,
    'VIEWED': FtdOrderStatus.NEEDS_ACTION,
    'PENDING': FtdOrderStatus.NEEDS_ACTION,

    // Accepted/Acknowledged
    'ACKNOWLEDGED': FtdOrderStatus.ACCEPTED,
    'SENT': FtdOrderStatus.ACCEPTED,
    'FORWARDED': FtdOrderStatus.ACCEPTED,
    'PRINTED': FtdOrderStatus.ACCEPTED,
    'ACKNOWLEDGE_PRINT': FtdOrderStatus.ACCEPTED,

    // In Design/Production
    'DESIGN': FtdOrderStatus.IN_DESIGN,
    'DESIGNED': FtdOrderStatus.READY,

    // Delivery
    'DS_REQUESTED': FtdOrderStatus.OUT_FOR_DELIVERY,
    'DS_REQUEST_PENDING': FtdOrderStatus.OUT_FOR_DELIVERY,
    'OUT_FOR_DELIVERY': FtdOrderStatus.OUT_FOR_DELIVERY,
    'DELIVERED': FtdOrderStatus.DELIVERED,

    // Rejected/Cancelled
    'REJECTED': FtdOrderStatus.REJECTED,
    'CANCELLED': FtdOrderStatus.CANCELLED,
    'ERROR': FtdOrderStatus.CANCELLED,
    'FORFEITED': FtdOrderStatus.CANCELLED,
  };

  return statusMap[ftdStatus] || FtdOrderStatus.NEEDS_ACTION;
}

// Map FTD address type to Bloom AddressType
function mapAddressType(ftdAddressType: string | undefined): AddressType | null {
  if (!ftdAddressType) return AddressType.RESIDENCE;

  const typeMap: Record<string, AddressType> = {
    'Residence': AddressType.RESIDENCE,
    'Business': AddressType.BUSINESS,
    'Church': AddressType.CHURCH,
    'School': AddressType.SCHOOL,
    'Funeral Home': AddressType.FUNERAL_HOME,
  };

  return typeMap[ftdAddressType] || AddressType.RESIDENCE;
}

// Auto-create Bloom order from accepted FTD order
async function autoCreateBloomOrder(ftdOrder: any) {
  try {
    // 1. Get or create SENDER customer (Sending Florist)
    // Use unique phone format: ftd-{floristCode} for easy lookup
    const floristCode = ftdOrder.sendingFloristCode || 'unknown';
    const floristPhone = `ftd-${floristCode}`;

    let senderCustomer = await prisma.customer.findFirst({
      where: { phone: floristPhone }
    });

    if (!senderCustomer) {
      senderCustomer = await prisma.customer.create({
        data: {
          firstName: 'FTD Florist',
          lastName: `#${floristCode}`,
          phone: floristPhone,
          email: null,
          notes: `FTD sending florist code: ${floristCode}`,
        }
      });
      console.log(`👤 Created FTD sending florist customer: #${floristCode}`);
    }

    // 2. Find or create RECIPIENT customer (the person receiving the flowers)
    let recipientCustomer = null;

    if (ftdOrder.recipientPhone) {
      // Try to find existing customer by phone
      recipientCustomer = await prisma.customer.findFirst({
        where: {
          phone: ftdOrder.recipientPhone,
        }
      });

      // If not found, create new customer with recipient info
      if (!recipientCustomer) {
        recipientCustomer = await prisma.customer.create({
          data: {
            firstName: ftdOrder.recipientFirstName || 'Recipient',
            lastName: ftdOrder.recipientLastName || '',
            phone: ftdOrder.recipientPhone,
            email: ftdOrder.recipientEmail,
          }
        });
        console.log(`👤 Created recipient customer: ${recipientCustomer.firstName} ${recipientCustomer.lastName} (${recipientCustomer.phone})`);
      }
    } else {
      // No phone provided - create anonymous recipient
      recipientCustomer = await prisma.customer.create({
        data: {
          firstName: ftdOrder.recipientFirstName || 'Recipient',
          lastName: ftdOrder.recipientLastName || '',
          phone: null,
          email: ftdOrder.recipientEmail,
        }
      });
      console.log(`👤 Created recipient customer without phone: ${recipientCustomer.firstName} ${recipientCustomer.lastName}`);
    }

    // 3. Create recipient address
    const recipientAddress = await prisma.address.create({
      data: {
        firstName: ftdOrder.recipientFirstName || '',
        lastName: ftdOrder.recipientLastName || '',
        address1: ftdOrder.address1 || '',
        address2: ftdOrder.address2,
        city: ftdOrder.city || '',
        province: ftdOrder.province || '',
        postalCode: ftdOrder.postalCode || '',
        country: ftdOrder.country || 'CA',
        phone: ftdOrder.recipientPhone,
        addressType: ftdOrder.addressType || AddressType.RESIDENCE,
        customerId: recipientCustomer.id,
      }
    });

    // 4. Create Bloom order
    const bloomOrder = await prisma.order.create({
      data: {
        type: 'DELIVERY',
        status: 'PAID', // FTD orders are pre-paid
        orderSource: 'WIREIN',
        customerId: senderCustomer.id, // Sender = Sending Florist
        deliveryAddressId: recipientAddress.id,
        recipientCustomerId: recipientCustomer.id, // Recipient = actual recipient
        deliveryDate: ftdOrder.deliveryDate,
        deliveryTime: ftdOrder.deliveryTime,
        cardMessage: ftdOrder.cardMessage,
        specialInstructions: ftdOrder.deliveryInstructions,
        occasion: ftdOrder.occasion,
        deliveryFee: 0, // FTD handles delivery fee
        paymentAmount: ftdOrder.totalAmount || 0,
        totalTax: 0,
      }
    });

    // 4. Add order item (single product from FTD)
    await prisma.orderItem.create({
      data: {
        orderId: bloomOrder.id,
        customName: ftdOrder.productDescription || 'FTD Wire Order',
        unitPrice: Math.round((ftdOrder.totalAmount || 0) * 100), // Convert to cents
        quantity: 1,
        rowTotal: Math.round((ftdOrder.totalAmount || 0) * 100),
      }
    });

    // 5. Link FTD order to Bloom order and mark for approval
    await prisma.ftdOrder.update({
      where: { id: ftdOrder.id },
      data: {
        linkedOrderId: bloomOrder.id,
        needsApproval: true  // Needs manual review for product/price adjustment
      }
    });

    console.log(`✅ Created Bloom Order #${bloomOrder.orderNumber} from FTD ${ftdOrder.externalId} - NEEDS APPROVAL`);

    return bloomOrder;

  } catch (error: any) {
    console.error('Failed to auto-create Bloom order:', error.message);
    throw error;
  }
}

// Auto-update Bloom order status
async function autoUpdateBloomOrderStatus(bloomOrderId: string, newStatus: string) {
  try {
    const updated = await prisma.order.update({
      where: { id: bloomOrderId },
      data: { status: newStatus as any }
    });

    console.log(`✅ Updated Bloom Order #${updated.orderNumber} status to ${newStatus}`);
  } catch (error: any) {
    console.error('Failed to update Bloom order status:', error.message);
    throw error;
  }
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
    currentToken: currentToken ? '••••••••' : null,
  };
}

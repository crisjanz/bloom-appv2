import axios from "axios";
import { PrismaClient, AddressType, FtdOrderStatus } from "@prisma/client";
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
      const result = await processFtdOrder(ftdOrder);
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

async function processFtdOrder(ftdData: any): Promise<'new' | 'updated' | 'unchanged'> {
  const newStatus = mapFtdStatus(ftdData.status);

  // Use messageNumber as the unique external ID
  const externalId = ftdData.messageNumber || ftdData.external_id;

  if (!externalId) {
    console.warn('⚠️ FTD order missing messageNumber, skipping');
    return 'unchanged';
  }

  const existing = await prisma.ftdOrder.findUnique({
    where: { externalId },
  });

  if (!existing) {
    // Extract total amount from price array
    const orderTotal = ftdData.price?.find((p: any) => p.name === 'orderTotal')?.value || 0;

    // Build product description from line items
    // Note: productFirstChoiceDescription can be malformed, use fallback to productCode
    const productDesc = ftdData.lineItems
      ?.map((item: any) => {
        // Try multiple fields to get a clean product name
        const desc = item.productName || item.productCode || item.productFirstChoiceDescription || 'FTD Product';
        // Clean up garbled text (if it contains "ons: Select Size" it's malformed)
        if (desc.includes('ons: Select Size')) {
          return item.productCode || 'FTD Wire Order';
        }
        return desc;
      })
      .join(', ') || 'FTD Wire Order';

    // Debug logging
    console.log('📝 Creating order with data:', {
      externalId,
      firstName: ftdData.recipientInfo?.firstName,
      lastName: ftdData.recipientInfo?.lastName,
      city: ftdData.recipientInfo?.city,
      orderTotal,
      productDesc: productDesc.substring(0, 50),
    });

    // New FTD order - create and notify
    const newOrder = await prisma.ftdOrder.create({
      data: {
        externalId,
        ftdOrderNumber: parseInt(externalId.split('-')[1]) || null, // Extract number from messageNumber
        status: newStatus,

        // Recipient info
        recipientFirstName: ftdData.recipientInfo?.firstName,
        recipientLastName: ftdData.recipientInfo?.lastName,
        recipientPhone: ftdData.recipientInfo?.phone,
        recipientEmail: ftdData.recipientInfo?.email,

        // Address
        address1: ftdData.recipientInfo?.addressLine1,
        address2: ftdData.recipientInfo?.addressLine2,
        city: ftdData.recipientInfo?.city,
        province: ftdData.recipientInfo?.state,
        postalCode: ftdData.recipientInfo?.zip,
        country: ftdData.recipientInfo?.country || "CA",
        addressType: AddressType.RESIDENCE, // FTD API doesn't provide this in sample

        // Delivery details
        deliveryDate: ftdData.deliveryInfo?.deliveryDate
          ? new Date(ftdData.deliveryInfo.deliveryDate + 'T00:00:00')
          : null,
        deliveryTime: null, // Not in API response
        deliveryInstructions: ftdData.deliveryInfo?.deliveryInstructions,

        // Order content
        cardMessage: ftdData.cardMessage,
        occasion: ftdData.deliveryInfo?.occasion,
        productDescription: productDesc,
        productCode: ftdData.orderItemId,

        // Pricing
        totalAmount: orderTotal,

        // FTD network
        sendingFloristCode: ftdData.sendingMember?.memberCode,

        // Raw data
        ftdRawData: ftdData,
      },
    });

    console.log(`✨ New FTD order: ${newOrder.externalId} (${newOrder.status})`);

    // Send notification
    await sendFtdOrderNotification(newOrder).catch(err => {
      console.error("Failed to send notification:", err.message);
    });

    return 'new';

  } else {
    // Existing order - check for status changes
    const oldStatus = existing.status;

    if (oldStatus === newStatus) {
      // No status change - just update lastCheckedAt
      await prisma.ftdOrder.update({
        where: { id: existing.id },
        data: {
          lastCheckedAt: new Date(),
          ftdRawData: ftdData,
        },
      });
      return 'unchanged';
    }

    // Status changed - update and handle automation
    const updatedOrder = await prisma.ftdOrder.update({
      where: { id: existing.id },
      data: {
        status: newStatus,
        lastCheckedAt: new Date(),
        ftdRawData: ftdData,
      },
    });

    console.log(`🔄 FTD order ${existing.externalId}: ${oldStatus} → ${newStatus}`);

    // 🤖 AUTO-CREATE BLOOM ORDER when status changes to ACCEPTED
    if (oldStatus !== FtdOrderStatus.ACCEPTED && newStatus === FtdOrderStatus.ACCEPTED) {
      console.log(`🎯 Auto-creating Bloom order for FTD ${existing.externalId}...`);
      await autoCreateBloomOrder(updatedOrder).catch(err => {
        console.error("Failed to auto-create Bloom order:", err.message);
      });
    }

    // 🤖 AUTO-UPDATE BLOOM ORDER when status changes to DELIVERED
    if (updatedOrder.linkedOrderId &&
        oldStatus !== FtdOrderStatus.DELIVERED &&
        newStatus === FtdOrderStatus.DELIVERED) {
      console.log(`✅ Auto-updating Bloom order for FTD ${existing.externalId}...`);
      await autoUpdateBloomOrderStatus(updatedOrder.linkedOrderId, 'COMPLETED').catch(err => {
        console.error("Failed to update Bloom order status:", err.message);
      });
    }

    return 'updated';
  }
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
    // 1. Find or create customer
    let customer = null;

    // Only search by phone if we have a valid phone number
    if (ftdOrder.recipientPhone) {
      customer = await prisma.customer.findFirst({
        where: {
          phone: ftdOrder.recipientPhone,
        }
      });

      // If not found, create new customer with recipient info
      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            firstName: ftdOrder.recipientFirstName || 'Wire-In',
            lastName: ftdOrder.recipientLastName || 'Customer',
            phone: ftdOrder.recipientPhone,
            email: ftdOrder.recipientEmail,
          }
        });
        console.log(`👤 Created customer for FTD order: ${customer.firstName} ${customer.lastName}`);
      }
    }

    // If still no customer (no phone provided), use default wire-in customer
    if (!customer) {
      customer = await prisma.customer.findFirst({
        where: { phone: 'wire-in-default' }
      });

      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            firstName: 'FTD Wire-In',
            lastName: 'Orders',
            phone: 'wire-in-default',
            email: null,
          }
        });
        console.log(`👤 Created default wire-in customer: ${customer.firstName} ${customer.lastName}`);
      }
    }

    // 2. Create recipient address
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
        customerId: customer.id,
      }
    });

    // 3. Create Bloom order
    const bloomOrder = await prisma.order.create({
      data: {
        type: 'DELIVERY',
        status: 'PAID', // FTD orders are pre-paid
        orderSource: 'WIREIN',
        customerId: customer.id,
        deliveryAddressId: recipientAddress.id,
        recipientCustomerId: customer.id,
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

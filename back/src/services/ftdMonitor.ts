import axios from "axios";
import {
  PrismaClient,
  AddressType,
  OrderStatus,
  OrderExternalSource,
  Prisma
} from "@prisma/client";
import { sendFtdOrderNotification } from "./ftdNotification";
import { isWithinBusinessHours } from "../utils/businessHours";

const prisma = new PrismaClient();
const axiosClient = axios.create();

let currentToken = "";
let isPolling = false;
let pollingInterval: NodeJS.Timeout | null = null;

type OrderRecord = Awaited<ReturnType<typeof prisma.order.findUnique>>;

const NEEDS_ACTION_STATUSES = new Set([
  "NEW",
  "VIEWED",
  "PENDING",
  "SENT",
  "FORWARDED",
  "PRINTED"
]);

const ACCEPTED_STATUSES = new Set([
  "ACKNOWLEDGED",
  "ACKNOWLEDGE_PRINT"
]);

const IN_DESIGN_STATUSES = new Set(["DESIGN", "DESIGNED"]);
const OUT_FOR_DELIVERY_STATUSES = new Set([
  "DS_REQUESTED",
  "DS_REQUEST_PENDING",
  "OUT_FOR_DELIVERY"
]);
const DELIVERED_STATUSES = new Set(["DELIVERED"]);
const CANCELLED_STATUSES = new Set(["REJECTED", "CANCELLED", "ERROR", "FORFEITED"]);

type SyncResult = "new" | "updated" | "unchanged";

interface NormalizedFtdPayload {
  raw: any;
  externalId: string;
  detailExternalId: string | null;
  status: string;
  total: number;
  totals: {
    total: number;
    fees: number;
    taxes: number;
    products: number;
  };
  priceBreakdown: Record<string, number>;
  deliveryDate: Date | null;
  deliveryTime: string | null;
  recipient: {
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    email: string | null;
  };
  address: {
    address1: string | null;
    address2: string | null;
    city: string | null;
    province: string | null;
    postalCode: string | null;
    country: string;
  };
  sendingFloristCode: string | null;
  cardMessage: string | null;
  deliveryInstructions: string | null;
  occasion: string | null;
  createdBy?: string | null;
  productDescription: string;
  products: Array<{
    description: string;
    totalPrice: number;
    fillPrice: number | null;
    productId: string | null;
  }>;
  payloadHash: string;
}

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
    const secondsAgo = Math.floor(
      (Date.now() - settings.lastSyncTime!.getTime()) / 1000
    );
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

export async function fetchFtdOrders(
  forceFullSync: boolean = false,
  bypassBusinessHours: boolean = false
) {
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

    console.log(`🔑 Using token: ${tokenToUse.substring(0, 50)}...`);

    const headers = {
      Authorization: `apiKey ${settings.apiKey}`,
      "ep-authorization": tokenToUse,
      Origin: "https://mercuryhq.com",
      Referer: "https://mercuryhq.com/",
      "X-Timezone": "America/Vancouver",
      "client-context": '{"siteId":"mercuryos"}',
      "request-context": `{"authGroupName":"ADMIN_ROLE","memberCodes":["${settings.shopId}"],"shopGroups":["IN YOUR VASE FLOWERS"],"roles":["ADMIN"]}`,
      "Content-Type": "application/json",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36"
    };

    const statuses = [
      "NEW",
      "VIEWED",
      "ACKNOWLEDGED",
      "PENDING",
      "SENT",
      "FORWARDED",
      "PRINTED",
      "DS_REQUESTED",
      "DS_REQUEST_PENDING",
      "ACKNOWLEDGE_PRINT",
      "DESIGN",
      "DESIGNED",
      "OUT_FOR_DELIVERY",
      "REJECTED",
      "CANCELLED",
      "DELIVERED",
      "ERROR",
      "FORFEITED"
    ].join(",");

    const useDeltaSync = !forceFullSync && !!settings.lastSyncTime;

    let lastSyncTime = "";
    if (settings.lastSyncTime && useDeltaSync) {
      lastSyncTime = settings.lastSyncTime.toISOString().split(".")[0] + "Z";
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    const startDateStr = startDate.toISOString().split("T")[0];

    const encodedLastSyncTime = encodeURIComponent(lastSyncTime);
    const apiUrl = `https://pt.ftdi.com/e/p/mercury/${settings.shopId}/orders?startDate=${startDateStr}&status=${statuses}&endDate=&deltaOrders=${useDeltaSync}&lastSyncTime=${encodedLastSyncTime}&listingFilter=DELIVERY_DATE&listingPage=orders`;

    console.log(
      forceFullSync
        ? "🔄 Fetching FTD orders (FULL SYNC - manual update)"
        : `🔄 Fetching FTD orders (deltaSync: ${useDeltaSync}, lastSync: ${lastSyncTime || "never"})`
    );

    const res = await axios.get(apiUrl, { headers, timeout: 30000 });

    if (res.status === 401 || res.status === 403) {
      console.log("🔒 FTD token expired, refresh needed");
      return;
    }

    const orders = res.data;
    console.log(
      `📦 Fetched ${orders.length} FTD orders from API ${
        useDeltaSync ? "(delta sync)" : "(full sync)"
      }`
    );

    let newCount = 0;
    let updatedCount = 0;

    for (const ftdOrder of orders) {
      const result = await processFtdOrder(ftdOrder, settings);
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

async function processFtdOrder(ftdData: any, settings: { shopId: string }): Promise<SyncResult> {
  const normalized = await enrichPayloadWithDetails(ftdData, settings.shopId);
  const { externalId } = normalized;

  if (!externalId) {
    console.warn("⚠️ FTD order missing messageNumber, skipping");
    return "unchanged";
  }

  if (isOutgoingFtdOrder(ftdData, settings.shopId)) {
    console.log(`↩️ Skipping outgoing FTD order ${externalId}`);
    return "unchanged";
  }

  const existingOrder = await prisma.order.findUnique({
    where: { externalReference: externalId }
  });

  if (!existingOrder) {
    await createBloomOrderFromFtd(normalized);
    await sendFtdOrderNotification(buildNotificationPayload(normalized));
    return "new";
  }

  return await reconcileExistingOrder(existingOrder, normalized);
}

async function enrichPayloadWithDetails(ftdData: any, shopId: string) {
  const detailExternalId =
    ftdData.external_id ||
    ftdData.orderItemId ||
    ftdData.messageNumber ||
    ftdData.orderNumber;

  const detailed = await fetchDetailedPayload(detailExternalId, shopId);
  if (detailed) {
    return normalizeFtdPayload({
      ...ftdData,
      ...detailed,
      __detailedPayload: detailed
    });
  }
  return normalizeFtdPayload(ftdData);
}

async function createBloomOrderFromFtd(payload: NormalizedFtdPayload) {
  const floristCustomer = await getOrCreateFloristCustomer(payload.sendingFloristCode);
  const recipientCustomer = await getOrCreateRecipientCustomer(payload);

  const totals = payload.totals;
  const priceBreakdown = payload.priceBreakdown;
  const orderTotal = totals.total || payload.total;
  const fees = totals.fees || 0;
  const taxes = totals.taxes || 0;
  const discount = Math.max(0, (priceBreakdown.orderTotal ?? orderTotal) - orderTotal);

  const deliveryAddress = await prisma.address.create({
    data: {
      firstName: payload.recipient.firstName || "",
      lastName: payload.recipient.lastName || "",
      address1: payload.address.address1 || "",
      address2: payload.address.address2,
      city: payload.address.city || "",
      province: payload.address.province || "",
      postalCode: payload.address.postalCode || "",
      country: payload.address.country,
      phone: payload.recipient.phone,
      addressType: AddressType.RESIDENCE,
      customerId: recipientCustomer.id
    }
  });

  const orderStatus = deriveOrderStatusFromFtd(payload.status);

  const order = await prisma.order.create({
    data: {
      type: "DELIVERY",
      status: orderStatus,
      orderSource: "WIREIN",
      customerId: floristCustomer.id,
      recipientCustomerId: recipientCustomer.id,
      deliveryAddressId: deliveryAddress.id,
      deliveryDate: payload.deliveryDate,
      deliveryTime: payload.deliveryTime,
      cardMessage: payload.cardMessage,
      specialInstructions: payload.deliveryInstructions,
      occasion: payload.occasion,
      deliveryFee: fees,
      paymentAmount: orderTotal,
      discount,
      totalTax: taxes,
      orderItems: {
        create: payload.products.map((item) => {
          const lineTotal = item.totalPrice || payload.total;
          const quantity = itemQuantityFromPayload(item);
          const unitPrice = lineTotal / quantity;
          return {
            customName: item.description || payload.productDescription || "FTD Wire Order",
            unitPrice: Math.round(unitPrice * 100),
            quantity,
            rowTotal: Math.round(lineTotal * 100)
          };
        })
      },
      externalSource: OrderExternalSource.FTD,
      externalReference: payload.externalId,
      importedPayload: payload.raw,
      externalStatus: payload.status,
      needsExternalUpdate: true
    }
  });

  console.log(
    `✨ Created Bloom order #${order.orderNumber} from FTD ${payload.externalId} (${payload.status})`
  );
}

async function reconcileExistingOrder(
  existingOrder: OrderRecord,
  payload: NormalizedFtdPayload
): Promise<SyncResult> {
  if (!existingOrder) {
    return "unchanged";
  }

  const hashedPayload = {
    ...payload.raw,
    __hash: payload.payloadHash
  } as any;

  const previousPayload = existingOrder.importedPayload as any | null;
  const previousHash =
    previousPayload && typeof previousPayload.__hash === "string"
      ? previousPayload.__hash
      : null;
  const payloadChanged = previousHash !== payload.payloadHash;
  const statusChanged = existingOrder.externalStatus !== payload.status;

  const updates: Prisma.OrderUpdateInput = {};

  if (payloadChanged || statusChanged) {
    updates.importedPayload = hashedPayload;
    updates.needsExternalUpdate = true;
    updates.externalStatus = payload.status;
  }

  if (statusChanged) {
    const nextStatus = deriveOrderStatusFromFtd(payload.status);
    if (nextStatus !== existingOrder.status) {
      updates.status = nextStatus;
    }
  }

  if (!existingOrder.cardMessage && payload.cardMessage) {
    updates.cardMessage = payload.cardMessage;
  }

  if (!existingOrder.specialInstructions && payload.deliveryInstructions) {
    updates.specialInstructions = payload.deliveryInstructions;
  }

  if (!existingOrder.occasion && payload.occasion) {
    updates.occasion = payload.occasion;
  }

  if (!existingOrder.deliveryTime && payload.deliveryTime) {
    updates.deliveryTime = payload.deliveryTime;
  }

  if (!existingOrder.deliveryDate && payload.deliveryDate) {
    updates.deliveryDate = payload.deliveryDate;
  }

  if (Object.keys(updates).length > 0) {
    const updated = await prisma.order.update({
      where: { id: existingOrder.id },
      data: updates
    });

    if (payloadChanged) {
      await sendFtdOrderNotification(buildNotificationPayload(payload, true));
      console.log(
        `✏️  FTD order ${payload.externalId} changed. Flagged Bloom order #${updated.orderNumber} for review.`
      );
    } else if (statusChanged) {
      console.log(
        `🔄 FTD order ${payload.externalId} status ${existingOrder.externalStatus} → ${payload.status}`
      );
    }

    return "updated";
  }

  return "unchanged";
}

function deriveOrderStatusFromFtd(ftdStatus: string): OrderStatus {
  if (NEEDS_ACTION_STATUSES.has(ftdStatus)) {
    return OrderStatus.DRAFT;
  }
  if (ACCEPTED_STATUSES.has(ftdStatus)) {
    return OrderStatus.PAID;
  }
  if (IN_DESIGN_STATUSES.has(ftdStatus)) {
    return OrderStatus.IN_DESIGN;
  }
  if (OUT_FOR_DELIVERY_STATUSES.has(ftdStatus)) {
    return OrderStatus.OUT_FOR_DELIVERY;
  }
  if (DELIVERED_STATUSES.has(ftdStatus)) {
    return OrderStatus.COMPLETED;
  }
  if (CANCELLED_STATUSES.has(ftdStatus)) {
    return OrderStatus.CANCELLED;
  }
  return OrderStatus.DRAFT;
}

function normalizeFtdPayload(ftdData: any): NormalizedFtdPayload {
  const detailedPayload = ftdData.__detailedPayload || ftdData;
  const detailExternalId =
    detailedPayload.external_id ||
    detailedPayload.orderItemId ||
    ftdData.external_id ||
    ftdData.orderItemId ||
    ftdData.messageNumber ||
    ftdData.orderNumber;
  const cardMessage =
    cleanMessage(
      detailedPayload.card_message ||
        detailedPayload.cardMessage ||
        detailedPayload.deliveryInfo?.cardMessage
    ) || null;
  const recipientSection = detailedPayload.recipient || detailedPayload.recipientInfo || {};
  const addressSection = recipientSection.address || {};

  const externalId: string =
    ftdData.messageNumber ||
    ftdData.orderNumber ||
    detailedPayload.messageNumber ||
    (typeof detailExternalId === "string" ? detailExternalId : "");

  const totalAmount =
    detailedPayload.totals?.total ??
    ftdData.price?.find((p: any) => p.name === "orderTotal")?.value ??
    0;

  const deliveryDateString =
    detailedPayload.fulfillment_date || ftdData.deliveryInfo?.deliveryDate;
  const deliveryDate = deliveryDateString
    ? new Date(`${deliveryDateString}T00:00:00`)
    : null;

  const recipientInfo = {
    firstName:
      cleanName(
        recipientSection.first_name ||
          recipientSection.firstName ||
          ftdData.recipientInfo?.firstName
      ) ?? null,
    lastName:
      cleanName(
        recipientSection.last_name ||
          recipientSection.lastName ||
          ftdData.recipientInfo?.lastName
      ) ?? null,
    phone: recipientSection.phone || ftdData.recipientInfo?.phone || null,
    email: recipientSection.email || ftdData.recipientInfo?.email || null
  };

  const productDescription = buildProductDescription(detailedPayload);

  const totals = {
    total: toNumber(detailedPayload.totals?.total, ftdData.price?.find((p: any) => p.name === "orderTotal")?.value ?? 0),
    fees: toNumber(detailedPayload.totals?.fees, 0),
    taxes: toNumber(detailedPayload.totals?.taxes, ftdData.totalTax?.amount ?? 0),
    products: toNumber(detailedPayload.totals?.products, ftdData.lineItems?.reduce((sum: number, item: any) => sum + toNumber(item.lineItemAmounts?.find((a: any) => a.name === "retailProductAmount")?.value, 0), 0))
  };

  const priceBreakdown: Record<string, number> = {};
  (detailedPayload.price || ftdData.price || []).forEach((entry: any) => {
    if (entry?.name) {
      priceBreakdown[entry.name] = toNumber(entry.value, 0);
    }
  });

  const products = (detailedPayload.products || ftdData.lineItems || []).map((item: any) => ({
    description:
      item.product_description ||
      item.productFirstChoiceDescription ||
      item.productName ||
      item.productCode ||
      "FTD Wire Order",
    totalPrice: toNumber(item.total_price, item.lineItemAmounts?.find((a: any) => a.name === "amountChargedToCustomer")?.value ?? totals.total),
    fillPrice: item.fill_price !== undefined ? toNumber(item.fill_price, null) : null,
    productId: item.product_id || item.productCode || null
  }));

  const payloadForStorage = {
    ...ftdData,
    card_message: cardMessage,
    productDescription,
    __syncedAt: new Date().toISOString()
  };

  return {
    raw: {
      ...payloadForStorage,
      __hash: generatePayloadHash(payloadForStorage)
    },
    externalId,
    detailExternalId: typeof detailExternalId === "string" ? detailExternalId : null,
    status: ftdData.status,
    total: totalAmount,
    totals,
    priceBreakdown,
    deliveryDate,
    deliveryTime: ftdData.deliveryInfo?.deliveryTimeWindow ?? null,
    recipient: {
      firstName: recipientInfo.firstName ?? null,
      lastName: recipientInfo.lastName ?? null,
      phone: recipientInfo.phone ?? null,
      email: recipientInfo.email ?? null
    },
    address: {
      address1:
        addressSection.address_line1 ??
        detailedPayload.recipientInfo?.addressLine1 ??
        null,
      address2:
        addressSection.address_line2 ??
        detailedPayload.recipientInfo?.addressLine2 ??
        null,
      city:
        addressSection.city ??
        detailedPayload.recipientInfo?.city ??
        null,
      province:
        addressSection.state ??
        detailedPayload.recipientInfo?.state ??
        null,
      postalCode:
        addressSection.zip ??
        detailedPayload.recipientInfo?.zip ??
        null,
      country:
        (addressSection.country ?? detailedPayload.recipientInfo?.country) || "CA"
    },
    sendingFloristCode: ftdData.sendingMember?.memberCode ?? null,
    cardMessage,
    deliveryInstructions:
      detailedPayload.delivery_instructions ??
      ftdData.deliveryInfo?.deliveryInstructions ??
      null,
    occasion:
      detailedPayload.occasion ?? ftdData.deliveryInfo?.occasion ?? null,
    createdBy: detailedPayload.created_by_name || null,
    productDescription,
    products: products.length ? products : [
      {
        description: productDescription,
        totalPrice: totalAmount,
        fillPrice: null,
        productId: null
      }
    ],
    payloadHash: generatePayloadHash(payloadForStorage)
  };
}

function buildProductDescription(ftdData: any): string {
  return (
    ftdData.lineItems
      ?.map((item: any) => {
        const desc =
          item.productName ||
          item.productCode ||
          item.productFirstChoiceDescription ||
          "FTD Product";
        if (typeof desc === "string" && desc.includes("ons: Select Size")) {
          return item.productCode || "FTD Wire Order";
        }
        return desc;
      })
      .join(", ") || "FTD Wire Order"
  );
}

function itemQuantityFromPayload(item: any): number {
  const quantity = toNumber(item.quantity, 1);
  if (quantity <= 0) {
    return 1;
  }
  return quantity;
}

function cleanName(value: any): string | null {
  if (!value) return null;
  return value.toString().trim().replace(/^[,\s]+|[,\s]+$/g, "") || null;
}

function cleanMessage(value: any): string | null {
  if (!value) return null;
  const text = value.toString().replace(/\r\n/g, "\n").trim();
  return text || null;
}

function normalizePhoneNumber(phone?: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 11 && digits.startsWith("1")) {
    return digits.slice(1);
  }
  return digits;
}

function toNumber(value: any, fallback: number | null = 0): number {
  if (value === null || value === undefined) {
    return fallback ?? 0;
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return fallback ?? 0;
  }
  return parsed;
}

async function getOrCreateFloristCustomer(floristCode: string | null) {
  const code = floristCode || "unknown";
  const floristPhone = `ftd-${code}`;

  let customer = await prisma.customer.findFirst({
    where: { phone: floristPhone }
  });

  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        firstName: "FTD Florist",
        lastName: `#${code}`,
        phone: floristPhone,
        notes: `FTD sending florist code: ${code}`
      }
    });
    console.log(`👤 Created FTD sending florist customer: #${code}`);
  }

  return customer;
}

async function getOrCreateRecipientCustomer(payload: NormalizedFtdPayload) {
  const { recipient } = payload;
  const normalizedPhone = normalizePhoneNumber(recipient.phone);

  let customer = null;

  if (normalizedPhone) {
    customer = await prisma.customer.findFirst({
      where: {
        OR: [
          recipient.phone ? { phone: recipient.phone } : undefined,
          { phone: normalizedPhone },
          normalizedPhone.length >= 7
            ? { phone: { endsWith: normalizedPhone.slice(-7) } }
            : undefined
        ].filter(Boolean) as any
      }
    });
  }

  if (!customer && recipient.firstName && recipient.lastName) {
    const possibleMatches = await prisma.customer.findMany({
      where: {
        firstName: {
          equals: recipient.firstName,
          mode: "insensitive"
        },
        lastName: {
          equals: recipient.lastName,
          mode: "insensitive"
        }
      },
      include: { addresses: true }
    });

    const normalizedCity = (payload.address.city || "").toLowerCase();
    customer =
      possibleMatches.find((match) =>
        match.addresses.some(
          (addr) => (addr.city || "").toLowerCase() === normalizedCity
        )
      ) || possibleMatches[0] || null;
  }

  if (customer) {
    const updateData: Prisma.CustomerUpdateInput = {};
    if (!customer.phone && normalizedPhone) {
      updateData.phone = normalizedPhone;
    }
    if (!customer.email && recipient.email) {
      updateData.email = recipient.email;
    }
    if (Object.keys(updateData).length > 0) {
      customer = await prisma.customer.update({
        where: { id: customer.id },
        data: updateData
      });
    }
    return customer;
  }

  const created = await prisma.customer.create({
    data: {
      firstName: recipient.firstName || "Recipient",
      lastName: recipient.lastName || "",
      phone: normalizedPhone,
      email: recipient.email || undefined
    }
  });

  console.log(
    `👤 Created recipient customer: ${created.firstName} ${created.lastName}`
  );

  return created;
}

function isOutgoingFtdOrder(ftdData: any, shopId?: string | null) {
  const directionHint = (ftdData?.direction || ftdData?.orderDirection || "")
    .toString()
    .toLowerCase();
  if (directionHint === "outgoing" || directionHint === "sent") {
    return true;
  }

  if (!shopId) return false;

  const normalize = (value: any) =>
    value ? value.toString().trim().toUpperCase() : "";

  const ourCode = normalize(shopId);
  const sendingCode = normalize(
    ftdData?.sendingMember?.memberCode || ftdData?.sendingMemberCode
  );
  const receivingCode = normalize(
    ftdData?.receivingMember?.memberCode || ftdData?.receivingMemberCode
  );

  if (sendingCode && sendingCode === ourCode) {
    if (!receivingCode || receivingCode !== ourCode) {
      return true;
    }
  }

  return false;
}

function generatePayloadHash(payload: any): string {
  const stable = JSON.stringify(payload, Object.keys(payload).sort());
  let hash = 0;
  for (let i = 0; i < stable.length; i++) {
    const chr = stable.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return `h${hash}`;
}

function buildNotificationPayload(
  payload: NormalizedFtdPayload,
  isUpdate: boolean = false
) {
  return {
    externalId: payload.externalId,
    recipientFirstName: payload.recipient.firstName,
    recipientLastName: payload.recipient.lastName,
    city: payload.address.city,
    deliveryDate: payload.deliveryDate,
    productDescription: payload.products[0]?.description || payload.productDescription,
    totalAmount: payload.total,
    cardMessage: payload.cardMessage,
    deliveryInstructions: payload.deliveryInstructions,
    isUpdate
  };
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

export type { NormalizedFtdPayload };
export { normalizeFtdPayload };

async function fetchDetailedPayload(externalId: string | undefined, shopId: string) {
  if (!externalId) return null;
  const settings = await prisma.ftdSettings.findFirst();
  if (!settings || !settings.authToken) {
    return null;
  }

  try {
    const detailUrl = `https://pt.ftdi.com/e/p/mdf-order/api/${shopId}/orders`;
    console.log(`🔍 Fetching detailed payload: ${detailUrl}?scope=listing&limit=1&external_id=${externalId}`);
    const res = await axiosClient.get(
      detailUrl,
      {
        params: {
          scope: "listing",
          limit: 1,
          offset: 0,
          external_id: externalId
        },
        headers: buildFtdHeaders(settings)
      }
    );

    const data = res.data;
    if (Array.isArray(data) && data.length > 0) {
      return data[0];
    }
  } catch (error: any) {
    console.error(
      `Failed to fetch detailed payload for ${externalId}:`,
      error.response?.status,
      error.message
    );
  }

  console.warn(`⚠️ Detailed payload not found for ${externalId}`);
  return null;
}

function buildFtdHeaders(settings: { apiKey: string; authToken: string; shopId: string }) {
  return {
    Authorization: `apiKey ${settings.apiKey}`,
    "ep-authorization": settings.authToken,
    Origin: "https://mercuryhq.com",
    Referer: "https://mercuryhq.com/",
    "X-Timezone": "America/Vancouver",
    "Content-Type": "application/json",
    "client-context": '{"siteId":"mercuryos"}',
    "request-context": `{"authGroupName":"ADMIN_ROLE","memberCodes":["${settings.shopId}"],"shopGroups":["IN YOUR VASE FLOWERS"],"roles":["ADMIN"]}`
  };
}

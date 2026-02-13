import { Router } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();

// Path to the legacy orders JSON file
const LEGACY_ORDERS_FILE = path.join(__dirname, '../../../data/legacy_orders.json');

type LegacyOrder = {
  orderNumber: string;
  orderDate: string | null;
  deliveryDate: string | null;
  customerName: string | null;
  customerFirstName: string | null;
  customerLastName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  recipientName: string | null;
  recipientFirstName: string | null;
  recipientLastName: string | null;
  recipientPhone: string | null;
  recipientAddress: string | null;
  recipientCity: string | null;
  orderTotal: number | null;
  orderType: string | null;
  cardMessage: string | null;
};

let ordersCache: LegacyOrder[] | null = null;
let cacheLoadedAt: number = 0;
const CACHE_TTL = 60000; // 1 minute cache

function loadOrders(): LegacyOrder[] {
  const now = Date.now();

  // Return cached if still valid
  if (ordersCache && (now - cacheLoadedAt) < CACHE_TTL) {
    return ordersCache;
  }

  try {
    if (!fs.existsSync(LEGACY_ORDERS_FILE)) {
      console.log('Legacy orders file not found:', LEGACY_ORDERS_FILE);
      return [];
    }

    const data = fs.readFileSync(LEGACY_ORDERS_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    ordersCache = parsed.orders || [];
    cacheLoadedAt = now;
    console.log(`Loaded ${ordersCache.length} legacy orders from file`);
    return ordersCache;
  } catch (error) {
    console.error('Error loading legacy orders:', error);
    return [];
  }
}

function normalizePhone(phone: string | null): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

function searchOrders(orders: LegacyOrder[], query: string): LegacyOrder[] {
  const q = query.toLowerCase().trim();
  const qPhone = normalizePhone(query);

  return orders.filter(order => {
    // Search customer fields
    if (order.customerName?.toLowerCase().includes(q)) return true;
    if (order.customerFirstName?.toLowerCase().includes(q)) return true;
    if (order.customerLastName?.toLowerCase().includes(q)) return true;
    if (order.customerEmail?.toLowerCase().includes(q)) return true;
    if (qPhone && normalizePhone(order.customerPhone).includes(qPhone)) return true;

    // Search recipient fields
    if (order.recipientName?.toLowerCase().includes(q)) return true;
    if (order.recipientFirstName?.toLowerCase().includes(q)) return true;
    if (order.recipientLastName?.toLowerCase().includes(q)) return true;
    if (qPhone && normalizePhone(order.recipientPhone).includes(qPhone)) return true;
    if (order.recipientAddress?.toLowerCase().includes(q)) return true;
    if (order.recipientCity?.toLowerCase().includes(q)) return true;

    // Search order number
    if (order.orderNumber?.toLowerCase().includes(q)) return true;

    return false;
  });
}

// Search legacy orders
router.get('/search', (req, res) => {
  try {
    const query = req.query.q as string;

    if (!query || query.trim().length < 2) {
      return res.json({ success: true, orders: [] });
    }

    const orders = loadOrders();
    const results = searchOrders(orders, query);

    // Limit to 50 results, sorted by order date (newest first)
    const sorted = results
      .sort((a, b) => {
        const dateA = a.orderDate ? new Date(a.orderDate).getTime() : 0;
        const dateB = b.orderDate ? new Date(b.orderDate).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 50);

    res.json({ success: true, orders: sorted });
  } catch (error) {
    console.error('Error searching legacy orders:', error);
    res.status(500).json({ error: 'Failed to search legacy orders' });
  }
});

// Get stats about legacy orders
router.get('/stats', (req, res) => {
  try {
    const orders = loadOrders();
    res.json({
      success: true,
      count: orders.length,
      loaded: orders.length > 0
    });
  } catch (error) {
    console.error('Error getting legacy order stats:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

export default router;

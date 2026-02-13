console.log("🚀 Starting backend...");
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import authRouter from "./routes/auth";

import productsRouter from './routes/products';
import inventoryRouter from './routes/inventory';
import categoriesRouter from './routes/categories';
import customersRouter from './routes/customers';
import houseAccountsRouter from './routes/house-accounts';
import reportingCategoriesRouter from './routes/reportingCategories';
import employeeRoutes from "./routes/employees";
import messageRoutes from "./routes/messages";
import addressShortcutRoutes from "./routes/addressShortcuts";
import importRouter from './routes/import';
import importJsonRouter from './routes/import-json';
import discountsRouter from './routes/discounts';
import customersAuthRouter from './routes/customersAuth';
import customerDuplicatesRouter from './routes/customerDuplicates';
import giftCardsRouter from './routes/gift-cards';
import ordersRouter from './routes/orders/index';
import communicationsRouter, { communicationsMetaRouter } from './routes/communications';
import paymentTransactionsRouter from './routes/payment-transactions';
import refundsRouter from './routes/refunds';
import faqsRouter from './routes/settings/faqs';
import homepageRouter from './routes/settings/homepage';
import { getPOSTabs, savePOSTabs } from './routes/settings/pos-tabs';
import { getStoreInfo, saveStoreInfo } from './routes/settings/store-info';
import { getOrderStatusNotificationSettings, saveOrderStatusNotificationSettings } from './routes/settings/order-status-notifications';
import { getBusinessHours, saveBusinessHours } from './routes/settings/business-hours';
import { getDeliveryExceptions, saveDeliveryExceptions } from './routes/settings/delivery-exceptions';
import { getDeliveryCharges, saveDeliveryCharges } from './routes/settings/delivery-charges';
import { 
  getHolidays, 
  createHoliday, 
  updateHoliday, 
  deleteHoliday, 
  getUpcomingHolidays, 
  getActiveHoliday 
} from './routes/settings/holidays';
import taxRatesRouter from './routes/settings/tax-rates';
import paymentSettingsRouter from './routes/settings/payments';
import operationsSettingsRouter from './routes/settings/operations';
import emailRouter from './routes/email';
import emailSendRouter from './routes/email/send';
import smsRouter from './routes/sms';
import notificationsRouter from './routes/notifications';
import stripeRouter from './routes/stripe';
import squareRouter from './routes/square';
import eventsRouter from './routes/events';
import reportsRouter from './routes/reports';
import imagesRouter from './routes/images';
import addOnGroupsRouter from './routes/addon-groups';
import dashboardRouter from './routes/dashboard';
import printJobsRouter from './routes/print-jobs';
import legacyOrdersRouter from './routes/legacy-orders';
import printSettingsRouter from './routes/print-settings';
import emailSettingsRouter from './routes/email-settings';
import printRouter from './routes/print';
import wireProductsRouter from './routes/wire-products';
import routesRouter from './routes/routes';
import driverRouteViewRouter from './routes/driver/route-view';
import driverQRRouter from './routes/driver/qr-code';
import giftsRouter from './routes/gifts';
import customerPaymentMethodsRouter from './routes/customer-payment-methods';
import { printService } from './services/printService';
import { setCommunicationsWebSocketServer } from './services/communicationsSocketService';

dotenv.config();

const app = express();
const server = createServer(app);
const prisma = new PrismaClient();

async function ensureOrderSchema() {
  try {
    const columns = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'Order'
    `;

    const existingColumns = new Set(columns.map((c) => c.column_name));
    const statements: string[] = [];

    if (!existingColumns.has('recipientId')) {
      statements.push(`ALTER TABLE "Order" ADD COLUMN "recipientId" TEXT;`);
    }
    if (!existingColumns.has('recipientCustomerId')) {
      statements.push(`ALTER TABLE "Order" ADD COLUMN "recipientCustomerId" TEXT;`);
    }
    if (!existingColumns.has('deliveryAddressId')) {
      statements.push(`ALTER TABLE "Order" ADD COLUMN "deliveryAddressId" TEXT;`);
    }

    for (const statement of statements) {
      await prisma.$executeRawUnsafe(statement);
      console.log(`✅ Executed schema patch: ${statement}`);
    }
  } catch (error) {
    console.error('Failed to verify or patch Order schema:', error);
  }
}

// CORS configuration
const defaultOrigins = [
  'https://www.hellobloom.ca',
  'https://hellobloom.ca',
  'https://admin.hellobloom.ca', // Cloudflare Pages admin custom domain
  'https://bloomadmin.pages.dev', // Cloudflare Pages admin default URL
  'https://bloom-appv2.pages.dev', // Cloudflare Pages www default URL
  'http://localhost:5173', // Admin frontend local
  'http://localhost:5174', // Admin frontend alternate
  'http://localhost:5175', // Customer website local
  'http://localhost:5176', // Customer website alternate
  'http://localhost:5177', // Customer website alternate
  'http://192.168.1.90:5173', // Admin frontend - network access
  'http://192.168.1.90:4000', // Backend - network access
];

const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS?.split(',')
  .map(origin => origin.trim())
  .filter(Boolean) ?? defaultOrigins);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) {
      return callback(null, true);
    }

    // Allow configured origins
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // In development, allow local network IPs (192.168.x.x, 10.x.x.x, 100.x.x.x for Tailscale, etc.)
    if (process.env.NODE_ENV !== 'production') {
      const localNetworkRegex = /^https?:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|100\.\d+\.\d+\.\d+|172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+)(:\d+)?$/;
      if (localNetworkRegex.test(origin)) {
        return callback(null, true);
      }
    }

    console.warn(`❌ Blocked CORS origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.options('*', cors({
  origin: (origin, callback) => {
    // Allow requests with no origin
    if (!origin) {
      return callback(null, true);
    }

    // Allow configured origins
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // In development, allow local network IPs
    if (process.env.NODE_ENV !== 'production') {
      const localNetworkRegex = /^https?:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|100\.\d+\.\d+\.\d+|172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+)(:\d+)?$/;
      if (localNetworkRegex.test(origin)) {
        return callback(null, true);
      }
    }

    console.warn(`❌ Blocked CORS origin (preflight): ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Stripe webhook needs raw body - must be registered BEFORE express.json()
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

app.use(express.json());

app.use('/api/discounts', discountsRouter); // Unified discounts system
app.use("/api/auth", authRouter);

app.use("/api/shortcuts", addressShortcutRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/employees", employeeRoutes);
app.use('/api/reportingcategories', reportingCategoriesRouter);
app.use('/api/customers', customersAuthRouter);
app.use('/api/customers', customerDuplicatesRouter);
app.use('/api/customers', customersRouter);
app.use('/api/house-accounts', houseAccountsRouter);
app.use('/api/import', importRouter);
app.use('/api/import-json', importJsonRouter);
app.use('/api/products', productsRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/addon-groups', addOnGroupsRouter);
app.use('/api/dashboard', dashboardRouter);
app.get('/api/settings/store-info', getStoreInfo);
app.post('/api/settings/store-info', saveStoreInfo);
app.get('/api/settings/notifications/order-status', getOrderStatusNotificationSettings);
app.post('/api/settings/notifications/order-status', saveOrderStatusNotificationSettings);
app.get('/api/settings/business-hours', getBusinessHours);
app.post('/api/settings/business-hours', saveBusinessHours);
app.get('/api/settings/delivery-exceptions', getDeliveryExceptions);
app.post('/api/settings/delivery-exceptions', saveDeliveryExceptions);
app.get('/api/settings/holidays', getHolidays);
app.post('/api/settings/holidays', createHoliday);
app.put('/api/settings/holidays/:id', updateHoliday);
app.delete('/api/settings/holidays/:id', deleteHoliday);
app.get('/api/settings/holidays/upcoming', getUpcomingHolidays);
app.get('/api/settings/holidays/active/:date', getActiveHoliday);
app.get('/api/settings/delivery-charges', getDeliveryCharges);
app.post('/api/settings/delivery-charges', saveDeliveryCharges);
app.use('/api/gift-cards', giftCardsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/orders', communicationsRouter); // Communication endpoints for orders
app.use('/api/communications', communicationsMetaRouter);
app.use('/api/payment-transactions', paymentTransactionsRouter);
app.use('/api', refundsRouter);
app.use('/api/settings/payments', paymentSettingsRouter);
app.use('/api/settings/operations', operationsSettingsRouter);
app.get('/api/settings/pos-tabs', getPOSTabs);
app.post('/api/settings/pos-tabs', savePOSTabs);
app.use('/api/settings/tax-rates', taxRatesRouter);
app.use('/api/settings/faqs', faqsRouter);
app.use('/api/settings/homepage', homepageRouter);
app.use('/api/settings/reporting-categories', reportingCategoriesRouter);
app.use('/api/email', emailRouter);
app.use('/api/email', emailSendRouter);
app.use('/api/sms', smsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/stripe', stripeRouter);
app.use('/api/square', squareRouter);
app.use('/api/events', eventsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/images', imagesRouter);
app.use('/api/print-jobs', printJobsRouter);
app.use('/api/legacy-orders', legacyOrdersRouter);
app.use('/api/print-settings', printSettingsRouter);
app.use('/api/email-settings', emailSettingsRouter);
app.use('/api/print', printRouter);
app.use('/api/routes', routesRouter);
app.use('/api/driver', driverRouteViewRouter);
app.use('/api/driver', driverQRRouter);
app.use('/api/wire-products', wireProductsRouter);
app.use('/api/gifts', giftsRouter);
app.use('/api/customer-payment-methods', customerPaymentMethodsRouter);

// Use noServer mode for multiple WebSocket endpoints
const wss = new WebSocketServer({ noServer: true });
const communicationsWss = new WebSocketServer({ noServer: true });

// Connect WebSocket servers to services
printService.setWebSocketServer(wss);
setCommunicationsWebSocketServer(communicationsWss);

// Handle upgrade requests manually to route to correct WebSocket server
server.on('upgrade', (request, socket, head) => {
  const { pathname } = new URL(request.url || '', `http://${request.headers.host}`);

  if (pathname === '/print-agent') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else if (pathname === '/communications') {
    communicationsWss.handleUpgrade(request, socket, head, (ws) => {
      communicationsWss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

wss.on('connection', (ws) => {
  console.log('📡 Print agent connected');

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());

      if (message.type === 'JOB_STATUS') {
        printService
          .updateJobStatus(message.jobId, message.status, message.agentId, message.errorMessage)
          .catch((error) => {
            console.error('Failed to update print job status from WebSocket:', error);
          });

        ws.send(JSON.stringify({ type: 'ACK', jobId: message.jobId }));
      } else if (message.type === 'HEARTBEAT') {
        ws.send(JSON.stringify({
          type: 'HEARTBEAT_ACK',
          timestamp: new Date().toISOString()
        }));
      }
    } catch (error) {
      console.error('Error handling print agent message:', error);
    }
  });

  ws.on('close', () => {
    console.log('📡 Print agent disconnected');
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

communicationsWss.on('connection', (ws) => {
  console.log('📡 Communications WebSocket connected');

  ws.on('close', () => {
    console.log('📡 Communications WebSocket disconnected');
  });

  ws.on('error', (error) => {
    console.error('Communications WebSocket error:', error);
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'Backend is alive!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    timezone: process.env.TZ
  });
});

async function startServer() {
  await ensureOrderSchema();

  const PORT = Number(process.env.PORT) || 4000;

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Custom backend running on http://localhost:${PORT}`);
    console.log('🖨️ Print agent WebSocket available at /print-agent');
  });
}

startServer().catch((error) => {
  console.error('Backend failed to start:', error);
  process.exit(1);
});

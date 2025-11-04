console.log("🚀 Starting backend...");
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import authRouter from "./routes/auth";

import productsRouter from './routes/products';
import categoriesRouter from './routes/categories';
import customersRouter from './routes/customers';
import reportingCategoriesRouter from './routes/reportingCategories';
import addressesRouter from './routes/addresses';
import employeeRoutes from "./routes/employees";
import messageRoutes from "./routes/messages";
import addressShortcutRoutes from "./routes/addressShortcuts";
import importRouter from './routes/import';
import discountsRouter from './routes/discounts';
import customersAuthRouter from './routes/customersAuth';
import customerDuplicatesRouter from './routes/customerDuplicates';
import giftCardsRouter from './routes/gift-cards';
import ordersRouter from './routes/orders/index';
import communicationsRouter from './routes/communications';
import paymentTransactionsRouter from './routes/payment-transactions';
import faqsRouter from './routes/settings/faqs';
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
import emailRouter from './routes/email';
import smsRouter from './routes/sms';
import notificationsRouter from './routes/notifications';
import stripeRouter from './routes/stripe';
import squareRouter from './routes/square';
import eventsRouter from './routes/events';
import reportsRouter from './routes/reports';
import ftdOrdersRouter from './routes/ftd/orders';
import ftdSettingsRouter from './routes/ftd/settings';
import imagesRouter from './routes/images';
import addOnGroupsRouter from './routes/addon-groups';
import dashboardRouter from './routes/dashboard';
import { startFtdMonitor } from './services/ftdMonitor';
import { startTokenRefreshSchedule } from './services/ftdAuthService';

dotenv.config();

const app = express();
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
];

const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS?.split(',')
  .map(origin => origin.trim())
  .filter(Boolean) ?? defaultOrigins);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
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
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    console.warn(`❌ Blocked CORS origin (preflight): ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json()); 

app.use('/api/discounts', discountsRouter); // Unified discounts system
app.use("/api/auth", authRouter);

app.use("/api/shortcuts", addressShortcutRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/employees", employeeRoutes);
app.use('/api/addresses', addressesRouter);
app.use('/api/reportingcategories', reportingCategoriesRouter);
app.use('/api/customers', customersAuthRouter);
app.use('/api/customers', customerDuplicatesRouter);
app.use('/api/customers', customersRouter);
app.use('/api/import', importRouter);
app.use('/api/products', productsRouter);
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
app.use('/api/payment-transactions', paymentTransactionsRouter);
app.use('/api/settings/payments', paymentSettingsRouter);
app.get('/api/settings/pos-tabs', getPOSTabs);
app.post('/api/settings/pos-tabs', savePOSTabs);
app.use('/api/settings/tax-rates', taxRatesRouter);
app.use('/api/settings/faqs', faqsRouter);
app.use('/api/settings/reporting-categories', reportingCategoriesRouter);
app.use('/api/email', emailRouter);
app.use('/api/sms', smsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/stripe', stripeRouter);
app.use('/api/square', squareRouter);
app.use('/api/events', eventsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/ftd/orders', ftdOrdersRouter);
app.use('/api/ftd/settings', ftdSettingsRouter);
app.use('/api/images', imagesRouter);

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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Custom backend running on http://localhost:${PORT}`);

    // Start FTD integration services
    console.log("🌸 Initializing FTD Wire Order Integration...");
    startFtdMonitor().catch(err => {
      console.error("Failed to start FTD monitor:", err.message);
    });
    startTokenRefreshSchedule();
  });
}

startServer().catch((error) => {
  console.error('Backend failed to start:', error);
  process.exit(1);
});

console.log("🚀 Starting backend...");
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import productsRouter from './routes/products';
import categoriesRouter from './routes/categories';
import customersRouter from './routes/customers';
import reportingCategoriesRouter from './routes/reportingCategories';
import addressesRouter from './routes/addresses';
import employeeRoutes from "./routes/employees";
import messageRoutes from "./routes/messages";
import addressShortcutRoutes from "./routes/addressShortcuts";
import couponsRouter from './routes/coupons';
import giftCardsRouter from './routes/gift-cards';
import ordersRouter from './routes/orders/index';
import paymentTransactionsRouter from './routes/payment-transactions';
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
import emailRouter from './routes/email';
import smsRouter from './routes/sms';
import notificationsRouter from './routes/notifications';

dotenv.config();

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json()); 

app.use('/api/coupons', couponsRouter); // ADD THIS LINE
app.use("/api/shortcuts", addressShortcutRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/employees", employeeRoutes);
app.use('/api/addresses', addressesRouter);
app.use('/api/reportingcategories', reportingCategoriesRouter);
app.use('/api/customers', customersRouter);
app.use('/api/products', productsRouter);
app.use('/api/categories', categoriesRouter);
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
app.use('/api/payment-transactions', paymentTransactionsRouter);
app.get('/api/settings/pos-tabs', getPOSTabs);
app.post('/api/settings/pos-tabs', savePOSTabs);
app.use('/api/settings/tax-rates', taxRatesRouter);
app.use('/api/email', emailRouter);
app.use('/api/sms', smsRouter);
app.use('/api/notifications', notificationsRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'Backend is alive!' });
});

const PORT = Number(process.env.PORT) || 4000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Custom backend running on http://localhost:${PORT}`);
});
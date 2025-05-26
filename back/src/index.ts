console.log("🚀 Starting backend...");

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






const app = express();
const prisma = new PrismaClient();


app.use(cors());
app.use(express.json()); 


app.use("/api/shortcuts", addressShortcutRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/employees", employeeRoutes);
app.use('/api/addresses', addressesRouter);
app.use('/api/reporting-categories', reportingCategoriesRouter);
app.use('/api/customers', customersRouter);
app.use('/api/products', productsRouter);
app.use('/api/categories', categoriesRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'Backend is alive!' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Custom backend running on http://localhost:${PORT}`);
});

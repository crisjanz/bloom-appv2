console.log("🚀 Starting backend...");

import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import productsRouter from './routes/products';
import categoriesRouter from './routes/categories';
import customersRouter from './routes/customers';
import reportingCategoriesRouter from './routes/reportingCategories';
import addressesRouter from './routes/addresses';

const app = express();
const prisma = new PrismaClient();


app.use(cors());
app.use(express.json()); 
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

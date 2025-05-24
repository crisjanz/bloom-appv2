import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import productsRouter from './routes/products.js'; // <- Note the `.js`

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());
app.use('/api/products', productsRouter); // <- Correct variable

app.get('/api/health', (req, res) => {
  res.json({ status: 'Backend is alive!' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Custom backend running on http://localhost:${PORT}`);
});

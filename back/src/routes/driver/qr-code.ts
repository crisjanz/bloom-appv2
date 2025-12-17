import express from 'express';
import { PrismaClient } from '@prisma/client';
import { generateRouteToken, buildRouteViewUrl } from '../../utils/routeToken';
import { generateOrderQRCode } from '../../utils/qrCodeGenerator';

const router = express.Router();
const prisma = new PrismaClient();

router.get('/qr/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const token = generateRouteToken(order.id);
    const url = buildRouteViewUrl(token);
    const qrCode = await generateOrderQRCode(url);

    res.json({ qrCode, url, token });
  } catch (error) {
    console.error('Error generating driver QR code:', error);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

export default router;

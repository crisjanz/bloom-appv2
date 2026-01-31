import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { emailService } from '../../services/emailService';

const prisma = new PrismaClient();

export const resendGiftCardEmail = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const card = await prisma.giftCard.findUnique({ where: { id } });
    if (!card) {
      return res.status(404).json({ error: 'Gift card not found' });
    }

    if (card.type !== 'DIGITAL') {
      return res.status(400).json({ error: 'Can only resend emails for digital gift cards' });
    }

    if (!card.recipientEmail) {
      return res.status(400).json({ error: 'Gift card has no recipient email' });
    }

    const emailSent = await emailService.sendGiftCardEmail({
      recipientEmail: card.recipientEmail,
      recipientName: card.recipientName || 'Gift Card Recipient',
      giftCardNumber: card.cardNumber,
      amount: card.initialValue / 100,
      purchaserName: card.purchasedBy || undefined,
      message: card.message || undefined,
      redeemUrl: 'https://bloomflowershop.com',
    });

    if (!emailSent) {
      return res.status(500).json({ error: 'Failed to send email' });
    }

    return res.json({ success: true, message: 'Gift card email resent' });
  } catch (error) {
    console.error('Error resending gift card email:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to resend gift card email',
    });
  }
};

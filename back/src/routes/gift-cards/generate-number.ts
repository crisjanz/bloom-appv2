import { Request, Response } from 'express';
import { giftCardService } from '../../services/giftCardService';

export const generateGiftCardNumber = async (_req: Request, res: Response) => {
  try {
    const cardNumber = await giftCardService.generateElectronicNumber();
    res.json({ cardNumber });
  } catch (error) {
    console.error('Error generating gift card number:', error);
    res.status(500).json({ error: 'Failed to generate gift card number' });
  }
};

import { Request, Response } from 'express';
import { PrismaClient, PrintJobType } from '@prisma/client';
import { generateOrderQRCode } from '../../utils/qrCodeGenerator';
import { storePdf } from '../../utils/pdfStorage';
import { giftCardService } from '../../services/giftCardService';
import { printSettingsService } from '../../services/printSettingsService';
import { printService } from '../../services/printService';
import { buildGiftCardLabelsPdf } from '../../templates/gift-card-labels-pdf';

const prisma = new PrismaClient();

interface BatchRequest {
  quantity: number;
  type: 'PHYSICAL' | 'DIGITAL';
  printLabels?: boolean;
}

const queueLabelPrint = async (cardNumbers: string[]) => {
  const config = await printSettingsService.getConfigForType(PrintJobType.LABEL);
  if (!config.enabled) {
    return { action: 'skipped', reason: 'disabled', type: PrintJobType.LABEL };
  }

  const labelItems = await Promise.all(
    cardNumbers.map(async (cardNumber) => ({
      cardNumber,
      qrCodeDataUrl: await generateOrderQRCode(cardNumber),
      quantity: 1,
    }))
  );

  const pdfBuffer = await buildGiftCardLabelsPdf(labelItems);

  if (config.destination === 'browser') {
    const stored = await storePdf(pdfBuffer, 'gift-card-labels');
    return {
      action: 'browser-print',
      pdfUrl: stored.url,
    };
  }

  const result = await printService.queuePrintJob({
    type: PrintJobType.LABEL,
    order: {
      pdfBase64: pdfBuffer.toString('base64'),
      labelCount: labelItems.length,
      cardNumbers,
    } as any,
    template: 'gift-card-label-v1',
    priority: 5,
  });

  return result;
};

export const createBatch = async (req: Request, res: Response) => {
  try {
    const { quantity = 100, type = 'PHYSICAL', printLabels = false }: BatchRequest = req.body;

    if (quantity < 1 || quantity > 1000) {
      return res.status(400).json({
        error: 'Quantity must be between 1 and 1000'
      });
    }

    const prefix = type === 'DIGITAL' ? 'EGC' : 'GC';
    const cardNumbers = await giftCardService.generateBatchNumbers(prefix, quantity);
    const cards = [];

    // Create all cards in batch
    for (const cardNumber of cardNumbers) {
      cards.push({
        cardNumber,
        type,
        status: 'INACTIVE',
        initialValue: 0,
        currentBalance: 0
      });
    }

    const result = await prisma.giftCard.createMany({
      data: cards
    });

    // Return the card numbers for printing
    const createdCards = cardNumbers.map(cardNumber => ({
      cardNumber,
      type,
      status: 'INACTIVE'
    }));

    const shouldPrintLabels = printLabels && type === 'PHYSICAL';
    const labelPrint = shouldPrintLabels ? await queueLabelPrint(cardNumbers) : null;

    const labelPdfUrl =
      labelPrint && typeof labelPrint === 'object' && 'pdfUrl' in labelPrint
        ? labelPrint.pdfUrl
        : undefined;

    return res.status(201).json({
      success: true,
      message: `Created ${result.count} gift cards`,
      cards: createdCards,
      labelPrint,
      labelPdfUrl,
    });

  } catch (error) {
    console.error('Error creating gift card batch:', error);
    return res.status(500).json({
      error: 'Failed to create gift card batch'
    });
  }
};

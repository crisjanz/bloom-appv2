import { Request, Response } from 'express';
import { OrderSource, OrderStatus, OrderType, PaymentStatus, PrismaClient } from '@prisma/client';
import { formatCurrency } from '../../utils/currency';
import { emailService } from '../../services/emailService';
import paymentProviderFactory from '../../services/paymentProviders/PaymentProviderFactory';
import { giftCardService } from '../../services/giftCardService';

const prisma = new PrismaClient();

interface PurchaseRequest {
  cards: Array<{
    cardNumber?: string; // For physical cards (preprinted)
    amount: number; // Amount in cents
    type: 'PHYSICAL' | 'DIGITAL';
    recipientEmail?: string; // For digital cards
    recipientName?: string;
    message?: string;
  }>;
  purchasedBy?: string;
  purchaserEmail?: string;
  employeeId?: string;
  orderId?: string;
  bloomCustomerId?: string;
  paymentIntentId?: string;
}

export const purchaseCards = async (req: Request, res: Response) => {
  try {
    const { 
      cards, 
      purchasedBy, 
      purchaserEmail,
      employeeId, 
      orderId,
      bloomCustomerId,
      paymentIntentId
    }: PurchaseRequest = req.body;

    if (!cards || !Array.isArray(cards) || cards.length === 0) {
      return res.status(400).json({
        error: 'Cards array is required'
      });
    }

    const minAmountCents = 2500;
    const maxAmountCents = 30000;
    const normalizedCards = cards.map((card) => ({
      ...card,
      amountCents: Number.isFinite(Number(card.amount)) ? Math.round(Number(card.amount)) : NaN
    }));

    // Validate each card
    for (const card of normalizedCards) {
      if (!Number.isFinite(card.amountCents) || card.amountCents < minAmountCents || card.amountCents > maxAmountCents) {
        return res.status(400).json({
          error: 'Each card amount must be between $25 and $300'
        });
      }

      // Digital cards require recipient email
      if (card.type === 'DIGITAL' && !card.recipientEmail) {
        return res.status(400).json({
          error: 'Digital cards require recipient email'
        });
      }

      // Physical cards require card number (digital cards get auto-generated numbers)
      if (card.type === 'PHYSICAL' && !card.cardNumber) {
        return res.status(400).json({
          error: 'Physical cards require card number'
        });
      }
    }

    const purchasedCards: any[] = [];
    let createdOrder: { id: string; orderNumber: number } | null = null;
    let resolvedOrderId: string | undefined = orderId;

    // Process each card in a transaction
    await prisma.$transaction(async (tx) => {
      if (!resolvedOrderId) {
        const orderItems = normalizedCards.map((card) => {
          const label = card.type === 'DIGITAL' ? 'Digital Gift Card' : 'Gift Card';
          const description = `${label} - ${formatCurrency(card.amountCents)}`;
          return {
            customName: description,
            description,
            unitPrice: card.amountCents,
            quantity: 1,
            rowTotal: card.amountCents,
          };
        });

        const totalAmount = orderItems.reduce((sum, item) => sum + item.rowTotal, 0);

        const order = await tx.order.create({
          data: {
            type: OrderType.GIFT_CARD,
            status: OrderStatus.PAID,
            paymentStatus: PaymentStatus.PAID,
            orderSource: OrderSource.WEBSITE,
            customerId: bloomCustomerId || null,
            deliveryFee: 0,
            totalTax: 0,
            taxBreakdown: [],
            paymentAmount: totalAmount,
            images: [],
            orderItems: {
              create: orderItems,
            },
          },
          select: {
            id: true,
            orderNumber: true,
          },
        });

        createdOrder = order;
        resolvedOrderId = order.id;
      }

      for (const cardData of normalizedCards) {
        let cardNumber = cardData.cardNumber;
        let giftCardId = '';

        if (cardData.type === 'PHYSICAL' && cardNumber) {
          // Physical card - find existing inactive card
          const existingCard = await tx.giftCard.findUnique({
            where: { cardNumber: cardNumber.toUpperCase() }
          });

          if (!existingCard) {
            throw new Error(`Physical gift card ${cardNumber} not found`);
          }

          if (existingCard.status !== 'INACTIVE') {
            throw new Error(`Gift card ${cardNumber} is already ${existingCard.status.toLowerCase()}`);
          }

          // Activate existing card
          const updatedCard = await tx.giftCard.update({
            where: { cardNumber: cardNumber.toUpperCase() },
            data: {
              status: 'ACTIVE',
              initialValue: cardData.amountCents,
              currentBalance: cardData.amountCents,
              purchasedBy,
              recipientEmail: cardData.recipientEmail,
              recipientName: cardData.recipientName,
              message: cardData.message
            }
          });

          cardNumber = updatedCard.cardNumber;
          giftCardId = updatedCard.id;

        } else {
          // Digital card - generate new card number if one wasn't provided
          if (cardNumber) {
            const normalized = cardNumber.toUpperCase().trim();
            if (!normalized.startsWith('EGC-')) {
              throw new Error('Digital gift card numbers must start with EGC-');
            }
            const existing = await tx.giftCard.findUnique({
              where: { cardNumber: normalized },
            });
            if (existing) {
              throw new Error(`Gift card ${normalized} already exists`);
            }
            cardNumber = normalized;
          } else {
            cardNumber = await giftCardService.generateElectronicNumber();
          }

          // Create new active card
          const newCard = await tx.giftCard.create({
            data: {
              cardNumber,
              type: cardData.type,
              status: 'ACTIVE',
              initialValue: cardData.amountCents,
              currentBalance: cardData.amountCents,
              purchasedBy,
              recipientEmail: cardData.recipientEmail,
              recipientName: cardData.recipientName,
              message: cardData.message
            }
          });

          cardNumber = newCard.cardNumber;
          giftCardId = newCard.id;
        }

        // Create purchase transaction
        await tx.giftCardTransaction.create({
          data: {
            giftCardId,
            type: 'PURCHASE',
            amount: cardData.amountCents,
            balanceAfter: cardData.amountCents,
            notes: `Gift card purchased for ${formatCurrency(cardData.amountCents)}`,
            employeeId,
            orderId: resolvedOrderId
          }
        });

        purchasedCards.push({
          cardNumber,
          amount: cardData.amountCents,
          type: cardData.type,
          recipientEmail: cardData.recipientEmail,
          recipientName: cardData.recipientName,
          message: cardData.message,
          status: 'ACTIVE'
        });
      }
    });

    if (paymentIntentId) {
      const orderNumber =
        createdOrder?.orderNumber ||
        (orderId
          ? (await prisma.order.findUnique({
              where: { id: orderId },
              select: { orderNumber: true },
            }))?.orderNumber
          : null);

      if (orderNumber) {
        (async () => {
          try {
            const stripe = await paymentProviderFactory.getStripeClient();
            await stripe.paymentIntents.update(paymentIntentId, {
              description: `Gift Card Order - ${orderNumber}`,
            });
          } catch (err) {
            console.error('Failed to update Stripe PaymentIntent description:', err);
          }
        })();
      }
    }

    // 📧 Send email for digital gift cards
    for (const card of purchasedCards) {
      if (card.recipientEmail) {
        console.log('📧 Sending gift card email to:', card.recipientEmail);
        try {
          const emailSent = await emailService.sendGiftCardEmail({
            recipientEmail: card.recipientEmail,
            recipientName: card.recipientName || 'Gift Card Recipient',
            giftCardNumber: card.cardNumber,
            amount: card.amount / 100,
            purchaserName: purchasedBy,
            message: card.message,
            redeemUrl: 'https://bloomflowershop.com' // Update when website is live
          });
          
          if (emailSent) {
            console.log('✅ Digital gift card email sent successfully');
          } else {
            console.log('❌ Failed to send digital gift card email');
          }
        } catch (error) {
          console.error('❌ Error sending digital gift card email:', error);
          // Don't fail the whole purchase if email fails
        }
      }
    }

    // 📧 Send receipt email to purchaser
    if (purchaserEmail && purchasedCards.length > 0) {
      try {
        const totalAmountCents = purchasedCards.reduce((sum, card) => sum + card.amount, 0);
        await emailService.sendGiftCardReceiptEmail({
          purchaserEmail,
          purchaserName: purchasedBy || 'Customer',
          cards: purchasedCards.map((card) => ({
            recipientName: card.recipientName || 'Gift Card Recipient',
            recipientEmail: card.recipientEmail,
            amount: card.amount / 100,
            cardNumber: card.cardNumber,
          })),
          totalAmount: totalAmountCents / 100,
        });
        console.log('✅ Gift card receipt sent to purchaser:', purchaserEmail);
      } catch (error) {
        console.error('❌ Error sending gift card receipt to purchaser:', error);
      }
    }

    return res.status(201).json({
      success: true,
      message: `Successfully purchased ${purchasedCards.length} gift card(s)`,
      cards: purchasedCards
    });

  } catch (error) {
    console.error('Error purchasing gift cards:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to purchase gift cards'
    });
  }
};

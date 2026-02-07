import { format } from 'date-fns';
import { formatCurrency, generatePdfBuffer } from '../utils/pdfGenerator';

export interface GiftCardHandoffItem {
  cardNumber: string;
  amount: number;
  type: 'PHYSICAL' | 'DIGITAL';
  recipientName?: string | null;
  recipientEmail?: string | null;
  message?: string | null;
}

export interface GiftCardHandoffPdfPayload {
  shopName?: string | null;
  generatedAt: Date;
  customerName?: string | null;
  cards: GiftCardHandoffItem[];
}

const MARGIN = 40;

export async function buildGiftCardHandoffPdf(
  payload: GiftCardHandoffPdfPayload
): Promise<Buffer> {
  return generatePdfBuffer((doc) => {
    const shopName = payload.shopName || 'In Your Vase Flowers';
    const cards = payload.cards || [];

    const renderCard = (card: GiftCardHandoffItem, index: number) => {
      if (index > 0) {
        doc.addPage();
      }

      let y = MARGIN;
      const pageWidth = doc.page.width;
      const contentWidth = pageWidth - MARGIN * 2;

      doc.font('Helvetica-Bold').fontSize(18).text(`${shopName} Gift Card`, MARGIN, y, {
        width: contentWidth,
        align: 'left',
      });
      doc.font('Helvetica').fontSize(10).text(`Generated: ${format(payload.generatedAt, 'yyyy-MM-dd HH:mm')}`, MARGIN, y, {
        width: contentWidth,
        align: 'right',
      });
      y += 26;

      if (payload.customerName) {
        doc.font('Helvetica').fontSize(10).text(`Purchased By: ${payload.customerName}`, MARGIN, y);
        y += 16;
      }

      doc.font('Helvetica-Bold').fontSize(12).text('Card Number', MARGIN, y);
      y += 14;
      doc.font('Helvetica-Bold').fontSize(22).text(card.cardNumber, MARGIN, y);
      y += 28;

      doc.font('Helvetica').fontSize(11).text(`Amount: ${formatCurrency(card.amount)}`, MARGIN, y);
      y += 16;
      doc.text(`Type: ${card.type === 'DIGITAL' ? 'Digital' : 'Physical'}`, MARGIN, y);
      y += 16;

      if (card.recipientName) {
        doc.text(`Recipient: ${card.recipientName}`, MARGIN, y);
        y += 14;
      }
      if (card.recipientEmail) {
        doc.text(`Recipient Email: ${card.recipientEmail}`, MARGIN, y);
        y += 14;
      }
      if (card.message) {
        doc.font('Helvetica-Oblique').fontSize(10).text(`Message: "${card.message}"`, MARGIN, y, {
          width: contentWidth,
        });
        y += 24;
      }

      doc.font('Helvetica-Bold').fontSize(11).text('How to Use', MARGIN, y);
      y += 14;
      doc.font('Helvetica').fontSize(10);
      const instructions = [
        'Present this card number for payment at checkout.',
        'Gift cards can be used online, in-store, or over the phone.',
        'Gift cards do not expire and keep their remaining balance.',
      ];
      instructions.forEach((line) => {
        doc.text(`- ${line}`, MARGIN, y, { width: contentWidth });
        y += 14;
      });
    };

    if (cards.length === 0) {
      doc.font('Helvetica-Bold').fontSize(14).text('Gift Card Details', MARGIN, MARGIN);
      doc.font('Helvetica').fontSize(10).text('No gift cards were provided for printing.', MARGIN, MARGIN + 20);
      return;
    }

    cards.forEach(renderCard);
  }, { size: 'LETTER', margin: MARGIN });
}

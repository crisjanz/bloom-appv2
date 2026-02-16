import { formatCurrency, formatDateTime, generatePdfBuffer } from '../utils/pdfGenerator';
import { PrismaClient } from '@prisma/client';
import { formatOrderNumber } from '../utils/formatOrderNumber';

const prisma = new PrismaClient();

const shortenTitle = (title: string, maxWords = 3): string => {
  const words = title.trim().split(/\s+/);
  return words.slice(0, maxWords).join(' ');
};

export async function buildReceiptPdf(order: any, orderNumberPrefix: string = ''): Promise<Buffer> {
  const storeSettings = await prisma.storeSettings.findFirst();
  const formattedOrderNumber = formatOrderNumber(order.orderNumber ?? order.id, orderNumberPrefix);

  // 80mm width thermal receipt format (227 points)
  const pageWidth = 227;
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;

  return generatePdfBuffer((doc) => {
    let yPos: number;

    yPos = doc.y;
    doc.fontSize(12).text(storeSettings?.storeName || 'Bloom Flowers', margin, yPos, { width: contentWidth, align: 'center', lineBreak: false });
    doc.y = yPos + 12;

    if (storeSettings?.address) {
      yPos = doc.y;
      doc.fontSize(8).text(storeSettings.address, margin, yPos, { width: contentWidth, align: 'center', lineBreak: false });
      doc.y = yPos + 9;
    }
    if (storeSettings?.city || storeSettings?.state || storeSettings?.zipCode) {
      const location = [storeSettings?.city, storeSettings?.state, storeSettings?.zipCode]
        .filter(Boolean)
        .join(', ');
      yPos = doc.y;
      doc.fontSize(8).text(location, margin, yPos, { width: contentWidth, align: 'center', lineBreak: false });
      doc.y = yPos + 9;
    }
    if (storeSettings?.phone) {
      yPos = doc.y;
      doc.fontSize(8).text(`Phone: ${storeSettings.phone}`, margin, yPos, { width: contentWidth, align: 'center', lineBreak: false });
      doc.y = yPos + 9;
    }
    if (storeSettings?.taxId) {
      yPos = doc.y;
      doc.fontSize(8).text(`Tax ID: ${storeSettings.taxId}`, margin, yPos, { width: contentWidth, align: 'center', lineBreak: false });
      doc.y = yPos + 9;
    }

    doc.y += 8;
    yPos = doc.y;
    doc.fontSize(9).text(`Order #${formattedOrderNumber}`, margin, yPos, { width: contentWidth, align: 'center', lineBreak: false });
    doc.y = yPos + 10;
    yPos = doc.y;
    doc.text(`Date: ${formatDateTime(order.createdAt)}`, margin, yPos, { width: contentWidth, align: 'center', lineBreak: false });
    doc.y = yPos + 10;

    doc.y += 10;

    const customerName = [order.customer?.firstName, order.customer?.lastName]
      .filter(Boolean)
      .join(' ');
    yPos = doc.y;
    doc.fontSize(9).text(`Customer: ${customerName || 'Customer'}`, margin, yPos, { width: contentWidth, align: 'center', lineBreak: false });
    doc.y = yPos + 20;

    doc.y += 10;

    // Headers
    yPos = doc.y;
    doc.fontSize(8).text('QTY', margin, yPos, { width: 25, align: 'center', lineBreak: false });
    doc.text('Product', margin + 25, yPos, { width: contentWidth - 75, lineBreak: false });
    doc.text('Price', margin + contentWidth - 50, yPos, { width: 50, align: 'right', lineBreak: false });
    doc.y = yPos + 10;
    doc.dash(4, { space: 3 }).moveTo(margin, doc.y).lineTo(pageWidth - margin, doc.y).stroke();
    doc.y += 3;

    const items = order.orderItems ?? [];
    const subtotal = items.reduce((sum: number, item: any) => {
      const quantity = item.quantity ?? 1;
      const rowTotal = item.rowTotal ?? (item.unitPrice ?? 0) * quantity;
      return sum + rowTotal;
    }, 0);

    items.forEach((item: any) => {
      const rawName = item.customName || 'Item';
      const name = shortenTitle(rawName, 3);
      const quantity = item.quantity ?? 1;
      const unitPrice = item.unitPrice ?? 0;
      const rowTotal = item.rowTotal ?? unitPrice * quantity;

      yPos = doc.y;
      doc.fontSize(8).text(`${quantity}`, margin, yPos, { width: 25, align: 'center', lineBreak: false });
      doc.text(name, margin + 25, yPos, { width: contentWidth - 75, lineBreak: false });
      doc.text(formatCurrency(rowTotal), margin + contentWidth - 50, yPos, { width: 50, align: 'right', lineBreak: false });
      doc.y = yPos + 10;
    });

    const deliveryFee = order.deliveryFee ?? 0;
    const tax = order.totalTax ?? 0;
    const discount = order.discount ?? 0;
    const total = order.paymentAmount ?? subtotal + deliveryFee + tax - discount;

    doc.moveTo(margin, doc.y).lineTo(pageWidth - margin, doc.y).stroke().undash();
    doc.y += 3;

    yPos = doc.y;
    doc.fontSize(8).text('Subtotal', margin + 25, yPos, { width: contentWidth - 75, lineBreak: false });
    doc.text(formatCurrency(subtotal), margin + contentWidth - 50, yPos, { width: 50, align: 'right', lineBreak: false });
    doc.y = yPos + 10;

    if (deliveryFee) {
      yPos = doc.y;
      doc.text('Delivery', margin + 25, yPos, { width: contentWidth - 75, lineBreak: false });
      doc.text(formatCurrency(deliveryFee), margin + contentWidth - 50, yPos, { width: 50, align: 'right', lineBreak: false });
      doc.y = yPos + 10;
    }
    if (discount) {
      yPos = doc.y;
      doc.text('Discount', margin + 25, yPos, { width: contentWidth - 75, lineBreak: false });
      doc.text(`-${formatCurrency(discount)}`, margin + contentWidth - 50, yPos, { width: 50, align: 'right', lineBreak: false });
      doc.y = yPos + 10;
    }
    if (tax) {
      yPos = doc.y;
      doc.text('Tax', margin + 25, yPos, { width: contentWidth - 75, lineBreak: false });
      doc.text(formatCurrency(tax), margin + contentWidth - 50, yPos, { width: 50, align: 'right', lineBreak: false });
      doc.y = yPos + 10;
    }

    yPos = doc.y;
    doc.fontSize(10).text('Total', margin + 25, yPos, { width: contentWidth - 75, lineBreak: false });
    doc.text(formatCurrency(total), margin + contentWidth - 50, yPos, { width: 50, align: 'right', lineBreak: false });
    doc.y = yPos + 12;

    if (order.transactions && order.transactions.length > 0) {
      const completedTransactions = order.transactions.filter((t: any) => t.status === 'COMPLETED');
      const failedTransactions = order.transactions.filter((t: any) => t.status === 'FAILED' || t.status === 'CANCELLED');

      // Show completed payment details
      if (completedTransactions.length > 0) {
        doc.y += 8;
        doc.moveTo(margin, doc.y).lineTo(pageWidth - margin, doc.y).stroke();
        doc.y += 8;
        yPos = doc.y;
        doc.fontSize(9).text('Payment Details', margin, yPos, { width: contentWidth, align: 'center', lineBreak: false });
        doc.y = yPos + 12;

        completedTransactions.forEach((transaction: any) => {
          transaction.paymentMethods?.forEach((pm: any) => {
            const methodType = pm.type?.replace('_', ' ') || 'Payment';
            const status = pm.status === 'completed' ? 'APPROVED' : pm.status?.toUpperCase() || 'PENDING';
            yPos = doc.y;
            doc.fontSize(7).text(`${methodType}: ${formatCurrency(pm.amount)} - ${status}`, margin, yPos, { width: contentWidth, align: 'center', lineBreak: false });
            doc.y = yPos + 8;
            if (pm.cardLast4) {
              yPos = doc.y;
              doc.text(`Card ending in ${pm.cardLast4}${pm.cardBrand ? ` (${pm.cardBrand})` : ''}`, margin, yPos, { width: contentWidth, align: 'center', lineBreak: false });
              doc.y = yPos + 8;
            }
            if (pm.providerTransactionId) {
              yPos = doc.y;
              doc.fontSize(7).text(`ID: ${pm.providerTransactionId}`, margin, yPos, { width: contentWidth, align: 'center', lineBreak: false });
              doc.y = yPos + 8;
            }
          });
        });
      }

      // Show failed attempts
      if (failedTransactions.length > 0) {
        doc.y += 4;
        yPos = doc.y;
        doc.fontSize(8).text('Previous Attempts', margin, yPos, { width: contentWidth, align: 'center', lineBreak: false });
        doc.y = yPos + 10;

        failedTransactions.forEach((transaction: any) => {
          transaction.paymentMethods?.forEach((pm: any) => {
            const methodType = pm.type?.replace('_', ' ') || 'Payment';
            const status = transaction.status === 'FAILED' ? 'DECLINED' : 'CANCELLED';
            yPos = doc.y;
            doc.fontSize(7).text(`${methodType}: ${formatCurrency(pm.amount)} - ${status}`, margin, yPos, { width: contentWidth, align: 'center', lineBreak: false });
            doc.y = yPos + 8;
            if (pm.cardLast4) {
              yPos = doc.y;
              doc.text(`Card ending in ${pm.cardLast4}`, margin, yPos, { width: contentWidth, align: 'center', lineBreak: false });
              doc.y = yPos + 8;
            }
          });
        });
      }
    }

    doc.y += 8;
    yPos = doc.y;
    doc.fontSize(8).text('Thank you for your order.', margin, yPos, { width: contentWidth, align: 'center', lineBreak: false });
  }, { size: [pageWidth, 1400], margin });
}

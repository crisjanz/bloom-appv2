import { PrismaClient } from '@prisma/client';
import { formatCurrency, formatDateTime, generatePdfBuffer } from '../utils/pdfGenerator';

const prisma = new PrismaClient();

const buildAddressLines = (address: any) => {
  if (!address) return [];
  const lines: string[] = [];
  if (address.address1) lines.push(address.address1);
  if (address.address2) lines.push(address.address2);
  const cityLine = [address.city, address.province, address.postalCode]
    .filter(Boolean)
    .join(', ');
  if (cityLine) lines.push(cityLine);
  return lines;
};

const formatTitleCase = (value: string) =>
  value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const formatPaymentMethod = (method: any) => {
  if (!method?.type) return 'Payment';

  if (method.type === 'CARD') {
    const last4 = method.cardLast4 ? ` ending in ${method.cardLast4}` : '';
    const brand = method.cardBrand ? ` (${method.cardBrand})` : '';
    return `Card${last4}${brand}`;
  }

  if (method.type === 'CHECK' && method.checkNumber) {
    return `Check #${method.checkNumber}`;
  }

  if (method.type === 'GIFT_CARD' && method.giftCardNumber) {
    return `Gift Card ${method.giftCardNumber}`;
  }

  return formatTitleCase(method.type);
};

const getOrderTransactions = (order: any) => {
  if (Array.isArray(order?.transactions)) {
    return order.transactions;
  }

  const transactions = order?.orderPayments?.map((op: any) => op.transaction).filter(Boolean) || [];
  const priority = { COMPLETED: 0, FAILED: 1, CANCELLED: 2, PROCESSING: 3, PENDING: 4 };

  return transactions.sort((a: any, b: any) => {
    return (priority[a.status] ?? 99) - (priority[b.status] ?? 99);
  });
};

const drawTextBlock = (
  doc: any,
  text: string,
  x: number,
  y: number,
  width: number,
  fontSize: number,
  font: string,
  align: 'left' | 'right' = 'left'
) => {
  doc.font(font).fontSize(fontSize);
  doc.text(text, x, y, { width, align });
  return y + doc.heightOfString(text, { width, align }) + 2;
};

export async function buildInvoicePdf(order: any): Promise<Buffer> {
  const storeSettings = await prisma.storeSettings.findFirst();

  const businessName = storeSettings?.storeName || 'Bloom Flowers';
  const businessLines = [
    storeSettings?.address,
    [storeSettings?.city, storeSettings?.state, storeSettings?.zipCode].filter(Boolean).join(', '),
    storeSettings?.phone ? `Phone: ${storeSettings.phone}` : null,
    storeSettings?.email || null,
    storeSettings?.taxId ? `Tax ID: ${storeSettings.taxId}` : null
  ].filter(Boolean) as string[];

  const customerName = [order.customer?.firstName, order.customer?.lastName]
    .filter(Boolean)
    .join(' ') || 'Customer';
  const senderLines = [customerName, order.customer?.phone, order.customer?.email].filter(Boolean) as string[];

  const recipientName =
    [order.deliveryAddress?.firstName, order.deliveryAddress?.lastName].filter(Boolean).join(' ') ||
    [order.recipientCustomer?.firstName, order.recipientCustomer?.lastName].filter(Boolean).join(' ') ||
    order.recipientName ||
    (order.type === 'PICKUP' ? 'Pickup' : 'Recipient');
  const recipientLines = [
    recipientName,
    order.deliveryAddress?.phone || order.recipientCustomer?.phone
  ]
    .filter(Boolean)
    .concat(buildAddressLines(order.deliveryAddress));

  const orderNumber = order.orderNumber ?? order.id ?? 'N/A';
  const issueDate = formatDateTime(order.createdAt) || 'N/A';

  const fulfillmentLabel = order.type === 'PICKUP' ? 'Pickup Date' : 'Delivery Date';
  const deliveryDateLabel = order.deliveryDate ? formatDateTime(order.deliveryDate) : 'Not set';
  const deliveryTimeLabel = order.deliveryTime ? ` (${order.deliveryTime})` : '';
  const cardMessage = order.cardMessage ? order.cardMessage.replace(/\s+/g, ' ').trim() : 'N/A';

  const transactions = getOrderTransactions(order);
  const primaryTransaction = transactions.find((transaction: any) => transaction.status === 'COMPLETED') || transactions[0];
  const paymentStatus = primaryTransaction?.status ? formatTitleCase(primaryTransaction.status) : 'Pending';
  const paymentMethods = primaryTransaction?.paymentMethods || [];
  const paymentMethodLabel = paymentMethods.length
    ? paymentMethods.map(formatPaymentMethod).join(', ')
    : 'N/A';

  return generatePdfBuffer((doc) => {
    const margin = doc.page.margins.left;
    const pageWidth = doc.page.width;
    const contentWidth = pageWidth - margin * 2;
    const rightColumnWidth = 200;
    const leftColumnWidth = contentWidth - rightColumnWidth - 16;
    const leftX = margin;
    const rightX = margin + contentWidth - rightColumnWidth;

    let leftY = margin;
    let rightY = margin;

    leftY = drawTextBlock(doc, businessName, leftX, leftY, leftColumnWidth, 14, 'Helvetica-Bold');
    businessLines.forEach((line) => {
      leftY = drawTextBlock(doc, line, leftX, leftY, leftColumnWidth, 9, 'Helvetica');
    });

    rightY = drawTextBlock(doc, 'INVOICE', rightX, rightY, rightColumnWidth, 18, 'Helvetica-Bold', 'right');
    rightY = drawTextBlock(doc, `Order #${orderNumber}`, rightX, rightY, rightColumnWidth, 10, 'Helvetica', 'right');
    rightY = drawTextBlock(doc, `Issue Date: ${issueDate}`, rightX, rightY, rightColumnWidth, 10, 'Helvetica', 'right');

    let y = Math.max(leftY, rightY) + 12;
    doc.strokeColor('#d0d0d0').lineWidth(1);
    doc.moveTo(leftX, y).lineTo(leftX + contentWidth, y).stroke();
    y += 12;

    const columnGap = 24;
    const columnWidth = (contentWidth - columnGap) / 2;
    const rightColumnX = leftX + columnWidth + columnGap;

    doc.font('Helvetica-Bold').fontSize(11).text('Sender', leftX, y, { width: columnWidth });
    doc.text('Recipient', rightColumnX, y, { width: columnWidth });
    y += 14;

    let senderY = y;
    let recipientY = y;

    if (senderLines.length === 0) {
      senderLines.push('N/A');
    }
    if (recipientLines.length === 0) {
      recipientLines.push('N/A');
    }

    senderLines.forEach((line) => {
      senderY = drawTextBlock(doc, line, leftX, senderY, columnWidth, 9, 'Helvetica');
    });
    recipientLines.forEach((line) => {
      recipientY = drawTextBlock(doc, line, rightColumnX, recipientY, columnWidth, 9, 'Helvetica');
    });

    y = Math.max(senderY, recipientY) + 8;
    doc.strokeColor('#d0d0d0').lineWidth(1);
    doc.moveTo(leftX, y).lineTo(leftX + contentWidth, y).stroke();
    y += 12;

    doc.font('Helvetica-Bold').fontSize(11).text('Order Info', leftX, y, { width: contentWidth });
    y += 14;

    const orderInfoLines = [
      `${fulfillmentLabel}: ${deliveryDateLabel}${deliveryTimeLabel}`,
      `Card Message: ${cardMessage}`,
      `Payment Method: ${paymentMethodLabel}`,
      `Payment Status: ${paymentStatus}`
    ];

    orderInfoLines.forEach((line) => {
      y = drawTextBlock(doc, line, leftX, y, contentWidth, 9, 'Helvetica');
    });

    y += 6;
    doc.strokeColor('#d0d0d0').lineWidth(1);
    doc.moveTo(leftX, y).lineTo(leftX + contentWidth, y).stroke();
    y += 12;

    doc.font('Helvetica-Bold').fontSize(11).text('Items', leftX, y, { width: contentWidth });
    y += 14;

    const items = order.orderItems ?? [];
    const subtotal = items.reduce((sum: number, item: any) => {
      const quantity = item.quantity ?? 1;
      const rowTotal = item.rowTotal ?? (item.unitPrice ?? 0) * quantity;
      return sum + rowTotal;
    }, 0);

    const qtyWidth = 40;
    const unitWidth = 80;
    const totalWidth = 80;
    const descWidth = contentWidth - qtyWidth - unitWidth - totalWidth - 12;
    const qtyX = leftX + descWidth + 4;
    const unitX = qtyX + qtyWidth + 4;
    const totalX = unitX + unitWidth + 4;

    doc.font('Helvetica-Bold').fontSize(9);
    doc.text('Item', leftX, y, { width: descWidth });
    doc.text('Qty', qtyX, y, { width: qtyWidth, align: 'right' });
    doc.text('Unit', unitX, y, { width: unitWidth, align: 'right' });
    doc.text('Total', totalX, y, { width: totalWidth, align: 'right' });
    y += 12;
    doc.strokeColor('#d0d0d0').lineWidth(1);
    doc.moveTo(leftX, y).lineTo(leftX + contentWidth, y).stroke();
    y += 6;

    doc.font('Helvetica').fontSize(9);
    items.forEach((item: any) => {
      const name = item.customName || item.description || 'Item';
      const quantity = item.quantity ?? 1;
      const unitPrice = item.unitPrice ?? 0;
      const rowTotal = item.rowTotal ?? unitPrice * quantity;

      const rowY = y;
      doc.text(name, leftX, rowY, { width: descWidth });
      doc.text(`${quantity}`, qtyX, rowY, { width: qtyWidth, align: 'right' });
      doc.text(formatCurrency(unitPrice), unitX, rowY, { width: unitWidth, align: 'right' });
      doc.text(formatCurrency(rowTotal), totalX, rowY, { width: totalWidth, align: 'right' });

      const rowHeight = Math.max(
        doc.heightOfString(name, { width: descWidth }),
        doc.heightOfString(formatCurrency(rowTotal), { width: totalWidth, align: 'right' })
      );
      y = rowY + rowHeight + 4;
    });

    const deliveryFee = order.deliveryFee ?? 0;
    const wireoutFee = order.wireoutServiceFee ?? 0;
    const discount = order.discount ?? 0;
    const taxBreakdown = Array.isArray(order.taxBreakdown)
      ? order.taxBreakdown
      : (() => {
          try {
            return JSON.parse(order.taxBreakdown || '[]');
          } catch {
            return [];
          }
        })();
    const taxLines = taxBreakdown.length
      ? taxBreakdown.map((tax: any) => ({
          label: tax.name || tax.taxType || 'Tax',
          amount: tax.amount || tax.taxAmount || 0
        }))
      : (order.totalTax ? [{ label: 'Tax', amount: order.totalTax }] : []);
    const taxTotal = taxLines.reduce((sum: number, tax: any) => sum + (tax.amount || 0), 0);
    const total = order.paymentAmount ?? subtotal + deliveryFee + wireoutFee + taxTotal - discount;

    y += 4;
    doc.strokeColor('#d0d0d0').lineWidth(1);
    doc.moveTo(leftX, y).lineTo(leftX + contentWidth, y).stroke();
    y += 8;

    const drawTotalLine = (label: string, amount: number, bold = false) => {
      const formattedAmount = amount < 0
        ? `-${formatCurrency(Math.abs(amount))}`
        : formatCurrency(amount);
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 10 : 9);
      doc.text(`${label}: ${formattedAmount}`, leftX, y, { width: contentWidth, align: 'right' });
      y += bold ? 12 : 10;
    };

    drawTotalLine('Subtotal', subtotal);
    if (deliveryFee) {
      drawTotalLine('Delivery', deliveryFee);
    }
    if (wireoutFee) {
      drawTotalLine(order.wireoutServiceName || 'Service Fee', wireoutFee);
    }
    if (discount) {
      drawTotalLine('Discount', -discount);
    }
    taxLines.forEach((tax: any) => {
      drawTotalLine(tax.label || 'Tax', tax.amount || 0);
    });
    drawTotalLine('Total', total, true);
  });
}

import path from 'path';
import { PrismaClient } from '@prisma/client';
import { formatCurrency, formatDateTime, generatePdfBuffer } from '../utils/pdfGenerator';
import { formatOrderNumber } from '../utils/formatOrderNumber';

const prisma = new PrismaClient();
const DEJAVU_SANS_OBLIQUE = path.join(__dirname, '..', 'assets', 'fonts', 'DejaVuSans-Oblique.ttf');

const formatShortDate = (value: Date | string | null | undefined) => {
  if (!value) return 'TBD';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return 'TBD';
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[date.getDay()]}. ${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
};

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

const wrapText = (doc: any, text: string, maxWidth: number, maxLines?: number) => {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const words = trimmed.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (doc.widthOfString(candidate) <= maxWidth || !currentLine) {
      currentLine = candidate;
      continue;
    }

    lines.push(currentLine);
    if (maxLines && lines.length >= maxLines) {
      return lines;
    }
    currentLine = word;
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return maxLines ? lines.slice(0, maxLines) : lines;
};

export async function buildOrderTicketPdf(
  order: any,
  options?: { qrCodeBuffer?: Buffer | null; orderNumberPrefix?: string }
): Promise<Buffer> {
  const storeSettings = await prisma.storeSettings.findFirst();
  const qrCodeBuffer = options?.qrCodeBuffer ?? null;
  const orderNumberPrefix = options?.orderNumberPrefix ?? '';

  const orderNumber = formatOrderNumber(order.orderNumber ?? order.id, orderNumberPrefix);
  const deliveryDateLabel = order.deliveryDate ? formatShortDate(order.deliveryDate) : 'TBD';
  const deliveryTimeLabel = order.deliveryTime || 'TBD';
  const orderDateLabel = formatDateTime(order.createdAt);

  const customerName = [order.customer?.firstName, order.customer?.lastName]
    .filter(Boolean)
    .join(' ') || 'Unknown';
  const customerPhone = order.customer?.phone || '';

  const recipientName = order.recipientName
    || [order.recipientCustomer?.firstName, order.recipientCustomer?.lastName]
      .filter(Boolean)
      .join(' ')
    || 'Unknown';
  const recipientPhone = order.deliveryAddress?.phone || order.recipientCustomer?.phone || '';
  const recipientAddressLines = buildAddressLines(order.deliveryAddress);

  const items = Array.isArray(order.orderItems) ? order.orderItems : [];
  const normalizedItems = items.map((item: any) => {
    const quantity = item.quantity ?? 1;
    const unitPrice = item.unitPrice ?? 0;
    const total = item.rowTotal ?? unitPrice * quantity;
    return {
      quantity,
      name: item.customName || item.description || 'Item',
      description: item.description || '',
      total
    };
  });

  const subtotal = normalizedItems.reduce((sum, item) => sum + (item.total || 0), 0);
  const deliveryFee = order.deliveryFee ?? 0;
  const discount = order.discount ?? 0;
  const taxLines = Array.isArray(order.taxBreakdown) && order.taxBreakdown.length > 0
    ? order.taxBreakdown.map((tax: any) => ({
        name: tax.name || 'Tax',
        amount: tax.amount || 0
      }))
    : (order.totalTax ? [{ name: 'Tax', amount: order.totalTax }] : []);
  const taxTotal = taxLines.reduce((sum, tax) => sum + tax.amount, 0);
  const total = order.paymentAmount ?? subtotal + deliveryFee + taxTotal - discount;

  const businessName = storeSettings?.storeName || 'Bloom Flowers';
  const businessLines = [
    storeSettings?.address,
    [storeSettings?.city, storeSettings?.state, storeSettings?.zipCode].filter(Boolean).join(', '),
    storeSettings?.phone,
    storeSettings?.email
  ].filter(Boolean) as string[];

  const pageWidth = 792;
  const pageHeight = 612;
  const leftWidth = 504;
  const rightWidth = pageWidth - leftWidth;
  const topHeight = 405;
  const bottomHeight = pageHeight - topHeight;
  const rightSectionHeight = pageHeight / 3;
  const padding = 24;

  return generatePdfBuffer((doc) => {
    doc.font('Helvetica');

    // Top left section (shop records)
    const leftContentX = padding;
    const leftContentWidth = leftWidth - padding * 2;
    let y = padding;

    doc.font('Helvetica-Bold').fontSize(12);
    doc.text(`Delivery Date: ${deliveryDateLabel}`, leftContentX, y, { width: leftContentWidth, align: 'left' });
    doc.text(`# ${orderNumber}`, leftContentX, y, { width: leftContentWidth, align: 'right' });
    y += 16;

    doc.save();
    doc.lineWidth(0.5).strokeColor('#000');
    doc.moveTo(leftContentX, y).lineTo(leftContentX + leftContentWidth, y).stroke();
    doc.restore();
    y += 10;

    doc.font('Helvetica').fontSize(9);
    doc.text(`Delivery Time: ${deliveryTimeLabel}`, leftContentX, y, { width: leftContentWidth, align: 'left' });
    y += 12;

    const colGap = 16;
    const colWidth = (leftContentWidth - colGap) / 2;
    const col1X = leftContentX;
    const col2X = leftContentX + colWidth + colGap;

    let col1Y = y;
    doc.font('Helvetica-Bold').fontSize(9).text('Recipient:', col1X, col1Y, { width: colWidth });
    col1Y = doc.y + 2;
    doc.font('Helvetica-Bold').text(recipientName || 'Unknown', col1X, col1Y, { width: colWidth });
    col1Y = doc.y;
    doc.font('Helvetica').fontSize(9);
    if (recipientPhone) {
      doc.text(recipientPhone, col1X, col1Y, { width: colWidth });
      col1Y = doc.y;
    }
    if (recipientAddressLines.length) {
      doc.text(recipientAddressLines.join('\n'), col1X, col1Y, { width: colWidth });
      col1Y = doc.y;
    }

    let col2Y = y;
    doc.font('Helvetica-Bold').fontSize(9).text('Sender:', col2X, col2Y, { width: colWidth });
    col2Y = doc.y + 2;
    doc.font('Helvetica-Bold').text(customerName || 'Unknown', col2X, col2Y, { width: colWidth });
    col2Y = doc.y;
    doc.font('Helvetica').fontSize(9);
    if (customerPhone) {
      doc.text(customerPhone, col2X, col2Y, { width: colWidth });
      col2Y = doc.y;
    }
    if (orderDateLabel) {
      doc.text(`Placed on: ${orderDateLabel}`, col2X, col2Y, { width: colWidth });
      col2Y = doc.y;
    }

    y = Math.max(col1Y, col2Y) + 10;

    doc.save();
    doc.lineWidth(0.5).strokeColor('#000');
    doc.moveTo(leftContentX, y).lineTo(leftContentX + leftContentWidth, y).stroke();
    doc.restore();
    y += 10;

    const detailsTop = y;
    const detailsBottom = topHeight - padding;
    const summaryWidth = 170;
    const summaryX = leftContentX;
    const productGap = 12;
    const productX = summaryX + summaryWidth + productGap;
    const productWidth = leftContentWidth - summaryWidth - productGap;

    doc.save();
    doc.lineWidth(0.5).strokeColor('#000');
    doc.moveTo(productX - productGap / 2, detailsTop).lineTo(productX - productGap / 2, detailsBottom).stroke();
    doc.restore();

    let summaryY = detailsTop;
    const addSummaryLine = (label: string, value: string, bold: boolean = false) => {
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 10 : 9);
      doc.text(label, summaryX, summaryY, { width: summaryWidth - 8, align: 'left' });
      doc.text(value, summaryX, summaryY, { width: summaryWidth - 8, align: 'right' });
      summaryY += bold ? 14 : 12;
    };

    addSummaryLine('Subtotal', formatCurrency(subtotal));
    if (deliveryFee) {
      addSummaryLine('Delivery', formatCurrency(deliveryFee));
    }
    if (discount) {
      addSummaryLine('Discount', `-${formatCurrency(discount)}`);
    }
    taxLines.forEach((tax) => {
      addSummaryLine(tax.name, formatCurrency(tax.amount));
    });

    doc.save();
    doc.lineWidth(0.5).strokeColor('#000');
    doc.moveTo(summaryX, summaryY).lineTo(summaryX + summaryWidth - 8, summaryY).stroke();
    doc.restore();
    summaryY += 6;
    addSummaryLine('Total', formatCurrency(total), true);

    let productY = detailsTop;
    doc.font('Helvetica-Bold').fontSize(9).text('Products:', productX, productY, { width: productWidth });
    productY = doc.y + 4;

    const remainingItems: typeof normalizedItems = [];

    if (normalizedItems.length === 0) {
      doc.font('Helvetica').fontSize(8).text('No items', productX, productY, { width: productWidth });
      productY = doc.y;
    } else {
      for (let i = 0; i < normalizedItems.length; i += 1) {
        const item = normalizedItems[i];
        doc.font('Helvetica-Bold').fontSize(8);
        const nameLine = `${item.quantity}x ${item.name} - ${formatCurrency(item.total)}`;
        const lineHeight = doc.currentLineHeight(true);

        if (productY + lineHeight > detailsBottom) {
          remainingItems.push(...normalizedItems.slice(i));
          break;
        }

        doc.text(nameLine, productX, productY, { width: productWidth });
        productY = doc.y + 2;

        if (item.description) {
          doc.font('Helvetica').fontSize(7);
          const maxLines = i === 0 ? 4 : 2;
          const displayLines = wrapText(doc, item.description, productWidth, maxLines);

          if (displayLines.length) {
            const descText = displayLines.join('\n');
            const descHeight = doc.heightOfString(descText, { width: productWidth });
            if (productY + descHeight <= detailsBottom) {
              doc.text(descText, productX, productY, { width: productWidth });
              productY = doc.y + 2;
            }
          }
        }
      }

      if (remainingItems.length > 0) {
        doc.font('Helvetica').fontSize(8);
        const noteY = Math.min(detailsBottom - 12, Math.max(productY, detailsTop));
        doc.text(`Additional items: ${remainingItems.length} more`, productX, noteY, { width: productWidth });
      }
    }

    // Bottom left section (driver slip)
    const driverTop = topHeight;
    const driverContentX = padding;
    const driverContentWidth = leftWidth - padding * 2;
    let driverY = driverTop + padding;
    const driverBottomLimit = driverTop + bottomHeight - padding;

    const qrSize = 90;
    const qrX = leftWidth - padding - qrSize;
    const qrY = driverTop + padding + 10;

    if (qrCodeBuffer) {
      doc.font('Helvetica-Bold').fontSize(7);
      doc.text('SCAN FOR ROUTE', qrX - 4, driverTop + padding, { width: qrSize + 8, align: 'center' });
      doc.image(qrCodeBuffer, qrX, qrY, { width: qrSize, height: qrSize });
    }

    const headerWidth = driverContentWidth - (qrSize + 12);

    doc.font('Helvetica-Bold').fontSize(12);
    doc.text(`Delivery Date: ${deliveryDateLabel}`, driverContentX, driverY, { width: headerWidth, align: 'left' });
    doc.text(`Order # ${orderNumber}`, driverContentX, driverY, { width: headerWidth, align: 'right' });
    driverY += 16;

    doc.save();
    doc.lineWidth(0.5).strokeColor('#000');
    doc.moveTo(driverContentX, driverY).lineTo(driverContentX + headerWidth, driverY).stroke();
    doc.restore();
    driverY += 8;

    const driverGap = 12;
    const driverColWidth = (headerWidth - driverGap) / 2;
    const driverCol1X = driverContentX;
    const driverCol2X = driverContentX + driverColWidth + driverGap;

    let driverCol1Y = driverY;
    doc.font('Helvetica-Bold').fontSize(9).text('Recipient:', driverCol1X, driverCol1Y, { width: driverColWidth });
    driverCol1Y = doc.y + 2;
    doc.font('Helvetica').fontSize(9).text(recipientName || 'Unknown', driverCol1X, driverCol1Y, { width: driverColWidth });
    driverCol1Y = doc.y;
    if (recipientAddressLines.length) {
      doc.text(recipientAddressLines.join('\n'), driverCol1X, driverCol1Y, { width: driverColWidth });
      driverCol1Y = doc.y;
    }
    if (recipientPhone) {
      doc.text(recipientPhone, driverCol1X, driverCol1Y, { width: driverColWidth });
      driverCol1Y = doc.y;
    }

    let driverCol2Y = driverY;
    doc.font('Helvetica-Bold').fontSize(9).text('Products:', driverCol2X, driverCol2Y, { width: driverColWidth });
    driverCol2Y = doc.y + 2;
    doc.font('Helvetica').fontSize(9);
    const productNames = normalizedItems.map((item) => item.name);
    const maxProductLines = 6;
    const productLines = productNames.length ? productNames.slice(0, maxProductLines) : ['No items'];
    if (productNames.length > maxProductLines) {
      productLines.push(`+${productNames.length - maxProductLines} more`);
    }
    doc.text(productLines.join('\n'), driverCol2X, driverCol2Y, { width: driverColWidth });
    driverCol2Y = doc.y;

    let bottomRowY = Math.max(driverCol1Y, driverCol2Y) + 8;
    if (bottomRowY > driverBottomLimit - 40) {
      bottomRowY = driverBottomLimit - 40;
    }

    const bottomGap = 16;
    const bottomColWidth = (driverContentWidth - bottomGap) / 2;
    const bottomCol1X = driverContentX;
    const bottomCol2X = driverContentX + bottomColWidth + bottomGap;

    bottomRowY += 36; // push down 0.5 inch
    doc.font('Helvetica-Bold').fontSize(9).text('Delivery Instructions:', bottomCol1X, bottomRowY, { width: bottomColWidth });
    const instructionsY = doc.y + 2;
    doc.font('Helvetica').fontSize(9).text(order.specialInstructions || 'None', bottomCol1X, instructionsY, { width: bottomColWidth });

    doc.font('Helvetica-Bold').fontSize(9).text('Signature:', bottomCol2X, bottomRowY, { width: bottomColWidth });
    const signatureLineY = bottomRowY + 24;
    doc.save();
    doc.lineWidth(0.5).strokeColor('#000');
    doc.moveTo(bottomCol2X, signatureLineY).lineTo(bottomCol2X + bottomColWidth, signatureLineY).stroke();
    doc.restore();

    // Right side sections
    const rightX = leftWidth;
    const rightPadding = 18;
    const rightTextWidth = rightWidth - rightPadding * 2;

    // Section 1: Card message
    const cardSectionY = 0;
    const cardMessage = order.cardMessage || 'No card message';
    doc.registerFont('DejaVuSansOblique', DEJAVU_SANS_OBLIQUE);
    doc.font('DejaVuSansOblique').fontSize(14);
    const cardHeight = doc.heightOfString(cardMessage, { width: rightTextWidth, align: 'center' });
    const cardY = cardSectionY + Math.max((rightSectionHeight - cardHeight) / 2, rightPadding);
    doc.text(cardMessage, rightX + rightPadding, cardY, { width: rightTextWidth, align: 'center' });

    // Section 2: Blank (pre-printed on paper)

    // Section 3: Address label
    const labelSectionY = rightSectionHeight * 2;
    const labelLines = [recipientName, ...recipientAddressLines, recipientPhone].filter(Boolean);
    const labelHeader = labelLines[0] || 'Unknown';
    const labelAddress = labelLines.slice(1).join('\n');
    const labelFooter = `${deliveryDateLabel}\n# ${orderNumber}`;

    doc.font('Helvetica-Bold').fontSize(12);
    const labelHeaderHeight = doc.heightOfString(labelHeader, { width: rightTextWidth, align: 'center' });
    doc.font('Helvetica').fontSize(10);
    const labelAddressHeight = doc.heightOfString(labelAddress, { width: rightTextWidth, align: 'center' });
    doc.font('Helvetica-Bold').fontSize(9);
    const labelFooterHeight = doc.heightOfString(labelFooter, { width: rightTextWidth, align: 'center' });
    const labelBlockHeight = labelHeaderHeight + 6 + labelAddressHeight + 12 + labelFooterHeight;
    const labelY = labelSectionY + Math.max((rightSectionHeight - labelBlockHeight) / 2, rightPadding);

    doc.font('Helvetica-Bold').fontSize(12);
    doc.text(labelHeader, rightX + rightPadding, labelY, { width: rightTextWidth, align: 'center' });
    doc.font('Helvetica').fontSize(10);
    doc.text(labelAddress, rightX + rightPadding, labelY + labelHeaderHeight + 6, { width: rightTextWidth, align: 'center' });
    doc.font('Helvetica-Bold').fontSize(9);
    doc.text(labelFooter, rightX + rightPadding, labelY + labelHeaderHeight + 6 + labelAddressHeight + 12, { width: rightTextWidth, align: 'center' });

    if (remainingItems.length > 0) {
      const overflowMargin = 48;
      let firstOverflowPage = true;

      remainingItems.forEach((item, index) => {
        if (firstOverflowPage || doc.y > pageHeight - overflowMargin) {
          doc.addPage({ size: [pageWidth, pageHeight], margin: overflowMargin });
          doc.font('Helvetica-Bold').fontSize(14).text(`Order #${orderNumber} - Additional Items`);
          doc.moveDown(0.5);
          doc.font('Helvetica').fontSize(10);
          firstOverflowPage = false;
        }

        doc.text(`${item.quantity}x ${item.name} - ${formatCurrency(item.total)}`);
        if (item.description) {
          doc.font('Helvetica').fontSize(9).text(item.description, { indent: 12 });
          doc.font('Helvetica').fontSize(10);
        }

        if (index < remainingItems.length - 1) {
          doc.moveDown(0.2);
        }
      });
    }
  }, { size: [pageWidth, pageHeight], margin: 0 });
}

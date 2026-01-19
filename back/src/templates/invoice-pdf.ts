import { formatCurrency, formatDateTime, generatePdfBuffer } from '../utils/pdfGenerator';

export async function buildInvoicePdf(order: any): Promise<Buffer> {
  return generatePdfBuffer((doc) => {
    doc.fontSize(18).text('Bloom Flowers', { align: 'left' });
    doc.moveDown(0.2);
    doc.fontSize(10).text('Invoice', { align: 'left' });
    doc.text(`Invoice #${order.orderNumber ?? order.id}`);
    doc.text(`Date: ${formatDateTime(order.createdAt)}`);

    doc.moveDown();

    const customerName = [order.customer?.firstName, order.customer?.lastName]
      .filter(Boolean)
      .join(' ');
    doc.fontSize(11).text('Bill To:');
    doc.fontSize(10).text(customerName || 'Customer');
    if (order.customer?.email) {
      doc.text(order.customer.email);
    }
    if (order.customer?.phone) {
      doc.text(order.customer.phone);
    }

    if (order.deliveryAddress) {
      doc.moveDown(0.4);
      doc.fontSize(11).text('Delivery Address:');
      doc.fontSize(10).text(order.deliveryAddress.address1 || '');
      if (order.deliveryAddress.address2) {
        doc.text(order.deliveryAddress.address2);
      }
      const cityLine = [order.deliveryAddress.city, order.deliveryAddress.province, order.deliveryAddress.postalCode]
        .filter(Boolean)
        .join(', ');
      if (cityLine) {
        doc.text(cityLine);
      }
    }

    doc.moveDown();
    doc.fontSize(11).text('Items');
    doc.moveDown(0.2);
    doc.moveTo(48, doc.y).lineTo(564, doc.y).stroke();

    const items = order.orderItems ?? [];
    const subtotal = items.reduce((sum: number, item: any) => {
      const quantity = item.quantity ?? 1;
      const rowTotal = item.rowTotal ?? (item.unitPrice ?? 0) * quantity;
      return sum + rowTotal;
    }, 0);

    items.forEach((item: any) => {
      const name = item.customName || item.description || 'Item';
      const quantity = item.quantity ?? 1;
      const unitPrice = item.unitPrice ?? 0;
      const rowTotal = item.rowTotal ?? unitPrice * quantity;

      doc.fontSize(10).text(`${quantity} x ${name}`, 48, doc.y + 4, { width: 360 });
      doc.text(formatCurrency(unitPrice), 420, doc.y, { width: 60, align: 'right' });
      doc.text(formatCurrency(rowTotal), 480, doc.y, { width: 84, align: 'right' });
      doc.moveDown();
    });

    const deliveryFee = order.deliveryFee ?? 0;
    const tax = order.totalTax ?? 0;
    const discount = order.discount ?? 0;
    const total = order.paymentAmount ?? subtotal + deliveryFee + tax - discount;

    doc.moveDown(0.4);
    doc.moveTo(48, doc.y).lineTo(564, doc.y).stroke();
    doc.moveDown(0.4);

    doc.fontSize(10).text(`Subtotal: ${formatCurrency(subtotal)}`, { align: 'right' });
    if (deliveryFee) {
      doc.text(`Delivery: ${formatCurrency(deliveryFee)}`, { align: 'right' });
    }
    if (tax) {
      doc.text(`Tax: ${formatCurrency(tax)}`, { align: 'right' });
    }
    if (discount) {
      doc.text(`Discount: -${formatCurrency(discount)}`, { align: 'right' });
    }
    doc.fontSize(12).text(`Total: ${formatCurrency(total)}`, { align: 'right' });

    doc.moveDown();
    doc.fontSize(10).text('Payment due on receipt.', { align: 'left' });
  });
}

import { formatDateTime, generatePdfBuffer } from '../utils/pdfGenerator';

export async function buildOrderTicketPdf(order: any): Promise<Buffer> {
  return generatePdfBuffer((doc) => {
    doc.fontSize(18).text('Order Ticket', { align: 'left' });
    doc.moveDown(0.3);
    doc.fontSize(10).text(`Order #${order.orderNumber ?? order.id}`);
    doc.text(`Date: ${formatDateTime(order.createdAt)}`);

    if (order.deliveryDate) {
      doc.text(`Delivery Date: ${formatDateTime(order.deliveryDate)}`);
    }
    if (order.deliveryTime) {
      doc.text(`Delivery Time: ${order.deliveryTime}`);
    }

    doc.moveDown();
    const recipientName = [order.recipientCustomer?.firstName, order.recipientCustomer?.lastName]
      .filter(Boolean)
      .join(' ');
    if (recipientName) {
      doc.fontSize(11).text(`Recipient: ${recipientName}`);
    }
    if (order.deliveryAddress) {
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
    items.forEach((item: any) => {
      const name = item.customName || item.description || 'Item';
      const quantity = item.quantity ?? 1;
      doc.fontSize(10).text(`${quantity} x ${name}`);
    });

    if (order.cardMessage) {
      doc.moveDown();
      doc.fontSize(11).text('Card Message');
      doc.fontSize(10).text(order.cardMessage);
    }

    if (order.specialInstructions) {
      doc.moveDown();
      doc.fontSize(11).text('Special Instructions');
      doc.fontSize(10).text(order.specialInstructions);
    }
  });
}

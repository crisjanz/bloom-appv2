import { formatCurrency, formatDateTime } from '../../utils/pdfGenerator';

export function buildInvoiceEmail(order: any): string {
  const customerName = [order.customer?.firstName, order.customer?.lastName]
    .filter(Boolean)
    .join(' ');
  const items = order.orderItems ?? [];
  const subtotal = items.reduce((sum: number, item: any) => {
    const quantity = item.quantity ?? 1;
    const rowTotal = item.rowTotal ?? (item.unitPrice ?? 0) * quantity;
    return sum + rowTotal;
  }, 0);
  const deliveryFee = order.deliveryFee ?? 0;
  const tax = order.totalTax ?? 0;
  const discount = order.discount ?? 0;
  const total = order.paymentAmount ?? subtotal + deliveryFee + tax - discount;

  const itemLines = items
    .map((item: any) => {
      const name = item.customName || item.description || 'Item';
      const quantity = item.quantity ?? 1;
      const rowTotal = item.rowTotal ?? (item.unitPrice ?? 0) * quantity;
      return `<tr>
        <td style="padding:6px 0;">${quantity} x ${name}</td>
        <td style="padding:6px 0; text-align:right;">${formatCurrency(rowTotal)}</td>
      </tr>`;
    })
    .join('');

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1f2937;">
      <h2 style="margin: 0 0 8px;">Bloom Flowers</h2>
      <p style="margin: 0 0 16px;">Invoice for order #${order.orderNumber ?? order.id}</p>
      <p style="margin: 0 0 16px;">Date: ${formatDateTime(order.createdAt)}</p>

      <p style="margin: 0 0 16px;">Hello ${customerName || 'Customer'},</p>
      <p style="margin: 0 0 16px;">Your invoice PDF is attached.</p>

      <table style="width:100%; border-collapse: collapse; margin-top: 16px;">
        <thead>
          <tr>
            <th style="text-align:left; border-bottom:1px solid #e5e7eb; padding-bottom:8px;">Items</th>
            <th style="text-align:right; border-bottom:1px solid #e5e7eb; padding-bottom:8px;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemLines}
        </tbody>
      </table>

      <div style="margin-top: 16px; text-align: right;">
        <div>Subtotal: ${formatCurrency(subtotal)}</div>
        ${deliveryFee ? `<div>Delivery: ${formatCurrency(deliveryFee)}</div>` : ''}
        ${tax ? `<div>Tax: ${formatCurrency(tax)}</div>` : ''}
        ${discount ? `<div>Discount: -${formatCurrency(discount)}</div>` : ''}
        <div style="font-weight: bold; margin-top: 8px;">Total: ${formatCurrency(total)}</div>
      </div>
    </div>
  `;
}

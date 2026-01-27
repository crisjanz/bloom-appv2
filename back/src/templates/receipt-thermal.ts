import * as thermalPrinter from 'node-thermal-printer';
const ThermalPrinter = (thermalPrinter as any).ThermalPrinter;
const PrinterTypes = (thermalPrinter as any).PrinterTypes;
import { formatCurrency, formatDateTime } from '../utils/pdfGenerator';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const LINE_WIDTH = 32;

const formatItemLine = (qty: string, name: string, totalCents: number) => {
  const totalText = formatCurrency(totalCents);
  const qtyWidth = 3;
  const priceWidth = totalText.length;
  const nameWidth = LINE_WIDTH - qtyWidth - priceWidth - 2;

  const qtyPadded = qty.padEnd(qtyWidth, ' ');
  const nameTrimmed = name.slice(0, nameWidth).padEnd(nameWidth, ' ');

  return `${qtyPadded} ${nameTrimmed} ${totalText}`;
};

const formatTotalLine = (label: string, totalCents: number) => {
  const totalText = formatCurrency(totalCents);
  const indent = 4; // Align with product names (QTY column = 3 + 1 space)
  const labelWidth = LINE_WIDTH - totalText.length - indent - 1;
  const indentedLabel = ' '.repeat(indent) + label;
  return `${indentedLabel.padEnd(LINE_WIDTH - totalText.length, ' ')}${totalText}`;
};

const shortenTitle = (title: string, maxWords = 3): string => {
  const words = title.trim().split(/\s+/);
  return words.slice(0, maxWords).join(' ');
};

export async function buildThermalReceipt(order: any): Promise<Buffer> {
  const storeSettings = await prisma.storeSettings.findFirst();

  const printer = new ThermalPrinter({
    type: PrinterTypes.STAR,
    interface: 'tcp://127.0.0.1:0',
  });

  printer.alignCenter();
  printer.bold(true);
  printer.println(storeSettings?.storeName || 'Bloom Flowers');
  printer.bold(false);
  if (storeSettings?.address) {
    printer.println(storeSettings.address);
  }
  if (storeSettings?.city || storeSettings?.state || storeSettings?.zipCode) {
    const location = [storeSettings?.city, storeSettings?.state, storeSettings?.zipCode]
      .filter(Boolean)
      .join(', ');
    printer.println(location);
  }
  if (storeSettings?.phone) {
    printer.println(`Phone: ${storeSettings.phone}`);
  }
  if (storeSettings?.taxId) {
    printer.println(`Tax ID: ${storeSettings.taxId}`);
  }
  printer.newLine();
  printer.println(`Order #${order.orderNumber ?? order.id}`);
  printer.println(`Date: ${formatDateTime(order.createdAt)}`);
  printer.newLine();

  const customerName = [order.customer?.firstName, order.customer?.lastName]
    .filter(Boolean)
    .join(' ');
  if (customerName) {
    printer.println(`Customer: ${customerName}`);
  }
  printer.newLine();

  printer.alignLeft();
  printer.println('QTY Product              Price');
  printer.println('- - - - - - - - - - - - - - - -');

  const items = order.orderItems ?? [];
  let subtotal = 0;

  items.forEach((item: any) => {
    const quantity = item.quantity ?? 1;
    const unitPrice = item.unitPrice ?? 0;
    const rowTotal = item.rowTotal ?? unitPrice * quantity;
    subtotal += rowTotal;

    const rawName = item.customName || 'Item';
    const name = shortenTitle(rawName, 3);
    printer.println(formatItemLine(String(quantity), name, rowTotal));
  });

  printer.drawLine();

  const deliveryFee = order.deliveryFee ?? 0;
  const tax = order.totalTax ?? 0;
  const discount = order.discount ?? 0;
  const total = order.paymentAmount ?? subtotal + deliveryFee + tax - discount;

  printer.println(formatTotalLine('Subtotal', subtotal));
  if (deliveryFee) {
    printer.println(formatTotalLine('Delivery', deliveryFee));
  }
  if (discount) {
    printer.println(formatTotalLine('Discount', -discount));
  }
  if (tax) {
    printer.println(formatTotalLine('Tax', tax));
  }

  printer.drawLine();
  printer.bold(true);
  printer.println(formatTotalLine('Total', total));
  printer.bold(false);

  if (order.transactions && order.transactions.length > 0) {
    const completedTransactions = order.transactions.filter((t: any) => t.status === 'COMPLETED');
    const failedTransactions = order.transactions.filter((t: any) => t.status === 'FAILED' || t.status === 'CANCELLED');

    // Show completed payment details
    if (completedTransactions.length > 0) {
      printer.newLine();
      printer.drawLine();
      printer.alignCenter();
      printer.bold(true);
      printer.println('Payment Details');
      printer.bold(false);

      completedTransactions.forEach((transaction: any) => {
        transaction.paymentMethods?.forEach((pm: any) => {
          const methodType = pm.type?.replace('_', ' ') || 'Payment';
          const status = pm.status === 'completed' ? 'APPROVED' : pm.status?.toUpperCase() || 'PENDING';
          printer.println(`${methodType}: ${formatCurrency(pm.amount)}`);
          printer.println(`${status}`);
          if (pm.cardLast4) {
            printer.println(`Card ending in ${pm.cardLast4}`);
          }
          if (pm.providerTransactionId) {
            const txId = pm.providerTransactionId.slice(0, LINE_WIDTH);
            printer.println(`ID: ${txId}`);
          }
        });
      });
    }

    // Show failed attempts
    if (failedTransactions.length > 0) {
      printer.newLine();
      printer.bold(true);
      printer.println('Previous Attempts');
      printer.bold(false);

      failedTransactions.forEach((transaction: any) => {
        transaction.paymentMethods?.forEach((pm: any) => {
          const methodType = pm.type?.replace('_', ' ') || 'Payment';
          const status = transaction.status === 'FAILED' ? 'DECLINED' : 'CANCELLED';
          printer.println(`${methodType}: ${formatCurrency(pm.amount)}`);
          printer.println(`${status}`);
          if (pm.cardLast4) {
            printer.println(`Card ending in ${pm.cardLast4}`);
          }
        });
      });
    }
  }

  printer.newLine();
  printer.alignCenter();
  printer.println('Thank you for your order.');

  return printer.getBuffer();
}

import { format } from 'date-fns';
import { formatCurrency, generatePdfBuffer } from '../utils/pdfGenerator';

export interface SalesReportOrderRow {
  createdAt: Date | string;
  orderNumber: number | null;
  customerName: string;
  paymentSummary: string;
  totalAmount: number;
}

export interface SalesReportSummary {
  totalSales: number;
  orderCount: number;
  averageOrderValue: number;
  totalTax: number;
  totalDeliveryFees: number;
  totalDiscounts: number;
}

export interface SalesReportBreakdownEntry {
  label: string;
  amount: number;
  count: number;
}

export interface SalesReportFilters {
  startDate?: string | null;
  endDate?: string | null;
  paymentMethod?: string | null;
  status?: string | null;
  orderSource?: string | null;
}

export interface SalesReportPdfPayload {
  shopName?: string | null;
  generatedAt: Date;
  filters: SalesReportFilters;
  summary: SalesReportSummary;
  paymentBreakdown: SalesReportBreakdownEntry[];
  sourceBreakdown: SalesReportBreakdownEntry[];
  orders: SalesReportOrderRow[];
}

const MARGIN = 40;
const ROW_HEIGHT = 20;

const truncateToWidth = (doc: any, text: string, maxWidth: number) => {
  if (!text) return '';
  if (doc.widthOfString(text) <= maxWidth) return text;

  let truncated = text;
  while (truncated.length > 1 && doc.widthOfString(`${truncated}...`) > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return `${truncated}...`;
};

const formatDate = (value: Date | string) => {
  const date = typeof value === 'string' ? new Date(value) : value;
  return format(date, 'yyyy-MM-dd');
};

const formatRange = (filters: SalesReportFilters) => {
  if (filters.startDate && filters.endDate) {
    return `${filters.startDate} to ${filters.endDate}`;
  }
  if (filters.startDate) {
    return `From ${filters.startDate}`;
  }
  if (filters.endDate) {
    return `Through ${filters.endDate}`;
  }
  return 'All Dates';
};

export async function buildSalesReportPdf(payload: SalesReportPdfPayload): Promise<Buffer> {
  return generatePdfBuffer((doc) => {
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const tableWidth = pageWidth - MARGIN * 2;

    let y = MARGIN;

    const shopName = payload.shopName || 'In Your Vase Flowers';

    doc.font('Helvetica-Bold').fontSize(18).text('Sales Report', MARGIN, y, {
      width: tableWidth,
      align: 'left',
    });
    doc.font('Helvetica').fontSize(10).text(formatRange(payload.filters), MARGIN, y, {
      width: tableWidth,
      align: 'right',
    });
    y += 22;

    doc.font('Helvetica').fontSize(10).text(shopName, MARGIN, y, {
      width: tableWidth,
      align: 'left',
    });
    doc.text(`Generated: ${format(payload.generatedAt, 'yyyy-MM-dd HH:mm')}`, MARGIN, y, {
      width: tableWidth,
      align: 'right',
    });
    y += 16;

    const filterLines = [
      `Payment Method: ${payload.filters.paymentMethod || 'All'}`,
      `Status: ${payload.filters.status || 'All'}`,
      `Order Source: ${payload.filters.orderSource || 'All'}`,
    ];
    doc.font('Helvetica').fontSize(9).fillColor('#4b5563');
    doc.text(filterLines.join(' | '), MARGIN, y, { width: tableWidth, align: 'left' });
    doc.fillColor('#111827');
    y += 18;

    const metrics = [
      { label: 'Total Sales', value: formatCurrency(payload.summary.totalSales) },
      { label: 'Orders', value: payload.summary.orderCount.toString() },
      { label: 'Average Order', value: formatCurrency(payload.summary.averageOrderValue) },
      { label: 'Total Tax', value: formatCurrency(payload.summary.totalTax) },
      { label: 'Delivery Fees', value: formatCurrency(payload.summary.totalDeliveryFees) },
      { label: 'Discounts', value: formatCurrency(payload.summary.totalDiscounts) },
    ];

    const metricColumns = 2;
    const metricWidth = tableWidth / metricColumns;
    const metricRowHeight = 18;
    doc.font('Helvetica-Bold').fontSize(11).text('Summary', MARGIN, y);
    y += 14;
    doc.font('Helvetica').fontSize(9);

    metrics.forEach((metric, index) => {
      const col = index % metricColumns;
      const row = Math.floor(index / metricColumns);
      const x = MARGIN + col * metricWidth;
      const rowY = y + row * metricRowHeight;
      doc.text(metric.label, x, rowY, { width: metricWidth - 8, align: 'left' });
      doc.text(metric.value, x, rowY, { width: metricWidth - 8, align: 'right' });
    });

    y += Math.ceil(metrics.length / metricColumns) * metricRowHeight + 10;

    const renderBreakdown = (title: string, items: SalesReportBreakdownEntry[]) => {
      doc.font('Helvetica-Bold').fontSize(11).text(title, MARGIN, y);
      y += 12;
      doc.font('Helvetica').fontSize(9);
      if (items.length === 0) {
        doc.text('No data available.', MARGIN, y);
        y += 14;
        return;
      }
      items.forEach((entry) => {
        const line = `${entry.label} (${entry.count})`;
        doc.text(line, MARGIN, y, { width: tableWidth * 0.7, align: 'left' });
        doc.text(formatCurrency(entry.amount), MARGIN, y, { width: tableWidth, align: 'right' });
        y += 12;
      });
      y += 6;
    };

    renderBreakdown('Payment Breakdown', payload.paymentBreakdown);
    renderBreakdown('Order Source Breakdown', payload.sourceBreakdown);

    const columns = {
      date: 80,
      order: 60,
      customer: 160,
      payment: 140,
      total: tableWidth - 80 - 60 - 160 - 140,
    };

    const drawTableHeader = () => {
      doc.save();
      doc.rect(MARGIN, y, tableWidth, ROW_HEIGHT).fill('#f3f4f6');
      doc.restore();

      doc.font('Helvetica-Bold').fontSize(9).fillColor('#111827');
      let x = MARGIN;
      doc.text('Date', x + 4, y + 6, { width: columns.date - 8 });
      x += columns.date;
      doc.text('Order #', x + 4, y + 6, { width: columns.order - 8 });
      x += columns.order;
      doc.text('Customer', x + 4, y + 6, { width: columns.customer - 8 });
      x += columns.customer;
      doc.text('Payment', x + 4, y + 6, { width: columns.payment - 8 });
      x += columns.payment;
      doc.text('Total', x + 4, y + 6, { width: columns.total - 8, align: 'right' });

      y += ROW_HEIGHT;
      doc.moveTo(MARGIN, y).lineTo(MARGIN + tableWidth, y).lineWidth(0.8).strokeColor('#e5e7eb').stroke();
    };

    doc.font('Helvetica-Bold').fontSize(11).text('Orders', MARGIN, y);
    y += 14;
    drawTableHeader();

    doc.font('Helvetica').fontSize(9).fillColor('#111827');

    if (payload.orders.length === 0) {
      doc.text('No orders matched the selected filters.', MARGIN, y + 10);
      return;
    }

    payload.orders.forEach((order) => {
      if (y + ROW_HEIGHT > pageHeight - MARGIN) {
        doc.addPage();
        y = MARGIN;
        drawTableHeader();
      }

      let x = MARGIN;
      doc.text(formatDate(order.createdAt), x + 4, y + 6, { width: columns.date - 8 });
      x += columns.date;
      doc.text(order.orderNumber ? `#${order.orderNumber}` : '-', x + 4, y + 6, {
        width: columns.order - 8,
      });
      x += columns.order;
      doc.text(truncateToWidth(doc, order.customerName || 'Guest', columns.customer - 8), x + 4, y + 6, {
        width: columns.customer - 8,
      });
      x += columns.customer;
      doc.text(truncateToWidth(doc, order.paymentSummary || '-', columns.payment - 8), x + 4, y + 6, {
        width: columns.payment - 8,
      });
      x += columns.payment;
      doc.text(formatCurrency(order.totalAmount), x + 4, y + 6, {
        width: columns.total - 8,
        align: 'right',
      });

      y += ROW_HEIGHT;
      doc.moveTo(MARGIN, y).lineTo(MARGIN + tableWidth, y).lineWidth(0.5).strokeColor('#e5e7eb').stroke();
    });
  }, { size: 'LETTER', margin: MARGIN });
}

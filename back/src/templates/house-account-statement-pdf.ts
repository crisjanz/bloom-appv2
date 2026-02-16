import { format } from 'date-fns';
import { formatCurrency, generatePdfBuffer } from '../utils/pdfGenerator';
import { formatOrderNumber } from '../utils/formatOrderNumber';

export interface HouseAccountStatementCharge {
  date: Date | string;
  orderNumber: number | null;
  description: string;
  reference?: string | null;
  amount: number;
}

export interface HouseAccountStatementPayment {
  date: Date | string;
  reference: string | null;
  description: string;
  amount: number;
}

export interface HouseAccountStatementAdjustment {
  date: Date | string;
  description: string;
  amount: number;
}

export interface HouseAccountStatementData {
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string | null;
    phone?: string | null;
    terms: string;
  };
  statementPeriod: {
    from: string | null;
    to: string | null;
  };
  openingBalance: number;
  charges: HouseAccountStatementCharge[];
  payments: HouseAccountStatementPayment[];
  adjustments: HouseAccountStatementAdjustment[];
  closingBalance: number;
}

export interface StoreInfo {
  storeName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  country?: string | null;
}

export interface HouseAccountStatementPdfPayload {
  statement: HouseAccountStatementData;
  storeInfo?: StoreInfo | null;
  generatedAt: Date;
  orderNumberPrefix?: string;
}

const MARGIN = 40;
const ROW_HEIGHT = 20;

const formatSignedCurrency = (amount: number) => {
  const sign = amount < 0 ? '-' : amount > 0 ? '+' : '';
  return `${sign}${formatCurrency(Math.abs(amount))}`;
};

const formatBalance = (amount: number) => {
  if (amount < 0) {
    return `-${formatCurrency(Math.abs(amount))}`;
  }
  return formatCurrency(amount);
};

const formatDateValue = (value: Date | string) => {
  if (!value) return '';
  return format(new Date(value), 'yyyy-MM-dd');
};

const buildStoreLine = (storeInfo?: StoreInfo | null) => {
  if (!storeInfo) return '';
  const parts = [storeInfo.address, storeInfo.city, storeInfo.state, storeInfo.zipCode].filter(Boolean);
  return parts.join(', ');
};

export async function buildHouseAccountStatementPdf(
  payload: HouseAccountStatementPdfPayload
): Promise<Buffer> {
  const orderNumberPrefix = payload.orderNumberPrefix || '';

  return generatePdfBuffer((doc) => {
    const { statement, storeInfo, generatedAt } = payload;
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const tableWidth = pageWidth - MARGIN * 2;
    let y = MARGIN;

    const storeName = storeInfo?.storeName || 'In Your Vase Flowers';
    const storeLine = buildStoreLine(storeInfo);
    const customerName = `${statement.customer.firstName} ${statement.customer.lastName}`.trim();

    doc.font('Helvetica-Bold').fontSize(18).text('House Account Statement', MARGIN, y, {
      width: tableWidth,
      align: 'left',
    });
    doc.font('Helvetica').fontSize(10).text(`Generated: ${format(generatedAt, 'yyyy-MM-dd HH:mm')}`, MARGIN, y, {
      width: tableWidth,
      align: 'right',
    });
    y += 22;

    doc.font('Helvetica').fontSize(10).text(storeName, MARGIN, y);
    if (storeLine) {
      doc.text(storeLine, MARGIN, y + 12);
    }
    const contactLine = [storeInfo?.phone, storeInfo?.email].filter(Boolean).join(' | ');
    if (contactLine) {
      doc.text(contactLine, MARGIN, y + 24);
    }
    y += contactLine ? 40 : storeLine ? 30 : 18;

    const periodLabel =
      statement.statementPeriod.from || statement.statementPeriod.to
        ? `${statement.statementPeriod.from || 'Start'} to ${statement.statementPeriod.to || 'Today'}`
        : 'All Activity';

    doc.font('Helvetica-Bold').fontSize(11).text('Statement Period', MARGIN, y);
    doc.font('Helvetica').fontSize(10).text(periodLabel, MARGIN + 120, y);
    y += 16;

    doc.font('Helvetica-Bold').fontSize(11).text('Customer', MARGIN, y);
    doc.font('Helvetica').fontSize(10).text(customerName || 'Customer', MARGIN + 120, y);
    y += 14;
    if (statement.customer.email) {
      doc.text(statement.customer.email, MARGIN + 120, y);
      y += 12;
    }
    if (statement.customer.phone) {
      doc.text(statement.customer.phone, MARGIN + 120, y);
      y += 12;
    }
    doc.text(`Terms: ${statement.customer.terms || 'NET_30'}`, MARGIN + 120, y);
    y += 20;

    const totals = [
      { label: 'Opening Balance', value: formatBalance(statement.openingBalance) },
      {
        label: 'Charges',
        value: formatSignedCurrency(statement.charges.reduce((sum, entry) => sum + (entry.amount || 0), 0)),
      },
      {
        label: 'Payments',
        value: formatSignedCurrency(statement.payments.reduce((sum, entry) => sum + (entry.amount || 0), 0)),
      },
      {
        label: 'Adjustments',
        value: formatSignedCurrency(statement.adjustments.reduce((sum, entry) => sum + (entry.amount || 0), 0)),
      },
      { label: 'Closing Balance', value: formatBalance(statement.closingBalance) },
    ];

    doc.font('Helvetica-Bold').fontSize(11).text('Account Summary', MARGIN, y);
    y += 14;
    doc.font('Helvetica').fontSize(9);
    totals.forEach((item) => {
      doc.text(item.label, MARGIN, y, { width: tableWidth * 0.6, align: 'left' });
      doc.text(item.value, MARGIN, y, { width: tableWidth, align: 'right' });
      y += 12;
    });
    y += 10;

    const ensureSpace = (minHeight: number) => {
      if (y + minHeight <= pageHeight - MARGIN) return;
      doc.addPage();
      y = MARGIN;
    };

    const renderTable = (
      title: string,
      columns: Array<{ label: string; width: number; align?: 'left' | 'right' }>,
      rows: Array<(string | null | undefined)[]>
    ) => {
      ensureSpace(ROW_HEIGHT * 2);
      doc.font('Helvetica-Bold').fontSize(11).text(title, MARGIN, y);
      y += 14;

      doc.save();
      doc.rect(MARGIN, y, tableWidth, ROW_HEIGHT).fill('#f3f4f6');
      doc.restore();

      doc.font('Helvetica-Bold').fontSize(9).fillColor('#111827');
      let x = MARGIN;
      columns.forEach((col) => {
        doc.text(col.label, x + 4, y + 6, { width: col.width - 8, align: col.align || 'left' });
        x += col.width;
      });

      y += ROW_HEIGHT;
      doc.moveTo(MARGIN, y).lineTo(MARGIN + tableWidth, y).lineWidth(0.8).strokeColor('#e5e7eb').stroke();

      doc.font('Helvetica').fontSize(9).fillColor('#111827');

      if (rows.length === 0) {
        doc.text('No entries for this period.', MARGIN, y + 8);
        y += ROW_HEIGHT;
        return;
      }

      rows.forEach((row) => {
        ensureSpace(ROW_HEIGHT + 4);
        let rowX = MARGIN;
        row.forEach((cell, idx) => {
          const text = cell ?? '-';
          const col = columns[idx];
          doc.text(text, rowX + 4, y + 6, { width: col.width - 8, align: col.align || 'left' });
          rowX += col.width;
        });
        y += ROW_HEIGHT;
        doc.moveTo(MARGIN, y).lineTo(MARGIN + tableWidth, y).lineWidth(0.5).strokeColor('#e5e7eb').stroke();
      });

      y += 10;
    };

    renderTable(
      'Charges',
      [
        { label: 'Date', width: 90 },
        { label: 'Order', width: 70 },
        { label: 'Reference', width: 120 },
        { label: 'Description', width: tableWidth - 90 - 70 - 120 - 80 },
        { label: 'Amount', width: 80, align: 'right' },
      ],
      statement.charges.map((entry) => [
        formatDateValue(entry.date),
        entry.orderNumber ? `#${formatOrderNumber(entry.orderNumber, orderNumberPrefix)}` : '-',
        entry.reference || '-',
        entry.description,
        formatSignedCurrency(entry.amount),
      ])
    );

    renderTable(
      'Payments',
      [
        { label: 'Date', width: 90 },
        { label: 'Reference', width: 140 },
        { label: 'Description', width: tableWidth - 90 - 140 - 80 },
        { label: 'Amount', width: 80, align: 'right' },
      ],
      statement.payments.map((entry) => [
        formatDateValue(entry.date),
        entry.reference || '-',
        entry.description,
        formatSignedCurrency(entry.amount),
      ])
    );

    renderTable(
      'Adjustments',
      [
        { label: 'Date', width: 90 },
        { label: 'Description', width: tableWidth - 90 - 80 },
        { label: 'Amount', width: 80, align: 'right' },
      ],
      statement.adjustments.map((entry) => [
        formatDateValue(entry.date),
        entry.description,
        formatSignedCurrency(entry.amount),
      ])
    );
  }, { size: 'LETTER', margin: MARGIN });
}

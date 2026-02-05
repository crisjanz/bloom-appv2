import { format } from 'date-fns';
import { generatePdfBuffer } from '../utils/pdfGenerator';

export interface InventorySheetItem {
  sku: string;
  productName: string;
  variantName: string;
  currentStock: number | null;
  trackInventory: boolean;
}

export interface InventorySheetOptions {
  shopName: string;
  generatedAt: Date;
  categoryName?: string | null;
  lowStockOnly?: boolean;
  sortLabel?: string;
}

const MARGIN = 40;
const ROW_HEIGHT = 24;

const buildProductLabel = (item: InventorySheetItem) => {
  const variant = item.variantName?.trim();
  if (!variant) return item.productName;

  const productName = item.productName?.trim();
  if (!productName) return variant;

  if (variant.toLowerCase() === productName.toLowerCase()) {
    return productName;
  }

  return `${productName} - ${variant}`;
};

const truncateToWidth = (
  doc: any,
  text: string,
  maxWidth: number
) => {
  if (!text) return '';
  if (doc.widthOfString(text) <= maxWidth) return text;

  let truncated = text;
  while (truncated.length > 1 && doc.widthOfString(`${truncated}...`) > maxWidth) {
    truncated = truncated.slice(0, -1);
  }

  return `${truncated}...`;
};

export async function buildInventorySheetPdf(
  items: InventorySheetItem[],
  options: InventorySheetOptions
): Promise<Buffer> {
  return generatePdfBuffer((doc) => {
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const tableWidth = pageWidth - MARGIN * 2;
    const columns = {
      sku: 95,
      product: 260,
      current: 70,
      counted: 75,
      notes: tableWidth - 95 - 260 - 70 - 75,
    };

    let currentPage = 1;
    let y = MARGIN;

    const drawHeader = (pageNumber: number) => {
      y = MARGIN;

      doc.font('Helvetica-Bold').fontSize(18);
      doc.text('INVENTORY COUNT SHEET', MARGIN, y, { width: tableWidth, align: 'left' });

      doc.font('Helvetica').fontSize(10);
      doc.text(`Page ${pageNumber}`, MARGIN, y, { width: tableWidth, align: 'right' });
      y += 22;

      doc.font('Helvetica-Bold').fontSize(11);
      doc.text(options.shopName || 'In Your Vase Flowers', MARGIN, y, {
        width: tableWidth,
        align: 'left',
      });
      y += 14;

      doc.font('Helvetica').fontSize(10);
      doc.text(`Generated: ${format(options.generatedAt, 'yyyy-MM-dd HH:mm')}`, MARGIN, y, {
        width: tableWidth,
        align: 'left',
      });
      y += 14;

      const filterParts = [
        `Category: ${options.categoryName || 'All'}`,
        options.lowStockOnly ? 'Low Stock Only: Yes' : 'Low Stock Only: No',
        `Sort: ${options.sortLabel || 'Name (A-Z)'}`,
      ];
      doc.text(filterParts.join(' | '), MARGIN, y, { width: tableWidth, align: 'left' });
      y += 18;

      doc.font('Helvetica-Oblique').fontSize(9);
      doc.text('Count each item and write the quantity in the "Counted" column.', MARGIN, y, {
        width: tableWidth,
        align: 'left',
      });
      y += 14;

      doc.save();
      doc.rect(MARGIN, y, tableWidth, ROW_HEIGHT).fill('#f3f4f6');
      doc.restore();

      let x = MARGIN;
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#111827');
      doc.text('SKU', x + 4, y + 7, { width: columns.sku - 8 });
      x += columns.sku;
      doc.text('Product', x + 4, y + 7, { width: columns.product - 8 });
      x += columns.product;
      doc.text('Current', x + 4, y + 7, { width: columns.current - 8 });
      x += columns.current;
      doc.text('Counted', x + 4, y + 7, { width: columns.counted - 8 });
      x += columns.counted;
      doc.text('Notes', x + 4, y + 7, { width: columns.notes - 8 });

      y += ROW_HEIGHT;
      doc.moveTo(MARGIN, y).lineTo(MARGIN + tableWidth, y).lineWidth(0.8).strokeColor('#9ca3af').stroke();
    };

    drawHeader(currentPage);

    if (items.length === 0) {
      doc.font('Helvetica').fontSize(11).fillColor('#374151');
      doc.text('No inventory items matched the selected filters.', MARGIN, y + 18, {
        width: tableWidth,
        align: 'left',
      });
      return;
    }

    for (const item of items) {
      if (y + ROW_HEIGHT > pageHeight - MARGIN) {
        doc.addPage();
        currentPage += 1;
        drawHeader(currentPage);
      }

      const currentLabel = item.trackInventory ? String(item.currentStock ?? 0) : 'Not Tracked';
      const productLabel = buildProductLabel(item);

      let x = MARGIN;
      doc.font('Helvetica').fontSize(9).fillColor('#111827');
      doc.text(truncateToWidth(doc, item.sku || '-', columns.sku - 8), x + 4, y + 7, {
        width: columns.sku - 8,
      });

      x += columns.sku;
      doc.text(truncateToWidth(doc, productLabel || '-', columns.product - 8), x + 4, y + 7, {
        width: columns.product - 8,
      });

      x += columns.product;
      doc.text(currentLabel, x + 4, y + 7, { width: columns.current - 8 });

      x += columns.current;
      doc.text('______', x + 4, y + 7, { width: columns.counted - 8 });

      doc.moveTo(MARGIN, y + ROW_HEIGHT).lineTo(MARGIN + tableWidth, y + ROW_HEIGHT).lineWidth(0.5).strokeColor('#d1d5db').stroke();
      y += ROW_HEIGHT;
    }
  }, { size: 'LETTER', margin: MARGIN });
}

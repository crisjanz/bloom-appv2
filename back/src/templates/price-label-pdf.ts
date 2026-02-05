import { formatCurrency, generatePdfBuffer } from '../utils/pdfGenerator';

export interface PriceLabelItem {
  productName: string;
  variantName: string;
  sku: string;
  priceCents: number;
  qrCodeDataUrl: string;
  quantity: number;
}

// 40mm x 35mm at 72dpi (1mm = 72/25.4 points)
const LABEL_WIDTH = 113;  // 40mm
const LABEL_HEIGHT = 99;  // 35mm

const decodeDataUrl = (dataUrl: string) => {
  const match = dataUrl.match(/^data:image\/\w+;base64,(.+)$/);
  if (!match) return null;

  try {
    return Buffer.from(match[1], 'base64');
  } catch {
    return null;
  }
};

const buildLabelName = (item: PriceLabelItem) => {
  const productName = item.productName?.trim() || 'Product';
  const variantName = item.variantName?.trim();

  if (!variantName || variantName.toLowerCase() === productName.toLowerCase()) {
    return productName;
  }

  return `${productName} - ${variantName}`;
};

const wrapText = (doc: any, text: string, maxWidth: number, maxLines: number) => {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [''];

  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;

    if (doc.widthOfString(candidate) <= maxWidth || currentLine.length === 0) {
      currentLine = candidate;
      continue;
    }

    lines.push(currentLine);
    currentLine = word;

    if (lines.length >= maxLines) {
      break;
    }
  }

  if (lines.length < maxLines && currentLine) {
    lines.push(currentLine);
  }

  if (lines.length > maxLines) {
    return lines.slice(0, maxLines);
  }

  if (lines.length === maxLines && words.length > 0) {
    const joined = lines.join(' ');
    if (joined.length < text.length && !lines[maxLines - 1].endsWith('...')) {
      let finalLine = lines[maxLines - 1];
      while (finalLine.length > 1 && doc.widthOfString(`${finalLine}...`) > maxWidth) {
        finalLine = finalLine.slice(0, -1);
      }
      lines[maxLines - 1] = `${finalLine}...`;
    }
  }

  return lines;
};

const drawLabel = (doc: any, item: PriceLabelItem) => {
  const qrSize = 60;
  const qrX = 5;
  const qrY = (LABEL_HEIGHT - qrSize) / 2; // Center QR vertically
  const contentX = qrX + qrSize + 6;
  const contentWidth = LABEL_WIDTH - contentX - 5;

  doc.save();
  doc.rect(0, 0, LABEL_WIDTH, LABEL_HEIGHT).lineWidth(0.4).strokeColor('#d1d5db').stroke();
  doc.restore();

  const qrBuffer = decodeDataUrl(item.qrCodeDataUrl);
  if (qrBuffer) {
    doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });
  } else {
    doc.save();
    doc.rect(qrX, qrY, qrSize, qrSize).lineWidth(0.5).strokeColor('#9ca3af').stroke();
    doc.restore();
    doc.font('Helvetica').fontSize(7).fillColor('#6b7280');
    doc.text('NO QR', qrX + 12, qrY + 26, { width: qrSize - 24, align: 'center' });
  }

  // Product name - top of content area
  const labelName = buildLabelName(item);
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#111827');
  const nameLines = wrapText(doc, labelName, contentWidth, 2);
  doc.text(nameLines.join('\n'), contentX, 12, {
    width: contentWidth,
    lineGap: 1,
  });

  // Price - middle, larger
  doc.font('Helvetica-Bold').fontSize(14).fillColor('#111827');
  doc.text(formatCurrency(item.priceCents), contentX, 45, {
    width: contentWidth,
    align: 'left',
  });

  // SKU - bottom
  doc.font('Helvetica').fontSize(7).fillColor('#374151');
  doc.text(`SKU: ${item.sku}`, contentX, 72, {
    width: contentWidth,
    align: 'left',
  });
};

export async function buildPriceLabelsPdf(items: PriceLabelItem[]): Promise<Buffer> {
  const expanded: PriceLabelItem[] = [];

  for (const item of items) {
    const quantity = Math.max(1, Math.floor(item.quantity || 1));
    for (let i = 0; i < quantity; i += 1) {
      expanded.push({ ...item, quantity: 1 });
    }
  }

  return generatePdfBuffer((doc) => {
    if (expanded.length === 0) {
      doc.font('Helvetica').fontSize(9).fillColor('#111827');
      doc.text('No labels selected.', 8, 10, { width: LABEL_WIDTH - 16 });
      return;
    }

    expanded.forEach((item, index) => {
      if (index > 0) {
        doc.addPage({ size: [LABEL_WIDTH, LABEL_HEIGHT], margin: 0 });
      }
      drawLabel(doc, item);
    });
  }, { size: [LABEL_WIDTH, LABEL_HEIGHT], margin: 0 });
}

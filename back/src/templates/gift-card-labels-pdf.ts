import { generatePdfBuffer } from '../utils/pdfGenerator';

export interface GiftCardLabelItem {
  cardNumber: string;
  qrCodeDataUrl: string;
  quantity: number;
}

// 40mm x 30mm at 72dpi (1mm = 72/25.4 points)
const LABEL_WIDTH = 113; // 40mm
const LABEL_HEIGHT = 85; // 30mm

const decodeDataUrl = (dataUrl: string) => {
  const match = dataUrl.match(/^data:image\/\w+;base64,(.+)$/);
  if (!match) return null;

  try {
    return Buffer.from(match[1], 'base64');
  } catch {
    return null;
  }
};

const drawLabel = (doc: any, item: GiftCardLabelItem) => {
  const padding = 4;
  const qrSize = 52;
  const qrX = (LABEL_WIDTH - qrSize) / 2;
  const qrY = padding;

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
    doc.font('Helvetica').fontSize(6).fillColor('#6b7280');
    doc.text('NO QR', qrX, qrY + 20, { width: qrSize, align: 'center' });
  }

  doc.font('Helvetica-Bold').fontSize(8).fillColor('#111827');
  doc.text(item.cardNumber, padding, qrY + qrSize + 6, {
    width: LABEL_WIDTH - padding * 2,
    align: 'center',
  });
};

export async function buildGiftCardLabelsPdf(items: GiftCardLabelItem[]): Promise<Buffer> {
  const expanded: GiftCardLabelItem[] = [];

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

import PDFDocument from 'pdfkit';
import { format } from 'date-fns';

export const formatCurrency = (cents: number) => {
  const amount = cents / 100;
  return `$${amount.toFixed(2)}`;
};

export const formatDateTime = (value: Date | string | null | undefined) => {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  return format(date, 'yyyy-MM-dd HH:mm');
};

export const generatePdfBuffer = (
  build: (doc: PDFKit.PDFDocument) => void,
  options?: { size?: [number, number] | string; margin?: number }
) =>
  new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: options?.size || 'LETTER',
      margin: options?.margin ?? 48,
    });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (error) => reject(error));

    build(doc);
    doc.end();
  });

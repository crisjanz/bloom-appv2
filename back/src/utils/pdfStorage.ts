import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { uploadToR2 } from './r2Client';

const LOCAL_PDF_DIR = path.join(os.tmpdir(), 'bloom-print-pdfs');

export async function storePdf(buffer: Buffer, label: string): Promise<{ url: string; storage: 'r2' | 'local' }> {
  const safeLabel = label.replace(/[^a-z0-9-_]/gi, '-').toLowerCase();
  const filename = `${safeLabel}-${Date.now()}-${crypto.randomUUID()}.pdf`;

  try {
    const result = await uploadToR2({
      folder: 'print-pdfs',
      buffer,
      mimeType: 'application/pdf',
      originalName: filename,
    });

    return {
      url: result.url,
      storage: 'r2',
    };
  } catch (error) {
    await fs.mkdir(LOCAL_PDF_DIR, { recursive: true });
    const filePath = path.join(LOCAL_PDF_DIR, filename);
    await fs.writeFile(filePath, buffer);

    return {
      url: `/api/print/pdf/${filename}`,
      storage: 'local',
    };
  }
}

export async function loadLocalPdf(fileName: string): Promise<string | null> {
  const safeName = path.basename(fileName);
  const filePath = path.join(LOCAL_PDF_DIR, safeName);

  try {
    await fs.access(filePath);
    return filePath;
  } catch {
    return null;
  }
}

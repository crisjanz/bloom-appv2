import { uploadToR2 } from '../utils/r2Client';

const SIGNATURE_PREFIX = /^data:image\/png;base64,/i;

export async function uploadSignature(signatureDataUrl?: string): Promise<string | null> {
  if (!signatureDataUrl) {
    return null;
  }

  if (!SIGNATURE_PREFIX.test(signatureDataUrl)) {
    throw new Error('Signature must be a base64-encoded PNG data URL');
  }

  const base64 = signatureDataUrl.replace(SIGNATURE_PREFIX, '');
  const buffer = Buffer.from(base64, 'base64');

  const { url } = await uploadToR2({
    folder: 'signatures',
    buffer,
    mimeType: 'image/png',
    originalName: 'signature.png'
  });

  return url;
}

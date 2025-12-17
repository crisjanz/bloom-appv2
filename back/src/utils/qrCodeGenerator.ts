import QRCode from 'qrcode';

const DEFAULT_QR_OPTIONS = {
  width: 200,
  margin: 1
};

export async function generateOrderQRCode(url: string): Promise<string> {
  return QRCode.toDataURL(url, DEFAULT_QR_OPTIONS);
}

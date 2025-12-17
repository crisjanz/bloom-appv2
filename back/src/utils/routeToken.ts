import crypto from 'crypto';

const ROUTE_VIEW_SECRET = process.env.ROUTE_VIEW_SECRET || process.env.JWT_SECRET;
const TOKEN_EXPIRY_DAYS = 30;
const ROUTE_TOKEN_TTL_MS = TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

function assertSecret(): string {
  if (!ROUTE_VIEW_SECRET) {
    throw new Error('ROUTE_VIEW_SECRET is not configured');
  }

  return ROUTE_VIEW_SECRET;
}

export function generateRouteToken(orderId: string, issuedAt: number = Date.now()): string {
  const secret = assertSecret();
  const payload = `${orderId}:${issuedAt}`;
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('base64url');

  return `${orderId}:${issuedAt}:${signature}`;
}

export function verifyRouteToken(token: string): { orderId: string } {
  const [orderId, issuedAtStr, signature] = token.split(':');

  if (!orderId || !issuedAtStr || !signature) {
    throw new Error('Invalid token format');
  }

  const issuedAt = Number(issuedAtStr);

  if (Number.isNaN(issuedAt)) {
    throw new Error('Invalid token contents');
  }

  const secret = assertSecret();
  const payload = `${orderId}:${issuedAt}`;
  const expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('base64url');

  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (providedBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(providedBuffer, expectedBuffer)) {
    throw new Error('Invalid token signature');
  }

  if (Date.now() - issuedAt > ROUTE_TOKEN_TTL_MS) {
    throw new Error('Token expired');
  }

  return { orderId };
}

export function buildRouteViewUrl(token: string): string {
  const baseUrl = (process.env.PUBLIC_URL || 'https://hellobloom.ca').replace(/\/$/, '');

  return `${baseUrl}/driver/route?token=${encodeURIComponent(token)}`;
}

export { ROUTE_TOKEN_TTL_MS };

import crypto from 'crypto';

export type ReminderUnsubscribeKind = 'birthday' | 'anniversary' | 'occasion';

export interface ReminderUnsubscribePayload {
  customerId: string;
  type: ReminderUnsubscribeKind;
  reminderId?: string;
  exp: number;
}

const getSecret = () => {
  const secret = process.env.REMINDER_UNSUBSCRIBE_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    console.warn('[reminders] WARNING: No REMINDER_UNSUBSCRIBE_SECRET or JWT_SECRET set. Using insecure fallback. Set an env var before production.');
  }
  return secret || 'bloom-reminder-unsubscribe';
};

const sign = (payload: string) =>
  crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url');

export function generateReminderUnsubscribeToken(input: Omit<ReminderUnsubscribePayload, 'exp'>, expiresInDays = 180): string {
  const payload: ReminderUnsubscribePayload = {
    ...input,
    exp: Date.now() + expiresInDays * 24 * 60 * 60 * 1000,
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifyReminderUnsubscribeToken(token: string): ReminderUnsubscribePayload {
  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) {
    throw new Error('Invalid token format');
  }

  const expectedSignature = sign(encodedPayload);
  if (signature !== expectedSignature) {
    throw new Error('Invalid token signature');
  }

  const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as ReminderUnsubscribePayload;

  if (!payload.customerId || !payload.type || !payload.exp) {
    throw new Error('Invalid token payload');
  }

  if (Date.now() > payload.exp) {
    throw new Error('Token expired');
  }

  return payload;
}

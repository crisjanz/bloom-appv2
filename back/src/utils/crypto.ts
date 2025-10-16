import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

function getEncryptionKey(): Buffer {
  const secret = process.env.CONFIG_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error('CONFIG_ENCRYPTION_KEY is not configured. Add it to your environment to store payment credentials securely.');
  }

  // Derive a 32-byte key via SHA-256 hash to support arbitrary secret lengths
  return crypto.createHash('sha256').update(secret).digest();
}

export function encryptSecret(plainText?: string | null): string | null {
  if (!plainText) {
    return null;
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Pack iv + authTag + ciphertext to support decryption later
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

export function decryptSecret(payload?: string | null): string | null {
  if (!payload) {
    return null;
  }

  const buffer = Buffer.from(payload, 'base64');
  if (buffer.length <= IV_LENGTH + 16) {
    throw new Error('Invalid encrypted payload provided');
  }

  const iv = buffer.subarray(0, IV_LENGTH);
  const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + 16);
  const encrypted = buffer.subarray(IV_LENGTH + 16);

  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

export function hasConfiguredEncryptionKey(): boolean {
  return Boolean(process.env.CONFIG_ENCRYPTION_KEY);
}

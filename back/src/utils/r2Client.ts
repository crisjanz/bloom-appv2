import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';
import path from 'path';

const accountId =
  process.env.CLOUDFLARE_R2_ACCOUNT_ID ||
  process.env.CLOUDFLARE_ACCOUNT_ID ||
  process.env.R2_ACCOUNT_ID;

const accessKeyId =
  process.env.CLOUDFLARE_R2_ACCESS_KEY_ID ||
  process.env.CLOUDFLARE_ACCESS_KEY_ID ||
  process.env.R2_ACCESS_KEY_ID;

const secretAccessKey =
  process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY ||
  process.env.CLOUDFLARE_SECRET_ACCESS_KEY ||
  process.env.R2_SECRET_ACCESS_KEY;

const bucketName =
  process.env.CLOUDFLARE_R2_BUCKET_NAME ||
  process.env.CLOUDFLARE_BUCKET_NAME ||
  process.env.R2_BUCKET_NAME ||
  'upload';

const publicUrlBase =
  process.env.CLOUDFLARE_R2_PUBLIC_URL ||
  process.env.CLOUDFLARE_PUBLIC_URL ||
  process.env.R2_PUBLIC_URL ||
  'https://cdn.hellobloom.ca';

const isConfigured = Boolean(accountId && accessKeyId && secretAccessKey);

if (!isConfigured) {
  console.warn('⚠️ Cloudflare R2 environment variables are not fully configured. Image uploads will fail until they are set.');
}

const s3Client = isConfigured
  ? new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: accessKeyId!,
        secretAccessKey: secretAccessKey!,
      },
    })
  : null;

const PUBLIC_URL = publicUrlBase.replace(/\/$/, '');

const mimeExtensions: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

interface UploadParams {
  folder: string;
  buffer: Buffer;
  mimeType: string;
  originalName?: string;
}

export async function uploadToR2({ folder, buffer, mimeType, originalName }: UploadParams): Promise<{ key: string; url: string }> {
  if (!s3Client) {
    throw new Error('Cloudflare R2 credentials are not configured');
  }

  const extFromName = originalName ? path.extname(originalName) : '';
  const extFromMime = mimeExtensions[mimeType] || '';
  const extension = extFromName || extFromMime || '';
  const fileName = `${crypto.randomUUID()}${extension}`;
  const key = `${folder}/${fileName}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
  });

  await s3Client.send(command);

  return {
    key,
    url: `${PUBLIC_URL}/${key}`,
  };
}

export async function deleteFromR2(key: string): Promise<void> {
  if (!s3Client) {
    throw new Error('Cloudflare R2 credentials are not configured');
  }

  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  await s3Client.send(command);
}

export function getR2PublicUrl(key: string): string {
  return `${PUBLIC_URL}/${key}`;
}

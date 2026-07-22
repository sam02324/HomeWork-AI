import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';

const REQUIRED_R2_ENV = [
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME',
  'R2_PUBLIC_URL',
] as const;

type R2EnvironmentKey = (typeof REQUIRED_R2_ENV)[number];

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrl: string;
}

function requireEnvironmentValue(key: R2EnvironmentKey): string {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(`Storage is not configured: ${key} is missing`);
  }
  return value;
}

/**
 * Reads R2 configuration without fallbacks. Missing storage configuration must
 * stop an upload instead of silently sending student work to another bucket.
 */
export function getR2Config(): R2Config {
  const values = Object.fromEntries(
    REQUIRED_R2_ENV.map((key) => [key, requireEnvironmentValue(key)])
  ) as Record<R2EnvironmentKey, string>;

  let publicUrl: URL;
  try {
    publicUrl = new URL(values.R2_PUBLIC_URL);
  } catch {
    throw new Error('Storage is not configured: R2_PUBLIC_URL must be a valid URL');
  }

  if (publicUrl.protocol !== 'https:') {
    throw new Error('Storage is not configured: R2_PUBLIC_URL must use HTTPS');
  }

  return {
    accountId: values.R2_ACCOUNT_ID,
    accessKeyId: values.R2_ACCESS_KEY_ID,
    secretAccessKey: values.R2_SECRET_ACCESS_KEY,
    bucketName: values.R2_BUCKET_NAME,
    publicUrl: publicUrl.toString().replace(/\/$/, ''),
  };
}

function createR2Client(config: R2Config): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

export function createSubmissionObjectKey(ownerId: string, originalName: string): string {
  const safeOwnerId = ownerId
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 128) || 'unknown';
  const extension = (originalName.split('.').pop() || 'bin')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 10) || 'bin';

  return `submissions/${safeOwnerId}/${randomUUID()}.${extension.toLowerCase()}`;
}

export async function uploadSubmissionBuffer(input: {
  buffer: Buffer;
  mimeType: string;
  originalName: string;
  ownerId: string;
}): Promise<string> {
  const config = getR2Config();
  const objectKey = createSubmissionObjectKey(input.ownerId, input.originalName);
  const client = createR2Client(config);

  await client.send(new PutObjectCommand({
    Bucket: config.bucketName,
    Key: objectKey,
    Body: input.buffer,
    ContentType: input.mimeType,
  }));

  return `${config.publicUrl}/${objectKey}`;
}

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createHash, randomUUID } from 'node:crypto';

const REQUIRED_R2_ENV = [
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME',
] as const;

type R2EnvironmentKey = (typeof REQUIRED_R2_ENV)[number];

export const ALLOWED_SUBMISSION_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
] as const;

export type SubmissionMimeType = (typeof ALLOWED_SUBMISSION_MIME_TYPES)[number];

export const MAX_SUBMISSION_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_SIGNED_URL_EXPIRY_SECONDS = 300;
export const DEFAULT_SIGNED_URL_EXPIRY_SECONDS = 300;

const MANAGED_REFERENCE_PREFIX = 'r2:';
const OWNER_SCOPE_LENGTH = 32;
const OBJECT_UUID_PATTERN =
  '[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
const MANAGED_OBJECT_KEY_PATTERN = new RegExp(
  `^submissions/[0-9a-f]{${OWNER_SCOPE_LENGTH}}/${OBJECT_UUID_PATTERN}$`
);
const OPAQUE_MANAGED_REFERENCE_PATTERN = new RegExp(
  `^${MANAGED_REFERENCE_PREFIX}submissions/[0-9a-f]{${OWNER_SCOPE_LENGTH}}/${OBJECT_UUID_PATTERN}$`
);
const LEGACY_MANAGED_OBJECT_KEY_PATTERN = new RegExp(
  `^submissions/[a-zA-Z0-9_-]{1,128}/${OBJECT_UUID_PATTERN}\\.[a-z0-9]{1,10}$`
);
const LEGACY_MANAGED_REFERENCE_PATTERN = new RegExp(
  `^${MANAGED_REFERENCE_PREFIX}submissions/[a-zA-Z0-9_-]{1,128}/${OBJECT_UUID_PATTERN}\\.[a-z0-9]{1,10}$`
);

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  /** Transitional only: used to recognize old public R2 URLs. */
  legacyPublicUrl?: string;
}

export interface PresignedSubmissionUpload {
  reference: string;
  uploadUrl: string;
  expiresInSeconds: number;
}

export interface DownloadedSubmissionObject {
  buffer: Buffer;
  contentType?: string;
}

function requireEnvironmentValue(key: R2EnvironmentKey): string {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(`Storage is not configured: ${key} is missing`);
  }
  return value;
}

function getOptionalLegacyPublicUrl(): string | undefined {
  const value = process.env.R2_PUBLIC_URL?.trim();
  if (!value) return undefined;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Storage is not configured: R2_PUBLIC_URL must be a valid URL');
  }

  if (url.protocol !== 'https:') {
    throw new Error('Storage is not configured: R2_PUBLIC_URL must use HTTPS');
  }

  return url.toString().replace(/\/$/, '');
}

/** Read private R2 configuration without account, bucket, or credential fallbacks. */
export function getR2Config(): R2Config {
  const values = Object.fromEntries(
    REQUIRED_R2_ENV.map((key) => [key, requireEnvironmentValue(key)])
  ) as Record<R2EnvironmentKey, string>;

  return {
    accountId: values.R2_ACCOUNT_ID,
    accessKeyId: values.R2_ACCESS_KEY_ID,
    secretAccessKey: values.R2_SECRET_ACCESS_KEY,
    bucketName: values.R2_BUCKET_NAME,
    legacyPublicUrl: getOptionalLegacyPublicUrl(),
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

function createOwnerScope(ownerId: string): string {
  const normalizedOwnerId = ownerId.trim();
  if (!normalizedOwnerId) {
    throw new Error('Storage owner is required');
  }

  // This hash keeps provider/user identifiers out of object keys. SQL ownership
  // remains the authorization boundary; the prefix is defense in depth only.
  return createHash('sha256')
    .update(`gradeai-submission-owner:${normalizedOwnerId}`)
    .digest('hex')
    .slice(0, OWNER_SCOPE_LENGTH);
}

function createLegacyOwnerScope(ownerId: string): string {
  return ownerId
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 128) || 'unknown';
}

/**
 * Create a tenant-scoped opaque key. The legacy originalName parameter remains
 * accepted so existing server callers do not need a synchronized signature edit.
 */
export function createSubmissionObjectKey(ownerId: string, _originalName?: string): string {
  void _originalName;
  return `submissions/${createOwnerScope(ownerId)}/${randomUUID()}`;
}

function createManagedReference(objectKey: string): string {
  if (
    !MANAGED_OBJECT_KEY_PATTERN.test(objectKey) &&
    !LEGACY_MANAGED_OBJECT_KEY_PATTERN.test(objectKey)
  ) {
    throw new Error('Invalid managed submission object key');
  }
  return `${MANAGED_REFERENCE_PREFIX}${objectKey}`;
}

export function isManagedSubmissionReference(value: string): boolean {
  return (
    OPAQUE_MANAGED_REFERENCE_PATTERN.test(value) ||
    LEGACY_MANAGED_REFERENCE_PATTERN.test(value)
  );
}

/**
 * Validate a managed reference against its tenant scope and return its raw R2
 * key. Call this after resource ownership is established in SQL.
 */
export function assertOwnedSubmissionReference(value: string, ownerId: string): string {
  if (!isManagedSubmissionReference(value)) {
    throw new Error('Managed submission reference required');
  }

  const objectKey = value.slice(MANAGED_REFERENCE_PREFIX.length);
  const expectedScope = MANAGED_OBJECT_KEY_PATTERN.test(objectKey)
    ? createOwnerScope(ownerId)
    : createLegacyOwnerScope(ownerId);
  if (!objectKey.startsWith(`submissions/${expectedScope}/`)) {
    throw new Error('Submission reference does not belong to this owner');
  }

  return objectKey;
}

export function validateSubmissionUpload(input: {
  mimeType: string;
  size: number;
}): asserts input is { mimeType: SubmissionMimeType; size: number } {
  if (!Number.isSafeInteger(input.size) || input.size <= 0) {
    throw new Error('File must not be empty');
  }
  if (input.size > MAX_SUBMISSION_FILE_BYTES) {
    throw new Error('File too large. Maximum 10MB.');
  }
  if (!(ALLOWED_SUBMISSION_MIME_TYPES as readonly string[]).includes(input.mimeType)) {
    throw new Error('Unsupported submission file type. Use PDF, PNG, or JPEG.');
  }
}

export function detectSubmissionMimeType(buffer: Buffer): SubmissionMimeType | null {
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return 'application/pdf';
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return 'image/jpeg';
  }
  return null;
}

function validateSignedUrlExpiry(expiresInSeconds: number): number {
  if (
    !Number.isSafeInteger(expiresInSeconds) ||
    expiresInSeconds < 1 ||
    expiresInSeconds > MAX_SIGNED_URL_EXPIRY_SECONDS
  ) {
    throw new Error('Signed URL expiry must be between 1 and 300 seconds');
  }
  return expiresInSeconds;
}

function isLegacyExternalUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function getLegacyObjectKey(value: string, legacyPublicUrl?: string): string | null {
  if (!legacyPublicUrl) return null;

  let baseUrl: URL;
  let candidateUrl: URL;
  try {
    baseUrl = new URL(`${legacyPublicUrl}/`);
    candidateUrl = new URL(value);
  } catch {
    return null;
  }

  if (
    candidateUrl.protocol !== 'https:' ||
    candidateUrl.origin !== baseUrl.origin ||
    !candidateUrl.pathname.startsWith(baseUrl.pathname)
  ) {
    return null;
  }

  let objectKey: string;
  try {
    objectKey = decodeURIComponent(candidateUrl.pathname.slice(baseUrl.pathname.length));
  } catch {
    return null;
  }

  if (
    !LEGACY_MANAGED_OBJECT_KEY_PATTERN.test(objectKey) ||
    objectKey.length > 1_024
  ) {
    return null;
  }

  return objectKey;
}

/**
 * Convert only managed references or URLs under the optional legacy R2 base.
 * Unknown hosts and malformed keys return null and are never fetched or signed.
 */
export function normalizeSubmissionReference(value: string): string | null {
  if (isManagedSubmissionReference(value)) return value;

  const objectKey = getLegacyObjectKey(value, getOptionalLegacyPublicUrl());
  return objectKey ? createManagedReference(objectKey) : null;
}

function resolveObjectKey(value: string, config: R2Config): string {
  const normalizedReference = isManagedSubmissionReference(value)
    ? value
    : getLegacyObjectKey(value, config.legacyPublicUrl)
      ? normalizeSubmissionReference(value)
      : null;
  if (!normalizedReference) {
    throw new Error('Unsupported legacy submission URL');
  }
  return normalizedReference.slice(MANAGED_REFERENCE_PREFIX.length);
}

/** Create a direct, private upload URL. A finalize step must verify the object before persistence. */
export async function createPresignedSubmissionUploadUrl(input: {
  ownerId: string;
  originalName: string;
  mimeType: string;
  size: number;
  expiresInSeconds?: number;
}): Promise<PresignedSubmissionUpload> {
  validateSubmissionUpload(input);
  const expiresInSeconds = validateSignedUrlExpiry(
    input.expiresInSeconds ?? DEFAULT_SIGNED_URL_EXPIRY_SECONDS
  );
  const config = getR2Config();
  const objectKey = createSubmissionObjectKey(input.ownerId, input.originalName);
  const uploadUrl = await getSignedUrl(
    createR2Client(config),
    new PutObjectCommand({
      Bucket: config.bucketName,
      Key: objectKey,
      ContentLength: input.size,
      ContentType: input.mimeType,
    }),
    { expiresIn: expiresInSeconds }
  );

  return {
    reference: createManagedReference(objectKey),
    uploadUrl,
    expiresInSeconds,
  };
}

/**
 * Sign a managed reference or a recognized legacy URL for at most five minutes.
 * Routes must authorize the owning submission before calling this helper.
 */
export async function createSignedSubmissionDownloadUrl(
  value: string,
  expiresInSeconds: number = DEFAULT_SIGNED_URL_EXPIRY_SECONDS
): Promise<string> {
  const boundedExpiry = validateSignedUrlExpiry(expiresInSeconds);
  const config = getR2Config();
  const objectKey = resolveObjectKey(value, config);

  return getSignedUrl(
    createR2Client(config),
    new GetObjectCommand({ Bucket: config.bucketName, Key: objectKey }),
    { expiresIn: boundedExpiry }
  );
}

export async function uploadSubmissionBuffer(input: {
  buffer: Buffer;
  mimeType: string;
  originalName: string;
  ownerId: string;
}): Promise<string> {
  validateSubmissionUpload({ mimeType: input.mimeType, size: input.buffer.length });
  if (detectSubmissionMimeType(input.buffer) !== input.mimeType) {
    throw new Error('File content does not match its declared type');
  }

  const config = getR2Config();
  const objectKey = createSubmissionObjectKey(input.ownerId, input.originalName);
  const client = createR2Client(config);

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucketName,
      Key: objectKey,
      Body: input.buffer,
      ContentLength: input.buffer.length,
      ContentType: input.mimeType,
    })
  );

  return createManagedReference(objectKey);
}

/** Download managed objects, including recognized old URLs from R2_PUBLIC_URL. */
export async function downloadSubmissionObject(
  value: string
): Promise<DownloadedSubmissionObject> {
  const config = getR2Config();
  const objectKey = resolveObjectKey(value, config);
  const result = await createR2Client(config).send(
    new GetObjectCommand({ Bucket: config.bucketName, Key: objectKey })
  );

  if (!result.Body) {
    throw new Error('Submission object body is missing');
  }
  if (result.ContentLength && result.ContentLength > MAX_SUBMISSION_FILE_BYTES) {
    throw new Error('Submission object exceeds the size limit');
  }

  const bytes = await result.Body.transformToByteArray();
  if (bytes.byteLength > MAX_SUBMISSION_FILE_BYTES) {
    throw new Error('Submission object exceeds the size limit');
  }
  return {
    buffer: Buffer.from(bytes),
    contentType: result.ContentType,
  };
}

/** Delete managed objects, including recognized URLs under the legacy R2 base. */
export async function deleteSubmissionObject(value: string): Promise<boolean> {
  const normalizedReference = normalizeSubmissionReference(value);
  if (!normalizedReference) {
    if (isLegacyExternalUrl(value)) return false;
    throw new Error('Managed submission reference required');
  }

  const config = getR2Config();
  const objectKey = normalizedReference.slice(MANAGED_REFERENCE_PREFIX.length);
  await createR2Client(config).send(
    new DeleteObjectCommand({ Bucket: config.bucketName, Key: objectKey })
  );
  return true;
}

import { deleteSubmissionObject } from './r2';

const GOOGLE_FILE_HOSTS = new Set(['drive.google.com', 'docs.google.com']);
const DELETE_BATCH_SIZE = 10;

function assertAllowedExternalFileUrl(urlString: string): void {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    throw new Error('Invalid file URL');
  }

  if (url.protocol !== 'https:') {
    throw new Error('Only HTTPS URLs are allowed');
  }

  const hostname = url.hostname.toLowerCase();
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    /^127\.\d+\.\d+\.\d+$/.test(hostname) ||
    /^10\.\d+\.\d+\.\d+$/.test(hostname) ||
    /^192\.168\.\d+\.\d+$/.test(hostname) ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+$/.test(hostname)
  ) {
    throw new Error('Local or internal URLs are not allowed');
  }
}

export function getSubmissionFileAccessPath(input: {
  submissionId: string;
  fileReference?: string | null;
  googleDriveFileId?: string | null;
}): string | null {
  if (!input.fileReference && !input.googleDriveFileId) return null;
  return `/api/submissions/${encodeURIComponent(input.submissionId)}/file`;
}

export function assertAllowedLegacySubmissionUrl(value: string): void {
  assertAllowedExternalFileUrl(value);

  const hostname = new URL(value).hostname.toLowerCase();
  if (GOOGLE_FILE_HOSTS.has(hostname)) return;

  const configuredPublicUrl = process.env.R2_PUBLIC_URL?.trim();
  if (configuredPublicUrl) {
    try {
      if (new URL(configuredPublicUrl).hostname.toLowerCase() === hostname) return;
    } catch {
      // Invalid transitional configuration must not broaden the redirect allowlist.
    }
  }

  throw new Error('Legacy submission URL is not from an approved storage host');
}

export function assertOwnedLegacySubmissionUrl(value: string, ownerId: string): void {
  assertAllowedLegacySubmissionUrl(value);

  const configuredPublicUrl = process.env.R2_PUBLIC_URL?.trim();
  if (!configuredPublicUrl) {
    throw new Error('Legacy submission storage is not configured');
  }

  const base = new URL(configuredPublicUrl);
  const candidate = new URL(value);
  if (candidate.hostname.toLowerCase() !== base.hostname.toLowerCase()) {
    throw new Error('Legacy submission URL is not an R2 object');
  }

  const safeOwnerId = ownerId
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 128) || 'unknown';
  const basePath = base.pathname.replace(/\/$/, '');
  const candidatePath = decodeURIComponent(candidate.pathname);
  if (basePath && candidatePath !== basePath && !candidatePath.startsWith(`${basePath}/`)) {
    throw new Error('Legacy submission URL is outside the configured storage path');
  }
  const objectPath = candidatePath
    .slice(basePath.length)
    .replace(/^\/+/, '');

  if (objectPath.split('/').some((segment) => segment === '.' || segment === '..')) {
    throw new Error('Legacy submission URL contains an invalid object path');
  }

  if (!objectPath.startsWith(`submissions/${safeOwnerId}/`)) {
    throw new Error('Legacy submission URL does not belong to this owner');
  }
}

export async function deleteManagedSubmissionReferences(
  references: Iterable<string | null | undefined>
): Promise<void> {
  const managed = [...new Set(
    [...references].filter((value): value is string => Boolean(value))
  )];

  for (let index = 0; index < managed.length; index += DELETE_BATCH_SIZE) {
    await Promise.all(
      managed.slice(index, index + DELETE_BATCH_SIZE).map((reference) =>
        deleteSubmissionObject(reference)
      )
    );
  }
}

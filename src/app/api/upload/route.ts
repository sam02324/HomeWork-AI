import { NextResponse } from 'next/server';
import { getAuthUserId, errorResponse, successResponse, handleApiError, rateLimitGuard } from '@/lib/utils';
import { uploadSubmissionBuffer } from '@/lib/storage/r2';

/**
 * Sniff the real MIME type from a file's magic bytes (SEC-14). Returns null
 * for formats we don't recognize so the caller can decide how to handle them.
 * Covers the binary types we accept; text/plain has no reliable signature.
 */
function detectMimeType(buf: Buffer): string | null {
  if (buf.length >= 4 && buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) {
    return 'application/pdf'; // %PDF
  }
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) {
    return 'image/png';
  }
  if (
    buf.length >= 12 &&
    buf.toString('ascii', 0, 4) === 'RIFF' &&
    buf.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }
  // HEIC/HEIF: ISO-BMFF 'ftyp' box with a heic/heif/mif1 brand.
  if (buf.length >= 12 && buf.toString('ascii', 4, 8) === 'ftyp') {
    const brand = buf.toString('ascii', 8, 12);
    if (['heic', 'heix', 'heif', 'mif1', 'hevc', 'msf1'].includes(brand)) {
      return 'image/heic';
    }
  }
  return null;
}

/** POST /api/upload — Upload file to Cloudflare R2 */
export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (userId instanceof NextResponse) return userId;

  // Throttle uploads: 30 per minute per user.
  const limited = rateLimitGuard(`upload:${userId}`, 30, 60_000);
  if (limited) return limited;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return errorResponse('No file provided', 400);
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return errorResponse('File too large. Maximum 10MB.', 400);
    }

    // Validate the client-declared type against our allowlist.
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/heic',
      'text/plain',
    ];
    if (!allowedTypes.includes(file.type)) {
      return errorResponse(`File type ${file.type} not allowed`, 400);
    }

    // Read file as buffer up front so we can sniff its real type.
    const buffer = Buffer.from(await file.arrayBuffer());

    // SEC-14: don't trust the client-declared MIME. If the magic bytes resolve
    // to a known type and it disagrees with what was claimed, reject the upload.
    const detected = detectMimeType(buffer);
    if (detected !== null && detected !== file.type) {
      return errorResponse('File content does not match its declared type', 400);
    }

    const fileUrl = await uploadSubmissionBuffer({
      buffer,
      mimeType: file.type,
      originalName: file.name,
      ownerId: userId,
    });

    return successResponse({
      url: fileUrl,
      filename: file.name,
      size: file.size,
      type: file.type,
    }, 201);
  } catch (error) {
    return handleApiError(error, 'POST /api/upload');
  }
}

import { NextResponse } from 'next/server';
import { getAuthUserId, errorResponse, successResponse, handleApiError, rateLimitGuard } from '@/lib/utils';
import {
  detectSubmissionMimeType,
  uploadSubmissionBuffer,
  validateSubmissionUpload,
} from '@/lib/storage/r2';

export const runtime = 'nodejs';

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

    try {
      validateSubmissionUpload({ mimeType: file.type, size: file.size });
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Invalid submission file';
      return errorResponse(message, 400);
    }

    // Read file as buffer up front so we can sniff its real type.
    const buffer = Buffer.from(await file.arrayBuffer());

    // All accepted formats have stable signatures, so unknown bytes are also
    // rejected instead of trusting the multipart Content-Type header.
    if (detectSubmissionMimeType(buffer) !== file.type) {
      return errorResponse('File content does not match its declared type', 400);
    }

    const fileReference = await uploadSubmissionBuffer({
      buffer,
      mimeType: file.type,
      originalName: file.name,
      ownerId: userId,
    });

    return successResponse({
      fileReference,
      // Transitional alias for the current client. The value is an internal
      // r2: reference, never a public or signed URL.
      url: fileReference,
      filename: file.name,
      size: file.size,
      type: file.type,
    }, 201);
  } catch (error) {
    return handleApiError(error, 'POST /api/upload');
  }
}

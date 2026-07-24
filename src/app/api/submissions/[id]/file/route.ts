import { NextResponse } from 'next/server';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { assignments, submissions } from '@/db/schema';
import {
  assertOwnedSubmissionReference,
  createSignedSubmissionDownloadUrl,
  isManagedSubmissionReference,
  MAX_SUBMISSION_FILE_BYTES,
} from '@/lib/storage/r2';
import { assertOwnedLegacySubmissionUrl } from '@/lib/storage/submission-files';
import { errorResponse, getAuthUserId, handleApiError } from '@/lib/utils';
import { downloadDriveFile } from '@/lib/google-sheets';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DOWNLOAD_URL_TTL_SECONDS = 60;
const SAFE_INLINE_CONTENT_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'text/plain',
]);

function noStoreRedirect(url: string): NextResponse {
  const response = NextResponse.redirect(url, 307);
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}

function privateFileResponse(input: {
  buffer: Buffer;
  contentType: string;
  filename: string;
}): NextResponse {
  const safeFilename = input.filename.replace(/[\r\n"]/g, '_').slice(0, 180) || 'submission';
  const declaredContentType = input.contentType.split(';', 1)[0].trim().toLowerCase();
  const isSafeInline = SAFE_INLINE_CONTENT_TYPES.has(declaredContentType);
  return new NextResponse(new Uint8Array(input.buffer), {
    status: 200,
    headers: {
      'Cache-Control': 'private, no-store, max-age=0',
      'Content-Disposition': `${isSafeInline ? 'inline' : 'attachment'}; filename="${safeFilename}"`,
      'Content-Type': isSafeInline ? declaredContentType : 'application/octet-stream',
      'Pragma': 'no-cache',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

/** GET /api/submissions/[id]/file - authorize and issue a short-lived file URL. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (userId instanceof NextResponse) return userId;

  const { id } = await params;

  try {
    const [submission] = await db
      .select({
        id: submissions.id,
        fileReference: submissions.fileUrl,
        googleDriveFileId: submissions.googleDriveFileId,
      })
      .from(submissions)
      .innerJoin(assignments, eq(submissions.assignmentId, assignments.id))
      .where(and(
        eq(submissions.id, id),
        eq(assignments.teacherId, userId),
        isNull(submissions.removedAt)
      ))
      .limit(1);

    if (!submission) return errorResponse('Submission file not found', 404, 'NOT_FOUND');

    if (
      submission.fileReference &&
      isManagedSubmissionReference(submission.fileReference)
    ) {
      assertOwnedSubmissionReference(submission.fileReference, userId);
      const signedUrl = await createSignedSubmissionDownloadUrl(
        submission.fileReference,
        DOWNLOAD_URL_TTL_SECONDS
      );
      return noStoreRedirect(signedUrl);
    }

    if (submission.googleDriveFileId) {
      const driveFile = await downloadDriveFile(submission.googleDriveFileId, userId);
      if (driveFile.buffer.byteLength > MAX_SUBMISSION_FILE_BYTES) {
        return errorResponse('Submission file exceeds the 10MB limit', 413, 'FILE_TOO_LARGE');
      }
      return privateFileResponse({
        buffer: driveFile.buffer,
        contentType: driveFile.mimeType,
        filename: driveFile.name,
      });
    }

    if (submission.fileReference) {
      assertOwnedLegacySubmissionUrl(submission.fileReference, userId);
      const signedUrl = await createSignedSubmissionDownloadUrl(
        submission.fileReference,
        DOWNLOAD_URL_TTL_SECONDS
      );
      return noStoreRedirect(signedUrl);
    }

    return errorResponse('Submission has no file', 404, 'FILE_MISSING');
  } catch (error) {
    return handleApiError(error, 'GET /api/submissions/[id]/file');
  }
}

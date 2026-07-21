import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { assignments, contentReports, submissions } from '@/db/schema';
import { createContentReportSchema } from '@/lib/validations';
import { recordSystemEvent } from '@/lib/operations/system-events';
import {
  errorResponse,
  getAuthUserId,
  handleApiError,
  parseBody,
  rateLimitGuard,
  stripHtml,
  successResponse,
} from '@/lib/utils';

/** POST /api/reports - Report a submission owned by the active teacher. */
export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (userId instanceof NextResponse) return userId;

  const limited = rateLimitGuard(`content-report:${userId}`, 10, 60_000);
  if (limited) return limited;

  const body = await parseBody(request, createContentReportSchema);
  if (body instanceof NextResponse) return body;

  try {
    const ownedSubmission = await db
      .select({ id: submissions.id, removedAt: submissions.removedAt })
      .from(submissions)
      .innerJoin(assignments, eq(submissions.assignmentId, assignments.id))
      .where(and(eq(submissions.id, body.submissionId), eq(assignments.teacherId, userId)))
      .limit(1);

    if (!ownedSubmission[0]) return errorResponse('Submission not found', 404, 'NOT_FOUND');

    const [report] = await db
      .insert(contentReports)
      .values({
        reporterId: userId,
        submissionId: body.submissionId,
        category: body.category,
        reason: stripHtml(body.reason),
      })
      .onConflictDoNothing({
        target: [contentReports.reporterId, contentReports.submissionId],
      })
      .returning();

    if (!report) {
      return errorResponse('This submission has already been reported', 409, 'ALREADY_REPORTED');
    }

    await recordSystemEvent({
      category: 'moderation',
      severity: 'warning',
      code: 'CONTENT_REPORTED',
      message: 'A teacher submitted content for owner review.',
      userId,
      entityType: 'report',
      entityId: report.id,
      metadata: { category: body.category },
    });

    return successResponse({ id: report.id, status: report.status }, 201);
  } catch (error) {
    return handleApiError(error, 'POST /api/reports');
  }
}

import { NextResponse } from 'next/server';
import { db } from '@/db';
import { submissions } from '@/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { getAuthUserId, errorResponse, successResponse } from '@/lib/utils';

type Params = { params: Promise<{ id: string }> };

/** GET /api/submissions/[id] — Submission detail with grade, student, assignment */
export async function GET(_req: Request, { params }: Params) {
  const userId = await getAuthUserId();
  if (userId instanceof NextResponse) return userId;

  const { id } = await params;

  try {
    const submission = await db.query.submissions.findFirst({
      where: and(eq(submissions.id, id), isNull(submissions.removedAt)),
      with: {
        grade: true,
        student: true,
        assignment: true,
      },
    });

    if (!submission) return errorResponse('Submission not found', 404);

    // Verify teacher owns the assignment
    if (submission.assignment.teacherId !== userId) {
      return errorResponse('Not authorized', 403);
    }

    return successResponse(submission);
  } catch (error) {
    console.error('GET /api/submissions/[id] error:', error);
    return errorResponse('Failed to fetch submission', 500);
  }
}

/** DELETE /api/submissions/[id] — Delete a submission */
export async function DELETE(_req: Request, { params }: Params) {
  const userId = await getAuthUserId();
  if (userId instanceof NextResponse) return userId;

  const { id } = await params;

  try {
    const submission = await db.query.submissions.findFirst({
      where: and(eq(submissions.id, id), isNull(submissions.removedAt)),
      with: { assignment: true },
    });

    if (!submission) return errorResponse('Submission not found', 404);
    if (submission.assignment.teacherId !== userId) {
      return errorResponse('Not authorized', 403);
    }

    await db.delete(submissions).where(eq(submissions.id, id));

    return successResponse({ message: 'Submission deleted' });
  } catch (error) {
    console.error('DELETE /api/submissions/[id] error:', error);
    return errorResponse('Failed to delete submission', 500);
  }
}

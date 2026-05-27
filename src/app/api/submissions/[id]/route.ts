import { NextResponse } from 'next/server';
import { db } from '@/db';
import { submissions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getAuthUserId, errorResponse, successResponse } from '@/lib/utils';

type Params = { params: Promise<{ id: string }> };

/** GET /api/submissions/[id] — Submission detail with grade, student, assignment */
export async function GET(_req: Request, { params }: Params) {
  const userId = await getAuthUserId();
  if (userId instanceof NextResponse) return userId;

  const { id } = await params;

  try {
    const submission = await db.query.submissions.findFirst({
      where: eq(submissions.id, id),
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

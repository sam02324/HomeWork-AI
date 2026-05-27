import { NextResponse } from 'next/server';
import { db } from '@/db';
import { assignments } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getAuthUserId, errorResponse, successResponse } from '@/lib/utils';
import { gradeAllSubmissions } from '@/lib/ai/grading-service';

type Params = { params: Promise<{ id: string }> };

/** POST /api/assignments/[id]/grade — Trigger AI grading for all pending submissions */
export async function POST(_req: Request, { params }: Params) {
  const userId = await getAuthUserId();
  if (userId instanceof NextResponse) return userId;

  const { id } = await params;

  try {
    // Verify ownership
    const assignment = await db.query.assignments.findFirst({
      where: and(eq(assignments.id, id), eq(assignments.teacherId, userId)),
    });

    if (!assignment) return errorResponse('Assignment not found', 404);
    if (assignment.status === 'grading') {
      return errorResponse('Grading is already in progress', 400);
    }

    // Trigger grading (runs in the request context)
    const gradedCount = await gradeAllSubmissions(id);

    return successResponse({
      message: `Grading complete. ${gradedCount} submissions graded.`,
      gradedCount,
    });
  } catch (error) {
    console.error('POST /api/assignments/[id]/grade error:', error);
    return errorResponse('Grading failed', 500);
  }
}

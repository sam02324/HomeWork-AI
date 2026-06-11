import { NextResponse } from 'next/server';
import { db } from '@/db';
import { assignments } from '@/db/schema';
import { eq, and, ne } from 'drizzle-orm';
import { getAuthUserId, errorResponse, successResponse, handleApiError, rateLimitGuard } from '@/lib/utils';
import { gradeAllSubmissions } from '@/lib/ai/grading-service';

type Params = { params: Promise<{ id: string }> };

/** POST /api/assignments/[id]/grade — Trigger AI grading for all pending submissions */
export async function POST(_req: Request, { params }: Params) {
  const userId = await getAuthUserId();
  if (userId instanceof NextResponse) return userId;

  // Throttle expensive grading runs: 5 per minute per user.
  const limited = rateLimitGuard(`grade:${userId}`, 5, 60_000);
  if (limited) return limited;

  const { id } = await params;

  try {
    // Verify ownership first (404 hides existence from non-owners).
    const assignment = await db.query.assignments.findFirst({
      where: and(eq(assignments.id, id), eq(assignments.teacherId, userId)),
    });
    if (!assignment) return errorResponse('Assignment not found', 404);

    // Atomic lock: only one request can flip status away from 'grading'.
    // This is the race-condition fix — concurrent callers can't both claim it.
    const claimed = await db
      .update(assignments)
      .set({ status: 'grading', updatedAt: new Date() })
      .where(and(eq(assignments.id, id), ne(assignments.status, 'grading')))
      .returning({ id: assignments.id });

    if (claimed.length === 0) {
      return errorResponse('Grading is already in progress', 409, 'ALREADY_GRADING');
    }

    try {
      const gradedCount = await gradeAllSubmissions(id);
      return successResponse({
        message: `Grading complete. ${gradedCount} submissions graded.`,
        gradedCount,
      });
    } catch (gradingError) {
      // Release the lock so the teacher can retry instead of being stuck in 'grading'.
      await db
        .update(assignments)
        .set({ status: 'published', updatedAt: new Date() })
        .where(eq(assignments.id, id));
      throw gradingError;
    }
  } catch (error) {
    return handleApiError(error, 'POST /api/assignments/[id]/grade');
  }
}

import { NextResponse } from 'next/server';
import { db } from '@/db';
import { assignments, submissions } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { getAuthUserId, errorResponse, successResponse, parseBody } from '@/lib/utils';
import { updateAssignmentSchema } from '@/lib/validations';

type Params = { params: Promise<{ id: string }> };

/** GET /api/assignments/[id] — Assignment detail with submission stats */
export async function GET(_req: Request, { params }: Params) {
  const userId = await getAuthUserId();
  if (userId instanceof NextResponse) return userId;

  const { id } = await params;

  try {
    const assignment = await db.query.assignments.findFirst({
      where: and(eq(assignments.id, id), eq(assignments.teacherId, userId)),
      with: { classroom: true },
    });

    if (!assignment) return errorResponse('Assignment not found', 404);

    // Get submission stats
    const [stats] = await db
      .select({
        submissionCount: sql<number>`COUNT(*)::int`,
        gradedCount: sql<number>`COUNT(*) FILTER (WHERE ${submissions.status} = 'graded')::int`,
        pendingCount: sql<number>`COUNT(*) FILTER (WHERE ${submissions.status} = 'pending')::int`,
      })
      .from(submissions)
      .where(eq(submissions.assignmentId, id));

    return successResponse({
      ...assignment,
      submissionCount: stats?.submissionCount || 0,
      gradedCount: stats?.gradedCount || 0,
      pendingCount: stats?.pendingCount || 0,
    });
  } catch (error) {
    console.error('GET /api/assignments/[id] error:', error);
    return errorResponse('Failed to fetch assignment', 500);
  }
}

/** PATCH /api/assignments/[id] — Update assignment */
export async function PATCH(request: Request, { params }: Params) {
  const userId = await getAuthUserId();
  if (userId instanceof NextResponse) return userId;

  const { id } = await params;
  const body = await parseBody(request, updateAssignmentSchema);
  if (body instanceof NextResponse) return body;

  try {
    const updateData: Record<string, unknown> = { ...body, updatedAt: new Date() };
    if (body.dueDate) updateData.dueDate = new Date(body.dueDate);

    const [updated] = await db.update(assignments)
      .set(updateData)
      .where(and(eq(assignments.id, id), eq(assignments.teacherId, userId)))
      .returning();

    if (!updated) return errorResponse('Assignment not found', 404);
    return successResponse(updated);
  } catch (error) {
    console.error('PATCH /api/assignments/[id] error:', error);
    return errorResponse('Failed to update assignment', 500);
  }
}

/** DELETE /api/assignments/[id] — Delete assignment (draft only) */
export async function DELETE(_req: Request, { params }: Params) {
  const userId = await getAuthUserId();
  if (userId instanceof NextResponse) return userId;

  const { id } = await params;

  try {
    // Only allow deleting draft assignments
    const existing = await db.query.assignments.findFirst({
      where: and(eq(assignments.id, id), eq(assignments.teacherId, userId)),
    });

    if (!existing) return errorResponse('Assignment not found', 404);
    if (existing.status !== 'draft') {
      return errorResponse('Can only delete draft assignments', 400);
    }

    await db.delete(assignments).where(eq(assignments.id, id));
    return successResponse({ message: 'Assignment deleted' });
  } catch (error) {
    console.error('DELETE /api/assignments/[id] error:', error);
    return errorResponse('Failed to delete assignment', 500);
  }
}

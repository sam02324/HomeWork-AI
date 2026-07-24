import { NextResponse } from 'next/server';
import { db } from '@/db';
import { assignments, submissions, classrooms } from '@/db/schema';
import { eq, and, sql, isNull } from 'drizzle-orm';
import { getAuthUserId, errorResponse, successResponse, parseBody } from '@/lib/utils';
import { updateAssignmentSchema } from '@/lib/validations';
import { deleteManagedSubmissionReferences } from '@/lib/storage/submission-files';

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
      .where(and(eq(submissions.assignmentId, id), isNull(submissions.removedAt)));

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
    // SEC-3: if moving the assignment to another classroom, that classroom
    // must also be owned by this teacher.
    if (body.classroomId) {
      const targetClassroom = await db.query.classrooms.findFirst({
        where: and(eq(classrooms.id, body.classroomId), eq(classrooms.teacherId, userId)),
        columns: { id: true },
      });
      if (!targetClassroom) return errorResponse('Classroom not found', 404);
    }

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
    const ownedFiles = await db
      .select({ fileReference: submissions.fileUrl })
      .from(submissions)
      .innerJoin(assignments, eq(submissions.assignmentId, assignments.id))
      .where(and(eq(assignments.id, id), eq(assignments.teacherId, userId)));

    await deleteManagedSubmissionReferences(ownedFiles.map((row) => row.fileReference));

    const [deleted] = await db.delete(assignments)
      .where(and(eq(assignments.id, id), eq(assignments.teacherId, userId)))
      .returning();

    if (!deleted) return errorResponse('Assignment not found', 404);
    return successResponse({ message: 'Assignment deleted' });
  } catch (error) {
    console.error('DELETE /api/assignments/[id] error:', error);
    return errorResponse('Failed to delete assignment', 500);
  }
}

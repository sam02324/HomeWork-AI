import { NextResponse } from 'next/server';
import { db } from '@/db';
import { grades } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getAuthUserId, errorResponse, successResponse, stripHtml } from '@/lib/utils';

type Params = { params: Promise<{ id: string }> };

/** PATCH /api/grades/[id] — Teacher reviews/overrides a grade */
export async function PATCH(request: Request, { params }: Params) {
  const userId = await getAuthUserId();
  if (userId instanceof NextResponse) return userId;

  const { id } = await params;

  try {
    const body = await request.json();
    const { teacherOverrideScore, teacherNote, reviewedByTeacher } = body;

    // Verify grade exists and belongs to teacher's assignment
    const grade = await db.query.grades.findFirst({
      where: eq(grades.id, id),
      with: {
        submission: {
          with: {
            assignment: true,
          },
        },
      },
    });

    if (!grade) return errorResponse('Grade not found', 404);
    if (grade.submission.assignment.teacherId !== userId) {
      return errorResponse('Unauthorized', 403);
    }

    const updateData: Record<string, unknown> = {};
    if (teacherOverrideScore !== undefined && teacherOverrideScore !== null) {
      // NaN serializes to null in JSON; reject anything that isn't a real score.
      const score = Number(teacherOverrideScore);
      if (!Number.isFinite(score) || score < 0 || score > grade.maxScore) {
        return errorResponse(`Score must be a number between 0 and ${grade.maxScore}`, 400);
      }
      updateData.teacherOverrideScore = score.toString();
    }
    if (typeof teacherNote === 'string') {
      updateData.teacherNote = stripHtml(teacherNote);
    }
    if (typeof reviewedByTeacher === 'boolean') {
      updateData.reviewedByTeacher = reviewedByTeacher;
    }

    if (Object.keys(updateData).length === 0) {
      return errorResponse('No valid fields to update', 400);
    }

    const [updated] = await db.update(grades)
      .set(updateData)
      .where(eq(grades.id, id))
      .returning();

    return successResponse(updated);
  } catch (error) {
    console.error('PATCH /api/grades/[id] error:', error);
    return errorResponse('Failed to update grade', 500);
  }
}

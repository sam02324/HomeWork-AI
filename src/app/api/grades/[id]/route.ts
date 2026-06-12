import { NextResponse } from 'next/server';
import { db } from '@/db';
import { grades } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getAuthUserId, errorResponse, successResponse } from '@/lib/utils';

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
    if (teacherOverrideScore !== undefined) {
      updateData.teacherOverrideScore = teacherOverrideScore.toString();
    }
    if (teacherNote !== undefined) {
      updateData.teacherNote = teacherNote;
    }
    if (reviewedByTeacher !== undefined) {
      updateData.reviewedByTeacher = reviewedByTeacher;
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

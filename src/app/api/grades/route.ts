import { NextResponse } from 'next/server';
import { db } from '@/db';
import { grades, submissions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import {
  getAuthUserId,
  errorResponse,
  successResponse,
  handleApiError,
  parseBody,
  stripHtml,
} from '@/lib/utils';
import { createGradeSchema } from '@/lib/validations';
import { getGradeLetter } from '@/lib/utils';

/** POST /api/grades — Teacher manually creates (or overrides) a grade */
export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (userId instanceof NextResponse) return userId;

  const body = await parseBody(request, createGradeSchema);
  if (body instanceof NextResponse) return body;

  try {
    // Verify submission exists and belongs to the teacher's assignment.
    const submission = await db.query.submissions.findFirst({
      where: eq(submissions.id, body.submissionId),
      with: { assignment: true },
    });

    if (!submission) return errorResponse('Submission not found', 404);
    if (submission.assignment.teacherId !== userId) {
      return errorResponse('You do not own this submission', 403);
    }

    const maxScore = body.maxScore || submission.assignment.maxScore;
    const percentage = (body.teacherOverrideScore / maxScore) * 100;
    const gradeLetter = getGradeLetter(percentage);
    const cleanNote = stripHtml(body.teacherNote);

    // Transaction: grade write + submission status flip must stay consistent.
    // NOTE (SEC-20): on the neon-http driver, db.transaction() is sent as Neon's
    // batch API — one atomic HTTP round-trip. It commits or rolls back as a unit,
    // but does NOT support interactive read-then-rollback (no conditional logic
    // between statements based on intermediate reads). Keep the body a straight
    // sequence of writes.
    const result = await db.transaction(async (tx) => {
      const [newGrade] = await tx
        .insert(grades)
        .values({
          submissionId: body.submissionId,
          totalScore: body.teacherOverrideScore.toString(),
          maxScore,
          teacherOverrideScore: body.teacherOverrideScore.toString(),
          teacherNote: cleanNote,
          reviewedByTeacher: true,
          aiDetectionFlag: false,
          aiDetectionScore: 0,
          gradeLetter,
          feedback: cleanNote || 'Manual Grade',
          criteriaScores: [],
          aiModel: 'manual',
        })
        // submissionId is UNIQUE — upsert so re-grading overwrites instead of erroring.
        .onConflictDoUpdate({
          target: grades.submissionId,
          set: {
            totalScore: body.teacherOverrideScore.toString(),
            maxScore,
            teacherOverrideScore: body.teacherOverrideScore.toString(),
            teacherNote: cleanNote,
            gradeLetter,
            reviewedByTeacher: true,
          },
        })
        .returning();

      await tx
        .update(submissions)
        .set({ status: 'graded' })
        .where(eq(submissions.id, body.submissionId));

      return newGrade;
    });

    return successResponse(result, 201);
  } catch (error) {
    return handleApiError(error, 'POST /api/grades');
  }
}

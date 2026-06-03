import { NextResponse } from 'next/server';
import { db } from '@/db';
import { grades, submissions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getAuthUserId, errorResponse, successResponse } from '@/lib/utils';
import crypto from 'crypto';

/** POST /api/grades — Teacher manually creates a grade */
export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (userId instanceof NextResponse) return userId;

  try {
    const body = await request.json();
    const { submissionId, teacherOverrideScore, teacherNote, maxScore } = body;

    // Verify submission exists and belongs to teacher's assignment
    const submission = await db.query.submissions.findFirst({
      where: eq(submissions.id, submissionId),
      with: {
        assignment: true,
      },
    });

    if (!submission) return errorResponse('Submission not found', 404);
    if (submission.assignment.teacherId !== userId) {
      return errorResponse('Unauthorized', 403);
    }

    const newGradeId = crypto.randomUUID();

    const [newGrade] = await db.insert(grades)
      .values({
        id: newGradeId,
        submissionId: submissionId,
        totalScore: teacherOverrideScore?.toString() || '0',
        maxScore: maxScore?.toString() || submission.assignment.maxScore.toString(),
        teacherOverrideScore: teacherOverrideScore?.toString(),
        teacherNote: teacherNote || '',
        reviewedByTeacher: true,
        aiDetectionFlag: false,
        aiDetectionScore: 0,
        gradeLetter: 'N/A', // Let the front-end or a helper calculate this later if needed
        feedback: 'Manual Grade',
        criteriaScores: [],
        aiModel: 'manual',
      })
      .returning();

    await db.update(submissions)
      .set({ status: 'graded' })
      .where(eq(submissions.id, submissionId));

    return successResponse(newGrade);
  } catch (error) {
    console.error('POST /api/grades error:', error);
    return errorResponse('Failed to create grade', 500);
  }
}

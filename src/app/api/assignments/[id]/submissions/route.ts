import { NextResponse } from 'next/server';
import { db } from '@/db';
import { submissions, students, grades } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getAuthUserId, errorResponse, successResponse } from '@/lib/utils';

type Params = { params: Promise<{ id: string }> };

/** GET /api/assignments/[id]/submissions — List submissions for an assignment */
export async function GET(_req: Request, { params }: Params) {
  const userId = await getAuthUserId();
  if (userId instanceof NextResponse) return userId;

  const { id } = await params;

  try {
    const result = await db
      .select({
        id: submissions.id,
        assignmentId: submissions.assignmentId,
        studentId: submissions.studentId,
        fileUrl: submissions.fileUrl,
        fileType: submissions.fileType,
        textContent: submissions.textContent,
        status: submissions.status,
        submittedAt: submissions.submittedAt,
        student: {
          id: students.id,
          name: students.name,
          rollNumber: students.rollNumber,
        },
        grade: {
          id: grades.id,
          totalScore: grades.totalScore,
          maxScore: grades.maxScore,
          gradeLetter: grades.gradeLetter,
          aiDetectionScore: grades.aiDetectionScore,
          aiDetectionFlag: grades.aiDetectionFlag,
          teacherOverrideScore: grades.teacherOverrideScore,
          teacherNote: grades.teacherNote,
          reviewedByTeacher: grades.reviewedByTeacher,
          feedback: grades.feedback,
          strengths: grades.strengths,
          improvements: grades.improvements,
          criteriaScores: grades.criteriaScores,
        }
      })
      .from(submissions)
      .innerJoin(students, eq(submissions.studentId, students.id))
      .leftJoin(grades, eq(submissions.id, grades.submissionId))
      .where(eq(submissions.assignmentId, id))
      .orderBy(desc(submissions.submittedAt));

    return successResponse(result);
  } catch (error) {
    console.error('GET /api/assignments/[id]/submissions error:', error);
    return errorResponse('Failed to fetch submissions', 500);
  }
}

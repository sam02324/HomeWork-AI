import { NextResponse } from 'next/server';
import { db } from '@/db';
import { submissions, students, grades, assignments } from '@/db/schema';
import { eq, and, desc, isNull } from 'drizzle-orm';
import { getAuthUserId, errorResponse, successResponse } from '@/lib/utils';
import { getSubmissionFileAccessPath } from '@/lib/storage/submission-files';

type Params = { params: Promise<{ id: string }> };

/** GET /api/assignments/[id]/submissions — List submissions for an assignment */
export async function GET(_req: Request, { params }: Params) {
  const userId = await getAuthUserId();
  if (userId instanceof NextResponse) return userId;

  const { id } = await params;

  try {
    // Ownership check (SEC-1): 404 for assignments the teacher doesn't own,
    // which also hides their existence.
    const owned = await db.query.assignments.findFirst({
      where: and(eq(assignments.id, id), eq(assignments.teacherId, userId)),
      columns: { id: true },
    });
    if (!owned) return errorResponse('Assignment not found', 404);

    const result = await db
      .select({
        id: submissions.id,
        assignmentId: submissions.assignmentId,
        studentId: submissions.studentId,
        fileUrl: submissions.fileUrl,
        fileType: submissions.fileType,
        textContent: submissions.textContent,
        googleDriveFileId: submissions.googleDriveFileId,
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
      .where(and(eq(submissions.assignmentId, id), isNull(submissions.removedAt)))
      .orderBy(desc(submissions.submittedAt))
      .limit(200); // BUG-8: cap response size for large classes

    return successResponse(result.map((submission) => ({
      ...submission,
      fileUrl: getSubmissionFileAccessPath({
        submissionId: submission.id,
        fileReference: submission.fileUrl,
        googleDriveFileId: submission.googleDriveFileId,
      }),
    })));
  } catch (error) {
    console.error('GET /api/assignments/[id]/submissions error:', error);
    return errorResponse('Failed to fetch submissions', 500);
  }
}

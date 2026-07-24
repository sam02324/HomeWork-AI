import { NextResponse } from 'next/server';
import { db } from '@/db';
import { submissions, assignments, students } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { getAuthUserId, errorResponse, successResponse, parseBody } from '@/lib/utils';
import { createSubmissionSchema } from '@/lib/validations';
import { assertOwnedSubmissionReference, isManagedSubmissionReference } from '@/lib/storage/r2';
import {
  assertOwnedLegacySubmissionUrl,
  getSubmissionFileAccessPath,
} from '@/lib/storage/submission-files';

export const dynamic = 'force-dynamic';

/** GET /api/submissions — List all submissions across all assignments for the teacher */
export async function GET() {
  const userId = await getAuthUserId();
  if (userId instanceof NextResponse) return userId;

  try {
    const result = await db
      .select({
        id: submissions.id,
        status: submissions.status,
        assignmentId: submissions.assignmentId,
        assignmentTitle: assignments.title,
        studentId: submissions.studentId,
        studentName: students.name,
      })
      .from(submissions)
      .innerJoin(assignments, eq(submissions.assignmentId, assignments.id))
      .innerJoin(students, eq(submissions.studentId, students.id))
      .where(and(eq(assignments.teacherId, userId), isNull(submissions.removedAt)));

    return successResponse(result);
  } catch (error) {
    console.error('GET /api/submissions error:', error);
    return errorResponse('Failed to fetch submissions', 500);
  }
}
/** POST /api/submissions — Create a submission */
export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (userId instanceof NextResponse) return userId;

  const body = await parseBody(request, createSubmissionSchema);
  if (body instanceof NextResponse) return body;

  try {
    // Verify assignment belongs to teacher
    const assignment = await db.query.assignments.findFirst({
      where: and(
        eq(assignments.id, body.assignmentId),
        eq(assignments.teacherId, userId)
      ),
    });

    if (!assignment) return errorResponse('Assignment not found', 404);
    if (assignment.status === 'draft') {
      return errorResponse('Assignment is still in draft', 400);
    }

    // The student must belong to the assignment's classroom
    const student = await db.query.students.findFirst({
      where: and(
        eq(students.id, body.studentId),
        eq(students.classroomId, assignment.classroomId)
      ),
    });
    if (!student) return errorResponse('Student not found in this classroom', 404);

    if (body.fileUrl) {
      try {
        if (isManagedSubmissionReference(body.fileUrl)) {
          assertOwnedSubmissionReference(body.fileUrl, userId);
        } else {
          assertOwnedLegacySubmissionUrl(body.fileUrl, userId);
        }
      } catch {
        return errorResponse('Invalid submission file reference', 400, 'INVALID_FILE_REFERENCE');
      }
    }

    const [submission] = await db.insert(submissions).values({
      assignmentId: body.assignmentId,
      studentId: body.studentId,
      fileUrl: body.fileUrl ?? null,
      fileType: body.fileType ?? null,
      textContent: body.textContent ?? null,
      status: 'pending',
    }).returning();

    return successResponse({
      ...submission,
      fileUrl: getSubmissionFileAccessPath({
        submissionId: submission.id,
        fileReference: submission.fileUrl,
        googleDriveFileId: submission.googleDriveFileId,
      }),
    }, 201);
  } catch (error) {
    console.error('POST /api/submissions error:', error);
    return errorResponse('Failed to create submission', 500);
  }
}

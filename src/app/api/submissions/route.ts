import { NextResponse } from 'next/server';
import { db } from '@/db';
import { submissions, assignments } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getAuthUserId, errorResponse, successResponse, parseBody } from '@/lib/utils';
import { createSubmissionSchema } from '@/lib/validations';

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

    const [submission] = await db.insert(submissions).values({
      assignmentId: body.assignmentId,
      studentId: body.studentId,
      fileUrl: body.fileUrl ?? null,
      fileType: body.fileType ?? null,
      textContent: body.textContent ?? null,
      status: 'pending',
    }).returning();

    return successResponse(submission, 201);
  } catch (error) {
    console.error('POST /api/submissions error:', error);
    return errorResponse('Failed to create submission', 500);
  }
}

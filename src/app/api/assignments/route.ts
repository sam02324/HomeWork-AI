import { NextResponse } from 'next/server';
import { db } from '@/db';
import { assignments, submissions } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { getAuthUserId, errorResponse, successResponse, parseBody, parseQuery } from '@/lib/utils';
import { createAssignmentSchema, assignmentQuerySchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';

/** GET /api/assignments — List assignments with filters and stats */
export async function GET(request: Request) {
  const userId = await getAuthUserId();
  if (userId instanceof NextResponse) return userId;

  const query = parseQuery(request.url, assignmentQuerySchema);
  if (query instanceof NextResponse) return query;

  try {
    const conditions = [eq(assignments.teacherId, userId)];

    if (query.classroomId) {
      conditions.push(eq(assignments.classroomId, query.classroomId));
    }
    if (query.status) {
      conditions.push(eq(assignments.status, query.status));
    }

    const result = await db
      .select({
        id: assignments.id,
        classroomId: assignments.classroomId,
        teacherId: assignments.teacherId,
        title: assignments.title,
        subject: assignments.subject,
        topic: assignments.topic,
        description: assignments.description,
        maxScore: assignments.maxScore,
        dueDate: assignments.dueDate,
        submissionType: assignments.submissionType,
        status: assignments.status,
        strictness: assignments.strictness,
        createdAt: assignments.createdAt,
        updatedAt: assignments.updatedAt,
        submissionCount: sql<number>`(
          SELECT COUNT(*)::int FROM submissions WHERE submissions.assignment_id = ${assignments.id}
        )`,
        gradedCount: sql<number>`(
          SELECT COUNT(*)::int FROM submissions WHERE submissions.assignment_id = ${assignments.id} AND submissions.status = 'graded'
        )`,
      })
      .from(assignments)
      .where(and(...conditions))
      .orderBy(sql`${assignments.createdAt} DESC`)
      .limit(query.limit)
      .offset(query.offset);

    return successResponse(result);
  } catch (error) {
    console.error('GET /api/assignments error:', error);
    return errorResponse('Failed to fetch assignments', 500);
  }
}

/** POST /api/assignments — Create a new assignment */
export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (userId instanceof NextResponse) return userId;

  const body = await parseBody(request, createAssignmentSchema);
  if (body instanceof NextResponse) return body;

  try {
    const [assignment] = await db.insert(assignments).values({
      ...body,
      teacherId: userId,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      status: 'draft',
    }).returning();

    return successResponse(assignment, 201);
  } catch (error) {
    console.error('POST /api/assignments error:', error);
    return errorResponse('Failed to create assignment', 500);
  }
}

import { NextResponse } from 'next/server';
import { db } from '@/db';
import { classrooms, students, grades, submissions } from '@/db/schema';
import { eq, sql, count } from 'drizzle-orm';
import { getAuthUserId, errorResponse, successResponse, parseBody } from '@/lib/utils';
import { createClassroomSchema } from '@/lib/validations';

/** GET /api/classrooms — List teacher's classrooms with stats */
export async function GET() {
  const userId = await getAuthUserId();
  if (userId instanceof NextResponse) return userId;

  try {
    const result = await db
      .select({
        id: classrooms.id,
        name: classrooms.name,
        subject: classrooms.subject,
        grade: classrooms.grade,
        color: classrooms.color,
        teacherId: classrooms.teacherId,
        createdAt: classrooms.createdAt,
        updatedAt: classrooms.updatedAt,
        studentCount: sql<number>`(
          SELECT COUNT(*)::int FROM students WHERE students.classroom_id = ${classrooms.id}
        )`,
        avgScore: sql<number | null>`(
          SELECT ROUND(AVG(g.total_score::numeric / g.max_score * 100), 1)
          FROM grades g
          JOIN submissions s ON s.id = g.submission_id
          JOIN assignments a ON a.id = s.assignment_id
          WHERE a.classroom_id = ${classrooms.id}
        )`,
      })
      .from(classrooms)
      .where(eq(classrooms.teacherId, userId))
      .orderBy(sql`${classrooms.createdAt} DESC`);

    return successResponse(result);
  } catch (error) {
    console.error('GET /api/classrooms error:', error);
    return errorResponse('Failed to fetch classrooms', 500);
  }
}

/** POST /api/classrooms — Create a new classroom */
export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (userId instanceof NextResponse) return userId;

  const body = await parseBody(request, createClassroomSchema);
  if (body instanceof NextResponse) return body;

  try {
    const [classroom] = await db.insert(classrooms).values({
      ...body,
      teacherId: userId,
    }).returning();

    return successResponse(classroom, 201);
  } catch (error) {
    console.error('POST /api/classrooms error:', error);
    return errorResponse('Failed to create classroom', 500);
  }
}

import { NextResponse } from 'next/server';
import { db } from '@/db';
import { students, classrooms, submissions, grades } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { getAuthUserId, errorResponse, successResponse, handleApiError, stripHtml } from '@/lib/utils';
import { createStudentSchema, createStudentsBulkSchema } from '@/lib/validations';

type Params = { params: Promise<{ id: string }> };

/** GET /api/classrooms/[id]/students — List students with stats */
export async function GET(_req: Request, { params }: Params) {
  const userId = await getAuthUserId();
  if (userId instanceof NextResponse) return userId;

  const { id } = await params;

  try {
    // Verify ownership
    const classroom = await db.query.classrooms.findFirst({
      where: and(eq(classrooms.id, id), eq(classrooms.teacherId, userId)),
    });
    if (!classroom) return errorResponse('Classroom not found', 404);

    const result = await db
      .select({
        id: students.id,
        classroomId: students.classroomId,
        name: students.name,
        rollNumber: students.rollNumber,
        email: students.email,
        parentPhone: students.parentPhone,
        createdAt: students.createdAt,
        submissionCount: sql<number>`(
          SELECT COUNT(*)::int FROM submissions WHERE submissions.student_id = students.id
        )`,
        avgScore: sql<number | null>`(
          SELECT ROUND(AVG(g.total_score::numeric / g.max_score * 100), 1)
          FROM grades g
          JOIN submissions s ON s.id = g.submission_id
          WHERE s.student_id = students.id
        )`,
      })
      .from(students)
      .where(eq(students.classroomId, id))
      .orderBy(students.rollNumber);

    return successResponse(result);
  } catch (error) {
    return handleApiError(error, 'GET /api/classrooms/[id]/students');
  }
}

/** POST /api/classrooms/[id]/students — Add students (single or bulk) */
export async function POST(request: Request, { params }: Params) {
  const userId = await getAuthUserId();
  if (userId instanceof NextResponse) return userId;

  const { id } = await params;

  // Verify ownership before touching the body.
  const classroom = await db.query.classrooms.findFirst({
    where: and(eq(classrooms.id, id), eq(classrooms.teacherId, userId)),
  });
  if (!classroom) return errorResponse('Classroom not found', 404);

  // Parse + validate (supports { student }, { students: [] }, or a bare object).
  // Validation failures return 400; only DB failures fall through to 500.
  let studentList: Array<{ name: string; rollNumber: string; email?: string | null; parentPhone?: string | null }>;
  try {
    const rawBody = await request.json();
    if (rawBody.students && Array.isArray(rawBody.students)) {
      studentList = createStudentsBulkSchema.parse(rawBody).students;
    } else if (rawBody.student) {
      studentList = [createStudentSchema.parse(rawBody.student)];
    } else {
      studentList = [createStudentSchema.parse(rawBody)];
    }
  } catch {
    return errorResponse('Invalid student data', 400, 'VALIDATION');
  }

  try {
    const inserted = await db.insert(students).values(
      studentList.map((s) => ({
        classroomId: id,
        name: stripHtml(s.name),
        rollNumber: stripHtml(s.rollNumber),
        email: s.email ?? null,
        parentPhone: s.parentPhone ?? null,
      }))
    ).returning();

    return successResponse(inserted, 201);
  } catch (error) {
    return handleApiError(error, 'POST /api/classrooms/[id]/students');
  }
}

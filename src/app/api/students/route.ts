import { NextResponse } from 'next/server';
import { db } from '@/db';
import { students, classrooms } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getAuthUserId, errorResponse, successResponse } from '@/lib/utils';

export const dynamic = 'force-dynamic';

/** GET /api/students — List all students across all classrooms for the teacher */
export async function GET() {
  const userId = await getAuthUserId();
  if (userId instanceof NextResponse) return userId;

  try {
    const result = await db
      .select({
        id: students.id,
        name: students.name,
        rollNumber: students.rollNumber,
        classroomId: students.classroomId,
        classroomName: classrooms.name,
        classroomGrade: classrooms.grade,
        classroomSubject: classrooms.subject,
      })
      .from(students)
      .innerJoin(classrooms, eq(students.classroomId, classrooms.id))
      .where(eq(classrooms.teacherId, userId));

    return successResponse(result);
  } catch (error) {
    console.error('GET /api/students error:', error);
    return errorResponse('Failed to fetch students', 500);
  }
}

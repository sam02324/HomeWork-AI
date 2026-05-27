import { NextResponse } from 'next/server';
import { db } from '@/db';
import { students, classrooms, submissions, grades, assignments } from '@/db/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { getAuthUserId, errorResponse, successResponse } from '@/lib/utils';

type Params = { params: Promise<{ id: string }> };

/** GET /api/analytics/student/[id] — Student performance analytics */
export async function GET(_req: Request, { params }: Params) {
  const userId = await getAuthUserId();
  if (userId instanceof NextResponse) return userId;

  const { id } = await params;

  try {
    // Get student with classroom
    const student = await db.query.students.findFirst({
      where: eq(students.id, id),
      with: { classroom: true },
    });

    if (!student) return errorResponse('Student not found', 404);

    // Verify teacher owns the classroom
    if (student.classroom.teacherId !== userId) {
      return errorResponse('Not authorized', 403);
    }

    // Get all grades for this student with assignment info
    const studentGrades = await db
      .select({
        totalScore: grades.totalScore,
        maxScore: grades.maxScore,
        gradeLetter: grades.gradeLetter,
        gradedAt: grades.gradedAt,
        assignmentTitle: assignments.title,
        assignmentSubject: assignments.subject,
        feedback: grades.feedback,
        strengths: grades.strengths,
        improvements: grades.improvements,
        criteriaScores: grades.criteriaScores,
      })
      .from(grades)
      .innerJoin(submissions, eq(grades.submissionId, submissions.id))
      .innerJoin(assignments, eq(submissions.assignmentId, assignments.id))
      .where(eq(submissions.studentId, id))
      .orderBy(desc(grades.gradedAt));

    // Calculate average score
    const avgScore = studentGrades.length > 0
      ? Math.round(
          studentGrades.reduce(
            (sum, g) => sum + (Number(g.totalScore) / g.maxScore) * 100,
            0
          ) / studentGrades.length * 10
        ) / 10
      : 0;

    // Total submissions
    const [subStats] = await db
      .select({ total: sql<number>`COUNT(*)::int` })
      .from(submissions)
      .where(eq(submissions.studentId, id));

    // Score trend (last 10)
    const scoreTrend = studentGrades.slice(0, 10).reverse().map((g) => ({
      date: g.gradedAt?.toISOString().split('T')[0] || '',
      score: Math.round((Number(g.totalScore) / g.maxScore) * 100),
      assignmentTitle: g.assignmentTitle,
    }));

    return successResponse({
      student: {
        ...student,
        classroom: {
          name: student.classroom.name,
          subject: student.classroom.subject,
        },
      },
      avgScore,
      totalSubmissions: subStats?.total || 0,
      scoreTrend,
      grades: studentGrades.map((g) => ({
        ...g,
        percentage: Math.round((Number(g.totalScore) / g.maxScore) * 100),
      })),
    });
  } catch (error) {
    console.error('GET /api/analytics/student/[id] error:', error);
    return errorResponse('Failed to fetch student analytics', 500);
  }
}

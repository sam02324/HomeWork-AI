import { NextResponse } from 'next/server';
import { db } from '@/db';
import { classrooms, students, assignments, submissions, grades } from '@/db/schema';
import { eq, and, sql, gte, isNull } from 'drizzle-orm';
import { getAuthUserId, errorResponse, successResponse } from '@/lib/utils';

export const dynamic = 'force-dynamic';

/** GET /api/analytics/dashboard — Teacher dashboard stats */
export async function GET() {
  const userId = await getAuthUserId();
  if (userId instanceof NextResponse) return userId;

  try {
    // Total students across all classrooms
    const [studentStats] = await db
      .select({ total: sql<number>`COUNT(*)::int` })
      .from(students)
      .innerJoin(classrooms, eq(students.classroomId, classrooms.id))
      .where(eq(classrooms.teacherId, userId));

    // Total assignments
    const [assignmentStats] = await db
      .select({ total: sql<number>`COUNT(*)::int` })
      .from(assignments)
      .where(eq(assignments.teacherId, userId));

    // Pending gradings
    const [pendingStats] = await db
      .select({ total: sql<number>`COUNT(*)::int` })
      .from(submissions)
      .innerJoin(assignments, eq(submissions.assignmentId, assignments.id))
      .where(and(
        eq(assignments.teacherId, userId),
        eq(submissions.status, 'pending'),
        isNull(submissions.removedAt)
      ));

    // Average score
    const [scoreStats] = await db
      .select({
        avgScore: sql<number | null>`ROUND(AVG(${grades.totalScore}::numeric / ${grades.maxScore} * 100), 1)`,
      })
      .from(grades)
      .innerJoin(submissions, eq(grades.submissionId, submissions.id))
      .innerJoin(assignments, eq(submissions.assignmentId, assignments.id))
      .where(and(eq(assignments.teacherId, userId), isNull(submissions.removedAt)));

    // Graded this week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const [weekStats] = await db
      .select({ total: sql<number>`COUNT(*)::int` })
      .from(grades)
      .innerJoin(submissions, eq(grades.submissionId, submissions.id))
      .innerJoin(assignments, eq(submissions.assignmentId, assignments.id))
      .where(and(
        eq(assignments.teacherId, userId),
        gte(grades.gradedAt, oneWeekAgo),
        isNull(submissions.removedAt)
      ));

    const gradedThisWeek = weekStats?.total || 0;

    return successResponse({
      totalStudents: studentStats?.total || 0,
      totalAssignments: assignmentStats?.total || 0,
      pendingGradings: pendingStats?.total || 0,
      avgScore: scoreStats?.avgScore || null,
      gradedThisWeek,
    });
  } catch (error) {
    console.error('GET /api/analytics/dashboard error:', error);
    return errorResponse('Failed to fetch dashboard stats', 500);
  }
}

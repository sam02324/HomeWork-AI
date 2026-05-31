import 'dotenv/config';
import { db } from './src/db';
import { classrooms, students, grades, submissions } from './src/db/schema';
import { eq, sql } from 'drizzle-orm';

async function run() {
  try {
    const userId = 'user_3EJvUo6mdIKbzwnudQJGvHZVs8S';
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
          SELECT COUNT(*)::int FROM students WHERE students.classroom_id = classrooms.id
        )`,
        avgScore: sql<number | null>`(
          SELECT ROUND(AVG(g.total_score::numeric / g.max_score * 100), 1)
          FROM grades g
          JOIN submissions s ON s.id = g.submission_id
          JOIN assignments a ON a.id = s.assignment_id
          WHERE a.classroom_id = classrooms.id
        )`,
      })
      .from(classrooms)
      .where(eq(classrooms.teacherId, userId))
      .orderBy(sql`${classrooms.createdAt} DESC`);

    console.log('Success:', result);
  } catch (err: any) {
    console.error('Error:', err);
  }
}

run();

import 'dotenv/config';
import { db } from './src/db';
import { classrooms, students, grades, submissions } from './src/db/schema';
import { eq, sql } from 'drizzle-orm';

async function run() {
  const userId = 'user_3EJvUo6mdIKbzwnudQJGvHZVs8S';
  const query = db
    .select({
      id: classrooms.id,
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
    .where(eq(classrooms.teacherId, userId));

  console.log('GENERATED SQL:', query.toSQL().sql);
}

run();

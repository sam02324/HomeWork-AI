import { db } from './src/db'; 
import { students } from './src/db/schema'; 
import { eq, sql } from 'drizzle-orm'; 

async function run() { 
  try { 
    const result = await db.select({ 
      id: students.id, 
      submissionCount: sql<number>`(SELECT COUNT(*)::int FROM submissions WHERE submissions.student_id = students.id)`,
      avgScore: sql<number | null>`(SELECT ROUND(AVG(g.total_score::numeric / g.max_score * 100), 1) FROM grades g JOIN submissions s ON s.id = g.submission_id WHERE s.student_id = students.id)`
    }).from(students).where(eq(students.classroomId, 'a9aa3e33-dfeb-4918-a886-397e57cedae9')); 
    console.log(result); 
  } catch(e: any) { 
    console.error('ERROR:', e); 
  } 
  process.exit(0); 
} 
run();

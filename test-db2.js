const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

async function check() {
  const sql = neon(process.env.DATABASE_URL);
  
  try {
    const result = await sql`
      SELECT 
        c.id, c.name,
        (SELECT COUNT(*)::int FROM students WHERE students.classroom_id = c.id) as student_count,
        (
          SELECT ROUND(AVG(g.total_score::numeric / g.max_score * 100), 1)
          FROM grades g
          JOIN submissions s ON s.id = g.submission_id
          JOIN assignments a ON a.id = s.assignment_id
          WHERE a.classroom_id = c.id
        ) as avg_score
      FROM classrooms c
    `;
    console.log('Query successful:', result);
  } catch (err) {
    console.error('Query failed:', err.message);
  }
}

check();

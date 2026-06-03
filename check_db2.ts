import { db } from './src/db';
import { submissions, students } from './src/db/schema';
import { eq } from 'drizzle-orm';

async function run() {
  const assignmentId = 'ed074027-480e-4ac8-b38a-479cb2ae511b';

  const subs = await db.query.submissions.findMany({ where: eq(submissions.assignmentId, assignmentId) });
  const stus = await db.query.students.findMany();
  
  console.log('Students:');
  console.log(JSON.stringify(stus, null, 2));
  
  console.log('\nSubmissions:');
  console.log(JSON.stringify(subs, null, 2));
  
  process.exit(0);
}

run().catch(e => { console.error('FATAL:', e); process.exit(1); });

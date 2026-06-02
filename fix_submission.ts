import { db } from './src/db';
import { submissions, students } from './src/db/schema';
import { eq } from 'drizzle-orm';

async function run() {
  // Delete the broken submission (created with old parser, missing file and wrong roll)
  const subId = 'acb13c5e-ad09-409d-ba23-b9e3fc3ae0ac';
  const studentId = '0cb2b7b0-5162-4177-802c-b89bc1958005';

  console.log('Deleting broken submission:', subId);
  await db.delete(submissions).where(eq(submissions.id, subId));

  // Update the student's roll number to the correct one from the form
  console.log('Updating student roll number to 2511010101');
  await db.update(students).set({ rollNumber: '2511010101' }).where(eq(students.id, studentId));

  console.log('Done! Next sync will re-create the submission with proper file download.');
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });

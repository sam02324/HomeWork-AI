import { db } from './src/db';
import { assignments, submissions, students, googleTokens } from './src/db/schema';
import { eq } from 'drizzle-orm';
import { fetchSheetRows } from './src/lib/google-sheets';

async function run() {
  const assignmentId = 'ed074027-480e-4ac8-b38a-479cb2ae511b';
  
  const assignment = await db.query.assignments.findFirst({
    where: eq(assignments.id, assignmentId),
  });
  
  if (!assignment?.spreadsheetId) {
    console.log('No spreadsheet!');
    process.exit(0);
  }

  const token = await db.query.googleTokens.findFirst({
    where: eq(googleTokens.userId, assignment.teacherId),
  });

  console.log('Fetching sheet rows...');
  const rows = await fetchSheetRows(assignment.spreadsheetId, token ? assignment.teacherId : undefined);
  
  console.log(`Found ${rows.length} rows:`);
  for (const row of rows) {
    console.log(JSON.stringify({
      responseId: row.responseId,
      studentName: row.studentName,
      studentEmail: row.studentEmail,
      rollNumber: row.rollNumber,
      driveFileId: row.driveFileId,
      fileUrl: row.fileUrl,
    }, null, 2));
  }

  // Check existing submissions
  const existingSubs = await db.query.submissions.findMany({
    where: eq(submissions.assignmentId, assignmentId),
  });
  console.log(`\nExisting submissions: ${existingSubs.length}`);
  
  // Check student
  const studentList = await db.query.students.findMany({
    where: eq(students.classroomId, assignment.classroomId),
  });
  console.log('Students:', studentList.map(s => ({ name: s.name, rollNumber: s.rollNumber })));

  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });

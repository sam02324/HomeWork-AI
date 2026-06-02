import { db } from './src/db';
import { assignments, googleTokens, submissions } from './src/db/schema';
import { eq } from 'drizzle-orm';
import { getOAuthClientForUser } from './src/lib/google-sheets';
import { google } from 'googleapis';

async function run() {
  // Get the assignment
  const assignment = await db.query.assignments.findFirst({
    where: eq(assignments.id, 'ed074027-480e-4ac8-b38a-479cb2ae511b'),
  });
  console.log('Assignment:', { id: assignment?.id, title: assignment?.title, spreadsheetId: assignment?.spreadsheetId });

  if (!assignment?.spreadsheetId) {
    console.log('No spreadsheet linked!');
    process.exit(0);
  }

  // Get the token
  const token = await db.query.googleTokens.findFirst({
    where: eq(googleTokens.userId, assignment.teacherId),
  });
  console.log('Token exists:', !!token);
  console.log('Token scopes:', token?.scope);

  // Try to fetch the sheet
  const auth = await getOAuthClientForUser(assignment.teacherId);
  const sheets = google.sheets({ version: 'v4', auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: assignment.spreadsheetId,
    range: 'A:Z',
  });

  const rows = response.data.values;
  console.log('\n=== SHEET DATA ===');
  console.log('Total rows:', rows?.length);
  if (rows && rows.length > 0) {
    console.log('HEADERS (row 0):', JSON.stringify(rows[0]));
    for (let i = 1; i < rows.length; i++) {
      console.log(`ROW ${i}:`, JSON.stringify(rows[i]));
    }
  }

  // Also check what's in submissions table
  const subs = await db.query.submissions.findMany({
    where: eq(submissions.assignmentId, assignment.id),
  });
  console.log('\n=== EXISTING SUBMISSIONS ===');
  for (const s of subs) {
    console.log({
      id: s.id,
      studentId: s.studentId,
      fileUrl: s.fileUrl,
      fileType: s.fileType,
      googleFormResponseId: s.googleFormResponseId,
      googleDriveFileId: s.googleDriveFileId,
    });
  }

  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });

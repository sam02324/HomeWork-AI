import { db } from './src/db';
import { assignments, submissions, students, googleTokens } from './src/db/schema';
import { eq, and, ilike } from 'drizzle-orm';
import { fetchSheetRows, downloadDriveFile } from './src/lib/google-sheets';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

function getR2Client() {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

async function uploadBufferToR2(buffer: Buffer, mimeType: string, originalName: string, teacherId: string): Promise<string> {
  const ext = originalName.split('.').pop() || 'bin';
  const filename = `submissions/${teacherId}/${randomUUID()}.${ext}`;
  const s3 = getR2Client();
  await s3.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: filename,
    Body: buffer,
    ContentType: mimeType,
  }));
  return `${process.env.R2_PUBLIC_URL}/${filename}`;
}

async function run() {
  const assignmentId = 'ed074027-480e-4ac8-b38a-479cb2ae511b';
  
  const assignment = await db.query.assignments.findFirst({
    where: eq(assignments.id, assignmentId),
  });
  
  if (!assignment?.spreadsheetId) {
    console.log('No spreadsheet!');
    process.exit(1);
  }

  console.log('Assignment:', assignment.title);

  // Fetch rows
  const rows = await fetchSheetRows(assignment.spreadsheetId, assignment.teacherId);
  console.log(`Found ${rows.length} rows`);

  // Check existing submissions
  const existingSubs = await db.query.submissions.findMany({
    where: eq(submissions.assignmentId, assignmentId),
    columns: { googleFormResponseId: true },
  });
  const existingIds = new Set(existingSubs.map(s => s.googleFormResponseId).filter(Boolean));
  console.log(`Existing submissions: ${existingSubs.length}`);

  for (const row of rows) {
    console.log(`\nProcessing: ${row.studentName} (roll: ${row.rollNumber})`);
    console.log(`  responseId: ${row.responseId}`);
    console.log(`  driveFileId: ${row.driveFileId}`);
    
    if (existingIds.has(row.responseId)) {
      console.log('  SKIPPED: duplicate');
      continue;
    }

    // Find the student
    const student = await db.query.students.findFirst({
      where: and(
        eq(students.classroomId, assignment.classroomId),
        ilike(students.name, row.studentName)
      ),
    });

    if (!student) {
      console.log('  ERROR: student not found');
      continue;
    }
    console.log(`  Student found: ${student.id}`);

    // Download file
    let fileUrl: string | null = null;
    let fileType: string | null = null;
    if (row.driveFileId) {
      try {
        console.log(`  Downloading file from Drive...`);
        const driveFile = await downloadDriveFile(row.driveFileId, assignment.teacherId);
        console.log(`  Downloaded: ${driveFile.name} (${driveFile.mimeType}, ${driveFile.buffer.length} bytes)`);
        
        console.log(`  Uploading to R2...`);
        fileUrl = await uploadBufferToR2(driveFile.buffer, driveFile.mimeType, driveFile.name, assignment.teacherId);
        fileType = driveFile.mimeType;
        console.log(`  Uploaded: ${fileUrl}`);
      } catch (err: any) {
        console.error(`  FILE DOWNLOAD FAILED:`, err.message);
      }
    }

    // Create submission
    const [sub] = await db.insert(submissions).values({
      assignmentId,
      studentId: student.id,
      fileUrl,
      fileType,
      status: 'pending',
      googleFormResponseId: row.responseId,
      googleDriveFileId: row.driveFileId,
      submittedAt: new Date(row.timestamp),
    }).returning();

    console.log(`  Created submission: ${sub.id} (fileUrl: ${fileUrl ? 'YES' : 'NULL'})`);
  }

  console.log('\nDone!');
  process.exit(0);
}

run().catch(e => { console.error('FATAL:', e); process.exit(1); });

import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/utils';
import { db } from '@/db';
import { assignments, submissions, students, classrooms, googleTokens } from '@/db/schema';
import { eq, and, ilike } from 'drizzle-orm';
import { getOAuthClientForUser, downloadDriveFile, fetchSheetRows } from '@/lib/google-sheets';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { google } from 'googleapis';
import { PDFParse } from 'pdf-parse';

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

async function uploadBufferToR2(
  buffer: Buffer,
  mimeType: string,
  originalName: string,
  teacherId: string
): Promise<string> {
  const ext = originalName.split('.').pop() || 'bin';
  const filename = `submissions/${teacherId}/${randomUUID()}.${ext}`;

  const s3 = getR2Client();
  const bucketName = process.env.R2_BUCKET_NAME || 'gradeai-uploads';
  const publicUrl = process.env.R2_PUBLIC_URL || 'https://pub-e8ac62539691450290f9818cb9c462ff.r2.dev';

  await s3.send(new PutObjectCommand({
    Bucket: bucketName,
    Key: filename,
    Body: buffer,
    ContentType: mimeType,
  }));

  return `${publicUrl}/${filename}`;
}

export async function GET() {
  const userId = await getAuthUserId();
  if (userId instanceof NextResponse) return userId;

  try {
    const tokenRecord = await db.query.googleTokens.findFirst({
      where: eq(googleTokens.userId, userId),
    });

    if (!tokenRecord) {
      return NextResponse.json({ message: 'No Google account connected' }, { status: 400 });
    }

    const auth = await getOAuthClientForUser(userId);
    const drive = google.drive({ version: 'v3', auth });

    // 1. Find recently modified Google Sheets (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    let query = `mimeType='application/vnd.google-apps.spreadsheet' and trashed=false and modifiedTime > '${sevenDaysAgo.toISOString()}'`;
    
    if (tokenRecord.syncFolderId) {
      query += ` and '${tokenRecord.syncFolderId}' in parents`;
    }

    const res = await drive.files.list({
      q: query,
      fields: 'files(id, name, modifiedTime, parents)',
      orderBy: 'modifiedTime desc',
      pageSize: 50,
    });

    const sheets = res.data.files || [];
    if (sheets.length === 0) {
      return NextResponse.json({ message: 'No recent sheets found', synced: 0 });
    }

    let totalSynced = 0;

    // Cache folder names to avoid redundant API calls
    const folderNames = new Map<string, string>();

    for (const sheet of sheets) {
      if (!sheet.id) continue;

      let folderName = 'General Class';
      if (sheet.parents && sheet.parents.length > 0) {
        const parentId = sheet.parents[0];
        if (folderNames.has(parentId)) {
          folderName = folderNames.get(parentId)!;
        } else {
          try {
            const folderRes = await drive.files.get({ fileId: parentId, fields: 'name' });
            folderName = folderRes.data.name || 'General Class';
            folderNames.set(parentId, folderName);
          } catch (e) {
            console.error(`Failed to get folder name for ${parentId}`, e);
          }
        }
      }

      const formTitle = sheet.name || 'Untitled Assignment';

      // 2. Find or Create Classroom
      let classroom = await db.query.classrooms.findFirst({
        where: and(
          eq(classrooms.teacherId, userId),
          ilike(classrooms.name, folderName)
        ),
      });

      if (!classroom) {
        [classroom] = await db.insert(classrooms).values({
          teacherId: userId,
          name: folderName,
          subject: 'General',
          grade: 'Auto-created',
        }).returning();
      }

      // 3. Find or Create Assignment
      let assignment = await db.query.assignments.findFirst({
        where: and(
          eq(assignments.classroomId, classroom.id),
          ilike(assignments.title, formTitle)
        ),
      });

      if (!assignment) {
        [assignment] = await db.insert(assignments).values({
          classroomId: classroom.id,
          teacherId: userId,
          title: formTitle,
          subject: classroom.subject,
          spreadsheetId: sheet.id,
          status: 'published',
        }).returning();
      } else if (!assignment.spreadsheetId) {
        await db.update(assignments)
          .set({ spreadsheetId: sheet.id })
          .where(eq(assignments.id, assignment.id));
      }

      // 4. Sync Rows
      let rows;
      try {
        rows = await fetchSheetRows(sheet.id, userId);
      } catch (e) {
        console.error(`Failed to fetch rows for sheet ${sheet.id}`, e);
        continue;
      }

      if (rows.length === 0) continue;

      const existingSubs = await db.query.submissions.findMany({
        where: eq(submissions.assignmentId, assignment.id),
        columns: { googleFormResponseId: true },
      });
      const existingIds = new Set(existingSubs.map(s => s.googleFormResponseId));

      for (const row of rows) {
        if (existingIds.has(row.responseId)) continue;

        // Find or Create Student
        let studentId: string | null = null;
        if (row.rollNumber) {
          const s = await db.query.students.findFirst({
            where: and(eq(students.classroomId, classroom.id), eq(students.rollNumber, row.rollNumber)),
          });
          if (s) {
            if (!s.email && row.studentEmail) {
              await db.update(students).set({ email: row.studentEmail }).where(eq(students.id, s.id));
            }
            studentId = s.id;
          }
        }
        if (!studentId && row.studentName) {
          const s = await db.query.students.findFirst({
            where: and(eq(students.classroomId, classroom.id), ilike(students.name, row.studentName)),
          });
          if (s) {
            if (row.rollNumber && !s.rollNumber) {
              await db.update(students).set({ rollNumber: row.rollNumber }).where(eq(students.id, s.id));
            }
            studentId = s.id;
          }
        }
        
        if (!studentId) {
          const allStudents = await db.query.students.findMany({
            where: eq(students.classroomId, classroom.id),
            columns: { rollNumber: true },
          });
          const maxRoll = allStudents.reduce((max, st) => {
            const n = parseInt(st.rollNumber, 10);
            return isNaN(n) ? max : Math.max(max, n);
          }, 0);
          
          const finalRollNumber = row.rollNumber ?? String(maxRoll + 1);
          
          const [newStudent] = await db.insert(students).values({
            classroomId: classroom.id,
            name: row.studentName || 'Unknown Student',
            email: row.studentEmail || null,
            rollNumber: finalRollNumber,
          }).returning();
          studentId = newStudent.id;
        }

        // Download file if exists
        let fileUrl: string | null = row.fileUrl || null;
        let fileType: string | null = null;
        let textContent: string | null = null;

        if (row.driveFileId) {
          try {
            const driveFile = await downloadDriveFile(row.driveFileId, userId);
            fileType = driveFile.mimeType;

            if (fileType === 'application/pdf') {
              try {
                const parser = new PDFParse({ data: new Uint8Array(driveFile.buffer) });
                const pdfData = await parser.getText();
                textContent = pdfData.text;
              } catch (e) {
                console.error(`PDF parse error for ${row.driveFileId}`, e);
              }
            }

            try {
              fileUrl = await uploadBufferToR2(
                driveFile.buffer,
                driveFile.mimeType,
                driveFile.name,
                userId
              );
            } catch (r2Err) {
              console.warn(`Skipping R2 upload (using Drive URL fallback) due to:`, (r2Err as Error).message);
            }

          } catch (fileErr) {
            console.error(`Sync-All: Failed to download Drive file ${row.driveFileId}:`, fileErr);
          }
        }

        let submittedAt = new Date();
        if (row.timestamp) {
          const parsed = new Date(row.timestamp);
          if (!isNaN(parsed.getTime())) submittedAt = parsed;
        }

        // Create submission
        await db.insert(submissions).values({
          assignmentId: assignment.id,
          studentId: studentId!,
          fileUrl,
          fileType,
          textContent,
          status: 'pending',
          googleFormResponseId: row.responseId,
          googleDriveFileId: row.driveFileId,
          submittedAt,
        });

        totalSynced++;
      }
    }

    return NextResponse.json({ success: true, synced: totalSynced });

  } catch (error) {
    console.error('Sync-All error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

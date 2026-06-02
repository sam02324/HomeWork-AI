import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { db } from '@/db';
import { assignments, submissions, students, classrooms, users, googleTokens } from '@/db/schema';
import { eq, and, ilike } from 'drizzle-orm';
import { downloadDriveFile } from '@/lib/google-sheets';
import { randomUUID } from 'crypto';

interface WebhookPayload {
  secret: string;
  teacherEmail: string;
  folderName: string;
  formTitle: string;
  spreadsheetId: string;
  responses: Array<{
    responseId: string;
    studentName: string;
    studentEmail: string;
    driveFileId: string | null;
    timestamp: string;
  }>;
}

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
  await s3.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: filename,
    Body: buffer,
    ContentType: mimeType,
  }));

  return `${process.env.R2_PUBLIC_URL}/${filename}`;
}

export async function POST(request: Request) {
  try {
    const payload: WebhookPayload = await request.json();

    // 1. Validate Secret
    if (!payload.secret || payload.secret !== process.env.WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Find Teacher by Email
    const teacher = await db.query.users.findFirst({
      where: ilike(users.email, payload.teacherEmail),
    });

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    const teacherId = teacher.id;

    // 3. Find or Create Classroom by folderName
    let classroom = await db.query.classrooms.findFirst({
      where: and(
        eq(classrooms.teacherId, teacherId),
        ilike(classrooms.name, payload.folderName || 'General Class')
      ),
    });

    if (!classroom) {
      [classroom] = await db.insert(classrooms).values({
        teacherId,
        name: payload.folderName || 'General Class',
        subject: 'General',
        grade: 'Auto-created',
      }).returning();
    }

    // 4. Find or Create Assignment by formTitle
    let assignment = await db.query.assignments.findFirst({
      where: and(
        eq(assignments.classroomId, classroom.id),
        ilike(assignments.title, payload.formTitle || 'Untitled Assignment')
      ),
    });

    if (!assignment) {
      [assignment] = await db.insert(assignments).values({
        classroomId: classroom.id,
        teacherId,
        title: payload.formTitle || 'Untitled Assignment',
        subject: classroom.subject,
        spreadsheetId: payload.spreadsheetId,
        status: 'published',
      }).returning();
    } else if (!assignment.spreadsheetId && payload.spreadsheetId) {
      // Update spreadsheet ID if it was missing
      await db.update(assignments)
        .set({ spreadsheetId: payload.spreadsheetId })
        .where(eq(assignments.id, assignment.id));
    }

    // 5. Process Responses
    let synced = 0;
    const existingSubs = await db.query.submissions.findMany({
      where: eq(submissions.assignmentId, assignment.id),
      columns: { googleFormResponseId: true },
    });
    const existingIds = new Set(existingSubs.map(s => s.googleFormResponseId));

    for (const row of payload.responses) {
      if (existingIds.has(row.responseId)) continue;

      // Find or Create Student
      let studentId: string | null = null;
      if (row.studentEmail) {
        const s = await db.query.students.findFirst({
          where: and(eq(students.classroomId, classroom.id), ilike(students.email, row.studentEmail)),
        });
        if (s) studentId = s.id;
      }
      if (!studentId) {
        const s = await db.query.students.findFirst({
          where: and(eq(students.classroomId, classroom.id), ilike(students.name, row.studentName)),
        });
        if (s) studentId = s.id;
      }
      
      if (!studentId) {
        const allStudents = await db.query.students.findMany({
          where: eq(students.classroomId, classroom.id),
          columns: { rollNumber: true },
        });
        const maxRoll = allStudents.reduce((max, st) => Math.max(max, st.rollNumber), 0);
        
        const [newStudent] = await db.insert(students).values({
          classroomId: classroom.id,
          name: row.studentName || 'Unknown Student',
          email: row.studentEmail || null,
          rollNumber: maxRoll + 1,
        }).returning();
        studentId = newStudent.id;
      }

      // Download file if exists
      let fileUrl: string | null = null;
      let fileType: string | null = null;

      if (row.driveFileId) {
        try {
          const driveFile = await downloadDriveFile(row.driveFileId, teacherId);
          fileUrl = await uploadBufferToR2(driveFile.buffer, driveFile.mimeType, driveFile.name, teacherId);
          fileType = driveFile.mimeType;
        } catch (err) {
          console.error(`Webhook: Failed to download Drive file ${row.driveFileId}:`, err);
        }
      }

      let submittedAt = new Date();
      if (row.timestamp) {
        const parsed = new Date(row.timestamp);
        if (!isNaN(parsed.getTime())) submittedAt = parsed;
      }

      // Create Submission
      await db.insert(submissions).values({
        assignmentId: assignment.id,
        studentId,
        fileUrl,
        fileType,
        status: 'pending',
        googleFormResponseId: row.responseId,
        googleDriveFileId: row.driveFileId,
        submittedAt,
      });

      synced++;
    }

    return NextResponse.json({ success: true, synced, classroom: classroom.name, assignment: assignment.title });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

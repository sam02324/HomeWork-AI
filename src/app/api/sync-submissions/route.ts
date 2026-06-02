/**
 * POST /api/sync-submissions
 *
 * Syncs student submissions from a Google Form-linked Google Sheet
 * into the database. Handles:
 *   - Reading rows from the Sheet
 *   - Deduplicating (skips already-synced rows)
 *   - Matching students by email → name (auto-creates if not found)
 *   - Downloading files from Google Drive → uploading to R2
 *   - Creating submission records with status 'pending'
 */

import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { db } from '@/db';
import { assignments, submissions, students, classrooms, googleTokens } from '@/db/schema';
import { eq, and, or, ilike } from 'drizzle-orm';
import { getAuthUserId, errorResponse, successResponse } from '@/lib/utils';
import { fetchSheetRows, downloadDriveFile } from '@/lib/google-sheets';
import type { FormResponse } from '@/lib/google-sheets';
import { randomUUID } from 'crypto';

/* ═══════════════════════════════════════
   R2 Upload Helper (reuse from upload route)
   ═══════════════════════════════════════ */

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

/* ═══════════════════════════════════════
   Student Matching / Auto-creation
   ═══════════════════════════════════════ */

/**
 * Finds a student by email (exact, case-insensitive) or name (case-insensitive)
 * within a specific classroom. If not found, auto-creates the student.
 */
async function findOrCreateStudent(
  classroomId: string,
  name: string,
  email: string
): Promise<string> {
  // 1. Try to match by email first (most reliable)
  if (email) {
    const byEmail = await db.query.students.findFirst({
      where: and(
        eq(students.classroomId, classroomId),
        ilike(students.email, email)
      ),
    });
    if (byEmail) return byEmail.id;
  }

  // 2. Try to match by name (case-insensitive)
  const byName = await db.query.students.findFirst({
    where: and(
      eq(students.classroomId, classroomId),
      ilike(students.name, name)
    ),
  });
  if (byName) return byName.id;

  // 3. Auto-create the student
  // Determine the next roll number
  const existingStudents = await db.query.students.findMany({
    where: eq(students.classroomId, classroomId),
    columns: { rollNumber: true },
  });

  const maxRoll = existingStudents.reduce(
    (max, s) => Math.max(max, s.rollNumber),
    0
  );

  const [newStudent] = await db.insert(students).values({
    classroomId,
    name: name,
    email: email || null,
    rollNumber: maxRoll + 1,
  }).returning();

  return newStudent.id;
}

/* ═══════════════════════════════════════
   Main Sync Handler
   ═══════════════════════════════════════ */

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (userId instanceof NextResponse) return userId;

  // Parse request body
  let body: { assignmentId: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  if (!body.assignmentId) {
    return errorResponse('assignmentId is required', 400);
  }

  try {
    // 1. Verify the assignment exists and belongs to this teacher
    const assignment = await db.query.assignments.findFirst({
      where: and(
        eq(assignments.id, body.assignmentId),
        eq(assignments.teacherId, userId)
      ),
      with: {
        classroom: true,
      },
    });

    if (!assignment) {
      return errorResponse('Assignment not found', 404);
    }

    if (!assignment.spreadsheetId) {
      return errorResponse(
        'No Google Spreadsheet linked to this assignment. ' +
        'Edit the assignment and add a Spreadsheet ID first.',
        400
      );
    }

    // 2. Fetch all rows from the linked Google Sheet
    // Check if user has OAuth tokens
    const tokenRecord = await db.query.googleTokens.findFirst({
      where: eq(googleTokens.userId, userId),
    });
    const oauthUserId = tokenRecord ? userId : undefined;

    let rows: FormResponse[];
    try {
      rows = await fetchSheetRows(assignment.spreadsheetId, oauthUserId);
    } catch (err) {
      console.error('Failed to fetch Google Sheet:', err);
      return errorResponse(
        'Failed to read Google Sheet. Make sure the Spreadsheet ID is correct ' +
        'and the service account has access.',
        502
      );
    }

    if (rows.length === 0) {
      return successResponse({
        synced: 0,
        skipped: 0,
        autoCreated: 0,
        errors: [],
        message: 'No responses found in the Google Sheet.',
      });
    }

    // 3. Get all existing googleFormResponseIds to skip duplicates
    const existingSubs = await db.query.submissions.findMany({
      where: eq(submissions.assignmentId, body.assignmentId),
      columns: { googleFormResponseId: true },
    });

    const existingIds = new Set(
      existingSubs
        .map(s => s.googleFormResponseId)
        .filter((id): id is string => id !== null)
    );

    // 4. Process each row
    let synced = 0;
    let skipped = 0;
    let autoCreated = 0;
    const errors: string[] = [];

    for (const row of rows) {
      try {
        // Skip duplicates
        if (existingIds.has(row.responseId)) {
          skipped++;
          continue;
        }

        // Find or create the student
        const studentCountBefore = await db.query.students.findMany({
          where: eq(students.classroomId, assignment.classroomId),
          columns: { id: true },
        });

        const studentId = await findOrCreateStudent(
          assignment.classroomId,
          row.studentName,
          row.studentEmail
        );

        const studentCountAfter = await db.query.students.findMany({
          where: eq(students.classroomId, assignment.classroomId),
          columns: { id: true },
        });

        if (studentCountAfter.length > studentCountBefore.length) {
          autoCreated++;
        }

        // Download file from Drive and upload to R2 (if file exists)
        let fileUrl: string | null = null;
        let fileType: string | null = null;

        if (row.driveFileId) {
          try {
            const driveFile = await downloadDriveFile(row.driveFileId, oauthUserId);
            fileUrl = await uploadBufferToR2(
              driveFile.buffer,
              driveFile.mimeType,
              driveFile.name,
              userId
            );
            fileType = driveFile.mimeType;
          } catch (fileErr) {
            console.error(`Failed to download Drive file ${row.driveFileId}:`, fileErr);
            errors.push(
              `Could not download file for ${row.studentName}: ` +
              `${fileErr instanceof Error ? fileErr.message : 'Unknown error'}`
            );
            // Continue without file — submission still created
          }
        }

        // Parse the timestamp from Google Sheets format
        let submittedAt: Date;
        try {
          submittedAt = new Date(row.timestamp);
          if (isNaN(submittedAt.getTime())) {
            submittedAt = new Date(); // Fallback to now
          }
        } catch {
          submittedAt = new Date();
        }

        // Create the submission
        await db.insert(submissions).values({
          assignmentId: body.assignmentId,
          studentId,
          fileUrl,
          fileType,
          status: 'pending',
          googleFormResponseId: row.responseId,
          googleDriveFileId: row.driveFileId,
          submittedAt,
        });

        synced++;
      } catch (rowErr) {
        console.error(`Error processing row for ${row.studentName}:`, rowErr);
        errors.push(
          `Failed to process submission from ${row.studentName}: ` +
          `${rowErr instanceof Error ? rowErr.message : 'Unknown error'}`
        );
      }
    }

    // 5. Update assignment status if it was in 'draft' and we synced some
    if (synced > 0 && assignment.status === 'draft') {
      await db.update(assignments)
        .set({ status: 'published', updatedAt: new Date() })
        .where(eq(assignments.id, body.assignmentId));
    }

    return successResponse({
      synced,
      skipped,
      autoCreated,
      errors,
      message: `Synced ${synced} new submission${synced !== 1 ? 's' : ''}. ` +
        `${skipped} duplicate${skipped !== 1 ? 's' : ''} skipped. ` +
        (autoCreated > 0 ? `${autoCreated} new student${autoCreated !== 1 ? 's' : ''} auto-created.` : ''),
    });

  } catch (error) {
    console.error('POST /api/sync-submissions error:', error);
    return errorResponse('Sync failed: ' + (error instanceof Error ? error.message : 'Unknown error'), 500);
  }
}

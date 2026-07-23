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
import { db } from '@/db';
import { assignments, submissions, students } from '@/db/schema';
import { eq, and, ilike } from 'drizzle-orm';
import { getAuthUserId, errorResponse, successResponse, handleApiError, rateLimitGuard, parseBody } from '@/lib/utils';
import { syncSubmissionsSchema } from '@/lib/validations';
import { fetchSheetRows, downloadDriveFile, GoogleConnectionError } from '@/lib/google-sheets';
import type { FormResponse } from '@/lib/google-sheets';
import { PDFParse } from 'pdf-parse';
import { uploadSubmissionBuffer } from '@/lib/storage/r2';
import {
  captureOperationalError,
  getOperationalErrorCode,
  recordSystemEvent,
} from '@/lib/operations/system-events';

async function uploadBufferToR2(
  buffer: Buffer,
  mimeType: string,
  originalName: string,
  teacherId: string
): Promise<string> {
  return uploadSubmissionBuffer({
    buffer,
    mimeType,
    originalName,
    ownerId: teacherId,
  });
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
  email: string,
  providedRollNumber?: string
): Promise<string> {
  // 1. Try to match by rollNumber first (most reliable identifier if provided)
  if (providedRollNumber) {
    const byRoll = await db.query.students.findFirst({
      where: and(
        eq(students.classroomId, classroomId),
        eq(students.rollNumber, providedRollNumber)
      ),
    });
    if (byRoll) {
      if (!byRoll.email && email) {
        await db.update(students).set({ email }).where(eq(students.id, byRoll.id));
      }
      return byRoll.id;
    }
  }

  // 2. Try to match by name (case-insensitive)
  const byName = await db.query.students.findFirst({
    where: and(
      eq(students.classroomId, classroomId),
      ilike(students.name, name)
    ),
  });
  if (byName) {
    if (providedRollNumber && !byName.rollNumber) {
      await db.update(students).set({ rollNumber: providedRollNumber }).where(eq(students.id, byName.id));
    }
    return byName.id;
  }

  // 3. Auto-create the student
  // Determine the next roll number
  const existingStudents = await db.query.students.findMany({
    where: eq(students.classroomId, classroomId),
    columns: { rollNumber: true },
  });

  const maxRoll = existingStudents.reduce(
    (max, s) => {
      const n = parseInt(s.rollNumber, 10);
      return isNaN(n) ? max : Math.max(max, n);
    },
    0
  );

  const finalRollNumber = providedRollNumber ?? String(maxRoll + 1);

  const [newStudent] = await db.insert(students).values({
    classroomId,
    name: name,
    email: email || null,
    rollNumber: finalRollNumber,
  }).returning();

  return newStudent.id;
}

/* ═══════════════════════════════════════
   Main Sync Handler
   ═══════════════════════════════════════ */

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (userId instanceof NextResponse) return userId;

  // Throttle sync (hits Google APIs + R2): 10 per minute per user.
  const limited = rateLimitGuard(`sync:${userId}`, 10, 60_000);
  if (limited) return limited;

  const body = await parseBody(request, syncSubmissionsSchema);
  if (body instanceof NextResponse) return body;

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

    // 2. Fetch rows using only this teacher's OAuth connection.
    let rows: FormResponse[];
    try {
      rows = await fetchSheetRows(assignment.spreadsheetId, userId);
    } catch (err) {
      console.error('Failed to fetch Google Sheet:', err);
      if (err instanceof GoogleConnectionError) {
        return errorResponse(err.message, 401, err.code);
      }
      return errorResponse(
        'Failed to read Google Sheet. Confirm the connected Google account can open it.',
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

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        // We intentionally find/create the student before the duplicate check
        // so that student records (like roll numbers) can self-heal/update 
        // even if the submission is already synced.

        // Find or create the student
        const studentCountBefore = await db.query.students.findMany({
          where: eq(students.classroomId, assignment.classroomId),
          columns: { id: true },
        });

        const studentId = await findOrCreateStudent(
          assignment.classroomId,
          row.studentName,
          row.studentEmail,
          row.rollNumber
        );

        const studentCountAfter = await db.query.students.findMany({
          where: eq(students.classroomId, assignment.classroomId),
          columns: { id: true },
        });

        if (studentCountAfter.length > studentCountBefore.length) {
          autoCreated++;
        }

        // Now we can safely skip the submission processing if it's a duplicate
        if (existingIds.has(row.responseId)) {
          skipped++;
          continue;
        }

        // Download file from Drive and upload to R2 (if file exists)
        let fileUrl: string | null = row.fileUrl || null;
        let fileType: string | null = null;
        let textContent: string | null = null;

        if (row.driveFileId) {
          try {
            const driveFile = await downloadDriveFile(row.driveFileId, userId);
            fileType = driveFile.mimeType;

            // Extract text if it's a PDF
            if (fileType === 'application/pdf') {
              try {
                const parser = new PDFParse({ data: new Uint8Array(driveFile.buffer) });
                const pdfData = await parser.getText();
                textContent = pdfData.text;
              } catch (pdfErr) {
                console.error(`Failed to parse PDF for ${row.driveFileId}:`, pdfErr);
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
            // SEC-11: log details server-side; client message stays generic.
            console.error(`Failed to download Drive file ${row.driveFileId}:`, fileErr);
            errors.push(`Failed to download file for row ${i + 1}`);
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
          textContent,
          status: 'pending',
          googleFormResponseId: row.responseId,
          googleDriveFileId: row.driveFileId,
          submittedAt,
        });

        synced++;
      } catch (rowErr) {
        // SEC-11: log details server-side; surface only a row number to the client.
        console.error(`Error processing row ${i + 1}:`, rowErr);
        errors.push(`Failed to process row ${i + 1}`);
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
      message: `Sync successful! ${synced} new submission${synced !== 1 ? 's' : ''} added.` +
        (autoCreated > 0 ? ` ${autoCreated} new student${autoCreated !== 1 ? 's' : ''} auto-created.` : ''),
    });

  } catch (error) {
    const code = getOperationalErrorCode(error);
    captureOperationalError(error, {
      category: 'sync',
      code,
      entityType: 'assignment',
      entityId: body.assignmentId,
    });
    await recordSystemEvent({
      category: 'sync',
      severity: 'error',
      code,
      message: 'Google Sheet submission synchronization failed.',
      userId,
      entityType: 'assignment',
      entityId: body.assignmentId,
    });
    return handleApiError(error, 'POST /api/sync-submissions');
  }
}

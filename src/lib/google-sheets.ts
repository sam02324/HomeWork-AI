/**
 * Google Sheets + Drive integration for syncing Google Form responses.
 *
 * Flow:
 *   1. Teacher creates a Google Form linked to a Google Sheet.
 *   2. Students submit homework via the form (including file uploads).
 *   3. Teacher clicks "Sync from Google Forms" in the app.
 *   4. This module reads rows from the Sheet, downloads files from Drive,
 *      and returns structured data for the sync API to process.
 */

import { google } from 'googleapis';
import type { JWT } from 'googleapis-common';

/* ═══════════════════════════════════════
   Types
   ═══════════════════════════════════════ */

/** A single parsed response row from the Google Sheet */
export interface FormResponse {
  /** Unique dedup key: hash of timestamp + email */
  responseId: string;
  /** ISO timestamp of when the form was submitted */
  timestamp: string;
  /** Student's name as entered in the form */
  studentName: string;
  /** Student's email as entered in the form */
  studentEmail: string;
  /** Class/Subject value from the dropdown */
  classSubject: string;
  /** Google Drive URL for the uploaded file (if any) */
  fileUrl: string | null;
  /** Extracted Google Drive file ID (if any) */
  driveFileId: string | null;
  /** The raw row values for debugging */
  rawRow: string[];
}

/** Result of downloading a file from Google Drive */
export interface DriveFile {
  /** The file content as a Buffer */
  buffer: Buffer;
  /** MIME type of the file */
  mimeType: string;
  /** Original filename */
  name: string;
}

/* ═══════════════════════════════════════
   Auth
   ═══════════════════════════════════════ */

/**
 * Creates a Google JWT auth client from the service account key
 * stored in the GOOGLE_SERVICE_ACCOUNT_KEY environment variable.
 *
 * The env var should contain the full JSON key as a string.
 */
function getGoogleAuth(): JWT {
  const keyEnv = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

  if (!keyEnv) {
    throw new Error(
      'Missing GOOGLE_SERVICE_ACCOUNT_KEY environment variable. ' +
      'Set it to the full JSON content of your service account key file.'
    );
  }

  let credentials: {
    client_email: string;
    private_key: string;
    project_id?: string;
  };

  try {
    credentials = JSON.parse(keyEnv);
  } catch {
    throw new Error(
      'GOOGLE_SERVICE_ACCOUNT_KEY is not valid JSON. ' +
      'Make sure you pasted the entire JSON key file content.'
    );
  }

  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets.readonly',
      'https://www.googleapis.com/auth/drive.readonly',
    ],
  });

  return auth;
}

/* ═══════════════════════════════════════
   Google Sheets — Fetch Rows
   ═══════════════════════════════════════ */

/**
 * Fetches all response rows from a Google Sheet linked to a Google Form.
 *
 * Assumes the standard Google Forms → Sheets layout:
 *   Column A: Timestamp
 *   Column B: Student Name
 *   Column C: Student Email
 *   Column D: Class/Subject (dropdown)
 *   Column E: Assignment File (file upload → Drive URL)
 *
 * @param spreadsheetId - The Google Spreadsheet ID (from the Sheet URL)
 * @returns Array of parsed FormResponse objects (excludes header row)
 */
export async function fetchSheetRows(
  spreadsheetId: string
): Promise<FormResponse[]> {
  const auth = getGoogleAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  // Fetch the entire first sheet
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'A:Z', // Fetch all columns — we'll pick what we need
  });

  const rows = response.data.values;
  if (!rows || rows.length <= 1) {
    // No data rows (only header or empty sheet)
    return [];
  }

  // Skip header row (index 0), parse each data row
  const dataRows = rows.slice(1);

  return dataRows
    .map((row): FormResponse | null => {
      const timestamp = (row[0] || '').trim();
      const studentName = (row[1] || '').trim();
      const studentEmail = (row[2] || '').trim();
      const classSubject = (row[3] || '').trim();
      const fileUrl = (row[4] || '').trim() || null;

      // Skip rows missing essential data
      if (!timestamp || !studentName) {
        return null;
      }

      // Generate a unique dedup key from timestamp + email
      const responseId = generateResponseId(timestamp, studentEmail || studentName);

      return {
        responseId,
        timestamp,
        studentName,
        studentEmail,
        classSubject,
        fileUrl,
        driveFileId: fileUrl ? extractDriveFileId(fileUrl) : null,
        rawRow: row.map(String),
      };
    })
    .filter((r): r is FormResponse => r !== null);
}

/* ═══════════════════════════════════════
   Google Drive — Download Files
   ═══════════════════════════════════════ */

/**
 * Downloads a file from Google Drive by its file ID.
 *
 * The service account must have at least Viewer access to the file
 * (share the Drive folder containing form uploads with the service account).
 *
 * @param fileId - The Google Drive file ID
 * @returns DriveFile with buffer, mimeType, and name
 */
export async function downloadDriveFile(fileId: string): Promise<DriveFile> {
  const auth = getGoogleAuth();
  const drive = google.drive({ version: 'v3', auth });

  // First, get file metadata to know the name and MIME type
  const metadata = await drive.files.get({
    fileId,
    fields: 'name,mimeType',
  });

  const name = metadata.data.name || 'unknown';
  const mimeType = metadata.data.mimeType || 'application/octet-stream';

  // Download the file content
  const fileResponse = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'arraybuffer' }
  );

  const buffer = Buffer.from(fileResponse.data as ArrayBuffer);

  return { buffer, mimeType, name };
}

/* ═══════════════════════════════════════
   Utilities
   ═══════════════════════════════════════ */

/**
 * Extracts the Google Drive file ID from various URL formats:
 *   - https://drive.google.com/open?id=FILE_ID
 *   - https://drive.google.com/file/d/FILE_ID/view
 *   - https://drive.google.com/uc?id=FILE_ID
 *
 * @param url - A Google Drive URL
 * @returns The file ID, or null if the URL doesn't match
 */
export function extractDriveFileId(url: string): string | null {
  if (!url) return null;

  // Pattern: /file/d/{ID}/
  const filePattern = /\/file\/d\/([a-zA-Z0-9_-]+)/;
  const fileMatch = url.match(filePattern);
  if (fileMatch) return fileMatch[1];

  // Pattern: ?id={ID} or &id={ID}
  const idPattern = /[?&]id=([a-zA-Z0-9_-]+)/;
  const idMatch = url.match(idPattern);
  if (idMatch) return idMatch[1];

  // Pattern: /folders/{ID}
  const folderPattern = /\/folders\/([a-zA-Z0-9_-]+)/;
  const folderMatch = url.match(folderPattern);
  if (folderMatch) return folderMatch[1];

  return null;
}

/**
 * Generates a stable deduplication ID from a Google Sheets row.
 * Uses timestamp + identifier (email or name) to create a unique key.
 *
 * This ensures that syncing the same sheet multiple times
 * does not create duplicate submissions.
 */
function generateResponseId(timestamp: string, identifier: string): string {
  const raw = `${timestamp}|${identifier.toLowerCase().trim()}`;
  // Simple hash — crypto not needed for dedup, just uniqueness
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `gf_${Math.abs(hash).toString(36)}_${timestamp.replace(/\D/g, '').slice(0, 14)}`;
}

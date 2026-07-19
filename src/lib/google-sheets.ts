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
import { createHash } from 'node:crypto';
import { decrypt, encrypt } from '@/lib/crypto';

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
  /** The student's email address (if collected) */
  studentEmail: string;
  /** The student's roll number */
  rollNumber?: string;
  /** The class/subject (if collected in the form) */
  classSubject?: string;
  /** Google Drive URL for the uploaded file (if any) */
  fileUrl?: string | null;
  /** Extracted Google Drive file ID (if any) */
  driveFileId: string | null;
  /** The raw row values for debugging */
  rawRow?: string[];
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

/** A safe, user-actionable Google connection failure. */
export class GoogleConnectionError extends Error {
  constructor(
    message: string,
    public readonly code: 'GOOGLE_RECONNECT_REQUIRED' | 'GOOGLE_AUTH_EXPIRED'
  ) {
    super(message);
    this.name = 'GoogleConnectionError';
  }
}

function isEncryptedToken(value: string): boolean {
  // AES-GCM values created by crypto.ts are iv.authTag.ciphertext (base64url).
  return /^[A-Za-z0-9_-]{16}\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]+$/.test(value);
}

function decryptStoredGoogleToken(value: string): string {
  const plaintext = decrypt(value);
  if (plaintext) return plaintext;

  if (isEncryptedToken(value)) {
    // A token copied from another Railway project requires the original key.
    throw new GoogleConnectionError(
      'This Google connection belongs to a different deployment. Disconnect and reconnect Google.',
      'GOOGLE_RECONNECT_REQUIRED'
    );
  }

  // Tokens stored before encryption was introduced remain supported.
  return value;
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

/**
 * Creates an OAuth2 client using a teacher's stored tokens.
 * Automatically refreshes the access token if it's expired.
 */
export async function getOAuthClientForUser(userId: string) {
  const { db } = await import('@/db');
  const { googleTokens } = await import('@/db/schema');
  const { eq } = await import('drizzle-orm');

  const token = await db.query.googleTokens.findFirst({
    where: eq(googleTokens.userId, userId),
  });

  if (!token) {
    throw new Error('Google account not connected. Please connect your Google account first.');
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/google/callback`
  );

  // Preserve legacy plaintext tokens, but never submit unreadable ciphertext to Google.
  oauth2Client.setCredentials({
    access_token: decryptStoredGoogleToken(token.accessToken),
    refresh_token: decryptStoredGoogleToken(token.refreshToken),
    expiry_date: token.tokenExpiry.getTime(),
  });

  // Auto-refresh if expired
  if (token.tokenExpiry.getTime() <= Date.now()) {
    let credentials;
    try {
      ({ credentials } = await oauth2Client.refreshAccessToken());
    } catch (error) {
      console.error('Google OAuth refresh failed:', error);
      await db.delete(googleTokens).where(eq(googleTokens.userId, userId));
      throw new GoogleConnectionError(
        'Your Google authorization expired. Reconnect Google to continue.',
        'GOOGLE_AUTH_EXPIRED'
      );
    }

    // Re-encrypt the refreshed access token before persisting.
    await db.update(googleTokens)
      .set({
        accessToken: encrypt(credentials.access_token!),
        tokenExpiry: new Date(credentials.expiry_date || Date.now() + 3600_000),
        updatedAt: new Date(),
      })
      .where(eq(googleTokens.userId, userId));

    oauth2Client.setCredentials(credentials);
  }

  return oauth2Client;
}

/* ═══════════════════════════════════════
   Google Drive — List Shared Spreadsheets
   ═══════════════════════════════════════ */

/** Metadata for a discovered Google Sheet */
export interface SharedSpreadsheet {
  /** Google Spreadsheet / Drive file ID */
  id: string;
  /** Display name of the spreadsheet */
  name: string;
  /** The last time the file was modified */
  modifiedTime: string;
  /** The owner's email (the professor who shared it) */
  ownerEmail: string | null;
  /** Web link to the spreadsheet */
  webViewLink: string | null;
}

/**
 * Lists all Google Sheets that have been shared with the service account.
 * This lets professors simply share their form-response sheet with the
 * service account email, and it will appear in the picker automatically —
 * no need to copy/paste spreadsheet IDs.
 *
 * @param pageSize - Max results per page (default 50)
 * @returns Array of SharedSpreadsheet metadata
 */
export async function listSharedSpreadsheets(
  pageSize = 50,
  userId?: string
): Promise<SharedSpreadsheet[]> {
  const auth = userId ? await getOAuthClientForUser(userId) : getGoogleAuth();
  const drive = google.drive({ version: 'v3', auth });

  const results: SharedSpreadsheet[] = [];
  let nextPageToken: string | undefined;

  do {
    const res = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
      fields: 'nextPageToken, files(id, name, modifiedTime, owners, webViewLink)',
      orderBy: 'modifiedTime desc',
      pageSize,
      pageToken: nextPageToken,
    });

    const files = res.data.files || [];
    for (const f of files) {
      results.push({
        id: f.id!,
        name: f.name || 'Untitled',
        modifiedTime: f.modifiedTime || '',
        ownerEmail: f.owners?.[0]?.emailAddress || null,
        webViewLink: f.webViewLink || null,
      });
    }

    nextPageToken = res.data.nextPageToken ?? undefined;
  } while (nextPageToken);

  return results;
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
  spreadsheetId: string,
  userId?: string
): Promise<FormResponse[]> {
  const auth = userId ? await getOAuthClientForUser(userId) : getGoogleAuth();
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
  const headers = rows[0].map((h: unknown) => String(h).toLowerCase().trim());
  const tsIdx = headers.findIndex((h: string) => h.includes('timestamp') || h === 'date');
  const nameIdx = headers.findIndex((h: string) => h.includes('name'));
  const emailIdx = headers.findIndex((h: string) => h.includes('email') || h.includes('e-mail'));
  const rollIdx = headers.findIndex((h: string) => h.includes('roll') || h.includes('id') || h.includes('student number'));
  const fileIdx = headers.findIndex((h: string) => h.includes('file') || h.includes('upload') || h.includes('assignment') || h.includes('submission'));

  // Skip header row (index 0), parse each data row
  const dataRows = rows.slice(1);

  return dataRows
    .map((row): FormResponse | null => {
      const timestamp = tsIdx >= 0 ? (row[tsIdx] || '').trim() : '';
      const studentName = nameIdx >= 0 ? (row[nameIdx] || '').trim() : (row[1] || '').trim();
      const studentEmail = emailIdx >= 0 ? (row[emailIdx] || '').trim() : '';
      const fileUrl = fileIdx >= 0 ? (row[fileIdx] || '').trim() : null;
      
      let rollNumber: string | undefined = undefined;
      if (rollIdx >= 0 && row[rollIdx]) {
        const trimmed = row[rollIdx].trim();
        if (trimmed) rollNumber = trimmed;
      }

      // Skip rows missing essential data
      if (!timestamp && !studentName) {
        return null;
      }

      // Generate a unique dedup key from timestamp + email/name
      const responseId = generateResponseId(timestamp || String(Date.now()), studentEmail || studentName || 'unknown');

      const driveFileId = extractDriveFileId(fileUrl || '');

      return {
        responseId,
        timestamp: timestamp || new Date().toISOString(),
        studentName: studentName || 'Unknown Student',
        studentEmail,
        rollNumber,
        classSubject: '',
        fileUrl,
        driveFileId,
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
export async function downloadDriveFile(fileId: string, userId?: string): Promise<DriveFile> {
  const auth = userId ? await getOAuthClientForUser(userId) : getGoogleAuth();
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
  // SHA-256 (BUG-6/SEC-15): 32-bit djb2 collided across distinct rows, which
  // could drop legitimate submissions during dedup.
  const hash = createHash('sha256').update(raw).digest('hex').slice(0, 16);
  return `gf_${hash}_${timestamp.replace(/\D/g, '').slice(0, 14)}`;
}

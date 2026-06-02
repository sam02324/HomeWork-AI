import { NextResponse } from 'next/server';
import { getAuthUserId, errorResponse, successResponse } from '@/lib/utils';
import { getOAuthClientForUser } from '@/lib/google-sheets';
import { google } from 'googleapis';
import { db } from '@/db';
import { googleTokens } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  const userId = await getAuthUserId();
  if (userId instanceof NextResponse) return userId;

  try {
    const token = await db.query.googleTokens.findFirst({
      where: eq(googleTokens.userId, userId),
    });

    if (!token) {
      return errorResponse('No Google account connected.', 401);
    }

    if (!token.scopes?.includes('drive.readonly') && !token.scopes?.includes('drive')) {
      return errorResponse('Missing Google Drive permissions. You must reconnect your account to grant folder access.', 403);
    }

    const auth = await getOAuthClientForUser(userId);
    const drive = google.drive({ version: 'v3', auth });

    const results: { id: string; name: string }[] = [];
    let nextPageToken: string | undefined;

    do {
      const res = await drive.files.list({
        q: "mimeType='application/vnd.google-apps.folder' and trashed=false",
        fields: 'nextPageToken, files(id, name)',
        orderBy: 'name',
        pageSize: 100,
        pageToken: nextPageToken,
        includeItemsFromAllDrives: true,
        supportsAllDrives: true,
      });

      const files = res.data.files || [];
      console.log(`[Google API] Found ${files.length} folders on this page.`);
      for (const f of files) {
        if (f.id && f.name) {
          results.push({ id: f.id, name: f.name });
        }
      }

      nextPageToken = res.data.nextPageToken ?? undefined;
    } while (nextPageToken);

    return successResponse({
      folders: results,
      currentSyncFolderId: token.syncFolderId || null
    });
  } catch (error: any) {
    console.error('GET /api/google-folders error:', error.message || error);
    return errorResponse(`Failed to list Google Folders: ${error.message || 'Unknown error'}`, 500);
  }
}

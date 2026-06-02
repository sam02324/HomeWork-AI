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
      });

      const files = res.data.files || [];
      for (const f of files) {
        if (f.id && f.name) {
          results.push({ id: f.id, name: f.name });
        }
      }

      nextPageToken = res.data.nextPageToken ?? undefined;
    } while (nextPageToken);

    const token = await db.query.googleTokens.findFirst({
      where: eq(googleTokens.userId, userId),
    });

    return successResponse({
      folders: results,
      currentSyncFolderId: token?.syncFolderId || null
    });
  } catch (error) {
    console.error('GET /api/google-folders error:', error);
    return errorResponse('Failed to list Google Folders.', 500);
  }
}

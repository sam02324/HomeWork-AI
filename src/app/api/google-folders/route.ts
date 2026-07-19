import { NextResponse } from 'next/server';
import { getAuthUserId, errorResponse, successResponse } from '@/lib/utils';
import { getOAuthClientForUser, GoogleConnectionError } from '@/lib/google-sheets';
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

    console.log(`[Google API] User ${userId} requested folders. Token exists: ${!!token}, Scopes: ${token?.scopes}`);

    if (!token) {
      return errorResponse('No Google account connected.', 401);
    }

    if (!token.scopes?.includes('drive.readonly') && !token.scopes?.includes('drive')) {
      console.log(`[Google API] User ${userId} missing drive.readonly scope. Throwing 403.`);
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

    const response = successResponse({
      folders: results,
      currentSyncFolderId: token.syncFolderId || null
    });
    
    // Hard-disable Next.js caching
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error) {
    if (error instanceof GoogleConnectionError) {
      return errorResponse(error.message, 401, error.code);
    }
    // SEC-11: log details server-side, return a generic message to the client.
    console.error('GET /api/google-folders error:', error instanceof Error ? error.message : error);
    return errorResponse('Failed to list Google folders. Please try reconnecting your Google account.', 500);
  }
}

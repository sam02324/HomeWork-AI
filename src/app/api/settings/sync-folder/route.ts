import { NextResponse } from 'next/server';
import { getAuthUserId, errorResponse, successResponse } from '@/lib/utils';
import { db } from '@/db';
import { googleTokens } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (userId instanceof NextResponse) return userId;

  try {
    const { folderId, folderName } = await request.json();

    if (folderId === undefined) {
      return errorResponse('folderId is required', 400);
    }

    const tokenRecord = await db.query.googleTokens.findFirst({
      where: eq(googleTokens.userId, userId),
    });

    if (!tokenRecord) {
      return errorResponse('No Google account connected', 400);
    }

    await db.update(googleTokens)
      .set({
        syncFolderId: folderId || null,
        syncFolderName: folderName || null,
        updatedAt: new Date(),
      })
      .where(eq(googleTokens.userId, userId));

    return successResponse({ message: 'Sync folder updated successfully' });
  } catch (error) {
    console.error('POST /api/settings/sync-folder error:', error);
    return errorResponse('Failed to update sync folder.', 500);
  }
}

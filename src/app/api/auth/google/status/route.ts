/**
 * GET /api/auth/google/status — Check if Google is connected
 * DELETE /api/auth/google/status — Disconnect Google
 */
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { googleTokens } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getAuthUserId, errorResponse, successResponse } from '@/lib/utils';
import { google } from 'googleapis';
import { decryptOrLegacy } from '@/lib/crypto';

export async function GET() {
  const userId = await getAuthUserId();
  if (userId instanceof NextResponse) return userId;

  const token = await db.query.googleTokens.findFirst({
    where: eq(googleTokens.userId, userId),
  });

  return successResponse({
    connected: !!token,
    googleEmail: token?.googleEmail || null,
    connectedAt: token?.createdAt || null,
  });
}

export async function DELETE() {
  const userId = await getAuthUserId();
  if (userId instanceof NextResponse) return userId;

  try {
    // Get the token to revoke it
    const token = await db.query.googleTokens.findFirst({
      where: eq(googleTokens.userId, userId),
    });

    if (token) {
      // Try to revoke the token at Google
      try {
        const oauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_OAUTH_CLIENT_ID,
          process.env.GOOGLE_OAUTH_CLIENT_SECRET
        );
        const accessToken = decryptOrLegacy(token.accessToken);
        oauth2Client.setCredentials({ access_token: accessToken });
        await oauth2Client.revokeToken(accessToken);
      } catch {
        // Revocation may fail if token is already expired — that's ok
      }

      // Delete from DB
      await db.delete(googleTokens).where(eq(googleTokens.userId, userId));
    }

    return successResponse({ disconnected: true });
  } catch (error) {
    console.error('DELETE /api/auth/google/status error:', error);
    return errorResponse('Failed to disconnect Google', 500);
  }
}

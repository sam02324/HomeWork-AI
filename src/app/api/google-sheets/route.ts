/**
 * GET /api/google-sheets
 *
 * Lists all Google Spreadsheets accessible to the teacher.
 * Uses OAuth tokens if available, otherwise falls back to service account.
 */

import { NextResponse } from 'next/server';
import { getAuthUserId, errorResponse, successResponse } from '@/lib/utils';
import { GoogleConnectionError, listSharedSpreadsheets } from '@/lib/google-sheets';
import { db } from '@/db';
import { googleTokens } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  const userId = await getAuthUserId();
  if (userId instanceof NextResponse) return userId;

  try {
    // Check if user has connected Google OAuth
    const token = await db.query.googleTokens.findFirst({
      where: eq(googleTokens.userId, userId),
    });

    // Use OAuth tokens if available, otherwise fall back to service account
    const sheets = await listSharedSpreadsheets(50, token ? userId : undefined);
    return successResponse(sheets);
  } catch (error) {
    if (error instanceof GoogleConnectionError) {
      return errorResponse(error.message, 401, error.code);
    }
    console.error('GET /api/google-sheets error:', error);
    return errorResponse(
      'Failed to list Google Sheets. Check your Google connection.',
      500
    );
  }
}

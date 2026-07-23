/**
 * GET /api/google-sheets
 *
 * Lists all Google Spreadsheets accessible to the teacher.
 * Uses only the requesting teacher's OAuth tokens.
 */

import { NextResponse } from 'next/server';
import { getAuthUserId, errorResponse, successResponse } from '@/lib/utils';
import { GoogleConnectionError, listSharedSpreadsheets } from '@/lib/google-sheets';

export const dynamic = 'force-dynamic';

export async function GET() {
  const userId = await getAuthUserId();
  if (userId instanceof NextResponse) return userId;

  try {
    const sheets = await listSharedSpreadsheets(50, userId);
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

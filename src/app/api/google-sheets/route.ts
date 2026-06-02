/**
 * GET /api/google-sheets
 *
 * Lists all Google Spreadsheets shared with the service account.
 * Professors share their form-response sheet, and it auto-appears here.
 */

import { NextResponse } from 'next/server';
import { getAuthUserId, errorResponse, successResponse } from '@/lib/utils';
import { listSharedSpreadsheets } from '@/lib/google-sheets';

export const dynamic = 'force-dynamic';

export async function GET() {
  const userId = await getAuthUserId();
  if (userId instanceof NextResponse) return userId;

  try {
    const sheets = await listSharedSpreadsheets();
    return successResponse(sheets);
  } catch (error) {
    console.error('GET /api/google-sheets error:', error);
    return errorResponse(
      'Failed to list Google Sheets. Check service account configuration.',
      500
    );
  }
}

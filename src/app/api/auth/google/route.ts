/**
 * GET /api/auth/google
 * Redirects the teacher to Google's OAuth consent screen.
 */
import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/utils';
import { google } from 'googleapis';

export async function GET() {
  const userId = await getAuthUserId();
  if (userId instanceof NextResponse) return userId;

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/google/callback`
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/spreadsheets.readonly',
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
    state: userId, // Pass userId to identify the teacher in the callback
  });

  return NextResponse.redirect(authUrl);
}

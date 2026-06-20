/**
 * GET /api/auth/google
 * Redirects the teacher to Google's OAuth consent screen.
 */
import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { getAuthUserId } from '@/lib/utils';
import { google } from 'googleapis';

export async function GET() {
  const userId = await getAuthUserId();
  if (userId instanceof NextResponse) return userId;

  // SEC-17: the redirect URI must come only from configured app URL, never from
  // request headers (Host-header injection → open redirect / token leak).
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    return NextResponse.json(
      { error: 'Server misconfigured: NEXT_PUBLIC_APP_URL is not set.' },
      { status: 500 }
    );
  }

  // SEC-5: CSRF protection. The `state` is a random nonce mirrored in an
  // httpOnly cookie; the callback rejects the flow unless they match. The
  // signed-in user is resolved from the Clerk session, not from `state`.
  const nonce = randomBytes(32).toString('hex');

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    `${appUrl}/api/auth/google/callback`
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/spreadsheets.readonly',
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
    state: nonce,
  });

  const res = NextResponse.redirect(authUrl);
  res.cookies.set('google_oauth_state', nonce, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 300, // 5 minutes
  });
  return res;
}

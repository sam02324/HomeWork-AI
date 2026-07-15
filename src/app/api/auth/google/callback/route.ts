/**
 * GET /api/auth/google/callback
 * Handles the OAuth callback, exchanges code for tokens, stores them encrypted.
 */
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { google } from 'googleapis';
import { db } from '@/db';
import { googleTokens } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { encrypt } from '@/lib/crypto';

const STATE_COOKIE = 'google_oauth_state';

export async function GET(request: Request) {
  // SEC-17: redirect base from configured app URL only — never request headers.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    return NextResponse.json(
      { error: 'Server misconfigured: NEXT_PUBLIC_APP_URL is not set.' },
      { status: 500 }
    );
  }

  // Every return path clears the one-time state cookie.
  const back = (reason?: string) => {
    const qs = reason ? `?google_auth=error&reason=${encodeURIComponent(reason)}` : '?google_auth=success';
    const res = NextResponse.redirect(`${appUrl}/dashboard${qs}`);
    res.cookies.set(STATE_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
    return res;
  };

  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  const cookieState = request.headers
    .get('cookie')
    ?.split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${STATE_COOKIE}=`))
    ?.slice(STATE_COOKIE.length + 1);

  if (error) {
    return back(error);
  }

  if (!code || !state) {
    return back('missing_params');
  }

  // SEC-5: verify the nonce round-tripped through our cookie (CSRF defence).
  if (!cookieState || state !== cookieState) {
    return back('invalid_state');
  }

  // The user is determined solely by the Clerk session, never by `state`.
  const { userId } = await auth();
  if (!userId) {
    return back('not_authenticated');
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_OAUTH_CLIENT_ID,
      process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      `${appUrl}/api/auth/google/callback`
    );

    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      return back('no_tokens');
    }

    // Get the user's Google email
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const googleEmail = userInfo.data.email || null;

    // Encrypt tokens at rest (SEC-4) before persisting.
    const encryptedAccess = encrypt(tokens.access_token);
    const encryptedRefresh = encrypt(tokens.refresh_token);

    const existing = await db.query.googleTokens.findFirst({
      where: eq(googleTokens.userId, userId),
    });

    if (existing) {
      await db.update(googleTokens)
        .set({
          accessToken: encryptedAccess,
          refreshToken: encryptedRefresh,
          tokenExpiry: new Date(tokens.expiry_date || Date.now() + 3600_000),
          googleEmail,
          scopes: tokens.scope || '',
          updatedAt: new Date(),
        })
        .where(eq(googleTokens.userId, userId));
    } else {
      await db.insert(googleTokens).values({
        userId,
        accessToken: encryptedAccess,
        refreshToken: encryptedRefresh,
        tokenExpiry: new Date(tokens.expiry_date || Date.now() + 3600_000),
        googleEmail,
        scopes: tokens.scope || '',
      });
    }

    return back();
  } catch (err) {
    console.error('Google OAuth callback error:', err);
    return back('token_exchange_failed');
  }
}

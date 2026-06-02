/**
 * GET /api/auth/google/callback
 * Handles the OAuth callback, exchanges code for tokens, stores in DB.
 */
import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { db } from '@/db';
import { googleTokens } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state'); // userId
  const error = url.searchParams.get('error');

  const host = request.headers.get('host');
  const protocol = request.headers.get('x-forwarded-proto') || 'http';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || (host ? `${protocol}://${host}` : 'http://localhost:3000');

  if (error) {
    return NextResponse.redirect(`${appUrl}/dashboard?google_auth=error&reason=${error}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${appUrl}/dashboard?google_auth=error&reason=missing_params`);
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_OAUTH_CLIENT_ID,
      process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      `${appUrl}/api/auth/google/callback`
    );

    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      return NextResponse.redirect(`${appUrl}/dashboard?google_auth=error&reason=no_tokens`);
    }

    // Get the user's Google email
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const googleEmail = userInfo.data.email || null;

    // Upsert the tokens
    const existing = await db.query.googleTokens.findFirst({
      where: eq(googleTokens.userId, state),
    });

    if (existing) {
      await db.update(googleTokens)
        .set({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          tokenExpiry: new Date(tokens.expiry_date || Date.now() + 3600_000),
          googleEmail,
          scopes: tokens.scope || '',
          updatedAt: new Date(),
        })
        .where(eq(googleTokens.userId, state));
    } else {
      await db.insert(googleTokens).values({
        userId: state,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token!,
        tokenExpiry: new Date(tokens.expiry_date || Date.now() + 3600_000),
        googleEmail,
        scopes: tokens.scope || '',
      });
    }

    return NextResponse.redirect(`${appUrl}/dashboard?google_auth=success`);
  } catch (err) {
    console.error('Google OAuth callback error:', err);
    return NextResponse.redirect(`${appUrl}/dashboard?google_auth=error&reason=token_exchange_failed`);
  }
}

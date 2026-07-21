import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { normalizeAppRole } from '@/lib/auth/roles';

/* ═══════════════════════════════════════
   Auth
   ═══════════════════════════════════════ */

/**
 * Get the authenticated user's Clerk ID or return a 401 response.
 * Also ensures the user exists in the local database (auto-provision).
 */
export async function getAuthUserId(): Promise<string | NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return errorResponse('Unauthorized', 401, 'UNAUTHORIZED');
  }

  // Auto-provision: ensure user exists in our DB
  try {
    const existing = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!existing) {
      const clerkUser = await currentUser();
      await db.insert(users).values({
        id: userId,
        email: clerkUser?.emailAddresses?.[0]?.emailAddress || `${userId}@clerk.dev`,
        name: [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(' ') || 'Teacher',
        role: normalizeAppRole(clerkUser?.publicMetadata.role),
      }).onConflictDoNothing();
    }
  } catch (err) {
    console.error('Auto-provision user error (non-fatal):', err);
    // Don't block the request if provisioning fails for a race condition
  }

  return userId;
}

/* ═══════════════════════════════════════
   Standard API response envelope
   Success: { success: true, data }
   Error:   { success: false, error, code }
   ═══════════════════════════════════════ */

/** Derive a stable error code from the HTTP status when one isn't provided. */
function codeForStatus(status: number): string {
  switch (status) {
    case 400: return 'BAD_REQUEST';
    case 401: return 'UNAUTHORIZED';
    case 403: return 'FORBIDDEN';
    case 404: return 'NOT_FOUND';
    case 409: return 'CONFLICT';
    case 429: return 'RATE_LIMITED';
    default: return status >= 500 ? 'INTERNAL' : 'ERROR';
  }
}

/** Standard error response. Never leaks internals — pass only safe messages. */
export function errorResponse(message: string, status: number = 400, code?: string) {
  return NextResponse.json(
    { success: false, error: message, code: code ?? codeForStatus(status) },
    { status }
  );
}

/** Standard success response wrapped in the envelope. */
export function successResponse<T>(data: T, status: number = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

/**
 * Central error handler: logs the real error server-side, returns a generic
 * 500 so stack traces / DB internals never reach the client.
 */
export function handleApiError(error: unknown, context: string) {
  console.error(`${context} error:`, error);
  return errorResponse('Internal server error', 500, 'INTERNAL');
}

/* ═══════════════════════════════════════
   Validation
   ═══════════════════════════════════════ */

/** Shape of a ZodError-like object without importing zod here. */
function formatValidationError(err: unknown): string {
  if (err && typeof err === 'object' && 'issues' in err) {
    const issues = (err as { issues: Array<{ path: (string | number)[]; message: string }> }).issues;
    if (Array.isArray(issues) && issues.length) {
      return issues
        .map((i) => `${i.path.join('.') || 'body'}: ${i.message}`)
        .join('; ');
    }
  }
  return 'Invalid request body';
}

/**
 * Parse and validate a JSON body with a zod schema.
 * Returns a 400 NextResponse with field-level messages on failure.
 */
export async function parseBody<T>(
  request: Request,
  schema: { parse: (data: unknown) => T }
): Promise<T | NextResponse> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return errorResponse('Request body must be valid JSON', 400, 'BAD_REQUEST');
  }
  try {
    return schema.parse(raw);
  } catch (err) {
    return errorResponse(formatValidationError(err), 400, 'VALIDATION');
  }
}

/** Parse URL search params with a zod schema. */
export function parseQuery<T>(
  url: string,
  schema: { parse: (data: unknown) => T }
): T | NextResponse {
  try {
    const { searchParams } = new URL(url);
    const params = Object.fromEntries(searchParams.entries());
    return schema.parse(params);
  } catch (err) {
    return errorResponse(formatValidationError(err), 400, 'VALIDATION');
  }
}

/* ═══════════════════════════════════════
   Rate limiting (in-memory, per-instance)
   Pragmatic throttle — good enough for a single deploy target.
   Note: serverless instances each keep their own map, so this is a
   best-effort guard, not a global limiter. Swap for Redis if needed.
   ═══════════════════════════════════════ */

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }

  if (entry.count >= limit) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count++;
  return { allowed: true, retryAfter: 0 };
}

/** Convenience: rate-limit guard that returns a 429 NextResponse or null if allowed. */
export function rateLimitGuard(
  key: string,
  limit: number,
  windowMs: number
): NextResponse | null {
  const { allowed, retryAfter } = checkRateLimit(key, limit, windowMs);
  if (allowed) return null;
  const res = errorResponse(
    `Too many requests. Try again in ${retryAfter}s.`,
    429,
    'RATE_LIMITED'
  );
  res.headers.set('Retry-After', String(retryAfter));
  return res;
}

/* ═══════════════════════════════════════
   Sanitization
   ═══════════════════════════════════════ */

/** Strip HTML tags from user input to prevent stored XSS. Simple + dependency-free. */
export function stripHtml(input: string | null | undefined): string {
  if (!input) return '';
  return input
    // Decode entities FIRST, so encoded tags like &lt;script&gt; turn into
    // real tags that the stripper below then removes. (&amp; first to avoid
    // leaving a dangling entity, e.g. &amp;lt; -> &lt; -> <.)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Then strip tags.
    .replace(/<[^>]*>/g, '')
    .trim();
}

/* ═══════════════════════════════════════
   Grading helpers
   ═══════════════════════════════════════ */

/** Calculate letter grade from percentage. */
export function getGradeLetter(percentage: number): string {
  if (percentage >= 90) return 'A+';
  if (percentage >= 85) return 'A';
  if (percentage >= 80) return 'A-';
  if (percentage >= 75) return 'B+';
  if (percentage >= 70) return 'B';
  if (percentage >= 65) return 'B-';
  if (percentage >= 60) return 'C+';
  if (percentage >= 55) return 'C';
  if (percentage >= 50) return 'C-';
  if (percentage >= 45) return 'D+';
  if (percentage >= 40) return 'D';
  return 'F';
}

/** 
 * Ensure the fileUrl is safe to fetch (SSRF protection).
 * Must be HTTPS and not point to internal/local IP addresses.
 */
export function assertAllowedFileUrl(urlString: string): void {
  try {
    const url = new URL(urlString);
    if (url.protocol !== 'https:') {
      throw new Error('Only HTTPS URLs are allowed');
    }
    const hostname = url.hostname;
    // Reject local and private IP ranges
    if (
      hostname === 'localhost' ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal') ||
      /^127\.\d+\.\d+\.\d+$/.test(hostname) ||
      /^10\.\d+\.\d+\.\d+$/.test(hostname) ||
      /^192\.168\.\d+\.\d+$/.test(hostname) ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+$/.test(hostname)
    ) {
      throw new Error('Local or internal URLs are not allowed');
    }
  } catch (e) {
    if (e instanceof Error && e.message !== 'Invalid URL') {
      throw e;
    }
    throw new Error('Invalid file URL');
  }
}

import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Get the authenticated user's Clerk ID or return a 401 response.
 * Also ensures the user exists in the local database (auto-provision).
 */
export async function getAuthUserId(): Promise<string | NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
        role: 'teacher',
      }).onConflictDoNothing();
    }
  } catch (err) {
    console.error('Auto-provision user error (non-fatal):', err);
    // Don't block the request if provisioning fails for a race condition
  }

  return userId;
}

/**
 * Standard error response helper.
 */
export function errorResponse(message: string, status: number = 400) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Standard success response helper.
 */
export function successResponse<T>(data: T, status: number = 200) {
  return NextResponse.json(data, { status });
}

/**
 * Parse and validate JSON body from request.
 */
export async function parseBody<T>(
  request: Request,
  schema: { parse: (data: unknown) => T }
): Promise<T | NextResponse> {
  try {
    const body = await request.json();
    return schema.parse(body);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid request body';
    return errorResponse(message, 400);
  }
}

/**
 * Parse URL search params with a zod schema.
 */
export function parseQuery<T>(
  url: string,
  schema: { parse: (data: unknown) => T }
): T | NextResponse {
  try {
    const { searchParams } = new URL(url);
    const params = Object.fromEntries(searchParams.entries());
    return schema.parse(params);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid query params';
    return errorResponse(message, 400);
  }
}

/**
 * Calculate letter grade from percentage.
 */
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

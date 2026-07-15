import { NextResponse } from 'next/server';
import { db } from '@/db';
import { classrooms, assignments } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getAuthUserId, errorResponse, successResponse, rateLimitGuard } from '@/lib/utils';

const CONFIRM_PHRASE = 'DELETE ALL MY DATA';

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (userId instanceof NextResponse) return userId;

  // SEC-9: throttle this irreversible action to 1/min per user.
  const limited = rateLimitGuard(`wipe:${userId}`, 1, 60_000);
  if (limited) return limited;

  // SEC-9: require an explicit, exact confirmation phrase in the body.
  let body: { confirm?: unknown };
  try {
    body = await request.json();
  } catch {
    return errorResponse('Request body must be valid JSON', 400, 'BAD_REQUEST');
  }
  if (body?.confirm !== CONFIRM_PHRASE) {
    return errorResponse(`Confirmation required: send { "confirm": "${CONFIRM_PHRASE}" }`, 400);
  }

  try {
    // Delete all assignments
    await db.delete(assignments).where(eq(assignments.teacherId, userId));
    // Delete all classrooms (this cascades to students and their submissions)
    await db.delete(classrooms).where(eq(classrooms.teacherId, userId));

    return successResponse({ message: 'All data wiped successfully' });
  } catch (error) {
    console.error('Failed to wipe data:', error);
    return errorResponse('Failed to wipe data', 500);
  }
}

import { NextResponse } from 'next/server';
import { db } from '@/db';
import { classrooms, assignments } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getAuthUserId, errorResponse, successResponse } from '@/lib/utils';

export async function POST() {
  const userId = await getAuthUserId();
  if (userId instanceof NextResponse) return userId;

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

import { NextResponse } from 'next/server';
import { db } from '@/db';
import { classrooms } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getAuthUserId, errorResponse, successResponse, parseBody } from '@/lib/utils';
import { updateClassroomSchema } from '@/lib/validations';

type Params = { params: Promise<{ id: string }> };

/** GET /api/classrooms/[id] — Classroom detail with students */
export async function GET(_req: Request, { params }: Params) {
  const userId = await getAuthUserId();
  if (userId instanceof NextResponse) return userId;

  const { id } = await params;

  try {
    const classroom = await db.query.classrooms.findFirst({
      where: and(eq(classrooms.id, id), eq(classrooms.teacherId, userId)),
      with: { students: true },
    });

    if (!classroom) return errorResponse('Classroom not found', 404);
    return successResponse(classroom);
  } catch (error) {
    console.error('GET /api/classrooms/[id] error:', error);
    return errorResponse('Failed to fetch classroom', 500);
  }
}

/** PATCH /api/classrooms/[id] — Update classroom */
export async function PATCH(request: Request, { params }: Params) {
  const userId = await getAuthUserId();
  if (userId instanceof NextResponse) return userId;

  const { id } = await params;
  const body = await parseBody(request, updateClassroomSchema);
  if (body instanceof NextResponse) return body;

  try {
    const [updated] = await db.update(classrooms)
      .set({ ...body, updatedAt: new Date() })
      .where(and(eq(classrooms.id, id), eq(classrooms.teacherId, userId)))
      .returning();

    if (!updated) return errorResponse('Classroom not found', 404);
    return successResponse(updated);
  } catch (error) {
    console.error('PATCH /api/classrooms/[id] error:', error);
    return errorResponse('Failed to update classroom', 500);
  }
}

/** DELETE /api/classrooms/[id] — Delete classroom */
export async function DELETE(_req: Request, { params }: Params) {
  const userId = await getAuthUserId();
  if (userId instanceof NextResponse) return userId;

  const { id } = await params;

  try {
    const [deleted] = await db.delete(classrooms)
      .where(and(eq(classrooms.id, id), eq(classrooms.teacherId, userId)))
      .returning();

    if (!deleted) return errorResponse('Classroom not found', 404);
    return successResponse({ message: 'Classroom deleted' });
  } catch (error) {
    console.error('DELETE /api/classrooms/[id] error:', error);
    return errorResponse('Failed to delete classroom', 500);
  }
}

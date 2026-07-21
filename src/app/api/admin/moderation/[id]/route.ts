import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/admin/auth';
import {
  AdminModerationError,
  performAdminModerationAction,
} from '@/lib/admin/moderation';
import { adminModerationActionSchema } from '@/lib/validations';
import {
  errorResponse,
  handleApiError,
  parseBody,
  rateLimitGuard,
  successResponse,
} from '@/lib/utils';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const access = await requireAdminApi();
  if (!access.ok) return access.response;

  const limited = rateLimitGuard(`admin-moderation:${access.admin.userId}`, 20, 60_000);
  if (limited) return limited;

  const body = await parseBody(request, adminModerationActionSchema);
  if (body instanceof NextResponse) return body;
  const { id } = await params;

  try {
    return successResponse(await performAdminModerationAction(access.admin, id, body));
  } catch (error) {
    if (error instanceof AdminModerationError) {
      return errorResponse(error.message, error.status, error.code);
    }
    return handleApiError(error, 'PATCH /api/admin/moderation/[id]');
  }
}

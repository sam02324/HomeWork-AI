import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/admin/auth';
import {
  AdminAccountError,
  getAdminAccountDetails,
  performAdminAccountAction,
} from '@/lib/admin/accounts';
import { adminAccountActionSchema } from '@/lib/validations';
import {
  errorResponse,
  handleApiError,
  parseBody,
  rateLimitGuard,
  successResponse,
} from '@/lib/utils';

type Params = { params: Promise<{ id: string }> };

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: Params) {
  const access = await requireAdminApi();
  if (!access.ok) return access.response;
  const { id } = await params;

  try {
    return successResponse(await getAdminAccountDetails(id));
  } catch (error) {
    if (error instanceof AdminAccountError) {
      return errorResponse(error.message, error.status, error.code);
    }
    return handleApiError(error, 'GET /api/admin/accounts/[id]');
  }
}
export async function PATCH(request: Request, { params }: Params) {
  const access = await requireAdminApi();
  if (!access.ok) return access.response;

  const limited = rateLimitGuard(`admin-account:${access.admin.userId}`, 20, 60_000);
  if (limited) return limited;

  const body = await parseBody(request, adminAccountActionSchema);
  if (body instanceof NextResponse) return body;
  const { id } = await params;

  try {
    return successResponse(await performAdminAccountAction(access.admin, id, body));
  } catch (error) {
    if (error instanceof AdminAccountError) {
      return errorResponse(error.message, error.status, error.code);
    }
    return handleApiError(error, 'PATCH /api/admin/accounts/[id]');
  }
}

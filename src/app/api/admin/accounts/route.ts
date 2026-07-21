import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/admin/auth';
import { getAdminAccounts } from '@/lib/admin/accounts';
import { adminAccountQuerySchema } from '@/lib/validations';
import { handleApiError, parseQuery, successResponse } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const access = await requireAdminApi();
  if (!access.ok) return access.response;

  const query = parseQuery(request.url, adminAccountQuerySchema);
  if (query instanceof NextResponse) return query;

  try {
    return successResponse(await getAdminAccounts(query));
  } catch (error) {
    return handleApiError(error, 'GET /api/admin/accounts');
  }
}

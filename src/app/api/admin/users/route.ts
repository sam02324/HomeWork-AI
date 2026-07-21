import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/admin/auth';
import { getAdminUserOverview } from '@/lib/admin/user-overview';
import { handleApiError, parseQuery, successResponse } from '@/lib/utils';
import { adminUserQuerySchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';

/** GET /api/admin/users - Clerk identities merged with GradeAI account totals. */
export async function GET(request: Request) {
  try {
    const access = await requireAdminApi();
    if (!access.ok) return access.response;

    const query = parseQuery(request.url, adminUserQuerySchema);
    if (query instanceof NextResponse) return query;

    const result = await getAdminUserOverview(query);
    const response = successResponse(result);
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  } catch (error) {
    return handleApiError(error, 'GET /api/admin/users');
  }
}
